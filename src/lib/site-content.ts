// Shared content for the /preview/* pages so palette + font variants stay in sync.
// Source: ~/dev/resume/ScottClark.md (canonical) + dossier cross-checks.

export interface ChronoRow {
  period: string;
  org: string;
  title: string;
  body: string; // HTML allowed; <strong> for key signals, <em> for venues/deal terms.
}

export const navLinks = [
  { href: "/cv", label: "CV" },
  { href: "/talks", label: "Talks" },
  { href: "/projects", label: "Projects" },
  { href: "/publications", label: "Research" },
  { href: "/press", label: "Press" },
];

// Editorial third-person paragraph. ~70 words.
export const lede = `Scott Clark is the co-founder and CEO of <strong>Distributional</strong>, an enterprise AI reliability company in Palo Alto. He was previously co-founder and CEO of <strong>SigOpt</strong>, the Y Combinator–backed Bayesian optimization platform acquired by <strong>Intel</strong> in 2020, where he then served as VP &amp; GM of AI and HPC supercomputing through 2023. He holds a PhD in applied mathematics and an MS in computer science from Cornell University, where he was a Department of Energy Computational Science Graduate Fellow.`;

// Tight elevator-pitch byline. Prioritizes: multi-time founder, a16z+YC, exit (Intel), F100 exec, PhD.
export const byline = `Co-founder &amp; CEO of <a href="https://distributional.com">Distributional</a>. Two-time AI-startup founder backed by Andreessen Horowitz (Y Combinator W15; SigOpt acquired by Intel, 2020). Former Intel VP &amp; GM. Cornell PhD.`;

export const bullets: { label: string; html: string }[] = [
  {
    label: "Researcher",
    html: `Published across <em>multiple STEM fields</em> — bioinformatics, machine learning, applied mathematics, and Bayesian optimization. <strong>1,200+ citations</strong>, h-index 16. <strong>~20 granted US patents</strong> as named inventor. Cornell PhD; <em>magna cum laude</em> triple BS (mathematics, physics, computational physics) from Oregon State.`,
  },
  {
    label: "Founder",
    html: `Two-time AI-startup founder, both <strong>backed multiple times by Andreessen Horowitz</strong>. SigOpt: <strong>Y Combinator W15</strong>; also backed by Two Sigma, Blumberg, and In-Q-Tel; <strong>acquired by Intel</strong> in 2020. Distributional: backed by a16z (Martin Casado) and Two Sigma Ventures, serving multiple Fortune 500 customers.`,
  },
  {
    label: "Operator",
    html: `Led an approximately <strong>200-person AI and HPC engineering organization</strong> at Intel as VP &amp; GM, through <strong>three successive promotions</strong> in two and a half years. Public face of Intel's oneAPI open-ecosystem strategy. Frequent invited speaker: SC22, NeurIPS, NVIDIA GTC, O'Reilly AI, MLconf, TWIML, a16z, Voices in AI.`,
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

export const experience: ChronoRow[] = [
  {
    period: "2023 — present",
    org: "Distributional",
    title: "Co-founder & CEO",
    body: `Enterprise AI reliability. Founded July 2023 with a founding team of 11 from <em>Bloomberg</em>, <em>Google</em>, <em>Meta</em>, <em>Intel</em>, <em>SigOpt</em>, <em>Stripe</em>, <em>Uber</em>, and <em>Yelp</em>. <strong>$30M raised</strong>: Seed (Dec 2023) led by <strong>Andreessen Horowitz</strong> (Martin Casado), Series A (Oct 2024) led by <strong>Two Sigma Ventures</strong>. Now a 30-person team serving multiple Fortune 500 customers. First granted patent <em>US 12,505,027</em> (2025) for anomaly detection in deployed AI applications.`,
  },
  {
    period: "2020 — 2023",
    org: "Intel",
    title: "VP & GM, AI/HPC Supercomputing",
    body: `Joined through the SigOpt acquisition. Led a <strong>~200-person multi-disciplinary organization</strong> in AI and HPC supercomputing application engineering. <strong>Three successive promotions</strong> across two years seven months: Director → Senior Director → VP &amp; GM. Public face of Intel's oneAPI open-ecosystem strategy. Notable appearances: SC22 theCUBE panel, MLconf 2021, Ai4 2021, Intel Conversations in the Cloud (Ep. 250).`,
  },
  {
    period: "2014 — 2020",
    org: "SigOpt",
    title: "Co-founder & CEO",
    body: `Commercial Bayesian-optimization platform serving Fortune 500 enterprises in algorithmic trading, intelligence, enterprise tech, and consumer technology. <strong>Y Combinator W15.</strong> ~$17M raised: Seed and Series A led by <strong>Andreessen Horowitz</strong>; Series A+ led by <strong>Blumberg Capital</strong> with <strong>Two Sigma Investments</strong>; strategic investment from <strong>In-Q-Tel</strong>. <strong>Acquired by Intel</strong> (Oct 2020). Research output during tenure: <strong>15 peer-reviewed papers</strong> on Bayesian optimization and hyperparameter tuning; <strong>~20 granted US patents</strong> as named inventor.`,
  },
  {
    period: "2012 — 2014",
    org: "Yelp",
    title: "Software Engineer & Team Lead, Ad Targeting",
    body: `One of the first PhDs hired by Yelp. Co-developed and open-sourced <strong>MOE</strong> (Metric Optimization Engine, github.com/Yelp/MOE), the first production Bayesian optimization package — Yelp's third-most-popular open-source release within 72 hours of launch and the basis of SigOpt's founding. Created and directed the Yelp Dataset Challenge (used by 100,000+ students worldwide). Profiled in the <em>Wall Street Journal</em>, August 2014.`,
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
