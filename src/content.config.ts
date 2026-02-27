import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    image: z.string().optional(),
    draft: z.boolean().default(false),
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

export const collections = { blog, publications, talks, articles, projects };
