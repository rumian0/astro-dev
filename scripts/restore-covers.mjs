#!/usr/bin/env node
/**
 * restore-covers.mjs — 从旧站（astro-gyoza，只读）恢复文章头图地址
 * 旧站 frontmatter: cover: 'https://r2.mingcy.cn/xxx.webp'
 * 新站主题写法: ogImage: '<url>'（ogImage 接受字符串 URL，Card/PostDetails 用作头图兜底）
 *
 * 用法:
 *   node scripts/restore-covers.mjs              # 全部
 *   node scripts/restore-covers.mjs --dry-run    # 预览
 *   node scripts/restore-covers.mjs --slug pi-dev
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const NEW_DATA = path.join(ROOT, "src", "data", "blog");
const OLD_POSTS = "F:/桌面/study/opencode/astro-gyoza/src/content/posts";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const onlySlug =
  args.indexOf("--slug") >= 0 ? args[args.indexOf("--slug") + 1] : null;

/** 读取旧站 frontmatter 的 cover 值 */
function readOldCover(slug) {
  const p = path.join(OLD_POSTS, slug, "index.md");
  if (!fs.existsSync(p)) return null;
  const raw = fs.readFileSync(p, "utf8");
  const m = raw.match(/^cover:\s*['"]?([^'"\n]+)['"]?\s*$/m);
  return m ? m[1].trim() : null;
}

/** 在新站 frontmatter 中插入 ogImage（已存在则跳过；正确处理多行折叠 description） */
function insertOgImage(md, url) {
  if (/^ogImage:/m.test(md)) return md;
  const lines = md.split("\n");
  // 找到 description 行
  let idx = lines.findIndex(l => /^description:/.test(l));
  if (idx === -1) idx = lines.findIndex(l => /^pubDatetime:/.test(l));
  const descLine = lines[idx] || "";
  // 若 description 是多行折叠/块标量（>- / |- / > / | 等），跳过其后所有缩进行
  if (/^description:\s*[>|][-+0-9]*\s*$/.test(descLine)) {
    idx++;
    while (idx < lines.length && /^\s+/.test(lines[idx])) idx++;
    idx--; // 停在最后一个缩进行之后
  }
  const ins = Math.min(idx + 1, lines.length - 1);
  lines.splice(ins, 0, `ogImage: '${url}'`);
  return lines.join("\n");
}

function main() {
  const slugs = fs
    .readdirSync(NEW_DATA)
    .filter(d => fs.statSync(path.join(NEW_DATA, d)).isDirectory())
    .filter(d => !onlySlug || d === onlySlug);

  let done = 0;
  let skipped = 0;
  const missingCover = [];

  for (const slug of slugs) {
    const file = ["index.md", "index.mdx"]
      .map(f => path.join(NEW_DATA, slug, f))
      .find(f => fs.existsSync(f));
    if (!file) continue;

    let md = fs.readFileSync(file, "utf8");
    if (/^ogImage:/m.test(md)) {
      skipped++;
      continue;
    }

    const cover = readOldCover(slug);
    if (!cover) {
      missingCover.push(slug);
      continue;
    }

    const updated = insertOgImage(md, cover);
    if (updated !== md) {
      if (!DRY) fs.writeFileSync(file, updated);
      done++;
    }
  }

  console.log(
    `restored: ${done}, already has ogImage: ${skipped}, no cover in old site: ${missingCover.length}${DRY ? " (dry-run)" : ""}`
  );
  if (missingCover.length) {
    console.log("no cover:", missingCover.slice(0, 20).join(", "));
  }
}

main();
