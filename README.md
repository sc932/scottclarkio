# scottclark.io

Personal website for Scott Clark. Built with [Astro](https://astro.build), styled with [Tailwind CSS](https://tailwindcss.com), hosted on AWS (S3 + CloudFront).

## Prerequisites

- Node.js 22+ (see `.nvmrc`; use `nvm use` if you have nvm installed)

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (http://localhost:4321)
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

## Writing Blog Posts

```bash
# Create a new blog post
npm run new-post -- "My Post Title"

# This creates src/content/blog/my-post-title.mdx with frontmatter template
# Edit the file, set draft: false, commit, and push to publish
```

Blog posts are MDX files in `src/content/blog/`. They support standard Markdown plus embedded Astro components.

### Frontmatter

```yaml
---
title: "Post Title"
description: "A brief description for SEO and previews"
date: 2026-02-27
tags: ["tag1", "tag2"]
image: "/images/post-image.jpg"  # optional
draft: false                      # set true to hide from production
---
```

## Adding Other Content

Content is organized into typed collections in `src/content/`:

| Directory | Format | Description |
|-----------|--------|-------------|
| `blog/` | `.mdx` | Blog posts (Markdown + components) |
| `publications/` | `.yaml` | Research papers and academic work |
| `talks/` | `.yaml` | Conference talks and presentations |
| `articles/` | `.yaml` | Press mentions and articles about you |
| `projects/` | `.yaml` | Projects and open source work |

See example files in each directory for the required schema.

## Deployment

### Automatic (GitHub Actions)

Push to `main` → GitHub Actions builds and deploys to S3 + CloudFront.

**Required GitHub Secrets:**

| Secret | Description |
|--------|-------------|
| `AWS_ROLE_ARN` | IAM role ARN for GitHub OIDC (recommended over access keys) |
| `S3_BUCKET` | S3 bucket name (e.g., `scottclark.io`) |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID |

### Manual

```bash
# Copy .env.example and fill in your values
cp .env.example .env

# Deploy (builds + syncs to S3 + invalidates CloudFront)
npm run deploy
```

## AWS Setup

One-time infrastructure setup:

### 1. S3 Bucket

```bash
aws s3 mb s3://scottclark.io --region us-east-1
```

Enable static website hosting (or use CloudFront origin access control).

### 2. CloudFront Distribution

- Origin: S3 bucket
- Alternate domain: `scottclark.io`, `www.scottclark.io`
- SSL: ACM certificate (must be in us-east-1)
- Default root object: `index.html`
- Custom error responses: 404 → `/404.html`

### 3. Route 53

- Create hosted zone for `scottclark.io`
- A record → alias to CloudFront distribution
- AAAA record → alias to CloudFront distribution (IPv6)

### 4. ACM Certificate

```bash
aws acm request-certificate \
  --domain-name scottclark.io \
  --subject-alternative-names "*.scottclark.io" \
  --validation-method DNS \
  --region us-east-1
```

Validate via DNS (add CNAME records to Route 53).

### 5. GitHub OIDC (for Actions)

Create an IAM role with:
- Trust policy: GitHub OIDC provider for your repo
- Permissions: `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket`, `cloudfront:CreateInvalidation`

## Project Structure

```
src/
  components/     Reusable UI components (.astro)
  content/        Content collections (blog, publications, talks, articles, projects)
  content.config.ts  Content collection schemas
  layouts/        Page layouts
  pages/          Routes (file-based routing)
  styles/         Global CSS
public/           Static assets (images, resume, favicon)
scripts/          Shell scripts (deploy, new-post)
```

## License

Code is [MIT licensed](LICENSE). Content (blog posts, publications, images) is copyright Scott Clark, all rights reserved.
