// scripts/migrate-galleries.mjs
// 一次性迁移：旧项目 6 个相册 → 新项目 src/data/galleries/（文件夹结构）。
//
// 旧 (astro-gyoza/src/content/galleries/<name>/index.md) → 新 (astro-devosfera/src/data/galleries/<name>/index.md)
// 字段映射：date → pubDatetime；其余保留。
// 图片：本地图片直接拷贝；manifest JSON 拷贝到 src/data/gallery-manifests/。
//
// 用法：node scripts/migrate-galleries.mjs [--dry-run]

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import matter from "gray-matter";

const nodeRequire = createRequire(import.meta.url);
const yaml = nodeRequire("js-yaml");

const OLD_ROOT = "F:/桌面/study/opencode/astro-gyoza/src/content/galleries";
const NEW_ROOT = path.join(import.meta.dirname, "..", "src", "data", "galleries");
const OLD_MANIFEST = "F:/桌面/study/opencode/astro-gyoza/src/data/gallery-manifests";
const NEW_MANIFEST = path.join(import.meta.dirname, "..", "src", "data", "gallery-manifests");
const DRY = process.argv.includes("--dry-run");

let migrated = 0, imgCopied = 0, manifests = 0;

for (const dir of fs.readdirSync(OLD_ROOT)) {
  const oldDir = path.join(OLD_ROOT, dir);
  if (!fs.statSync(oldDir).isDirectory()) continue;

  const oldFile = path.join(oldDir, "index.md");
  if (!fs.existsSync(oldFile)) continue;

  const raw = fs.readFileSync(oldFile, "utf8").replace(/^\uFEFF/, "");
  const { data, content } = matter(raw);

  // 字段映射：date → pubDatetime
  const newData = { ...data };
  if (newData.date) {
    newData.pubDatetime = newData.date;
    delete newData.date;
  }

  const newDir = path.join(NEW_ROOT, dir);
  fs.mkdirSync(newDir, { recursive: true });

  // 写 index.md
  const out = `---\n${yaml.dump(newData)}---\n${content}`.trim() + "\n";
  if (!DRY) fs.writeFileSync(path.join(newDir, "index.md"), out);

  // 拷贝本地图片
  if (!DRY) {
    for (const f of fs.readdirSync(oldDir)) {
      if (f === "index.md" || f === "index.mdx") continue;
      const src = path.join(oldDir, f);
      if (fs.statSync(src).isFile()) {
        fs.copyFileSync(src, path.join(newDir, f));
        imgCopied++;
      }
    }
  }
  migrated++;
}

// 拷贝 manifest
if (fs.existsSync(OLD_MANIFEST)) {
  if (!DRY) fs.mkdirSync(NEW_MANIFEST, { recursive: true });
  for (const f of fs.readdirSync(OLD_MANIFEST)) {
    if (!DRY) {
      fs.copyFileSync(path.join(OLD_MANIFEST, f), path.join(NEW_MANIFEST, f));
    }
    manifests++;
  }
}

console.log(`\n✅ 相册迁移 ${migrated} 个（图片 ${imgCopied}，manifest ${manifests}）`);
if (DRY) console.log("   [DRY-RUN 模式]");
