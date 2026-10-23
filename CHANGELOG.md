# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Cross-link gate v2 (`scripts/check-crosslinks.mjs`, 2026-10-23): two rule classes join the property rules — `bare-path` (static: a site-internal path as visible prose fails outright; a path is never link text) and `post:<slug>` (derived from the built post pages: a page naming a post by its JSON-LD headline, or a recap's headline minus its "(… recap)" qualifier, in any case, must link it by that title at least once on the page, as anchor text; the hyphenated slug as prose fails too). Read-next cards are out of scope. The gate self-tests its matcher and page semantics before every run. Founding incident: `/talks` showed its two recap posts as bare `/blog/<slug>` text. Reviewed by an eight-seat cross-model round (vault record `Writing/_reviews/scottclarkio-linkgate-2026-10-23/`).
- Talks collection: `recap: <blog-slug>` (schema + `src/lib/talks.ts`). The `/talks` row renders "Recap: <post title>" linked, the JSON-LD `PresentationDigitalDocument` carries `subjectOf` → the post's `BlogPosting` node, and the `.md` twin carries the same markdown link; a slug that is not a published post fails the build.
- Talk-recap post format, first instance `better-evals-abundance` (published 2026-08-31): video facade with self-hosted poster, slide-by-slide walkthrough as plain markdown images under lesson-sentence h3s, downloadable slides PDF at /slides/, companion talks-collection entry. Estate contract: vault blog-grammar.md § Talk-recap format.
- `YouTubeFacade` `posterSrc` prop + `videoPoster` blog schema field: self-hosted posters (lane-open requirement).

### Changed
- `scripts/deploy.sh` (manual deploy) now runs the AIO gate before the cross-link gate, matching CI (it had skipped it).
- The talks `.md` twin renders the Slides link absolute, like the Recap link beside it.
- The two recap-bearing talk entries (Agentic AI Summit 2026, OSU AI+Science Seminar 2026) moved their recap reference from a bare path in the description to the structured `recap` field.
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
