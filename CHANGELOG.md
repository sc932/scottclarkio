# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Talk-recap post format, first instance `better-evals-abundance` (DRAFT: videoId/date/slide-render/PDF placeholders — replace via the vault piece note's deploy checklist before this ever lands on main): video facade with self-hosted poster, slide-by-slide walkthrough as plain markdown images under lesson-sentence h3s, downloadable slides PDF at /slides/, companion talks-collection entry. Estate contract: vault blog-grammar.md § Talk-recap format.
- `YouTubeFacade` `posterSrc` prop + `videoPoster` blog schema field: self-hosted posters (lane-open requirement).

### Changed
- VIDEO LANE OPENED (2026-08-06): feed-safe facade rewrite in `rss.xml.ts` `feedifyHtml` (facade div -> anchor-wrapped absolutized poster; script strip); `aio-check` `VIDEO_LANE_OPEN = true` with inverted teeth — no i.ytimg.com hotlinks on post pages, every local `<img>` must exist in dist, published video posts must embed the facade.

## [1.0.0] - 2026-02-27

### Added
- Initial project setup with Astro 5, Tailwind CSS v4, and MDX
- Landing page with hero section, recent posts, and project highlights
- About page with bio, experience, education, and skills sections
- Publications page with year-grouped publication cards
- Talks page with embedded video support
- Press page for articles and media mentions
- Projects page with card-based project showcase
- Blog with MDX support and content collection
- Responsive navigation with mobile menu
- SEO meta tags and Open Graph support
- GitHub Actions CI/CD pipeline for auto-deploy to AWS
- Manual deploy script (scripts/deploy.sh)
- New blog post scaffolding script (scripts/new-post.sh)
- Content collection schemas for blog, publications, talks, articles, projects
- Example content for all collection types
- Dual license: MIT for code, All Rights Reserved for content
- CLAUDE.md with project conventions
- README.md with complete setup and usage guide
