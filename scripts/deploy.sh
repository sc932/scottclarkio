#!/usr/bin/env bash
set -euo pipefail

# Deploy scottclark.io to AWS S3 + CloudFront
#
# Prerequisites:
#   - AWS CLI configured with credentials (aws configure)
#   - S3_BUCKET and CLOUDFRONT_DISTRIBUTION_ID set in .env or exported
#
# Usage:
#   npm run deploy
#   # or
#   bash scripts/deploy.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env if it exists
if [ -f "$PROJECT_DIR/.env" ]; then
  set -a
  source "$PROJECT_DIR/.env"
  set +a
fi

# Required env vars
: "${S3_BUCKET:?Error: S3_BUCKET is not set. Export it or add to .env}"
: "${CLOUDFRONT_DISTRIBUTION_ID:?Error: CLOUDFRONT_DISTRIBUTION_ID is not set. Export it or add to .env}"

echo "==> Building site..."
cd "$PROJECT_DIR"
npm run build

echo "==> Syncing to S3 (s3://$S3_BUCKET)..."
aws s3 sync dist/ "s3://$S3_BUCKET" \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "*.html" \
  --exclude "*.xml" \
  --exclude "*.json"

# HTML and dynamic files get shorter cache
aws s3 sync dist/ "s3://$S3_BUCKET" \
  --cache-control "public, max-age=3600, must-revalidate" \
  --include "*.html" \
  --include "*.xml" \
  --include "*.json" \
  --exclude "*" \
  --content-type "text/html" \
  --no-guess-mime-type

echo "==> Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
  --paths "/*" \
  --query "Invalidation.Id" \
  --output text

echo "==> Deploy complete! Site will be live shortly at https://scottclark.io"
