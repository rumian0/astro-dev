/**
 * toc-highlight — 目录高亮引擎（TocButton HUD 面板与 Sidebar 目录卡片共用）
 *
 * - rAF 节流的滚动位置探测线（视口顶部往下 18%）确定当前章节
 * - 可选：共享指示条（transform + height 弹簧位移）、章节读数、阅读进度条
 * - 预缓存「对应行 / 严格祖先 toc-node / 文档内绝对 top」，切换只做常量级操作
 * - 依赖的 DOM 结构由 src/utils/tocTree.ts 渲染，两处必须同步修改
 */

export type TocItem = {
  id: string;
  index: number;
  heading: HTMLElement;
  row: HTMLElement;
  ancestors: HTMLElement[];
  top: number;
};

export type TocHighlightOptions = {
  /** 滚动容器（含 [data-slug] 链接） */
  list: HTMLElement;
  /** 定位上下文（共享指示条的 offsetParent） */
  tree: HTMLElement;
  /** 共享指示条（可选） */
  indicator?: HTMLElement | null;
  /** 当前章节读数（可选） */
  curEl?: HTMLElement | null;
  /** 阅读进度条填充（可选） */
  fillEl?: HTMLElement | null;
  /** 阅读进度百分比（可选） */
  pctEl?: HTMLElement | null;
  /** FAB 按钮（可选，用于 title 显示当前章节） */
  fab?: HTMLElement | null;
  signal: AbortSignal;
};

export type TocHighlightHandle = {
  /** 立即重新测量并刷新高亮（面板打开时调用） */
  refresh: () => void;
};

export function initTocHighlight(
  opts: TocHighlightOptions
): TocHighlightHandle | null {
  const { list, tree, signal } = opts;

  // ── 构建索引 ──
  const items: TocItem[] = [];
  list.querySelectorAll<HTMLElement>("[data-slug]").forEach(link => {
    const id = link.getAttribute("data-slug");
    const row = link.closest<HTMLElement>(".toc-row");
    const heading = id ? document.getElementById(id) : null;
    if (!id || !row || !heading) return;

    // 收集严格祖先的 .toc-node（跳过自身所在的那一层）
    const ancestors: HTMLElement[] = [];
    let own = false;
    let el = row.parentElement;
    while (el && el !== tree) {
      if (el.classList.contains("toc-node")) {
        if (own) ancestors.push(el);
        else own = true;
      }
      el = el.parentElement;
    }
    items.push({
      id,
      index: parseInt(row.dataset.index || "1", 10),
      heading,
      row,
      ancestors,
      top: 0,
    });
  });

  if (!items.length) return null;

  // 探测线：视口顶部往下 18%，标题越过此线即算当前章节
  const PROBE_RATIO = 0.18;
  let rafId = 0;
  let active: TocItem | null = null;

  const measure = () => {
    items.forEach(it => {
      it.top = it.heading.getBoundingClientRect().top + window.scrollY;
    });
    items.sort((a, b) => a.top - b.top);
  };

  // 共享指示条：垂直跟随激活行、水平跟随该行层级刻度（::before 钉）的 x。
  // 刻度 x 经计算样式读取，天然适配 HUD / 侧边栏两套几何（--toc-rail / --toc-step 各自定义）。
  // offsetTop / offsetLeft 基于布局（offsetParent = 树容器，不受面板 scale 变换影响）
  const moveIndicator = (it: TocItem) => {
    const ind = opts.indicator;
    if (!ind) return;
    const tick = getComputedStyle(it.row, "::before");
    const x = it.row.offsetLeft + (parseFloat(tick.left) || 0);
    ind.style.opacity = "1";
    ind.style.transform = `translate(${x}px, ${it.row.offsetTop + 2}px)`;
    ind.style.height = `${Math.max(14, it.row.offsetHeight - 4)}px`;
  };

  const activate = (it: TocItem) => {
    if (active && active !== it) {
      active.row.classList.remove("is-active");
      active.ancestors.forEach(n => n.classList.remove("is-ancestor"));
    }
    it.row.classList.add("is-active");
    it.ancestors.forEach(n => n.classList.add("is-ancestor"));
    active = it;

    if (opts.curEl) {
      opts.curEl.textContent = String(it.index).padStart(2, "0");
    }
    moveIndicator(it);

    // 激活项滚进面板可见区域（参考 gyoza 的 block:'nearest'）。
    // offsetParent 为 null 说明列表处于 display:none（如移动端隐藏的侧边栏），跳过
    if (it.row.offsetParent) {
      it.row.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    if (opts.fab) {
      const label = it.row.textContent?.trim() || "";
      opts.fab.title = label ? `目录 · 当前：${label}` : "目录";
    }
  };

  const scheduleUpdate = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;

      // 阅读进度
      const doc = document.documentElement;
      const docHeight = doc.scrollHeight;
      const range = docHeight - window.innerHeight;
      const ratio =
        range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
      if (opts.fillEl) opts.fillEl.style.width = `${(ratio * 100).toFixed(1)}%`;
      if (opts.pctEl) opts.pctEl.textContent = `${Math.round(ratio * 100)}%`;

      // 当前章节
      const probe = window.scrollY + window.innerHeight * PROBE_RATIO;
      let current = items[0];
      for (const it of items) {
        if (it.top <= probe) current = it;
        else break;
      }
      // 滚到底部固定最后一节
      if (window.innerHeight + window.scrollY >= docHeight - 2) {
        current = items[items.length - 1];
      }
      if (current !== active) activate(current);
    });
  };

  let resizeRaf = 0;
  const reMeasure = () => {
    if (resizeRaf) return;
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0;
      measure();
      if (active) moveIndicator(active);
      scheduleUpdate();
    });
  };

  const refresh = () => {
    measure();
    scheduleUpdate();
  };

  measure();
  scheduleUpdate();

  // 滚动 / 尺寸变化 / 字体与图片加载导致布局重排时都要跟上
  window.addEventListener("scroll", scheduleUpdate, { passive: true, signal });
  window.addEventListener("resize", reMeasure, { passive: true, signal });
  if (document.fonts) {
    document.fonts.ready.then(reMeasure).catch(() => {});
  }
  document
    .getElementById("main-content")
    ?.querySelectorAll("img")
    .forEach(img => {
      if (!img.complete) {
        img.addEventListener("load", reMeasure, { signal, once: true });
      }
    });

  return { refresh };
}
