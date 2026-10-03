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
 * 递归渲染 HTML（参考 gyoza PostToc 的视觉结构 + 「层级缩进」重构）。
 *
 * 结构：.toc-node[data-depth][style="--toc-level:N"]
 *          > a.toc-row.toc-link[data-slug][data-index]
 *              > span.toc-text
 *        .toc-node > .toc-children > .toc-node …
 *
 * 关键视觉（几何全部由内联的 --toc-level 驱动，HUD / 侧边栏各自定义 --toc-rail / --toc-step）：
 *  - 真实层级缩进：整行（含 hover/active 药丸）按层级逐级右移，
 *    padding-left = calc(1.1rem + var(--toc-level) * var(--toc-step))
 *  - 分级刻度：.toc-row::before 钉在各自层级 x（0 级在主干上，其余成阶梯）
 *  - 树枝肘线：depth≥3 的行由 .toc-row::after 从父级刻度横向连到本级刻度
 *  - 树主干：.toc-tree::before 一条贯穿左缘的细线（各组件自行定义）
 *  - 缩进不再由 .toc-text 的 inline padding 承担（已删除）
 *
 * 该结构与 toc-highlight.ts 的查询约定一致（[data-slug] / .toc-row / .toc-node 祖先链），
 * 且共享指示条的水平 x 由行 ::before 的计算样式动态读取，两处必须同步修改。
 */
export function renderTocTree(nodes: TocNode[]): string {
  return nodes
    .map(n => {
      const level = Math.max(0, n.depth - 2);
      const childrenHtml = n.children.length
        ? `<div class="toc-children">${renderTocTree(n.children)}</div>`
        : "";
      return `<div class="toc-node" data-depth="${n.depth}" style="--toc-level:${level}">
        <a href="#${n.slug}" class="toc-row toc-link" data-slug="${n.slug}" data-index="${n.index}">
          <span class="toc-text">${n.text}</span>
        </a>${childrenHtml}
      </div>`;
    })
    .join("");
}
