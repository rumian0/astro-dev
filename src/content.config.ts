import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import { SITE } from "@/config";

export const BLOG_PATH = "src/data/blog";
export const GALLERY_PATH = "src/data/galleries";

// frontmatter 只写日期（如 `2026-09-19`）时，js-yaml 解析为 UTC 午夜（00:00:00Z）。
// 归一到 UTC 正午（12:00:00Z）：字面即「默认 12:00」，且跨构建/查看时区稳定
// （用本地时区会在本机 UTC+8 与 Vercel UTC 产物里产生不同 instant）。
const noonDefaultDate = z
  .date()
  .transform(d =>
    d.getUTCHours() === 0 &&
    d.getUTCMinutes() === 0 &&
    d.getUTCSeconds() === 0 &&
    d.getUTCMilliseconds() === 0
      ? new Date(new Date(d).setUTCHours(12, 0, 0, 0))
      : d
  );

const blog = defineCollection({
  // 一篇文章一个文件夹：<slug>/index.md（也兼容扁平 .md）
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: `./${BLOG_PATH}` }),
  schema: ({ image }) =>
    z.object({
      author: z.string().default(SITE.author),
      pubDatetime: noonDefaultDate,
      modDatetime: noonDefaultDate.nullable().optional(),
      title: z.string(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).default(["others"]),
      ogImage: image().or(z.string()).optional(),
      coverImage: image().optional(),
      description: z.string(),
      canonicalURL: z.string().optional(),
      hideEditPost: z.boolean().optional(),
      timezone: z.string().optional(),
      // ── 旧项目字段（兼容迁移内容） ──
      category: z.string().optional(),
      // ── 分类（新写法：数组） ──
      categories: z.array(z.string()).optional(),
      comments: z.boolean().default(true),
      sticky: z.number().default(0),
    }),
});

const galleries = defineCollection({
  loader: glob({ pattern: "**/index.{md,mdx}", base: `./${GALLERY_PATH}` }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDatetime: noonDefaultDate,
      draft: z.boolean().optional(),
      coverImage: image().optional(),
      tags: z.array(z.string()).default([]),
    }),
});

export const collections = { blog, galleries };
