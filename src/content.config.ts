import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// The blog collection is the estate blog grammar's scottclarkio instantiation
// (canonical contract: vault Projects/content_factory/blog-grammar.md) —
// schema SHAPE is shared across the three sites; the taxonomy enum here is
// the personal-track `pillar` (the company sites use `series`).
const blog = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string().min(40).max(320),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    format: z.enum(["post", "video", "event", "thread"]).default("post"),
    author: z.string().default("Scott Clark"),
    pillar: z
      .enum([
        "optimization-thinking",
        "startup-leadership",
        "research-to-product",
        "agentic-craft",
      ])
      .optional(),
    kind: z.enum(["why", "how", "proof", "news"]).optional(),
    videoId: z.string().optional(),
    videoDuration: z.string().optional(),
    videoUploadDate: z.coerce.date().optional(),
    sourceUrl: z.string().url().optional(),
    pinned: z.boolean().default(false),
    draft: z.boolean().default(false),
  })
    .refine((d) => d.format !== "video" || Boolean(d.videoId), {
      message: "format: video requires videoId",
    }),
});

const publications = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/publications" }),
  schema: z.object({
    title: z.string(),
    authors: z.array(z.string()),
    venue: z.string(),
    year: z.number(),
    url: z.string().optional(),
    doi: z.string().optional(),
    abstract: z.string().optional(),
  }),
});

const talks = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/talks" }),
  schema: z.object({
    title: z.string(),
    event: z.string(),
    date: z.coerce.date(),
    videoUrl: z.string().optional(),
    slidesUrl: z.string().optional(),
    description: z.string(),
  }),
});

const articles = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/articles" }),
  schema: z.object({
    title: z.string(),
    publication: z.string(),
    date: z.coerce.date(),
    url: z.string(),
    excerpt: z.string().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    url: z.string().optional(),
    repo: z.string().optional(),
    image: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

const patents = defineCollection({
  loader: glob({ pattern: "**/*.yaml", base: "./src/content/patents" }),
  schema: z.object({
    title: z.string(),
    patents: z
      .array(
        z.object({
          number: z.string(),
          year: z.number(),
          url: z.string().url().optional(),
        })
      )
      .min(1),
    inventors: z.array(z.string()),
    abstract: z.string().optional(),
  }),
});

export const collections = { publications, talks, articles, projects, patents, blog };
