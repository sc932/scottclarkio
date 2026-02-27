#!/usr/bin/env bash
set -euo pipefail

# Create a new blog post with frontmatter template
#
# Usage:
#   npm run new-post -- "My Post Title"
#   # or
#   bash scripts/new-post.sh "My Post Title"

if [ -z "${1:-}" ]; then
  echo "Usage: $0 \"Post Title\""
  echo "Example: $0 \"My Thoughts on Static Sites\""
  exit 1
fi

TITLE="$1"
DATE=$(date +%Y-%m-%d)
# Convert title to slug: lowercase, replace spaces with hyphens, remove non-alphanumeric
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//')

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
POST_DIR="$PROJECT_DIR/src/content/blog"
POST_FILE="$POST_DIR/$SLUG.mdx"

if [ -f "$POST_FILE" ]; then
  echo "Error: Post already exists at $POST_FILE"
  exit 1
fi

cat > "$POST_FILE" << EOF
---
title: "$TITLE"
description: ""
date: $DATE
tags: []
draft: true
---

Write your post here.
EOF

echo "Created new post: $POST_FILE"
echo ""
echo "Next steps:"
echo "  1. Edit the post: $POST_FILE"
echo "  2. Fill in the description and tags"
echo "  3. Set draft: false when ready to publish"
echo "  4. Commit and push to deploy"
