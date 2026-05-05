# scottclark.io

Personal website for Scott Clark. Built with [Astro](https://astro.build), hosted on AWS (S3 + CloudFront).

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
| `patents/` | `.yaml` | Granted US patents as named inventor |

See example files in each directory for the required schema.

## Deployment

All AWS infrastructure is provisioned by `terraform/`. Once that's applied, every push to `main` auto-deploys via `.github/workflows/` (build → S3 sync → CloudFront invalidate).

**The ACM cert, S3 bucket, CloudFront distribution, Route 53 alias records, and GitHub OIDC IAM role are all created by Terraform — no separate aws CLI commands.** See `terraform/README.md` for the per-resource breakdown.

### First-time AWS provisioning (one-time, ~30 minutes)

This assumes the Route 53 hosted zone for `scottclark.io` already exists with MX/TXT/CNAME records mirrored from the previous registrar, and the registrar's nameservers point at Route 53.

**1. Confirm the new nameservers have propagated.** Don't run Terraform until at least one major resolver shows the AWS nameservers (otherwise ACM cert validation will sit and retry):

```bash
dig +short scottclark.io NS @8.8.8.8
dig +short scottclark.io NS @1.1.1.1
# Expect 4 × ns-XXXX.awsdns-XX.{com,net,org,co.uk}; not iwantmyname.net
```

**2. Install Terraform** (≥ 1.7) if not present:

```bash
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform
terraform version
```

**3. Apply.** From the repo root:

```bash
cd terraform/
terraform init      # downloads providers, generates .terraform.lock.hcl (commit it)
terraform plan      # ~20 resources to add, review the diff
terraform apply
```

Wall-clock 15–30 minutes. The slow steps:
- `aws_acm_certificate_validation`: waits for ACM to validate the DNS-01 challenge against Route 53 (5–15 min after NS propagation).
- `aws_cloudfront_distribution`: waits for the distribution to deploy globally (10–20 min).

If you see `aws_iam_openid_connect_provider.github: already exists` because another project already added the GitHub OIDC provider in this AWS account, import it instead:

```bash
terraform import aws_iam_openid_connect_provider.github \
  arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):oidc-provider/token.actions.githubusercontent.com
terraform apply
```

**4. Push the three Terraform outputs into GitHub Actions secrets.** Still inside `terraform/`:

```bash
gh secret set AWS_ROLE_ARN -b "$(terraform output -raw github_secret_AWS_ROLE_ARN)"
gh secret set S3_BUCKET    -b "$(terraform output -raw github_secret_S3_BUCKET)"
gh secret set CLOUDFRONT_DISTRIBUTION_ID -b "$(terraform output -raw github_secret_CLOUDFRONT_DISTRIBUTION_ID)"
```

(Or paste them via the UI at `https://github.com/sc932/scottclarkio/settings/secrets/actions`.)

**5. Trigger the first deploy.** Either commit + push to `main`, or kick the workflow directly:

```bash
cd ..
gh workflow run "Build & Deploy"
gh run watch
```

**6. Verify.** When the workflow shows green:

```bash
curl -sI https://scottclark.io                # 200, TLS via ACM, HSTS header
curl -sI https://www.scottclark.io            # 301 → https://scottclark.io/
curl -sI https://scottclark.io/about          # 301 → https://scottclark.io/
curl -s  https://scottclark.io/llms.txt | head
curl -s  https://scottclark.io/sitemap-index.xml
```

Optional — confirm structured data + cards:
- [Google Rich Results Test](https://search.google.com/test/rich-results) on `https://scottclark.io/`
- [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/) for OG cards
- [Twitter Card validator](https://cards-dev.twitter.com/validator) (if still up) or just paste in a tweet

### Ongoing deploys

Push to `main`. The workflow builds (`npm run build`), syncs `dist/` to S3 with the right Cache-Control headers, and invalidates `/*` on CloudFront. Done.

### Manual deploy (fallback)

If GitHub Actions is unavailable, you can deploy from a local AWS-CLI-authed shell:

```bash
cp .env.example .env
# Set S3_BUCKET=scottclark.io and CLOUDFRONT_DISTRIBUTION_ID=<from `terraform output`>
npm run deploy
```

### Tearing down

`terraform destroy` from `terraform/`. Bucket versioning blocks delete until you empty the versioned objects:

```bash
cd terraform/
aws s3api delete-objects --bucket scottclark.io --delete "$(aws s3api list-object-versions \
  --bucket scottclark.io --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}')"
aws s3api delete-objects --bucket scottclark.io --delete "$(aws s3api list-object-versions \
  --bucket scottclark.io --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}')"
terraform destroy
```

CloudFront distribution disable + delete takes ~30 minutes; that's the long pole.

### Cost expectations

~$0.50–$2/month. Route 53 hosted zone $0.50; CloudFront free tier covers 1TB egress; S3 pennies; ACM free; IAM/OIDC free.

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

## Editing Guide

This is where most of the home-page editorial copy lives. Open `src/lib/site-content.ts` first.

### Single source of truth: `src/lib/site-content.ts`

| What | Field |
|---|---|
| Top nav links | `navLinks` array — five items: CV / Talks / Projects / Research / Press. The "Scott Clark" wordmark links to `/` separately. |
| One-line tight byline (under the H1, above the lede) | `byline` template literal |
| Editorial intro paragraph (right column under the name) | `lede` template literal |
| Three bullets — Researcher / Founder / Operator | `bullets` array of `{label, html}` |
| Experience rows (Distributional, Intel, SigOpt, Yelp) | `experience` array of `{period, org, title, body}` |
| Education rows (Cornell, OSU) | `education` array of same shape |
| Home `<title>` and `<meta description>` | `pageTitle`, `pageDescription` |

These fields use HTML inside template-literal strings — `<strong>` for bolded signals (a16z, Two Sigma, paper counts), `<em>` for venue/deal names, `<a href="...">` for inline links. Use `&amp;` instead of `&`; `'` is fine inside backticks.

### Per-page map

#### `/` — `src/pages/index.astro`

- Tiny file. Just imports fonts + `HomeContent` + `v2Theme`.
- All visible copy comes from `site-content.ts` (above) except the social-row handles (GitHub `sc932`, LinkedIn `sc932`, Scholar label, ORCID `0009-0007-0478-7129`, X `@DrScottClark`, email).
- Social row markup lives in `src/components/HomeContent.astro` — search for `<ul class="socials">`. Each row has the SVG icon + `<span>handle</span>`. Edit the `<span>` text and `href=` to change handles or platforms.
- Photo: `public/images/scott-clark.jpg`. Path referenced in `HomeContent.astro` as `/images/scott-clark.jpg`.

#### `/cv` — `src/pages/cv.astro`

The CV-only sections are inline at the top of the file (lines ~9–145). Six arrays:

- `awards` — Forbes, Young Alumni, DOE CSGF, Sage Fellowship, NERSC, etc.
- `advisory` — OMSI Board, OSU Board of Advisors, OSU Industry & Innovation Council
- `focusAreas` — flat dot-separated chip list (currently 20 entries)
- `selectedPubs` — 4 highlight publications
- `selectedTalks` — 5 highlight talks/podcasts

The Experience and Education blocks on `/cv` reuse the same arrays from `site-content.ts` — change there, both home and CV update. CV-only fields are inline so you can curate independently. Page title and description are in the frontmatter at the very top.

#### `/talks` — `src/pages/talks.astro`

- Page only contains the layout + sort. Talk content is one YAML file per talk in `src/content/talks/`.
- Schema (in `src/content.config.ts`): `title`, `event`, `date`, `videoUrl?`, `slidesUrl?`, `description`. All strings except `date` (yaml date) and the optional URLs.
- To add a talk: create a new `.yaml` in `src/content/talks/`. To remove: delete the file. To edit: edit the file. Sort order is automatic (newest first by date).
- Page title / description are in the `<PreviewBase>` props at the top of `talks.astro`.

#### `/projects` — `src/pages/projects.astro`

This page renders two sections: **Projects** and **Patents**.

**Projects.** One YAML per project in `src/content/projects/`. Currently: `distributional.yaml`, `sigopt.yaml`, `ale.yaml`, `moe.yaml`, `yelp-dataset-challenge.yaml`, `resume.yaml`.
- Schema: `title`, `description`, `url?`, `repo?`, `image?`, `tags[]`.
- Sort order is manual — defined in `projects.astro` near the top as a `const order` array. Anything not in that list goes alphabetically at the end. Edit the array to reorder.

**Patents.** One YAML per granted US patent in `src/content/patents/`. ~20+ entries; filenames follow `us-<number>-<short-name>.yaml`.
- Schema: `title`, `patentNumber` (e.g., `"US 12,505,027"`), `date` (yaml date), `inventors[]`, `url?`, `abstract?`.
- Sort: descending by date, automatic.
- Most patents in the dossier are catalogued at year-level granularity only — entries currently use Jan 1 of the issuance year as a placeholder date. Update `date` to the actual issuance date when verified against patents.google.com.

#### `/publications` — `src/pages/publications.astro`

- One YAML per publication in `src/content/publications/`.
- Schema: `title`, `authors[]`, `venue`, `year`, `url?`, `doi?`, `abstract?`.
- The `authors[]` array auto-bolds your name when it sees `Scott C. Clark` exactly — see `formatAuthors` in `publications.astro` line 13. Variant spellings won't be bolded.
- Sort: descending by year, automatic.
- Top-of-page note (the "1,200+ citations / h-index 16" line) is in the `.page-head` markup of `publications.astro`.

#### `/press` — `src/pages/press.astro`

- One YAML per article in `src/content/articles/`.
- Schema: `title`, `publication`, `date`, `url`, `excerpt?`.
- Sort: descending by date, automatic.

### Shared chrome (every page)

**Masthead** — wordmark "Scott Clark" + nav. `src/components/SiteLayout.astro`. Wordmark is hardcoded; nav links come from `navLinks` in `site-content.ts`.

**Endnote / footer** — bottom of `src/components/SiteLayout.astro`, search for `<footer class="endnotes">`. Currently:

> Resume: PDF · Source: github.com/sc932/resume
> © 2026 Scott Clark

Edit text or links directly here.

**Resume PDF** — lives at `public/resume/scott-clark-resume.pdf`. Drop in a new file with the same name to update — no code change needed. (Per `CLAUDE.md`, don't edit the PDF in place; rebuild from `~/dev/resume/ScottClarkResume.tex` and re-copy.)

**Theme colors and fonts** — `src/lib/site-theme.ts` exports `v2Theme`. Edit hex values to shift the palette site-wide.

### VSCode-specific tips

- Open the workspace at `~/dev/scottclarkio/` so paths resolve.
- TypeScript will autocomplete the content schemas if you hover/Cmd+click into `content.config.ts`.
- After editing YAML or `.ts`, the dev server hot-reloads at `localhost:4321`; you usually don't need to restart it.
- If you add a YAML file with a malformed date or missing required field, Astro will throw at the dev URL with a clear error message — useful as a fast schema check.

## License

Code is [MIT licensed](LICENSE). Content (blog posts, publications, images) is copyright Scott Clark, all rights reserved.
