// scripts/migrate-posts.mjs
// 一次性迁移：旧项目 86 篇文章 → 新项目文件夹结构（one-folder-per-post）。
//
// 旧 (astro-gyoza/src/content/posts/<slug>/index.md) → 新 (astro-devosfera/src/data/blog/<slug>/index.md)
//
// 字段映射：
//   title     → title
//   date      → pubDatetime
//   summary   → description
//   category  → category
//   tags      → tags
//   draft     → draft
//   comments  → comments
//   lastMod   → modDatetime
//   sticky    → sticky (默认 0)
//   cover     → 丢弃（远程 URL；新项目用动态 OG 图，SITE.showCoverImages=false）
//
// 正文处理：
//   {% link name,label,url %} → [label](url)   （旧项目无此插件，属死语法，顺手转正）
//   本地图片 ![](foo.png)    → ![](./foo.png) + 拷贝文件到 src/data/blog/<slug>/（与 index.md 同文件夹）
//   cover     → ogImage（新主题字段）
//
// 用法：node scripts/migrate-posts.mjs [--dry-run]

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import matter from "gray-matter";

const nodeRequire = createRequire(import.meta.url);
const yaml = nodeRequire("js-yaml");

const OLD_ROOT = "F:/桌面/study/opencode/astro-gyoza/src/content/posts";
const NEW_ROOT = path.join(import.meta.dirname, "..", "src", "data", "blog");
const DRY = process.argv.includes("--dry-run");

function convertLinks(body) {
  // {% link 123pan,点我点我,https://www.123pan.com/s/xxx %}
  // → [点我点我](https://www.123pan.com/s/xxx)
  return body.replace(/\{%\s*link\s+([^%]+?)\s*%\}/g, (_m, raw) => {
    const parts = raw.split(",").map((p) => p.trim());
    if (parts.length < 3) return `[${parts.join(" ")}](${parts[2] ?? ""})`;
    const label = parts[1];
    const url = parts.at(-1);
    return `[${label}](${url})`;
  });
}

const IMG_EXT = /\.(webp|png|jpg|jpeg|gif|svg|avif)$/i;

function sanitizeFilename(name) {
  // 去掉括号/点/逗号/空格等 markdown 不安全字符，压缩连续下划线
  return name
    .replace(/[()]/g, "")
    .replace(/[\s.,!@#&%~"'\/\\]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function rewriteImages(body, slug, oldDir) {
  // 列出旧文件夹里的实际图片文件，用字符串替换（兼容含括号的文件名）
  const used = [];
  if (fs.existsSync(oldDir)) {
    for (const file of fs.readdirSync(oldDir)) {
      if (!IMG_EXT.test(file)) continue;
      if (/^(https?:|\/\/)/.test(file)) continue;
      const sanitized = sanitizeFilename(file);
      if (body.includes(file)) {
        body = body.split(file).join(`./${sanitized}`);
        used.push([file, sanitized]);
      }
    }
  }
  return { body, used };
}

let migrated = 0, skipped = 0, imgCopied = 0, linkConv = 0, imgRewritten = 0;

for (const dir of fs.readdirSync(OLD_ROOT)) {
  const oldFile = path.join(OLD_ROOT, dir, "index.md");
  if (!fs.existsSync(oldFile)) { skipped++; continue; }

  const raw = fs.readFileSync(oldFile, "utf8");
  // 去 BOM
  const clean = raw.replace(/^\uFEFF/, "");
  const { data: oldData, content } = matter(clean);

  const title = oldData.title;
  const desc = oldData.summary ?? oldData.description ?? (typeof oldData.title === 'string' ? oldData.title : '');
  const date = oldData.date ?? oldData.pubDatetime;
  if (!title || !date) {
    console.warn(`⚠ 跳过 ${dir}：缺 title/date`);
    skipped++;
    continue;
  }

  const newDir = path.join(NEW_ROOT, dir);
  fs.mkdirSync(newDir, { recursive: true });

  // 字段映射
  const newData = {
    title,
    description: desc,
    pubDatetime: date,
  };
  if (oldData.modDatetime ?? oldData.lastMod) {
    newData.modDatetime = oldData.modDatetime ?? oldData.lastMod;
  }
  // cover（远程 URL）→ 新主题 ogImage 字段
  if (oldData.cover) newData.ogImage = oldData.cover;
  if (oldData.category) newData.category = oldData.category;
  if (oldData.tags) newData.tags = oldData.tags;
  if (typeof oldData.draft === "boolean") newData.draft = oldData.draft;
  if (typeof oldData.comments === "boolean") newData.comments = oldData.comments;
  if (oldData.sticky) newData.sticky = oldData.sticky;
  else newData.sticky = 0;
  if (oldData.featured) newData.featured = oldData.featured;

  // 正文
  let body = content;
  const beforeLinks = body.match(/\{%\s*link\s+/g)?.length ?? 0;
  body = convertLinks(body);
  linkConv += beforeLinks;
  const { body: body2, used } = rewriteImages(body, dir, path.join(OLD_ROOT, dir));
  imgRewritten += used.length;
  body = body2;

  const out = `---\n${yaml.dump(newData)}---\n\n${body}`;
  if (!DRY) fs.writeFileSync(path.join(newDir, "index.md"), out);

  // 拷贝本地图片（重命名为安全文件名，与 index.md 同文件夹）
  if (!DRY) {
    for (const [src, dst] of used) {
      const srcPath = path.join(OLD_ROOT, dir, src);
      if (fs.existsSync(srcPath)) {
        fs.copyFileSync(srcPath, path.join(newDir, dst));
        imgCopied++;
      }
    }
  }
  migrated++;
}

console.log(`\n✅ 迁移完成 ${migrated} 篇（跳过 ${skipped}）`);
console.log(`   link 转换 ${linkConv} 处 | 图片引用重写 ${imgRewritten} | 图片拷贝 ${imgCopied}`);
if (DRY) console.log("   [DRY-RUN 模式，未写入文件]");
