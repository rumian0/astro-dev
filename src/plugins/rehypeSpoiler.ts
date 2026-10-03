import { visit } from "unist-util-visit";
import { h } from "hastscript";

type Part = { spoiler: boolean; text: string };

/**
 * rehypeSpoiler — `||hidden text||` →
 *   <span class="spoiler" title="你知道的太多了">hidden text</span>
 *
 * Operates on HAST text nodes (after remark→rehype), so it needs no micromark
 * extension. Skips text inside <code>/<pre> so code like `a || b` is untouched.
 */
export function rehypeSpoiler() {
  return (tree: any) => {
    visit(tree, "text", (node: any, index: number | undefined, parent: any) => {
      if (!parent || typeof index !== "number") return;
      // Skip code contexts
      const tag = parent.tagName as string | undefined;
      if (tag === "code" || tag === "pre") return;
      const value: string = node.value;
      if (!value.includes("||")) return;
      const parts = splitSpoiler(value);
      if (parts.length === 1) return; // nothing matched

      const newNodes = parts.map(part =>
        part.spoiler
          ? h("span", { class: "spoiler", title: "你知道的太多了" }, part.text)
          : { type: "text", value: part.text }
      );
      parent.children.splice(index, 1, ...newNodes);
      // No return value: visit advances to index+1, which is the 2nd inserted node.
      // The first inserted node can never contain a fresh `||…||` pair (splitSpoiler
      // consumed all pairs), so it won't be re-matched.
    });
  };
}

function splitSpoiler(s: string): Part[] {
  const out: Part[] = [];
  let i = 0;
  while (i < s.length) {
    const start = s.indexOf("||", i);
    if (start === -1) {
      out.push({ spoiler: false, text: s.slice(i) });
      break;
    }
    if (start > i) out.push({ spoiler: false, text: s.slice(i, start) });
    const end = s.indexOf("||", start + 2);
    if (end === -1) {
      // unmatched opener: keep literal
      out.push({ spoiler: false, text: s.slice(start) });
      break;
    }
    const inner = s.slice(start + 2, end);
    out.push({ spoiler: true, text: inner });
    i = end + 2;
  }
  return out;
}
