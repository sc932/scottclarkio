// CV-only content — extracted from src/pages/cv.astro on 2026-05-04 so that the
// /cv.md endpoint and /llms-full.txt corpus can render the same data without
// duplicating it. cv.astro and cv.md.ts both import from here.

import { experience, type ChronoRow } from "./site-content";

// Bloomberg internship — listed as the 5th industry role in ScottClarkCV.tex.
export const bloombergRow: ChronoRow = {
  period: "May — Aug 2011",
  org: "Bloomberg LP",
  title: "Financial Software Development Intern",
  cvBullets: [
    "Developed end-to-end portfolio-analytics function in C++ and JavaScript (concept → back-end integration → GUI → PDF reporting).",
  ],
};

// Combined experience for /cv: shared 4 roles from site-content.ts + Bloomberg.
export const cvExperience: ChronoRow[] = [...experience, bloombergRow];

// Pre-PhD research practicums — separate "Research Experience" section in the longform CV.
export const researchPracticums: ChronoRow[] = [
  {
    period: "May — Aug 2010",
    org: "DOE Joint Genome Institute (LBNL)",
    title: "DOE CSGF Practicum under Dr. Zhong Wang & Rob Egan",
    cvBullets: [
      `Built open-source genome-assembly validation framework (<strong>ALE</strong>, published <em>Bioinformatics</em> 2013, 208 cites).`,
    ],
  },
  {
    period: "May — Aug 2009",
    org: "Los Alamos National Laboratory",
    title: "DOE CSGF Practicum under Drs. Nick Hengartner & Joel Berendzen",
    cvBullets: [
      `Metagenomics / local sequence-alignment algorithms in Python, C, and CUDA (<em>Velvetrope</em>). This practicum pivoted my dissertation from computational fluid dynamics to bioinformatics.`,
    ],
  },
  {
    period: "May — Aug 2007",
    org: "Max Planck Institute for the Physics of Complex Systems",
    title: "NSF REU under Prof. Steven Tomsovic (WSU)",
    cvBullets: [
      `Extreme-value statistics of chaotic quantum systems in MATLAB and FORTRAN.`,
    ],
  },
  {
    period: "May — Aug 2006",
    org: "University of California, Davis",
    title: "NSF REU under Prof. Daniel Cox",
    cvBullets: [
      `Computational biophysics / protein folding in Java. Results published in <em>Prion</em> (2008).`,
    ],
  },
];

export interface AwardRow {
  period: string;
  title: string;
  body: string;
}

export const awards: AwardRow[] = [
  {
    period: "2016",
    title: "Forbes 30 Under 30",
    body: "Enterprise Technology category. Recognized as co-founder &amp; CEO of SigOpt.",
  },
  {
    period: "2016",
    title: "Young Alumni Award",
    body: "Oregon State University, College of Science.",
  },
  {
    period: "2010",
    title: "DOE CSGF Communicating Science Award (Honorable Mention)",
    body: 'For the essay "Solving Genomic Jigsaws," <em>DEIXIS Magazine</em>.',
  },
  {
    period: "2008 — 2012",
    title: "DOE Computational Science Graduate Fellowship",
    body: "Full four-year PhD scholarship (~$300,000), Department of Energy. Contract DE-FG02-97ER25308.",
  },
  {
    period: "2008",
    title: "Cornell University Sage Fellowship",
    body: "$55,000, declined in favor of DOE CSGF.",
  },
  {
    period: "2010 — 2012",
    title: "NERSC Production + Startup Allocations",
    body: "Principal Investigator, Cray XT4 (DOE Contract DE-AC02-05CH11231), 100,000 production hours plus startup renewals.",
  },
];

export interface AdvisoryRow {
  period: string;
  title: string;
  role: string;
  body: string;
}

export const advisory: AdvisoryRow[] = [
  {
    period: "2022 — 2025",
    title: "Oregon Museum of Science and Industry",
    role: "Board of Trustees · Treasurer · Finance Committee Chair",
    body: "Executive Committee member; chaired the Finance Committee through OMSI's post-COVID financial recovery.",
  },
  {
    period: "2019 — 2025",
    title: "Oregon State University, College of Science",
    role: "Board of Advisors",
    body: "Advised the Dean's office on industry partnerships and research-to-product translation.",
  },
  {
    period: "2018 — 2025",
    title: "Oregon State University, College of Science",
    role: "Industry and Innovation Council",
    body: "Industry-side member supporting the College's translational research initiatives.",
  },
];

export const focusAreas: string[] = [
  "Bayesian optimization",
  "Gaussian processes",
  "Optimal learning",
  "Multi-armed bandits",
  "Hyperparameter tuning",
  "AI reliability",
  "AI testing & evaluation",
  "Production ML observability",
  "LLM and agent evaluation",
  "Experiment design",
  "A/B testing",
  "Monte Carlo methods",
  "Numerical analysis",
  "High-performance computing",
  "Parallel algorithms",
  "Distributed systems",
  "CUDA / GPU computing",
  "Bioinformatics",
  "Genome assembly",
  "Computational biophysics",
];

export interface SelectedPubRow {
  period: string;
  title: string;
  venue: string;
  body: string;
}

export const selectedPubs: SelectedPubRow[] = [
  {
    period: "2020",
    title: "Parallel Bayesian Global Optimization of Expensive Functions",
    venue: "Operations Research",
    body: "Wang, Clark, Liu, Frazier. 263+ citations. Theoretical and practical algorithms for parallel evaluation in BO.",
  },
  {
    period: "2013",
    title: "ALE: A Generic Assembly Likelihood Evaluation Framework",
    venue: "Bioinformatics",
    body: "Clark, Egan, Frazier, Wang. 208+ citations. Reference-free quality metric for genome assemblies. Output of the JGI 2010 DOE practicum.",
  },
  {
    period: "2016",
    title: "Bayesian Optimization for Machine Learning: A Practical Guidebook",
    venue: "arXiv:1612.04858",
    body: "Dewancker, McCourt, Clark. 142+ citations. Widely-cited practitioner guide; the most-read public artifact from the SigOpt research program.",
  },
  {
    period: "2025",
    title: "Anomaly Detection in Deployed Artificial Intelligence Applications",
    venue: "U.S. Patent 12,505,027",
    body: "Distributional's first granted patent. McCourt, Bourassa-Denis, Laban, Kim, Dewancker, Cheng, Clark.",
  },
];

export interface SelectedTalkRow {
  period: string;
  title: string;
  venue: string;
}

export const selectedTalks: SelectedTalkRow[] = [
  {
    period: "Mar 2026",
    title: "AI Reliability for the Enterprise",
    venue: "SAIR Podcast",
  },
  {
    period: "May 2025",
    title: "Behavioral Analytics for Production AI",
    venue: "AI + a16z Podcast (with Matt Bornstein)",
  },
  {
    period: "Nov 2022",
    title: "oneAPI and the Future of Accelerated Computing",
    venue: "SC22 theCUBE Panel (with David Schmidt of Dell)",
  },
  {
    period: "Mar 2019",
    title: "Tuning the Untunable",
    venue: "NVIDIA GTC Silicon Valley",
  },
  {
    period: "Dec 2019",
    title: "From argmax f(x) to an International Business",
    venue: "Cornell CAM Notable Alumni Speaker Series",
  },
];
