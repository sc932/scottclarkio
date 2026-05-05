// Page-level markdown renderers. Each function returns the markdown body for a
// route — used by both the per-page .md endpoint (e.g. /cv.md) and the
// aggregated /llms-full.txt endpoint. Keep rendering logic here so the two
// surfaces never drift.

import { getCollection } from "astro:content";
import {
  experience,
  education,
  bullets as homeBullets,
  byline,
  lede,
  socialLinks,
  siteUrl,
  type ChronoRow,
} from "./site-content";
import {
  cvExperience,
  researchPracticums,
  awards,
  advisory,
  focusAreas,
  selectedPubs,
  selectedTalks,
} from "./cv-content";
import { htmlToMd } from "./md-helpers";

function rowToMd(row: ChronoRow, useCvBullets = false): string {
  const list = useCvBullets
    ? row.cvBullets ?? row.bullets
    : row.bullets ?? row.cvBullets;
  let body: string;
  if (list && list.length) {
    body = list.map((b) => `- ${htmlToMd(b)}`).join("\n");
  } else if (row.body) {
    body = htmlToMd(row.body);
  } else {
    body = "";
  }
  return `### ${row.period} · ${row.org} · ${row.title}\n\n${body}`;
}

export async function renderHomeMd(): Promise<string> {
  return `# Scott Clark

> ${byline}

${htmlToMd(lede)}

## At a glance

${homeBullets
  .map((b) => `**${b.label}.** ${htmlToMd(b.html)}`)
  .join("\n\n")}

## Experience

${experience.map((r) => rowToMd(r, false)).join("\n\n")}

## Education

${education.map((r) => rowToMd(r, false)).join("\n\n")}

## Links

${socialLinks.map((l) => `- [${l.label}](${l.href})`).join("\n")}

---

Source: ${siteUrl}/
`;
}

export async function renderCvMd(): Promise<string> {
  return `# Scott Clark — Curriculum Vitae

Long-form CV. The short version lives on the home page (${siteUrl}/). Downloadable PDFs: [two-page resume](${siteUrl}/resume/scott-clark-resume.pdf) and the longer [academic CV](${siteUrl}/resume/scott-clark-cv.pdf). Full LaTeX source and a structured markdown profile are at https://github.com/sc932/resume.

## Experience

${cvExperience.map((r) => rowToMd(r, true)).join("\n\n")}

## Education

${education.map((r) => rowToMd(r, false)).join("\n\n")}

## Research Experience

${researchPracticums.map((r) => rowToMd(r, true)).join("\n\n")}

## Awards & Honors

${awards
  .map((a) => `### ${a.period} · ${a.title}\n\n${htmlToMd(a.body)}`)
  .join("\n\n")}

## Board & Advisory

${advisory
  .map(
    (a) =>
      `### ${a.period} · ${a.title} · ${a.role}\n\n${htmlToMd(a.body)}`
  )
  .join("\n\n")}

## Research Areas

${focusAreas.join(" · ")}

## Selected Publications

${selectedPubs
  .map(
    (p) =>
      `### ${p.period} · ${p.title}\n\n*${p.venue}*. ${htmlToMd(p.body)}`
  )
  .join("\n\n")}

Full publication list: ${siteUrl}/publications (1,200+ citations, h-index 16; Google Scholar: https://scholar.google.com/citations?user=mwWbhAUAAAAJ)

## Selected Talks & Podcasts

${selectedTalks
  .map((t) => `### ${t.period} · ${t.title}\n\n*${t.venue}*`)
  .join("\n\n")}

Full talks/podcasts list (40+ appearances since 2013): ${siteUrl}/talks

---

Source: ${siteUrl}/cv
`;
}

export async function renderTalksMd(): Promise<string> {
  const talks = (await getCollection("talks")).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );
  const items = talks
    .map((t) => {
      const date = t.data.date.toISOString().slice(0, 10);
      const links = [
        t.data.videoUrl ? `[Video](${t.data.videoUrl})` : null,
        t.data.slidesUrl ? `[Slides](${t.data.slidesUrl})` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      return `## ${t.data.title}\n\n**${date}** · ${t.data.event}${
        links ? `\n\n${links}` : ""
      }\n\n${t.data.description}`;
    })
    .join("\n\n");
  return `# Talks & Podcasts — Scott Clark

40+ documented conference and podcast appearances since 2013.

${items}

---

Source: ${siteUrl}/talks
`;
}

export async function renderProjectsMd(): Promise<string> {
  const order = [
    "distributional",
    "sigopt",
    "ale",
    "moe",
    "yelp-dataset-challenge",
    "resume",
  ];
  const projects = (await getCollection("projects")).sort((a, b) => {
    const ai = order.indexOf(a.id);
    const bi = order.indexOf(b.id);
    if (ai === -1 && bi === -1)
      return a.data.title.localeCompare(b.data.title);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  const patentFamilies = (await getCollection("patents"))
    .map((fam) => ({
      data: fam.data,
      sortedPatents: [...fam.data.patents].sort((a, b) => a.year - b.year),
      mostRecentYear: Math.max(...fam.data.patents.map((p) => p.year)),
    }))
    .sort((a, b) => b.mostRecentYear - a.mostRecentYear);

  const projectItems = projects
    .map((p) => {
      const links = [
        p.data.url ? `[Site](${p.data.url})` : null,
        p.data.repo ? `[Repo](${p.data.repo})` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      const tags = p.data.tags.length
        ? `\n\n*Tags:* ${p.data.tags.join(", ")}`
        : "";
      return `### ${p.data.title}\n\n${p.data.description}${
        links ? `\n\n${links}` : ""
      }${tags}`;
    })
    .join("\n\n");

  const patentItems = patentFamilies
    .map((fam) => {
      const list = fam.sortedPatents
        .map((pt) =>
          pt.url
            ? `[${pt.number}](${pt.url}) (${pt.year})`
            : `${pt.number} (${pt.year})`
        )
        .join(", ");
      const inventors = `Inventors: ${fam.data.inventors.join(", ")}`;
      const abstract = fam.data.abstract ? `\n\n${fam.data.abstract}` : "";
      return `### ${fam.data.title}\n\n${list}\n\n${inventors}${abstract}`;
    })
    .join("\n\n");

  return `# Projects & Patents — Scott Clark

## Projects

${projectItems}

## Patents (as named inventor)

~20 granted US patents across 4 SigOpt patent families (2019–2025) plus 1 Distributional patent (2025).

${patentItems}

---

Source: ${siteUrl}/projects
`;
}

export async function renderPublicationsMd(): Promise<string> {
  const pubs = (await getCollection("publications")).sort(
    (a, b) => b.data.year - a.data.year
  );
  const items = pubs
    .map((p) => {
      const authors = p.data.authors
        .map((a) => (a === "Scott C. Clark" ? `**${a}**` : a))
        .join(", ");
      const link = p.data.url ? `\n\n[Link](${p.data.url})` : "";
      const doi = p.data.doi ? `\n\nDOI: ${p.data.doi}` : "";
      const abstract = p.data.abstract ? `\n\n${p.data.abstract}` : "";
      return `### ${p.data.title}\n\n${authors}. *${p.data.venue}*, ${p.data.year}.${link}${doi}${abstract}`;
    })
    .join("\n\n");
  return `# Publications — Scott Clark

1,200+ citations · h-index 16 · Google Scholar: https://scholar.google.com/citations?user=mwWbhAUAAAAJ

${items}

---

Source: ${siteUrl}/publications
`;
}

export async function renderPressMd(): Promise<string> {
  const articles = (await getCollection("articles")).sort(
    (a, b) => b.data.date.valueOf() - a.data.date.valueOf()
  );
  const items = articles
    .map((a) => {
      const date = a.data.date.toISOString().slice(0, 10);
      const excerpt = a.data.excerpt ? `\n\n> ${a.data.excerpt}` : "";
      return `## ${a.data.title}\n\n**${date}** · *${a.data.publication}* · [Link](${a.data.url})${excerpt}`;
    })
    .join("\n\n");
  return `# Press — Scott Clark

${items}

---

Source: ${siteUrl}/press
`;
}
