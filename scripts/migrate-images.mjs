#!/usr/bin/env node
/**
 * migrate-images.mjs — 将文章图片从 public/assets/blog/<slug> 迁移到 src/data/blog/<slug>
 * （与 index.md 同文件夹，方便管理），并重写 markdown 中的图片引用为相对路径。
 *
 * 用法:
 *   node scripts/migrate-images.mjs                  # 全部迁移
 *   node scripts/migrate-images.mjs --slug pi-dev    # 只迁移指定 slug
 *   node scripts/migrate-images.mjs --dry-run        # 只预览不改动
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC_ASSETS = path.join(ROOT, "public", "assets", "blog");
const SRC_DATA = path.join(ROOT, "src", "data", "blog");

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const onlySlug =
  args.indexOf("--slug") >= 0 ? args[args.indexOf("--slug") + 1] : null;

const EXTS = ["webp", "png", "jpg", "jpeg", "gif"];
const EXT_RE = /\.(webp|png|jpg|jpeg|gif)$/i;

/** 规范化引用文件名 */
function normalizeRefName(name) {
  let n = name.replace(/[>)\]"'\s]+$/, "");
  // 损坏：xxx_.webp / xxx_.png
  n = n.replace(/_(\.(webp|png|jpg|jpeg|gif))$/i, "$1");
  // 损坏：xxx. （无扩展）
  if (n.endsWith(".")) n = n.slice(0, -1);
  if (EXT_RE.test(n)) return n;
  // 无扩展：xxx_webp → xxx.webp
  const m = n.match(/^(.*?)_(webp|png|jpg|jpeg|gif)$/i);
  if (m) return `${m[1]}.${m[2]}`;
  return n;
}

/** 从引用名推断真实存在的图片文件名（尝试多种扩展与 _ext 变体） */
function findRealFile(slug, name) {
  const cands = [name];
  if (EXT_RE.test(name)) {
    cands.push(name.replace(EXT_RE, "") + "_" + name.split(".").pop());
  } else {
    for (const e of EXTS) cands.push(`${name}.${e}`, `${name}_${e}`);
  }
  for (const c of cands) {
    for (const base of [SRC_DATA, SRC_ASSETS]) {
      if (fs.existsSync(path.join(base, slug, c))) return c;
    }
  }
  return null;
}

function main() {
  const slugs = fs
    .readdirSync(SRC_DATA)
    .filter(d => fs.statSync(path.join(SRC_DATA, d)).isDirectory())
    .filter(d => !onlySlug || d === onlySlug);

  let totalRefs = 0;
  let totalCopied = 0;
  const missing = [];
  const copied = [];

  for (const slug of slugs) {
    // 兼容 index.md 与 index.mdx
    const files = ["index.md", "index.mdx"]
      .map(f => path.join(SRC_DATA, slug, f))
      .filter(f => fs.existsSync(f));
    for (const mdPath of files) {
      let md = fs.readFileSync(mdPath, "utf8");
      let changed = false;

      md = md.replace(/!\[[^\]]*\]\(([^)]+)\)/g, (full, ref) => {
        // 清理：尖括号包裹 <...>、杂前缀（如 mm-/assets/...）、引号
        let clean = ref.replace(/^\s*[<"']/, "").replace(/[>"'\s]+$/, "");
        const pfx = `/assets/blog/${slug}/`;
        const isLocal =
          clean.startsWith(pfx) || clean.startsWith("./") || clean.includes(pfx);
        if (!isLocal) return full;

        if (clean.includes(pfx)) clean = clean.slice(clean.lastIndexOf(pfx) + pfx.length);
        else clean = clean.replace(/^\.\//, "");

        const name = normalizeRefName(clean);
        const real = findRealFile(slug, name || clean);

        if (!real) {
          missing.push(`${slug}/${clean}`);
          return full;
        }

        // 复制图片到文章同目录（幂等）
        const dest = path.join(SRC_DATA, slug, real);
        if (!fs.existsSync(dest)) {
          const src = path.join(SRC_ASSETS, slug, real);
          if (fs.existsSync(src)) {
            if (!DRY) fs.copyFileSync(src, dest);
            copied.push(`${slug}/${real}`);
            totalCopied++;
          }
        }

        const newRef = `./${real}`;
        if (newRef !== ref && !DRY) changed = true;
        totalRefs++;
        return full.replace(ref, newRef);
      });

      if (changed && !DRY) fs.writeFileSync(mdPath, md);
    }
  }

  console.log(
    `refs: ${totalRefs}, copied: ${totalCopied}, missing: ${missing.length}${DRY ? " (dry-run)" : ""}`
  );
  if (copied.length) console.log("copied sample:", copied.slice(0, 5).join(", "));
  if (missing.length) {
    console.log("MISSING:");
    missing.slice(0, 30).forEach(x => console.log("  " + x));
  }
}

main();
