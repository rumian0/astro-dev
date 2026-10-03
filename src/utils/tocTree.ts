/**
 * tocTree — 目录树构建与渲染（TocButton HUD 面板与 Sidebar 目录卡片共用）
 *
 * 服务端逻辑：astro:content render() 返回的 headings → 树形结构 → HTML 字符串。
 * 客户端高亮引擎见 src/scripts/toc-highlight.ts。
 */

export type TocHeading = { depth: number; slug: string; text: string };

export type TocNode = TocHeading & {
  index: number;
  children: TocNode[];
};

/**
 * 构建树形结构。
 * 关键坑：部分文章正文带 h1（会重复页面标题），若不归一化，
 * 紧随 h1 的 h2 会被错误挂成 h1 的子节点，缩进全乱。
 * 修法：depth = Math.max(2, h.depth)，顶层标题全部成为同级兄弟。
 */
export function buildTocTree(headings: TocHeading[]): TocNode[] {
  const tree: TocNode[] = [];
  const stack: TocNode[] = [];
  let counter = 0;
  for (const h of headings) {
    counter += 1;
    const depth = Math.max(2, h.depth);
    const node: TocNode = { ...h, depth, index: counter, children: [] };
    while (stack.length && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }
    if (stack.length) stack[stack.length - 1].children.push(node);
    else tree.push(node);
    stack.push(node);
  }
  return tree;
}

/**
 * 递归渲染 HTML。
 * 缩进公式：(depth - 2) * 12px —— h2=0, h3=12, h4=24, h5=36
 * 结构：.toc-node[data-depth][padding-left] > .toc-row[data-index] > a.toc-link[data-slug]
 *       .toc-node > .toc-children > .toc-node …
 * 该结构与 toc-highlight.ts 的查询约定一致，两处必须同步修改。
 */
export function renderTocTree(nodes: TocNode[]): string {
  return nodes
    .map(n => {
      const indent = Math.max(0, (n.depth - 2) * 12);
      const childrenHtml = n.children.length
        ? `<div class="toc-children">${renderTocTree(n.children)}</div>`
        : "";
      return `<div class="toc-node" style="padding-left:${indent}px" data-depth="${n.depth}">
        <div class="toc-row" data-index="${n.index}">
          <a href="#${n.slug}" class="toc-link" data-slug="${n.slug}">${n.text}</a>
        </div>${childrenHtml}
      </div>`;
    })
    .join("");
}
