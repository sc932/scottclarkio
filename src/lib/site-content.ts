// Shared content for the /preview/* pages so palette + font variants stay in sync.
// Source: ~/dev/resume/ScottClark.md (canonical) + dossier cross-checks.

export interface ChronoRow {
  period: string;
  org: string;
  title: string;
  body?: string; // HTML allowed; used for prose-style entries (e.g. education).
  bullets?: string[]; // HTML allowed per item; used for resume-style short bullets (home page).
  cvBullets?: string[]; // HTML allowed per item; longer-form bullets for /cv. Falls back to `bullets`.
}

export const navLinks = [
  { href: "/cv", label: "CV" },
  { href: "/talks", label: "Talks" },
  { href: "/projects", label: "Projects" },
  { href: "/publications", label: "Research" },
  { href: "/press", label: "Press" },
];

// Editorial third-person paragraph. ~70 words.
export const lede = `Scott Clark is the co-founder and CEO of <strong>Distributional</strong>, an enterprise AI reliability company backed by a16z and Two Sigma. He was previously co-founder and CEO of <strong>SigOpt</strong>, a YC-and-a16z-backed Bayesian optimization platform acquired by <strong>Intel</strong> in 2020, where he then served as VP &amp; GM of AI and HPC supercomputing through 2023. He holds a PhD in applied mathematics and an MS in computer science from Cornell University, where he was a Department of Energy Computational Science Graduate Fellow.`;

// Tight elevator-pitch byline. Prioritizes: multi-time founder, a16z+YC, exit (Intel), F100 exec, PhD.
export const byline = `I build startups that bring AI research into production at enterprise scale.`;

export const bullets: { label: string; html: string }[] = [
  {
    label: "Researcher",
    html: `Published across multiple STEM fields. 1,200+ citations, h-index 16. ~20 granted US patents. PhD Applied Math and MS Computer Science from Cornell University; BS Mathematics, BS Physics, and BS Computational Physics from Oregon State University`,
  },
  {
    label: "Founder",
    html: `Two-time AI-startup founder, backed multiple times by a16z and Two Sigma. SigOpt (YC W15): raised $17M, acquired by Intel in 2020. Distributional: raised $30M, serving multiple Fortune 500 customers.`,
  },
  {
    label: "Operator",
    html: `Built and led teams from 2 to 200. From AI startups as a YC founder to the AI and HPC engineering organization at Intel as VP &amp; GM. Frequent invited speaker at conferences and podcasts.`,
  },
];

export const socialLinks = [
  { href: "https://github.com/sc932", label: "GitHub" },
  { href: "https://www.linkedin.com/in/sc932", label: "LinkedIn" },
  {
    href: "https://scholar.google.com/citations?user=mwWbhAUAAAAJ",
    label: "Scholar",
  },
  { href: "https://orcid.org/0009-0007-0478-7129", label: "ORCID" },
  { href: "https://twitter.com/DrScottClark", label: "@DrScottClark" },
  { href: "mailto:scott@scottclark.io", label: "scott@scottclark.io" },
];

// Home-page bullets are verbatim from ScottClarkResume.tex (3 each).
// CV-page bullets are verbatim from ScottClarkCV.tex (longer; 4–6 each).
export const experience: ChronoRow[] = [
  {
    period: "2023 — present",
    org: "Distributional",
    title: "Co-founder & CEO",
    bullets: [
      "Analytics for agents, discovering behavioral signals in AI logs for continuous improvement",
      "Built enterprise tooling for AI reliability with statistical testing and adaptive analytics",
      "Led a remote team of 30. Raised $30M from a16z, Two Sigma, others over 2 rounds",
    ],
    cvBullets: [
      `Analytics for AI agents — discovering behavioral signals in agent trace data for continuous AI reliability. <strong>30-person team</strong>, <strong>$30M raised</strong> (Seed Dec 2023 led by <em>Andreessen Horowitz</em>; Series A Oct 2024 led by <em>Two Sigma Ventures</em>).`,
      `Co-founders: Michael McCourt (CTO; multi-paper SigOpt-era co-author), David Rosales (COO), Nick Payton (CRO). 11-person founding team sourced from <em>Bloomberg</em>, <em>Google</em>, <em>Meta</em>, <em>Intel</em>, <em>SigOpt</em>, <em>Slack</em>, <em>Stripe</em>, <em>Uber</em>, <em>Yelp</em>.`,
      `Product evolved 2023–2025 from pre-deployment AI-testing to production behavioral analytics for AI agents — turning raw trace data into actionable insights for AI teams.`,
      `<strong>US Patent 12,505,027</strong> (2025, named inventor): anomaly detection in deployed AI applications.`,
    ],
  },
  {
    period: "2020 — 2023",
    org: "Intel",
    title: "VP & GM, AI/HPC Supercomputing",
    bullets: [
      "Led a team of 200 engineers and technologists worldwide, overseeing a $70M annual budget",
      "Responsible for AI and HPC application quality on 35MW+ government datacenters",
      "Promoted from Director to Sr. Director to VP, supporting multiple chip and datacenter launches",
    ],
    cvBullets: [
      `Joined Intel through the acquisition of SigOpt (Oct 2020). Led a multi-disciplinary <strong>~200-person organization</strong> responsible for application-level AI and HPC software within Intel's Supercomputing Group.`,
      `<strong>Title progression:</strong> Director &amp; GM of SigOpt (Nov 2020 – Mar 2021) → Senior Director &amp; GM of SigOpt and AI Application Enablement (Mar 2021 – Sep 2022) → VP &amp; GM of AI and HPC Supercomputing Application Level Engineering (Sep 2022 – Jun 2023).`,
      `Public face for Intel's <strong>oneAPI</strong> open-ecosystem thesis — <em>SC22 theCUBE</em> panel (Dallas, Nov 2022), MLconf 2021 Webinar, Ai4 2021, <em>Intel Conversations in the Cloud</em> Ep. 250.`,
      `Integrated SigOpt's IP into Intel's AI Analytics Toolkit; recognized as a leader in AI Software Optimization (<em>Kisaco Research Leadership Council</em>, 2021).`,
    ],
  },
  {
    period: "2014 — 2020",
    org: "SigOpt",
    title: "Co-founder & CEO",
    bullets: [
      "Bayesian Optimization-as-a-Service product based on my PhD and open source work",
      "Led a team of 25; published research at top conferences and closed several million in ARR",
      "Acquired by Intel. Raised $17M from a16z, Two Sigma, YC (W15), others over 3 rounds",
    ],
    cvBullets: [
      `Commercial Bayesian-optimization platform serving Fortune 500 enterprises in finance, trading, intelligence, and technology. <strong>Acquired by Intel</strong> (Oct 29, 2020).`,
      `<strong>Raised $17M</strong> across seed + Series A + Series A+ + strategic rounds: <em>Andreessen Horowitz</em> (led seed 2015 and A 2016); <em>Blumberg Capital</em> (lead, 2018 Series A+, with <em>Two Sigma Investments</em> co-investing, announced 2019); <em>Data Collective (DCVC)</em>, <em>SV Angel</em>, <em>Stanford</em>, <em>In-Q-Tel</em> strategic, <em>Y Combinator (W15)</em>, and notable angels.`,
      `Co-founders: Patrick Hayes (CTO 2014–2021), Eric Liu.`,
      `Grew from <strong>Y Combinator W15</strong> through Series A+ with customers in algorithmic trading, government/intelligence, enterprise AI, and consumer-tech.`,
      `Awards: <em>Gartner Cool Vendor in AI Core Technologies</em> (2017); <em>Barclays Open Innovation Challenge</em> winner (2017); <em>Kisaco Research KLC Leader</em> (2021).`,
      `Drove research culture and IP: <strong>15 peer-reviewed papers</strong> + <strong>~20 granted US patents</strong> as named inventor across Intelligent Optimization Platform, Multi-Criteria Optimization, and Multi-Solution Hyperparameter Tuning families.`,
    ],
  },
  {
    period: "2012 — 2014",
    org: "Yelp",
    title: "Software Engineer & Team Lead, Ad Targeting",
    bullets: [
      "Led MOE team (Metric Optimization Engine), 1.3k+ star open source repo based on my PhD",
      "Developed novel location-based and bandit-optimized ad targeting algorithms",
      "Created the Yelp Dataset Challenge, used by hundreds of thousands of students globally",
    ],
    cvBullets: [
      `<strong>Optimization:</strong> Co-developed and led team for <strong>MOE</strong> (Metric Optimization Engine, github.com/Yelp/MOE) — first production Bayesian-optimization open-source package. Third-most-popular Yelp open-source release within 72 hours of launch; basis of SigOpt's founding.`,
      `<strong>Ad targeting:</strong> Implemented multi-armed bandit strategies for ad selection, sole targeting engineer on mobile ads rollout, developed location-based targeting algorithms.`,
      `<strong>Director, Yelp Dataset Challenge:</strong> created, implemented, and directed yelp.com/dataset_challenge; used by 100,000+ students worldwide since its inception.`,
      `<strong>Leadership:</strong> Founded Yelp's internal Applied Learning Group (bi-weekly all-engineering speaker series); MOE team lead; intern and new-hire mentor; 200+ technical interviews.`,
      `Featured in the <em>Wall Street Journal</em>, Aug 8 2014 (Elizabeth Dwoskin, &ldquo;Big Data's High-Priests of Algorithms&rdquo;) and the Cornell ORIE alumni spotlight (2014).`,
    ],
  },
];

export const education: ChronoRow[] = [
  {
    period: "2008 — 2012",
    org: "Cornell University",
    title: "Ph.D. Applied Mathematics, M.S. Computer Science",
    body: `<strong>Department of Energy Computational Science Graduate Fellow</strong> (full four-year scholarship). Dissertation: "Parallel Machine Learning Algorithms in Bioinformatics and Global Optimization." Advisor: <strong>Peter Frazier</strong>. Committee: <strong>Steve Strogatz</strong>, <strong>Bart Selman</strong>. DOE practicums at Los Alamos National Laboratory and the Joint Genome Institute (LBNL).`,
  },
  {
    period: "2004 — 2008",
    org: "Oregon State University",
    title: "B.Sc. Mathematics, B.Sc. Computational Physics, B.Sc. Physics",
    body: `<strong>Triple bachelor's degrees</strong> in four years, <em>magna cum laude</em>. Minors in Actuarial Sciences and Mathematical Sciences. Paradigms in Physics degree track. NSF REU summers at UC Davis (computational biophysics) and the Max Planck Institute Dresden (extreme-value statistics of chaotic quantum systems).`,
  },
];

export const pageTitle = "Scott Clark — Co-founder & CEO of Distributional. Cornell PhD.";
export const pageDescription =
  "Scott Clark is the co-founder and CEO of Distributional, an enterprise AI reliability company. Previously co-founder and CEO of SigOpt (acquired by Intel 2020); VP and GM of AI and HPC supercomputing at Intel through 2023. PhD in Applied Mathematics from Cornell University.";

export const siteUrl = "https://scottclark.io";

// JSON-LD Person schema — emitted in <head> on every page.
// Cross-checked against ~/dev/content_finder/dossier/. Update here when bio facts change;
// CLAUDE.md propagation order is dossier → resume md → vault bio → site.
export const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": `${siteUrl}/#person`,
  name: "Scott Clark",
  givenName: "Scott",
  additionalName: "C.",
  familyName: "Clark",
  honorificSuffix: "Ph.D.",
  jobTitle: "Co-founder & CEO",
  description:
    "Co-founder and CEO of Distributional (enterprise AI reliability). Previously co-founder & CEO of SigOpt (acquired by Intel 2020); VP & GM of AI and HPC supercomputing at Intel through 2023. PhD Applied Mathematics, Cornell University.",
  url: siteUrl,
  image: `${siteUrl}/images/scott-clark.jpg`,
  email: "scott@scottclark.io",
  worksFor: {
    "@type": "Organization",
    name: "Distributional, Inc.",
    url: "https://distributional.com",
  },
  alumniOf: [
    {
      "@type": "CollegeOrUniversity",
      name: "Cornell University",
      sameAs: "https://www.cornell.edu/",
    },
    {
      "@type": "CollegeOrUniversity",
      name: "Oregon State University",
      sameAs: "https://oregonstate.edu/",
    },
  ],
  award: [
    "Forbes 30 Under 30 — Enterprise Technology (2016)",
    "Young Alumni Award, Oregon State University College of Science (2016)",
    "Department of Energy Computational Science Graduate Fellowship (2008–2012)",
  ],
  knowsAbout: [
    "Bayesian optimization",
    "AI reliability",
    "AI testing and evaluation",
    "Production ML observability",
    "LLM and agent evaluation",
    "Hyperparameter tuning",
    "Gaussian processes",
    "Optimal learning",
    "Multi-armed bandits",
    "High-performance computing",
    "Numerical analysis",
    "Bioinformatics",
    "Genome assembly",
  ],
  sameAs: [
    "https://github.com/sc932",
    "https://www.linkedin.com/in/sc932",
    "https://scholar.google.com/citations?user=mwWbhAUAAAAJ",
    "https://orcid.org/0009-0007-0478-7129",
    "https://twitter.com/DrScottClark",
    "https://distributional.com",
    "https://github.com/sc932/resume",
    "https://github.com/sc932/scottclarkio",
  ],
};

// WebSite schema — appears in every page's @graph. Ties Person → site.
export const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${siteUrl}/#website`,
  url: `${siteUrl}/`,
  name: "Scott Clark",
  description: pageDescription,
  inLanguage: "en-US",
  publisher: { "@id": `${siteUrl}/#person` },
  copyrightHolder: { "@id": `${siteUrl}/#person` },
  copyrightYear: 2026,
};

// ProfilePage schema for pages whose primary subject is Scott (home, /cv).
export function buildProfilePageSchema(opts: {
  pathname: string;
  name: string;
  description?: string;
}) {
  const path = opts.pathname.replace(/\/$/, "") || "/";
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    "@id": `${siteUrl}${path === "/" ? "" : path}#page`,
    url: `${siteUrl}${path}`,
    name: opts.name,
    ...(opts.description && { description: opts.description }),
    inLanguage: "en-US",
    isPartOf: { "@id": `${siteUrl}/#website` },
    mainEntity: { "@id": `${siteUrl}/#person` },
    primaryImageOfPage: {
      "@type": "ImageObject",
      url: `${siteUrl}/images/scott-clark.jpg`,
      caption: "Scott Clark",
    },
  };
}

// CollectionPage with an ItemList of typed entities. Used by the listing pages
// (/talks, /projects, /publications, /press). Caller passes already-typed
// schema.org items; we wrap each in a ListItem with position.
export function buildCollectionPageSchema(opts: {
  pathname: string;
  name: string;
  description?: string;
  items: object[];
}) {
  const path = opts.pathname.replace(/\/$/, "") || "/";
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${siteUrl}${path}#page`,
    url: `${siteUrl}${path}`,
    name: opts.name,
    ...(opts.description && { description: opts.description }),
    inLanguage: "en-US",
    isPartOf: { "@id": `${siteUrl}/#website` },
    about: { "@id": `${siteUrl}/#person` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: opts.items.length,
      itemListElement: opts.items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item,
      })),
    },
  };
}

// Build a BreadcrumbList for a given pathname. Uses navLinks for canonical
// labels (so /publications shows "Research", matching the nav label).
export function buildBreadcrumbList(pathname: string) {
  const path = pathname.replace(/\/$/, "") || "/";
  const items: Array<{
    "@type": "ListItem";
    position: number;
    name: string;
    item: string;
  }> = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: `${siteUrl}/`,
    },
  ];
  if (path !== "/") {
    const navLink = navLinks.find((n) => n.href === path);
    items.push({
      "@type": "ListItem",
      position: 2,
      name: navLink?.label ?? path.replace(/^\//, ""),
      item: `${siteUrl}${path}`,
    });
  }
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items,
  };
}
