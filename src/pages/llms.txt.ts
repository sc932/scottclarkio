// /llms.txt — index for LLMs per the llmstxt.org spec.
// This is the "discovery" file: short site description + links to canonical
// page-by-page markdown. The full corpus lives at /llms-full.txt.

import type { APIRoute } from "astro";
import { siteUrl } from "../lib/site-content";
import { getPublishedPosts, postUrl } from "../lib/blog";

export const GET: APIRoute = async () => {
  const posts = await getPublishedPosts();
  const writingSection = posts.length
    ? `\n## Writing\n\nEssays by Scott Clark (index: [${siteUrl}/blog](${siteUrl}/blog); markdown twin: [${siteUrl}/blog.md](${siteUrl}/blog.md)); every post has a plain-markdown twin (linked below) and ships in the full-content RSS feed at ${siteUrl}/rss.xml.\n\n${posts
        .map((p) => `- [${p.data.title}](${postUrl(p)}.md): ${p.data.description}`)
        .join("\n")}\n`
    : "";
  const txt = `# Scott Clark

> Co-founder and CEO of Distributional (enterprise AI reliability). Previously co-founder & CEO of SigOpt (acquired by Intel 2020); VP & GM of AI and HPC supercomputing at Intel through 2023. PhD Applied Mathematics, Cornell University.

This site is the canonical reference for Scott Clark's professional bio, work history, publications, talks, projects, and patents. Every page has a plain-markdown twin for direct LLM ingestion (linked below). For one-shot ingestion, see [llms-full.txt](${siteUrl}/llms-full.txt).

## Pages

- [Home](${siteUrl}/index.md): Short bio, three-bullet summary (researcher / founder / operator), experience, education, social links
- [CV](${siteUrl}/cv.md): Long-form academic CV — education, executive & industry experience, research practicums, awards, advisory, focus areas, selected publications and talks
- [Talks](${siteUrl}/talks.md): Catalog of conference talks and podcast appearances since 2013 (40+ documented)
- [Projects](${siteUrl}/projects.md): Open-source projects and patent families (~20 granted US patents as named inventor)
- [Research](${siteUrl}/publications.md): Peer-reviewed publications (Bayesian optimization, bioinformatics, AI/ML), 1,200+ citations, h-index 16
- [Press](${siteUrl}/press.md): Press mentions, interviews, and articles
${writingSection}
## Optional

- [Full corpus (single file)](${siteUrl}/llms-full.txt): All page markdown concatenated
- [Two-page resume PDF](${siteUrl}/resume/scott-clark-resume.pdf): Hiring / exec-search version
- [Long-form academic CV PDF](${siteUrl}/resume/scott-clark-cv.pdf): Academic detail
- [Resume LaTeX source](https://github.com/sc932/resume): Including aligned markdown profile (ScottClark.md)
- [Site source](https://github.com/sc932/scottclarkio): This site's source
`;
  return new Response(txt, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
