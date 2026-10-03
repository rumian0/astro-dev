# Devosfera 博客（茗辰原版）

基于 [AstroPaper](https://github.com/satnaing/astro-paper) 主题深度定制的版本，拥有全新的视觉风格、图片画廊、全局搜索弹窗以及大量视觉与交互改进。本仓库是 [茗辰原](https://mingcy.cn) 个人博客迁移到该主题后的完整源码。

**🌐 在线演示：** [mingcy.cn](https://mingcy.cn)

![Devosfera OG](public/devosfera-og.webp)

> **说明：** 本项目主要是我的个人博客。任何使用者都可以自由删除所有文章条目并修改设置。

> [!IMPORTANT]
> **社交链接与个人 URL 不再硬编码。**
> 它们从环境变量加载，这样仓库的 fork 不会暴露原作者的私人数据。
> 运行项目前请复制 `.env.example` → `.env` 并填入你自己的值。详见 [配置](#️-配置) 部分。

---

## 目录

1. [功能特性](#-功能特性)
2. [项目结构](#-项目结构)
3. [安装与本地开发](#-安装与本地开发)
4. [命令](#-命令)
5. [创建内容](#-创建内容)
   - [文章](#文章-srcdatablog)
   - [相册（画廊）](#相册画廊-srcdatagalleries)
6. [GalleryEmbed 组件](#️-galleryembed-组件)
7. [配置](#️-配置)
8. [上游已解决的问题](#-上游已解决的问题)
9. [许可协议](#-许可协议)
10. [更新记录 Update](#️-更新记录-update)

---

## ✨ 功能特性

### 核心能力（继承自 AstroPaper）

- 类型安全的 Markdown、良好的性能、无障碍与响应式支持
- 完整的 SEO（meta 标签、Open Graph、sitemap、RSS）、明暗双主题
- 使用 Satori 动态生成 OG 图片

### 现代化的设计

- 带有动画提示的 Hero 区，可在 `src/config.ts` 的 `heroTerminalPrompt` 中配置（默认：`~/ready-to-go $`）
- 全局背景：网格 + 光标辉光 + 噪点纹理（全站生效，可在 `src/config.ts` 中配置开关）
- 导航栏、卡片与弹窗采用毛玻璃（Glassmorphism）效果

### 自定义字体排版

| 角色          | 字体                       |
| :------------ | :------------------------- |
| 正文          | `Wotfard`（本地）          |
| 代码 / 等宽   | `Cascadia Code`（本地）    |
| 斜体 / 三级标题 | `Sriracha`（本地）         |

### 全局搜索（⌘K）

- 通过 `⌘K` / `Ctrl+K` 打开搜索弹窗，由 **Pagefind**（静态索引）驱动，支持完整的键盘导航（本地测试请先执行 `pnpm run build`，再执行 `pnpm run dev` 或 `pnpm run preview`，因为索引只在生产构建时生成）

### 图片画廊（`/galleries`）

- 相册位于 `src/data/galleries/<slug>/`；图片在构建时优化（srcset、WebP、懒加载）
- 原生 `<dialog>` 灯箱、重新设计的全屏布局、键盘导航与边缘感知的上一张/下一张控制
- `<GalleryEmbed>` 组件可在 MDX 文章内直接嵌入画廊，无需手动导入
- 由 `src/config.ts` 中的 `showGalleries` 控制（同时决定画廊是否进入混合信息流）——详见 [GALLERIES.md](GALLERIES.md)

### 统一混合信息流（文章 + 画廊）

- 由 `src/config.ts` 中的 `showGalleriesInIndex` 控制（仅在 `showGalleries` 为 `true` 时生效）
- 两个开关都开启时，画廊条目会出现在 `/`、`/posts`、`/archives`、`/tags` 与 `/rss.xml` 中
- 共享的 URL/日期辅助函数保证所有列表页的路由与发布日期排序一致
- 画廊条目在卡片与归档时间线中带有视觉徽章

### 性能与可维护性改进

- 关键路由使用 `Promise.all` 并行加载集合
- 针对更大内容集优化了排序与标签提取逻辑
- 加强了博客/画廊条目间的共享类型（移除薄弱 `any` 用法）
- 通过集中化条目辅助函数减少重复的路由/slug 逻辑

### 品牌化音频播放器

- Hero 区的开场音频播放器，终端风格（波形条、进度条）
- 可在 `src/config.ts` 中完全开关与配置

### 重新设计的页面

| 页面        | 亮点                                             |
| :---------- | :----------------------------------------------- |
| `/` 首页    | 终端风格 Hero、精选网格、区块计数器、可选混合信息流 |
| `/archives` | 带辉光的纵向时间线，包含画廊条目                 |
| `/tags`     | 带比例进度条的标签网格                           |
| `/search`   | 响应式极光背景、重新样式化的 Pagefind            |
| 文章列表    | 分页混合信息流（文章 + 画廊）、内联 Pagefind 搜索 |

---

## 🚀 项目结构

```
/
├── public/
│   ├── audio/             # 音频文件（开场等）
│   └── pagefind/          # 搜索索引（构建时生成）
├── src/
│   ├── assets/            # 本地字体、SVG 图标与 Logo
│   ├── components/        # 可复用的 Astro 组件
│   ├── data/
│   │   ├── blog/          # 文章 .md / .mdx（每篇一个文件夹：index.md + 图片）
│   │   └── galleries/     # 相册（每个相册一个文件夹）
│   ├── layouts/           # 根布局、文章详情等
│   ├── pages/             # Astro 路由
│   ├── styles/            # global.css、typography.css
│   └── utils/             # 过滤器、OG 生成（Satori）、Shiki 转换器
└── astro.config.ts
```

---

## 👨🏻‍💻 安装与本地开发

**环境要求：** Node.js 20+ 与 pnpm。

```bash
# 1. 安装依赖
pnpm install

# 2. 启动开发服务器
pnpm run dev
# → http://localhost:4321
```

Pagefind 搜索索引**仅在生产构建中可用**。本地测试请执行：

```bash
pnpm run build && pnpm run preview/dev
```

### Docker

```bash
docker build -t devosfera-blog .
docker run -p 4321:80 devosfera-blog
```

---

## 🧞 命令

| 命令            | 说明                                                 |
| :-------------- | :--------------------------------------------------- |
| `pnpm install`  | 安装依赖                                             |
| `pnpm run dev`  | 本地开发服务器（`localhost:4321`）                   |
| `pnpm run build` | 生产构建（`astro check` + 构建 + Pagefind）          |
| `pnpm run preview` | 预览生产构建                                        |
| `pnpm run format` | 使用 Prettier 格式化                                 |
| `pnpm run lint`  | 使用 ESLint 检查                                     |

> `pnpm run build` 内部会执行 `pagefind --site dist && cp -r dist/pagefind public/`。搜索索引会生成到 `public/pagefind/` 供预览使用。

---

## 📝 创建内容

### 文章（`src/data/blog/`）

每篇文章一个文件夹：`src/data/blog/<slug>/index.md`（或 `index.mdx`），图片与文章位于同一文件夹内，方便管理。frontmatter 示例：

```yaml
---
title: "文章标题"
pubDatetime: 2026-01-15T10:00:00Z   # 必填 — ISO 8601 带时区
description: "用于 SEO 与卡片的简短描述"
categories: ["技术分享"]             # 分类（数组，卡片徽章与 /categories 页面使用）
tags: ["astro", "dev"]
featured: false       # 在首页精选（已默认关闭精选区块）
draft: false          # 生产环境隐藏
timezone: "America/Guatemala"  # 覆盖 SITE.timezone
hideEditPost: false
---
```

**MDX**：可以直接使用 JSX 组件。`<GalleryEmbed>` 无需导入即可使用（见下一节）。

**目录（TOC）**：文章正文只要包含 `## 二级标题` / `### 三级标题`，右下角的目录按钮会自动出现（少于 2 个标题时自动隐藏）。

**带注释的代码块**（通过 Shiki 转换器）：

```
// [!code highlight]      → 高亮该行
// [!code ++]             → 新增行（diff）
// [!code --]             → 删除行（diff）
// fileName: file.ts      → 在代码块上方显示文件名
```

---

### 相册（画廊）（`src/data/galleries/`）

快速上手：

1. 在 `src/data/galleries/<slug>/` 创建文件夹。
2. 添加 `index.md`（相册元数据）与图片文件。
3. 使用数字前缀（`01-`、`02-`、…）控制图片顺序。
4. 文件夹 slug 即路由：`/galleries/<slug>`。

完整细节（frontmatter 字段、封面行为、alt 生成与图片优化）见 [GALLERIES.md](GALLERIES.md)。

---

## 🖼️ GalleryEmbed 组件

在任何 `.mdx` 文章中嵌入画廊——**无需导入**：

```mdx
<GalleryEmbed slug="my-trip-to-tokyo" />
```

可选属性：`limit`（`0` = 全部）、`cols`（`2 | 3 | 4`）、`showLink`（`true/false`）。

高级用法、完整属性说明、灯箱行为与无效 slug 回退见 [GALLERIES.md](GALLERIES.md#galleryembed--gallery-inside-mdx-posts)。

---

## ⚙️ 配置

所有站点配置都在 `src/config.ts`（`SITE` 常量）中：包括常规设置（标题、描述、时区）、功能开关（画廊、音频播放器、混合信息流）与内容限制（每页文章数、画廊嵌入数量）。

社交链接与"分享"链接定义在 `src/constants.ts`。

> [!WARNING]
> **破坏性变更——社交链接移入环境变量。**
>
> 此前社交 URL（GitHub、X、LinkedIn、邮箱）与"编辑此文"URL 硬编码在 `src/constants.ts` 与 `src/config.ts` 中。这导致仓库的每个 fork 都会公开原作者的个人数据，引发不必要的骚扰。
>
> **变更内容：**
>
> | 变量 | 控制的项 |
> | :--- | :--- |
> | `PUBLIC_SOCIAL_GITHUB` | GitHub 主页链接与 JSON-LD 作者 URL |
> | `PUBLIC_SOCIAL_X` | X / Twitter 主页链接 |
> | `PUBLIC_SOCIAL_LINKEDIN` | LinkedIn 主页链接 |
> | `PUBLIC_SOCIAL_EMAIL` | 联系邮箱（以 `mailto:` 链接显示） |
> | `PUBLIC_EDIT_POST_URL` | "编辑此文"按钮的基础 URL |
>
> **fork 或更新后恢复你的社交链接：**
>
> ```bash
> cp .env.example .env
> # 在 .env 中填入你自己的值
> ```
>
> 生产部署（Vercel、Netlify 等）时，请在平台的运行环境设置中添加这些变量。
> 任何**未设置**的变量只会隐藏对应的社交链接——不会报错，也不会破坏界面。

---

## 🐛 上游已解决的问题

来自官方 [AstroPaper](https://github.com/satnaing/astro-paper) 仓库并在本版本中实现的 Bug 修复与功能请求：

| Issue                                                       | 说明                                                                                                                                    | 涉及文件                                     | 鸣谢                                                                                                            |
| :---------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------- | :--------------------------------------------------------------------------------------------------------------- |
| [#614](https://github.com/satnaing/astro-paper/issues/614)  | **返回顶部按钮在 `ShareLinks` 为空时挤压分页按钮**                                                                                      | `BackToTopButton.astro`                       | —                                                                                                                |
| [#574](https://github.com/satnaing/astro-paper/issues/574)  | **Markdown 表格在移动端撑出布局** —— 通过 `w-full table-auto` 与单元格 `word-wrap` 修复                                              | `typography.css`                              | [@GladerJ](https://github.com/GladerJ) — [方案](https://github.com/satnaing/astro-paper/issues/574#issuecomment-3427381261) |
| [#569](https://github.com/satnaing/astro-paper/issues/569)  | **返回顶部按钮在桌面端不一致** —— 统一为带进度环的圆形设计并 `fixed` 定位                                                            | `BackToTopButton.astro`、`PostDetails.astro`  | —                                                                                                                |
| [#566](https://github.com/satnaing/astro-paper/issues/566)  | **分享链接不在新标签页打开** —— 添加 `target="_blank"` 与 `rel="noopener noreferrer"`                                                | `ShareLinks.astro`                            | [PR #611](https://github.com/satnaing/astro-paper/pull/611) by [@zerone0x](https://github.com/zerone0x)           |
| [#131](https://github.com/satnaing/astro-paper/issues/131)  | **不支持 MDX** —— 添加 `@astrojs/mdx` 集成并开启 `extendMarkdownConfig: true`                                                        | `astro.config.ts`、`content.config.ts`        | —                                                                                                                |
| [#495](https://github.com/satnaing/astro-paper/issues/495)  | **按时区过滤文章结果不一致** —— 用 `dayjs` + `utc`/`timezone` 插件修复；同时修复了参考方案中误用 `.millisecond()` 而非 `.valueOf()` 的 Bug | `postFilter.ts`                              | [@kj-9](https://github.com/kj-9) — [参考修复](https://github.com/satnaing/astro-paper/compare/main...kj-9:astro-paper:fix-post-filter-date) |
| [#553](https://github.com/satnaing/astro-paper/issues/553)  | **没有相册区块** —— 实现完整的 `/galleries` 区块：灯箱、`GalleryEmbed`、图片优化与 `showGalleries` 开关。见 [GALLERIES.md](GALLERIES.md) | 多个 — 见 GALLERIES.md                         | —                                                                                                                |

---

## 🔧 排障记录 Troubleshooting

### `.astro` 报 `Unexpected ","`，但 `astro check` 全绿

**现象**：`astro dev` / `astro build` 报

```
[ERROR] Unexpected ","
  Stack trace:
    at .../src/components/Xxx.astro:110:1
```

但 `astro check` 显示 0 错误，且报错行号指向的是一行完全正常的模板 HTML。

**根因**：`astro check` 走 TypeScript / Volar 解析器，**带容错恢复**——比如某个 `function` 少了闭合花括号，它会静默地把后续语句当成函数体的一部分，于是全绿；而构建走 esbuild，严格解析，直接报错。

更坑的是**报错位置会被误导**：未闭合的 `function` 会吞掉后面的 `return $$render\`...\``，导致本该关闭外层箭头函数的那个 `}` 先关掉了内层函数，esbuild 便在该函数体里撞到下一个逗号。

**定位方法**：别信行号，直接用 Astro 编译器复现产物再喂给 esbuild：

```bash
node -e \
"const fs=require('fs');const{transform}=require('@astrojs/compiler');\nconst esbuild=require('esbuild');\ntransform(fs.readFileSync('src/components/TocButton.astro','utf8'),{filename:'TocButton.astro'})\n.then(r=>esbuild.transformSync(r.code,{loader:'ts'}));"
```

`esbuild` 抛出的行号才是真位置。2026-10 的 `TocButton.astro` 就是这样查出 `renderTree()` 缺一个 `}` 的。

---

## 📜 许可协议

基于 [AstroPaper](https://github.com/satnaing/astro-paper)（作者 [Sat Naing](https://satnaing.dev)），MIT 许可。
自定义部分 © [0xdres](https://github.com/0xdres)、[茗辰原](https://mingcy.cn)。

---

## 🔄 更新记录 Update

> 以下为本仓库自原主题 fork 后针对**茗辰原（mingcy.cn）**个人博客迁移所做的全部修改。

### 2026-10-03 迁移完成

#### 1. 侧边栏（合并旧站左右两栏，统一右侧）

- 新组件 `src/components/Sidebar.astro`，合并旧站 mingcy.cn 首页的左右两个侧边栏内容：
  - **资料卡**：头像（`mingcy.cn/image/mcy.png`）、名字、简介、profile-nav 4 图标快捷导航（首页/归档/项目/关于）、社交
  - **今日一言**：`SITE.hero.yiyan` 引用
  - **问候时钟**：实时钟表 + 日期星期 + 按时段问候语（GreetingClock 复刻）
  - **随笔插画**：`webp.mingcy.cn` 随机图
  - **站点信息**：构建平台/技术栈/折叠按钮
- 首页布局：`lg:grid-cols-[minmax(0,1fr)_18rem]`，内容在左、**sticky 侧边栏在右**，与「最新文章」平行（不顶格）

#### 2. 导航（仿清羽 blog.liushen.fun）

- `src/config.ts` 的 `SITE.nav` 重构为分组结构：**整理**（时光卷轴/文章标签/文章分类/文章通览）、**友人**（友链展示/朋友动态）、**作品**（相册/项目/工具）、**关于**（站长资料）
- `Header.astro`：下拉分组菜单（**二级菜单横向排布**）+ **glide pill 滑动药丸**（hover 跟随、按元素实际宽高定位、离轨回到活动项）
- 修复：下拉内 pill 误匹配导致的左侧留白、一级菜单胶囊错位、trigger→下拉间隙误关（160ms 关闭延迟）、导航切换后残留展开状态
- `MobileMenu.astro`：`<details>` 折叠分组菜单

#### 3. 新增页面

- **`/categories` 分类页**（`src/pages/categories.astro`）：分类卡片墙（轨道光点动画 + 悬停辉光，仿 liushen）+ 各分类文章列表 + 锚点跳转
- **`/projects` 项目页**（`src/pages/projects.astro`）：6 个项目卡片（封面图补全 mingcy.cn 前缀、访问/源码链接）
- **`/tools` 工具页**（`src/pages/tools.astro`）：39 个在线工具按标签分组展示
- **`/links/fcircle` 友圈页**：使用 `public/fclite/` 内的 **FCLite 插件**（`fclite.js` + `fclite.css` 本地化）渲染动态流——随机文章卡（换一换）、统计栏（订阅/活跃/文章/失败）、响应式卡片墙、作者弹窗（最近文章）、加载更多

#### 3.1 友圈加载优化（预填插件缓存）

- 构建时服务端预取 `fc.mingcy.cn/all.json` → 内联 `#fc-preload` JSON
- 客户端将内联数据**预填到 FCLite 插件的 localStorage 缓存**（`friend-circle-lite-cache`，10 分钟有效期）→ **首屏零等待渲染**，缓存到期后插件自动重新拉取更新
- 构建失败/无内联数据时回退客户端 fetch（插件自带逻辑）
- 插件 CSS 变量映射站点主题（accent/foreground/border，明暗通吃）；保留友链状态区（`status.json` 正常/异常 + 卡片网格）

#### 4. 文章数据迁移

- **图片与文章同文件夹**：`scripts/migrate-images.mjs` 将 480 处图片引用迁移为相对路径（`index.md` 与图片同在 `src/data/blog/<slug>/`），删除 90MB 重复的 `public/assets/blog/`
- **恢复头图**：`scripts/restore-covers.mjs` 从旧站（astro-gyoza，只读）读取 `cover:` 写入新站 `ogImage`（新主题写法），**78 篇恢复**；9 篇无封面走动态 OG
- **分类字段**：`scripts/add-categories.mjs` 为 **86 篇文章全部添加 `categories:[...]`**（取值：旧站 category → 四字中文标签 → 兜底「其他」），移除旧 `category:` 字段
- **卡片分类徽章**：分类徽章与标签**同一行**显示，accent 样式 + 文件夹图标，链接到 `/categories/#cat-<slug>`

#### 5. 首页

- Hero 放大至 **屏幕 3/4 高度**（min-h-[72vh/75vh]）垂直居中
- Hero 右侧新增**头像**（`mingcy.cn/image/mcy.png`，带旋转光环动画，独立于侧边栏，**移动端隐藏**）
- Logo 由 "Dev{·}sfera" 改为 **"Ming{·}CY"**
- 移除「精选」区块（默认只展示最新文章）
- 文案更新：「INFJ-T | 学生 | 网络安全爱好者 | 茶香四溢·编程世界。记录编程、网络安全与生活的点滴。」

#### 6. 目录 TOC（HUD 风格）

- 新组件 `src/components/TocButton.astro`，挂在 `PostDetails.astro`，**仅文章页生效**
- 右下角圆形浮动按钮 → 点击向上弹出 **HUD 目录面板**（底部固定「评论」导航项）
- 服务端用 `astro:content` 的 `render()` 返回的 `headings` 构建标题树（非扫描 DOM），
  并把 **h1 归一化为 h2**（部分文章正文带 h1，否则紧随的 h2 会被错误挂成 h1 的子节点）
- **共享指示条**：一条发光 accent 竖条在条目间做弹簧位移（`transform` + `height` 过渡），
  复刻 gyoza 的 framer-motion `layoutId` 效果，但**零新增 JS 依赖**
- 面板头部有**当前章节读数**（`01 / 08`，Fira Code 等宽数字 + accent 发光）与
  **阅读进度条**（填充宽度 + 百分比实时刷新）
- **层级轨道**：子列表 dashed 竖线区分层级，激活路径上的轨道与刻度变 accent 发光
- **条目弱化 + hover 显现**：默认 opacity 0.5，hover 面板提到 0.95，激活项 1.0
- 滚动高亮基于 **rAF 节流的滚动位置探测线**（视口顶部往下 18%），**不是 IntersectionObserver**；
  激活项自动 `scrollIntoView({ block: 'nearest' })` 滚进面板可见区
- FAB 图标在面板打开时旋转 90°，`title` 实时显示当前章节名
- ESC / 点击面板外部关闭；`prefers-reduced-motion` 下全部动效降级为直跳
- 参考：`astro-gyoza/src/components/post/PostToc.tsx`（`layoutId` 共享指示条）、
  blog.liushen.fun 的 sidebar-toc（app-card-glow 发光卡片）

#### 7. 移动端优化

- **移动端默认隐藏头图**：文章详情 `.post-cover` 与列表卡片 `.card-cover-wrapper` 在 `max-width: 640px` 隐藏

#### 8. 仓库与部署

- **移除 ai-summaries**：删除 `scripts/gen-ai-summaries.mjs` 与 `src/data/ai-summaries.json`（无任何代码引用），build 脚本简化为 `astro check && astro build && pagefind --site dist && cp -r dist/pagefind public/`，**修复 CI 构建失败**（原引用的脚本文件缺失导致 `MODULE_NOT_FOUND`）
- README 全部翻译为简体中文

#### 9. 构建说明

- 图片放入内容集合后 Astro 会为每张 markdown 图片生成多尺寸 srcset（约 2264 个优化输出），完整构建约 10 分钟（与旧站 gyoza 结构一致，CI 部署可接受）
- `astro check` 0 错误；迁移脚本：`migrate-images.mjs`（图片入夹）、`restore-covers.mjs`（ogImage 恢复）、`add-categories.mjs`（分类）、`migrate-posts.mjs`（旧站全量迁移）

#### 10. 性能优化

- **favicon.svg**：3.33 MB → **438 B**（原为 VTracer 位图转矢量，满篇冗余路径；重做为简洁矢量 M + 圆点，呼应 Ming{·}CY logo）
- **apple-touch-icon**：2.5 MB × 2 → **50 KB × 2**（sharp 裁切缩放至 180×180，iOS 标准尺寸）
- **Fancybox 189 KB + HeoLivePhoto 11 KB 按需懒加载**：`Layout.astro` 不再全局注入，改为 `live-gallery.ts` 的 `ensureFancybox()` / `ensureHeoLivePhoto()` 运行时检测——仅当页面存在 `[data-fancybox]` 或 `img[data-live-pvt]` 等元素时才注入 CSS + JS，其他页面零开销
- **背景卡顿优化**：全局背景大图 `filter: blur(24px)` 是主要卡顿源——移动端降至 **12px**，滚动期间进一步降至 **8px**，并同步将 header / 抽屉 / 侧边栏的 `backdrop-filter` 减薄至 6px（`body.is-scrolling` 状态驱动，120ms 防抖）

#### 11. 目录 TOC 交互打磨（2026-10-03）

- **高亮延迟修复**：原用 `IntersectionObserver` + `rootMargin: "-10% 0px -70% 0px"`，
  检测带只有约 20% 视口高，整段标题落在带内时不触发回调，快滚时高亮明显滞后；
  改为 rAF 节流的滚动位置探测线（视口顶部往下 18%），滚到哪跟到哪
- **高亮性能**：`setActive` 原先每次触发都对全部条目跑 `querySelectorAll` + `closest`
  并逐条重算祖先链路；改为初始化时预缓存「对应行 / 严格祖先 toc-node / 绝对 top」，
  切换时只做常量级类名操作
- **面板动画**：原来靠切换 `hidden` / `flex` 类 + `@keyframes`，只能做打开动画、关闭瞬跳，
  且动画规则 `:not([hidden])` 选的是**属性**而代码切的是**类名**，两者永不匹配；
  改为 `data-open` 驱动 `visibility + opacity + transform` 过渡，开关闭都能动画，
  并用 `visibility` 延迟切换保证关闭后不可交互
- **激活态微交互**：圆点激活时 `scale(1.25)` + 发光，各条过渡统一改 `ease-out`
- **补偿性测量**：字体加载（`document.fonts.ready`）与正文图片加载后重新测量标题位置
- **修复构建失败**：`renderTree()` 缺一个闭合花括号，esbuild 报 `Unexpected ","`，
  详见上方「排障记录」
- **搜索脚本说明**：`SearchModal.astro…lang.js` 仅 **2.8 KB**、`preload-helper…js` 仅 **1.25 KB**，本身极小；真正的大块 **Pagefind UI 94 KB**（`ui-core…js`）是打开搜索弹层时才加载的动态 chunk，不影响首屏

#### 12. 目录 TOC 重写为 HUD 风格（2026-10-03）

- **共享指示条**（本版本最大变化）：新增 `.toc-indicator` —— 一条发光 accent 竖条，
  章节切换时用 `transform: translate(x, y)` + `height` 双属性过渡在条目间**弹簧位移**，
  同时贴合条目的行内缩进与高度。效果等同 gyoza 的 framer-motion `layoutId`，
  但用纯 CSS 过渡实现，**零新增 JS 依赖**（本项目无 React 运行时）
- **发光卡片外壳**：面板改为 app-card-glow 风格 —— 扫描线纹理背景
  （`repeating-linear-gradient`）+ 多层 accent 辉光阴影 + 顶部渐变光带 `.toc-beam`
- **实时读数**：面板头部新增当前章节 `01 / 08`（Fira Code + `tabular-nums` 等宽数字，
  防跳字）与阅读进度条（填充宽度 + 百分比），随滚动同步刷新
- **层级轨道**：`.toc-children` 的 dashed 竖线在祖先链路上变 accent；
  `.toc-row::before` 伪元素刻度在激活项让位给共享指示条（同时省掉一层 DOM，
  移除上一版的 `.toc-dot` 圆点方案）
- **h1 归一化**：正文带 h1 的文章（如 `123-liuliang`，实测 2×h1 + 4×h2 + 3×h3）
  此前会把 h2 错误挂成 h1 的子节点，现统一 `depth = Math.max(2, h.depth)`，
  顶层标题全部成为同级兄弟
- **补偿性测量**：字体加载（`document.fonts.ready`）与正文图片 `load` 后重算
  标题绝对位置与指示条坐标
- **坐标系选型**：指示条用 `offsetLeft` / `offsetTop`（基于布局，不受面板
  `scale(0.96)` 变换影响），避免关闭态测量漂移；滚动位置仍用
  `getBoundingClientRect().top + scrollY`
- **验证**：`astro check` 0 错误；`@astrojs/compiler` + esbuild 直验通过；
  dev 实机 grep 确认 9/9 toc slug 全部命中正文 DOM id（高亮前提成立），
  `IntersectionObserver` 计数为 0

#### 13. 文章侧边栏 + 评论/页脚修复（2026-10-03）

- **文章页加主页同款侧边栏**：`PostDetails.astro` 改为
  `lg:grid-cols-[minmax(0,1fr)_18rem]` 双栏（内容左、sticky 侧边栏右），
  手机端随 `hidden lg:block` 整体隐藏
- **目录卡片**：`Sidebar.astro` 新增 `headings` prop，在「今日一言」之下渲染
  「文章目录」卡片（服务端树 + 客户端高亮，复用 `initTocHighlight` 引擎）；
  首页不传 headings 故无此卡
- **站点信息卡片按页面显隐**：新增 `showSiteInfo` prop——文章页传 `false`
  隐藏「构建平台/技术栈」，首页保留
- **TOC 引擎抽共享模块**：`src/utils/tocTree.ts`（树构建/渲染，含 h1 归一化）
  + `src/scripts/toc-highlight.ts`（rAF 滚动探测 + 指示条 + 读数），
  TocButton HUD 与 Sidebar 目录卡片共用；浮动按钮改为 `lg:hidden`
  （桌面端由侧边栏目录承担，手机端保留浮动按钮）
- **Twikoo 评论区**：移除「展开评论区」按钮，改为**自动加载**；
  CDN 从单一 jsdelivr 改为多源回退
  （npmmirror → staticfile → jsdelivr → unpkg，国内可达性优先）
- **友链页评论区**：`/links` 页接入 `<TwikooComment />`
- **页脚 Logo**：`Ming {·} CY` 去掉大括号，改为 `Ming · CY`
  （`{·}` 字面量在页脚缩小后 `}` 像错字）
- **排查发现**：`twikoo.mingcy.cn` 的 HTTPS 443 握手失败（HTTP 308 但 TLS
  connect error 35），疑似 Vercel 部署停摆——评论加载不了的主因是**服务端**，
  代码层面已尽力（自动加载 + 多 CDN），需检查该部署