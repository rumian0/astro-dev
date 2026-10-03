/// <reference path="../../.astro/types.d.ts" />

import type { CollectionEntry } from "astro:content";
import { getPostPath } from "./getPath";

export type ContentEntry = CollectionEntry<"blog"> | CollectionEntry<"galleries">;

const isGalleryEntry = (
  entry: Pick<ContentEntry, "collection">
): entry is CollectionEntry<"galleries"> => entry.collection === "galleries";

export const getGallerySlug = (id: string) =>
  id.replace(/\/index(?:\.(?:md|mdx))?$/, "");

/**
 * Canonical public path for any content entry.
 * - blog → date-based permalink `/YYYY/MM/DD/<slug>/`
 * - galleries → `/galleries/<slug>`
 */
export const getEntryPath = (
  entry: Pick<ContentEntry, "collection" | "id" | "filePath"> & {
    data: { pubDatetime: Date };
  }
) =>
  isGalleryEntry(entry)
    ? `/galleries/${getGallerySlug(entry.id)}`
    : getPostPath(entry);

export const getEntryPublishedMs = (entry: ContentEntry) => {
  const modDatetime =
    "modDatetime" in entry.data ? entry.data.modDatetime : null;
  return new Date(modDatetime ?? entry.data.pubDatetime).getTime();
};
