# CLAUDE.md — scottclark.io

Project conventions and best practices for AI-assisted development.

## Project Overview

Personal website for Scott Clark hosted at scottclark.io. Static site built with Astro 5, styled with Tailwind CSS v4, deployed to AWS S3 + CloudFront.

## Tech Stack

- **Astro 5** — static site generator
- **Tailwind CSS v4** — utility-first CSS (via @tailwindcss/vite plugin)
- **MDX** — Markdown with embedded Astro components (blog posts)
- **TypeScript** — strict mode
- **AWS S3 + CloudFront** — static hosting and CDN
- **GitHub Actions** — CI/CD on push to main

## Project Structure

```
src/
  components/     Reusable .astro components
  content/        Content collections (blog/, publications/, talks/, articles/, projects/)
  content.config.ts  Collection schemas (zod)
  layouts/        Page layouts (BaseLayout, PageLayout, BlogPostLayout)
  pages/          Route pages (file-based routing)
  styles/         Global CSS (Tailwind imports + custom styles)
public/           Static assets (images, resume PDF, favicon)
scripts/          Shell scripts (deploy, new-post)
```

## Commands

```bash
npm run dev        # Start dev server (localhost:4321)
npm run build      # Build static site to dist/
npm run preview    # Preview built site locally
npm run deploy     # Build and deploy to AWS
npm run new-post -- "Title"  # Create a new blog post
```

## Content Conventions

### Blog Posts
- Location: `src/content/blog/<slug>.mdx`
- Format: MDX with YAML frontmatter
- Required frontmatter: title, description, date
- Set `draft: true` to hide from production
- Use `npm run new-post -- "Title"` to scaffold

### Structured Content (publications, talks, articles, projects)
- Location: `src/content/<type>/<name>.yaml`
- One YAML file per entry
- Schemas defined in `src/content.config.ts`

## Coding Standards

- Use Astro components (.astro) for all UI — no React/Vue unless interactivity requires it
- Keep pages thin: fetch data, pass to components
- All content types have typed schemas in content.config.ts — update schema when adding fields
- Use Tailwind utility classes directly in templates
- Custom CSS goes in `src/styles/global.css` only when Tailwind utilities are insufficient
- Follow the existing design system: use `--color-accent`, `--color-surface`, `--color-text-*` theme variables
- Images go in `public/images/` for static assets or reference URLs for external images

## Design System

Theme colors (defined in `src/styles/global.css` via `@theme`):
- `accent` / `accent-light` / `accent-dark` — primary brand color (sky blue)
- `surface` / `surface-light` / `surface-lighter` — background layers (dark navy)
- `text-primary` / `text-secondary` / `text-muted` — text hierarchy

Typography: Inter font family, bold headings, generous spacing.

## Deployment

- **Auto**: Push to `main` triggers GitHub Actions → build → S3 sync → CloudFront invalidation
- **Manual**: `npm run deploy` (requires AWS CLI configured + `.env` with S3_BUCKET and CLOUDFRONT_DISTRIBUTION_ID)

## Do NOT

- Add client-side JavaScript unless absolutely necessary (Astro islands only)
- Use server-side rendering — this is a fully static site
- Commit `.env` files or AWS credentials
- Modify the LICENSE structure (dual MIT/copyright)
- Remove the CHANGELOG.md tracking
