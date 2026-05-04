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

Here's the full content map.                                                            
                                                                                       
  Single source of truth: src/lib/site-content.ts                                         
  
  This is where most of the home-page editorial copy lives. Open it first.                
          
  ┌───────────────────────────────┬───────────────────────────────────────────────────┐   
  │             What              │                       Field                       │   
  ├───────────────────────────────┼───────────────────────────────────────────────────┤   
  │                               │ navLinks array — five items: CV / Talks /         │
  │ Top nav links                 │ Projects / Research / Press. Wordmark "Scott      │
  │                               │ Clark" links to / separately.                     │   
  ├───────────────────────────────┼───────────────────────────────────────────────────┤
  │ Editorial intro paragraph     │ lede template literal                             │   
  │ (right column under the name) │                                                   │
  ├───────────────────────────────┼───────────────────────────────────────────────────┤   
  │ One-line tight byline (under  │ byline template literal                           │
  │ the H1, above the lede)       │                                                   │
  ├───────────────────────────────┼───────────────────────────────────────────────────┤   
  │ Three bullets — Researcher /  │ bullets array of {label, html}                    │
  │ Founder / Operator            │                                                   │   
  ├───────────────────────────────┼───────────────────────────────────────────────────┤
  │ Experience rows               │                                                   │   
  │ (Distributional, Intel,       │ experience array of {period, org, title, body}    │
  │ SigOpt, Yelp)                 │                                                   │   
  ├───────────────────────────────┼───────────────────────────────────────────────────┤   
  │ Education rows (Cornell, OSU) │ education array of same shape                     │
  ├───────────────────────────────┼───────────────────────────────────────────────────┤   
  │ Home <title> and <meta        │ pageTitle, pageDescription                        │
  │ description>                  │                                                   │   
  └───────────────────────────────┴───────────────────────────────────────────────────┘
                                                                                          
  These fields use HTML inside template-literal strings — <strong> for bolded signals     
  (a16z, Two Sigma, paper counts), <em> for venue/deal names, <a href="..."> for inline
  links. Use &amp; instead of & and ' is fine inside backticks.                           
          
  Per-page map                           

  / — src/pages/index.astro                                                               
  
  - Tiny file. Just imports fonts + HomeContent + v2Theme.                                
  - All visible copy comes from site-content.ts (above) except the social-row handles
  (GitHub sc932, LinkedIn sc932, Scholar label, ORCID 0009-0007-0478-7129, X              
  @DrScottClark, email).
  - Social row markup lives in src/components/HomeContent.astro — search for <ul          
  class="socials">. Each row has the SVG icon + <span>handle</span>. Edit the <span> text 
  and href= to change handles or platforms.
  - Photo: public/images/scott-clark.jpg. Path referenced in HomeContent.astro as         
  /images/scott-clark.jpg.                                                                
                                         
  /cv — src/pages/cv.astro                                                                
          
  The CV-only sections are inline at the top of the file (lines ~9–145). Six arrays:      
  - awards — Forbes, Young Alumni, DOE CSGF, Sage Fellowship, NERSC, etc.
  - advisory — OMSI Board, OSU Board of Advisors, OSU Industry & Innovation Council       
  - focusAreas — flat dot-separated chip list (currently 20 entries)               
  - selectedPubs — 4 highlight publications                                               
  - selectedTalks — 5 highlight talks/podcasts                                            
                                                                                          
  The Experience and Education blocks on /cv reuse the same arrays from site-content.ts — 
  change there, both home and CV update. CV-only fields are inline so you can curate      
  independently. Page title and description are in the frontmatter at the very top.
                                                                                          
  /talks — src/pages/talks.astro
                                         
  - Page only contains the layout + sort. Talk content is one YAML file per talk in       
  src/content/talks/.
  - Schema (in src/content.config.ts): title, event, date, videoUrl?, slidesUrl?,         
  description. All strings except date (yaml date) and the optional URLs.                 
  - To add a talk: create a new .yaml in src/content/talks/. To remove: delete the file.
  To edit: edit the file. Sort order is automatic (newest first by date).                 
  - Page title / description are in the <PreviewBase> props at the top of talks.astro.
                                                                                          
  /projects — src/pages/projects.astro                                                    
                                         
  - One YAML per project in src/content/projects/. Currently: distributional.yaml,        
  sigopt.yaml, ale.yaml, velvetrope.yaml, moe.yaml.
  - Schema: title, description, url?, repo?, image?, tags[].                              
  - Sort order is manual — defined in projects.astro line 9 as const order =              
  ["distributional", "sigopt", "ale", "velvetrope"]. Anything not in that list goes       
  alphabetically at the end (currently MOE). Edit the array to reorder.                   
                                                                                          
  /publications — src/pages/publications.astro
                                         
  - One YAML per publication in src/content/publications/.
  - Schema: title, authors[], venue, year, url?, doi?, abstract?.
  - The authors[] array auto-bolds your name when it sees "Scott C. Clark" exactly — see  
  formatAuthors in publications.astro line 13. Variant spellings won't be bolded.         
  - Sort: descending by year, automatic.                       Here's the full content map.                                                            
                                                                                       
  Single source of truth: src/lib/site-content.ts                                         
  
  This is where most of the home-page editorial copy lives. Open it first.                
          
  ┌───────────────────────────────┬───────────────────────────────────────────────────┐   
  │             What              │                       Field                       │   
  ├───────────────────────────────┼───────────────────────────────────────────────────┤   
  │                               │ navLinks array — five items: CV / Talks /         │
  │ Top nav links                 │ Projects / Research / Press. Wordmark "Scott      │
  │                               │ Clark" links to / separately.                     │   
  ├───────────────────────────────┼───────────────────────────────────────────────────┤
  │ Editorial intro paragraph     │ lede template literal                             │   
  │ (right column under the name) │                                                   │
  ├───────────────────────────────┼───────────────────────────────────────────────────┤   
  │ One-line tight byline (under  │ byline template literal                           │
  │ the H1, above the lede)       │                                                   │
  ├───────────────────────────────┼───────────────────────────────────────────────────┤   
  │ Three bullets — Researcher /  │ bullets array of {label, html}                    │
  │ Founder / Operator            │                                                   │   
  ├───────────────────────────────┼───────────────────────────────────────────────────┤
  │ Experience rows               │                                                   │   
  │ (Distributional, Intel,       │ experience array of {period, org, title, body}    │
  │ SigOpt, Yelp)                 │                                                   │   
  ├───────────────────────────────┼───────────────────────────────────────────────────┤   
  │ Education rows (Cornell, OSU) │ education array of same shape                     │
  ├───────────────────────────────┼───────────────────────────────────────────────────┤   
  │ Home <title> and <meta        │ pageTitle, pageDescription                        │
  │ description>                  │                                                   │   
  └───────────────────────────────┴───────────────────────────────────────────────────┘
                                                                                          
  These fields use HTML inside template-literal strings — <strong> for bolded signals     
  (a16z, Two Sigma, paper counts), <em> for venue/deal names, <a href="..."> for inline
  links. Use &amp; instead of & and ' is fine inside backticks.                           
          
  Per-page map                           

  / — src/pages/index.astro                                                               
  
  - Tiny file. Just imports fonts + HomeContent + v2Theme.                                
  - All visible copy comes from site-content.ts (above) except the social-row handles
  (GitHub sc932, LinkedIn sc932, Scholar label, ORCID 0009-0007-0478-7129, X              
  @DrScottClark, email).
  - Social row markup lives in src/components/HomeContent.astro — search for <ul          
  class="socials">. Each row has the SVG icon + <span>handle</span>. Edit the <span> text 
  and href= to change handles or platforms.
  - Photo: public/images/scott-clark.jpg. Path referenced in HomeContent.astro as         
  /images/scott-clark.jpg.                                                                
                                         
  /cv — src/pages/cv.astro                                                                
          
  The CV-only sections are inline at the top of the file (lines ~9–145). Six arrays:      
  - awards — Forbes, Young Alumni, DOE CSGF, Sage Fellowship, NERSC, etc.
  - advisory — OMSI Board, OSU Board of Advisors, OSU Industry & Innovation Council       
  - focusAreas — flat dot-separated chip list (currently 20 entries)               
  - selectedPubs — 4 highlight publications                                               
  - selectedTalks — 5 highlight talks/podcasts                                            
                                                                                          
  The Experience and Education blocks on /cv reuse the same arrays from site-content.ts — 
  change there, both home and CV update. CV-only fields are inline so you can curate      
  independently. Page title and description are in the frontmatter at the very top.
                                                                                          
  /talks — src/pages/talks.astro
                                         
  - Page only contains the layout + sort. Talk content is one YAML file per talk in       
  src/content/talks/.
  - Schema (in src/content.config.ts): title, event, date, viHere's the full content map.                                                            
                                                                                       
  Single source of truth: src/lib/site-content.ts                                         
  
  This is where most of the home-page editorial copy lives. Open it first.                
          
  ┌───────────────────────────────┬───────────────────────────────────────────────────┐   
  │             What              │                       Field                       │   
  ├───────────────────────────────┼───────────────────────────────────────────────────┤   
  │                               │ navLinks array — five items: CV / Talks /         │
  │ Top nav links                 │ Projects / Research / Press. Wordmark "Scott      │
  │                               │ Clark" links to / separately.                     │   
  ├───────────────────────────────┼───────────────────────────────────────────────────┤
  │ Editorial intro paragraph     │ lede template literal                             │   
  │ (right column under the name) │                                                   │
  ├───────────────────────────────┼───────────────────────────────────────────────────┤   
  │ One-line tight byline (under  │ byline template literal                           │
  │ the H1, above the lede)       │                                                   │
  ├───────────────────────────────┼───────────────────────────────────────────────────┤   
  │ Three bullets — Researcher /  │ bullets array of {label, html}                    │
  │ Founder / Operator            │                                                   │   
  ├───────────────────────────────┼───────────────────────────────────────────────────┤
  │ Experience rows               │                                                   │   
  │ (Distributional, Intel,       │ experience array of {period, org, title, body}    │
  │ SigOpt, Yelp)                 │                                                   │   
  ├───────────────────────────────┼───────────────────────────────────────────────────┤   
  │ Education rows (Cornell, OSU) │ education array of same shape                     │
  ├───────────────────────────────┼───────────────────────────────────────────────────┤   
  │ Home <title> and <meta        │ pageTitle, pageDescription                        │
  │ description>                  │                                                   │   
  └───────────────────────────────┴───────────────────────────────────────────────────┘
                                                                                          
  These fields use HTML inside template-literal strings — <strong> for bolded signals     
  (a16z, Two Sigma, paper counts), <em> for venue/deal names, <a href="..."> for inline
  links. Use &amp; instead of & and ' is fine inside backticks.                           
          
  Per-page map                           

  / — src/pages/index.astro                                                               
  
  - Tiny file. Just imports fonts + HomeContent + v2Theme.                                
  - All visible copy comes from site-content.ts (above) except the social-row handles
  (GitHub sc932, LinkedIn sc932, Scholar label, ORCID 0009-0007-0478-7129, X              
  @DrScottClark, email).
  - Social row markup lives in src/components/HomeContent.astro — search for <ul          
  class="socials">. Each row has the SVG icon + <span>handle</span>. Edit the <span> text 
  and href= to change handles or platforms.
  - Photo: public/images/scott-clark.jpg. Path referenced in HomeContent.astro as         
  /images/scott-clark.jpg.                                                                
                                         
  /cv — src/pages/cv.astro                                                                
          
  The CV-only sections are inline at the top of the file (lines ~9–145). Six arrays:      
  - awards — Forbes, Young Alumni, DOE CSGF, Sage Fellowship, NERSC, etc.
  - advisory — OMSI Board, OSU Board of Advisors, OSU Industry & Innovation Council       
  - focusAreas — flat dot-separated chip list (currently 20 entries)               
  - selectedPubs — 4 highlight publications                                               
  - selectedTalks — 5 highlight talks/podcasts                                            
                                                                                          
  The Experience and Education blocks on /cv reuse the same arrays from site-content.ts — 
  change there, both home and CV update. CV-only fields are inline so you can curate      
  independently. Page title and description are in the frontmatter at the very top.
                                                                                          
  /talks — src/pages/talks.astro
                                         
  - Page only contains the layout + sort. Talk content is one YAML file per talk in       
  src/content/talks/.
  - Schema (in src/content.config.ts): title, event, date, videoUrl?, slidesUrl?,         
  description. All strings except date (yaml date) and the optional URLs.                 
  - To add a talk: create a new .yaml in src/content/talks/. To remove: delete the file.
  To edit: edit the file. Sort order is automatic (newest first by date).                 
  - Page title / description are in the <PreviewBase> props at the top of talks.astro.
                                                                                          
  /projects — src/pages/projects.astro                                                    
                                         
  - One YAML per project in src/content/projects/. Currently: distributional.yaml,        
  sigopt.yaml, ale.yaml, velvetrope.yaml, moe.yaml.
  - Schema: title, description, url?, repo?, image?, tags[].                              
  - Sort order is manual — defined in projects.astro line 9 as const order =              
  ["distributional", "sigopt", "ale", "velvetrope"]. Anything not in that list goes       
  alphabetically at the end (currently MOE). Edit the array to reorder.                   
                                                                                          
  /publications — src/pages/publications.astro
                                         
  - One YAML per publication in src/content/publications/.
  - Schema: title, authors[], venue, year, url?, doi?, abstract?.
  - The authors[] array auto-bolds your name when it sees "Scott C. Clark" exactly — see  
  formatAuthors in publications.astro line 13. Variant spellings won't be bolded.         
  - Sort: descending by year, automatic.                                                  
  - Top-of-page note (the "1,200+ citations / h-index 16" line) is in the .page-head      
  markup of publications.astro.                                                           
                                                                                          
  /press — src/pages/press.astro                                                          
                                         
  - One YAML per article in src/content/articles/.                                        
  - Schema: title, publication, date, url, excerpt?.
  - Sort: descending by date, automatic.                                                  
          
  Shared chrome (every page)                                                              
          
  Masthead — wordmark "Scott Clark" + nav                                                 
  
  src/components/SiteLayout.astro. Wordmark is hardcoded; nav links come from navLinks in 
  site-content.ts.
                                                                                          
  Endnote / footer                                                                        
                                         
  Bottom of src/components/SiteLayout.astro — search for <footer class="endnotes">.       
  Currently:
  Bottom of src/components/SiteLayout.astro — search for <footer class="endnotes">.
  Currently:

  ▎ Resume: PDF · Source: github.com/sc932/resume
  ▎ © 2026 Scott Clark

  Edit text or links directly here.

  Resume PDF

  Lives at public/resume/scott-clark-resume.pdf. Drop in a new file with the same name to
  update — no code change needed. (Per CLAUDE.md, don't edit the PDF in place; rebuild
  from ~/dev/resume/ScottClarkResume.tex and re-copy.)

  Theme colors and fonts

  src/lib/site-theme.ts exports v2Theme. Edit hex values to shift the palette site-wide.

  VSCode-specific tips

  - Open the workspace at ~/dev/scottclarkio/ so paths resolve.
  - TypeScript will autocomplete the content schemas if you hover/Cmd+click into
  content.config.ts.
  - After editing YAML or .ts, the dev server hot-reloads at localhost:4321; you usually
  don't need to restart it.
  - If you add a YAML file with a malformed date or missing required field, Astro will
  throw at the dev URL with a clear error message — useful as a fast schema check.
 reorder.                   
                                                                                          
  /publications — src/pages/publications.astro
                                         
  - One YAML per publication in src/content/publications/.
  - Schema: title, authors[], venue, year, url?, doi?, abstract?.
  - The authors[] array auto-bolds your name when it sees "Scott C. Clark" exactly — see  
  formatAuthors in publications.astro line 13. Variant spellings won't be bolded.         
  - Sort: descending by year, automatic.                                                  
  - Top-of-page note (the "1,200+ citations / h-index 16" line) is in the .page-head      
  markup of publications.astro.                                                           
                                                                                          
  /press — src/pages/press.astro                                                          
                                         
  - One YAML per article in src/content/articles/.                                        
  - Schema: title, publication, date, url, excerpt?.
  - Sort: descending by date, automatic.                                                  
          
  Shared chrome (every page)                                                              
          
  Masthead — wordmark "Scott Clark" + nav                                                 
  
  src/components/SiteLayout.astro. Wordmark is hardcoded; nav links come from navLinks in 
  site-content.ts.
                                                                                          
  Endnote / footer                                                                        
                                         
  Bottom of src/components/SiteLayout.astro — search for <footer class="endnotes">.       
  Currently:
  Bottom of src/components/SiteLayout.astro — search for <footer class="endnotes">.
  Currently:

  ▎ Resume: PDF · Source: github.com/sc932/resume
  ▎ © 2026 Scott Clark

  Edit text or links directly here.

  Resume PDF

  Lives at public/resume/scott-clark-resume.pdf. Drop in a new file with the same name to
  update — no code change needed. (Per CLAUDE.md, don't edit the PDF in place; rebuild
  from ~/dev/resume/ScottClarkResume.tex and re-copy.)

  Theme colors and fonts

  src/lib/site-theme.ts exports v2Theme. Edit hex values to shift the palette site-wide.

  VSCode-specific tips

  - Open the workspace at ~/dev/scottclarkio/ so paths resolve.
  - TypeScript will autocomplete the content schemas if you hover/Cmd+click into
  content.config.ts.
  - After editing YAML or .ts, the dev server hot-reloads at localhost:4321; you usually
  don't need to restart it.
  - If you add a YAML file with a malformed date or missing required field, Astro will
  throw at the dev URL with a clear error message — useful as a fast schema check.
                        
  
  src/components/SiteLayout.astro. Wordmark is hardcoded; nav links come from navLinks in 
  site-content.ts.
                                                                                          
  Endnote / footer                                                                        
                                         
  Bottom of src/components/SiteLayout.astro — search for <footer class="endnotes">.       
  Currently:
  Bottom of src/components/SiteLayout.astro — search for <footer class="endnotes">.
  Currently:

  ▎ Resume: PDF · Source: github.com/sc932/resume
  ▎ © 2026 Scott Clark

  Edit text or links directly here.

  Resume PDF

  Lives at public/resume/scott-clark-resume.pdf. Drop in a new file with the same name to
  update — no code change needed. (Per CLAUDE.md, don't edit the PDF in place; rebuild
  from ~/dev/resume/ScottClarkResume.tex and re-copy.)

  Theme colors and fonts

  src/lib/site-theme.ts exports v2Theme. Edit hex values to shift the palette site-wide.

  VSCode-specific tips

  - Open the workspace at ~/dev/scottclarkio/ so paths resolve.
  - TypeScript will autocomplete the content schemas if you hover/Cmd+click into
  content.config.ts.
  - After editing YAML or .ts, the dev server hot-reloads at localhost:4321; you usually
  don't need to restart it.
  - If you add a YAML file with a malformed date or missing required field, Astro will
  throw at the dev URL with a clear error message — useful as a fast schema check.


## License

Code is [MIT licensed](LICENSE). Content (blog posts, publications, images) is copyright Scott Clark, all rights reserved.
