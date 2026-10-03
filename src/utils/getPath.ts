import { slugifyStr } from "./slugify";

/**
 * One-folder-per-post slug: id is `<slug>/index` (folder) or `<slug>` (flat).
 * Strip the trailing `/index` and slugify the folder name.
 */
export function getBlogSlug(id: string): string {
  return slugifyStr(id.replace(/\/index$/, ""));
}

/**
 * Legacy path helper (folder-aware). Returns `/posts/<slug>` by default.
 * Prefer `getPostPath` for blog detail permalinks (date-based).
 * Still used as the OG-image base fallback and by callers that don't have a date.
 */
export function getPath(
  id: string,
  _filePath: string | undefined,
  includeBase = true
): string {
  const basePath = includeBase ? "/posts" : "";
  const slug = getBlogSlug(id);
  return [basePath, slug].join("/");
}

/**
 * Date-based permalink: `/YYYY/MM/DD/<slug>/` (UTC, matches the noon-normalized
 * pubDatetime so the URL is stable across builds and timezones).
 */
export function getPostPath(post: {
  id: string;
  data: { pubDatetime: Date };
}): string {
  const d = post.data.pubDatetime;
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const slug = getBlogSlug(post.id);
  return `/${yyyy}/${mm}/${dd}/${slug}/`;
}
