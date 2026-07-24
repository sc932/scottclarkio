#!/usr/bin/env bash
# One-time (idempotent) Athena setup for CloudFront access-log analytics.
# Creates database `sitelogs` + table `sitelogs.cf_access` over the log
# bucket this repo's terraform/logging.tf delivers into. Safe to re-run.
#
# Usage:  ./scripts/athena-setup.sh
# Then:   ./scripts/analytics-report.sh [DAYS]
#
# The DDL is the AWS-documented schema for CloudFront STANDARD (legacy v1)
# logs — tab-separated, 33 fields, 2 header lines. Committed here because
# the talaria-site original was created ad-hoc (2026-07-05) and never
# landed in a repo; the table setup must be reproducible per account.
set -euo pipefail

SITE="scottclark.io"
LOGS_BUCKET="scottclarkio-site-logs"
# No named profile: this account rides the `aws login` credential
# bridge (ambient env). --profile is added only when AWS_PROFILE is set.
PROFILE_ARGS=()
[[ -n "${AWS_PROFILE:-}" ]] && PROFILE_ARGS=(--profile "$AWS_PROFILE")
OUT="s3://${LOGS_BUCKET}/athena-results/"

run() { # $1 = sql
  local qid state
  qid=$(aws athena start-query-execution "${PROFILE_ARGS[@]}" \
    --query-string "$1" \
    --result-configuration "OutputLocation=$OUT" \
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
}

echo "creating database sitelogs (idempotent) ..."
run "CREATE DATABASE IF NOT EXISTS sitelogs"

echo "creating table sitelogs.cf_access over s3://${LOGS_BUCKET}/cf/ ..."
run "CREATE EXTERNAL TABLE IF NOT EXISTS sitelogs.cf_access (
  \`date\` DATE,
  time STRING,
  x_edge_location STRING,
  sc_bytes BIGINT,
  c_ip STRING,
  cs_method STRING,
  cs_host STRING,
  cs_uri_stem STRING,
  sc_status INT,
  cs_referer STRING,
  cs_user_agent STRING,
  cs_uri_query STRING,
  cs_cookie STRING,
  x_edge_result_type STRING,
  x_edge_request_id STRING,
  x_host_header STRING,
  cs_protocol STRING,
  cs_bytes BIGINT,
  time_taken FLOAT,
  x_forwarded_for STRING,
  ssl_protocol STRING,
  ssl_cipher STRING,
  x_edge_response_result_type STRING,
  cs_protocol_version STRING,
  fle_status STRING,
  fle_encrypted_fields INT,
  c_port INT,
  time_to_first_byte FLOAT,
  x_edge_detailed_result_type STRING,
  sc_content_type STRING,
  sc_content_len BIGINT,
  sc_range_start BIGINT,
  sc_range_end BIGINT
)
ROW FORMAT DELIMITED FIELDS TERMINATED BY '\t'
LOCATION 's3://${LOGS_BUCKET}/cf/'
TBLPROPERTIES ('skip.header.line.count'='2')"

echo "sanity: row count over the last 7 days ..."
run "SELECT count(*) FROM sitelogs.cf_access WHERE \"date\" > current_date - interval '7' day"

echo "done — ${SITE} analytics ready; run ./scripts/analytics-report.sh"
