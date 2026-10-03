import { visit } from "unist-util-visit";
import { h } from "hastscript";

type Part = { mark: boolean; text: string };

/**
 * rehypeMark — `==highlighted==` → <mark>highlighted</mark>
 *
 * Operates on HAST text nodes. Skips <code>/<pre> so `a == b` in code is safe.
 */
export function rehypeMark() {
  return (tree: any) => {
    visit(tree, "text", (node: any, index: number | undefined, parent: any) => {
      if (!parent || typeof index !== "number") return;
      const tag = parent.tagName as string | undefined;
      if (tag === "code" || tag === "pre") return;
      const value: string = node.value;
      if (!value.includes("==")) return;
      const parts = splitMark(value);
      if (parts.length === 1) return;

      const newNodes = parts.map(part =>
        part.mark
          ? h("mark", part.text)
          : { type: "text", value: part.text }
      );
      parent.children.splice(index, 1, ...newNodes);
    });
  };
}

function splitMark(s: string): Part[] {
  const out: Part[] = [];
  let i = 0;
  while (i < s.length) {
    const start = s.indexOf("==", i);
    if (start === -1) {
      out.push({ mark: false, text: s.slice(i) });
      break;
    }
    if (start > i) out.push({ mark: false, text: s.slice(i, start) });
    const end = s.indexOf("==", start + 2);
    if (end === -1) {
      out.push({ mark: false, text: s.slice(start) });
      break;
    }
    out.push({ mark: true, text: s.slice(start + 2, end) });
    i = end + 2;
  }
  return out;
}
