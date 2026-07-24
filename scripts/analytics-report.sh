#!/usr/bin/env bash
# Traffic report from CloudFront access logs via Athena (analytics layer 1).
# Usage:  ./scripts/analytics-report.sh [DAYS]
# Data:   s3://scottclarkio-site-logs/cf/  ->  Athena table sitelogs.cf_access
#         (database + table DDL created 2026-07-05; 400-day log retention)
# Cost:   pennies (Athena bills per TB scanned; this site's logs are KBs).
set -euo pipefail

DAYS="${1:-7}"
OUT=s3://scottclarkio-site-logs/athena-results/
# No named profile: this account rides the `aws login` credential
# bridge (ambient env). --profile is added only when AWS_PROFILE is set.
PROFILE_ARGS=()
[[ -n "${AWS_PROFILE:-}" ]] && PROFILE_ARGS=(--profile "$AWS_PROFILE")
BOTS="(?i)bot|crawl|spider|slurp|gpt|claude|anthropic|perplexity|bytespider|ccbot|scrapy|python-requests|curl|wget"

run() { # $1 = sql -> prints result rows (tab-separated)
  local qid state
  qid=$(aws athena start-query-execution "${PROFILE_ARGS[@]}" \
    --query-string "$1" \
    --result-configuration OutputLocation=$OUT \
    --query QueryExecutionId --output text)
  while :; do
    state=$(aws athena get-query-execution "${PROFILE_ARGS[@]}" \
      --query-execution-id "$qid" \
      --query QueryExecution.Status.State --output text)
    case "$state" in
      SUCCEEDED) break ;;
      FAILED|CANCELLED)
        aws athena get-query-execution "${PROFILE_ARGS[@]}" \
          --query-execution-id "$qid" \
          --query QueryExecution.Status.StateChangeReason --output text >&2
        return 1 ;;
      *) sleep 2 ;;
    esac
  done
  aws athena get-query-results "${PROFILE_ARGS[@]}" \
    --query-execution-id "$qid" \
    --query 'ResultSet.Rows[1:].Data[].VarCharValue' --output text |
    paste - -  2>/dev/null || true
}

W="FROM sitelogs.cf_access WHERE \"date\" > current_date - interval '$DAYS' day"
HUMAN="AND NOT regexp_like(cs_user_agent, '$BOTS')"

echo "=================================================================="
echo " scottclark.io — last $DAYS day(s)   ($(date +%F))"
echo "=================================================================="

echo; echo "-- totals (human / bot / uniques) --"
run "SELECT 'human_hits', count(*) $W $HUMAN AND sc_status < 400
     UNION ALL SELECT 'bot_hits', count(*) $W AND regexp_like(cs_user_agent, '$BOTS')
     UNION ALL SELECT 'unique_ips', approx_distinct(c_ip) $W $HUMAN"

echo; echo "-- top pages (human, 2xx/3xx) --"
run "SELECT cs_uri_stem, count(*) $W $HUMAN AND sc_status < 400
     AND cs_uri_stem NOT LIKE '/_astro%' AND cs_uri_stem NOT LIKE '%.svg'
     AND cs_uri_stem NOT LIKE '%.png' AND cs_uri_stem NOT LIKE '%.ico'
     GROUP BY 1 ORDER BY 2 DESC LIMIT 15"

echo; echo "-- referrers (external) --"
run "SELECT cs_referer, count(*) $W $HUMAN AND cs_referer <> '-'
     AND cs_referer NOT LIKE '%scottclark.io%'
     GROUP BY 1 ORDER BY 2 DESC LIMIT 15"

echo; echo "-- edge locations (rough geo; first 3 chars = IATA) --"
run "SELECT substr(x_edge_location,1,3), count(*) $W $HUMAN
     GROUP BY 1 ORDER BY 2 DESC LIMIT 12"

echo; echo "-- AI/LLM + crawler traffic (the AIO audience) --"
run "SELECT substr(cs_user_agent,1,60), count(*) $W
     AND regexp_like(cs_user_agent, '$BOTS')
     GROUP BY 1 ORDER BY 2 DESC LIMIT 12"

echo; echo "done."
