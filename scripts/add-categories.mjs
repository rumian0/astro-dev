#!/usr/bin/env node
/**
 * add-categories.mjs — 为每篇文章添加 categories 分类字段（新主题写法，数组）
 *
 * 取值优先级：
 *   1. 新站现有 `category:` 字段（从旧站迁移）
 *   2. 旧站（astro-gyoza，只读）frontmatter 的 categories / category
 *   3. 该文 tags 中四字中文标签（四个汉字的视为分类，多个取第一个）
 *   4. 兜底「其他」
 *
 * 同时移除旧的 `category:` 字段，统一为 `categories:`。
 * 用法: node scripts/add-categories.mjs [--dry-run]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const NEW_DATA = path.join(ROOT, "src", "data", "blog");
const OLD_POSTS = "F:/桌面/study/opencode/astro-gyoza/src/content/posts";

const DRY = process.argv.includes("--dry-run");

const is4CharChinese = (s) => /^[\u4e00-\u9fa5]{4}$/.test(s || "");

/** 读取旧站分类 */
function readOldCategory(slug) {
  const p = path.join(OLD_POSTS, slug, "index.md");
  if (!fs.existsSync(p)) return null;
  const raw = fs.readFileSync(p, "utf8");
  let m = raw.match(/^categories?:\s*['"]?([^'"\n]+)['"]?\s*$/m);
  if (m) return m[1].trim();
  // categories 数组形式
  m = raw.match(/^categories?:\s*\[([^\]]*)\]/m);
  if (m) {
    const arr = m[1]
      .split(",")
      .map((x) => x.trim().replace(/['"]/g, ""))
      .filter(Boolean);
    if (arr.length) return arr[0];
  }
  return null;
}

function parseFrontmatter(md) {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const fm = m[1];
  const titleLine = fm.split("\n").find((l) => /^title:/.test(l)) || "";
  const title = titleLine.replace(/^title:\s*/, "").replace(/['"]/g, "").trim();
  return { fm, title };
}

function main() {
  const slugs = fs
    .readdirSync(NEW_DATA)
    .filter((d) => fs.statSync(path.join(NEW_DATA, d)).isDirectory());

  let converted = 0;
  let fallbackOther = 0;
  const notes = [];

  for (const slug of slugs) {
    const file = ["index.md", "index.mdx"]
      .map((f) => path.join(NEW_DATA, slug, f))
      .find((f) => fs.existsSync(f));
    if (!file) continue;
    let md = fs.readFileSync(file, "utf8");
    const parsed = parseFrontmatter(md);
    if (!parsed) continue;
    const { fm } = parsed;

    if (/^categories:/m.test(fm)) continue; // 已有

    // 1) 新站现有 category
    let value = (fm.match(/^category:\s*['"]?([^'"\n]+)['"]?\s*$/m) || [])[1];
    value = value ? value.trim() : null;

    // 2) 旧站 categories / category
    if (!value) value = readOldCategory(slug);

    // 3) 四字中文标签
    if (!value) {
      const tags = [...fm.matchAll(/^\s*-\s*(.+)$/gm)]
        .map((m) => m[1].trim().replace(/['"]/g, ""))
        .filter(is4CharChinese);
      if (tags.length) value = tags[0];
    }

    // 4) 兜底
    if (!value) {
      value = "其他";
      fallbackOther++;
    }

    // 重写 frontmatter：移除旧 category 行，插入 categories 数组（title 行后）
    const fmLines = fm.split("\n");
    const out = [];
    for (const line of fmLines) {
      if (/^category:/.test(line)) continue; // 删除旧字段
      out.push(line);
      if (/^title:/.test(line)) {
        out.push(`categories:`);
        out.push(`  - ${value}`);
      }
    }
    const newFm = out.join("\n");
    md = md.replace(fm, newFm);
    if (!DRY) fs.writeFileSync(file, md);
    converted++;
    if (value === "其他") notes.push(slug);
  }

  console.log(
    `converted: ${converted}${DRY ? " (dry-run)" : ""} | 兜底「其他」: ${fallbackOther}`
  );
  if (notes.length) console.log("其他:", notes.join(", "));
}

main();
