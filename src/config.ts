// ───────────────────────────────────────────────────────────────────────────
// 茗辰原 · 站点配置（中文优先，沿用旧项目身份，融合 Devosfera 主题结构）
// ───────────────────────────────────────────────────────────────────────────

/** 随机强调色：每次访问随机选一组，明/暗双值。来自旧项目 config.json。 */
export interface AccentColor {
  light: string;
  dark: string;
}

export const SITE = {
  // ── 站点 ──
  website: "https://mingcy.cn/",
  author: "茗辰原",
  profile: process.env.PUBLIC_SOCIAL_GITHUB ?? "",
  desc: "茶香四溢，编程世界。",
  title: "茗辰原",
  ogImage: "mingcy-og.webp",
  lightAndDarkMode: true,
  postPerIndex: 6,
  postPerPage: 5,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showGalleries: true,
  showGalleriesInIndex: true,
  showLinks: true, // 友链导航
  showBackButton: true,
  showTagsInCards: true,
  /** 文章/相册封面图：列表卡片与文章头图 */
  showCoverImages: true,
  indexPostsGrid: false,
  heroTerminalPrompt: {
    prefix: "~",
    path: "/mingcy",
    suffix: "$",
  },
  backdropEffects: {
    cursorGlow: true,
    grain: true,
  },
  /** 全局背景：图库随机图 + 模糊，叠加色保证正文可读 */
  background: {
    image: "https://webp.mingcy.cn",
    blur: 14,
    scale: 1.08,
    /** 叠加层不透明度（%），越高越不影响阅读 */
    overlayLight: 68,
    overlayDark: 76,
  },
  /**
   * 顶部导航（仿清羽风格 dropdown + glide pill）
   * - 扁平项：{ label, href } 直接链接
   * - 下拉组：{ label, items: [{ label, href, external? }] }
   * 顶部 Logo 始终指向首页（"我的"），故导航不再单列首页项。
   */
  nav: [
    {
      label: "整理",
      items: [
        { label: "时光卷轴", href: "/archives" },
        { label: "文章标签", href: "/tags" },
        { label: "文章分类", href: "/categories" },
        { label: "文章通览", href: "/posts" },
      ],
    },
    {
      label: "友人",
      items: [
        { label: "友链展示", href: "/links/" },
        { label: "朋友动态", href: "/links/fcircle/" },
      ],
    },
    {
      label: "作品",
      items: [
        { label: "相册", href: "/galleries" },
        { label: "项目", href: "/projects" },
        { label: "工具", href: "/tools" },
      ],
    },
    {
      label: "关于",
      items: [{ label: "站长资料", href: "/about" }],
    },
  ],
  editPost: {
    enabled: true,
    text: "编辑此文",
    url: process.env.PUBLIC_EDIT_POST_URL ?? "",
  },
  dynamicOgImage: true,
  dir: "ltr",
  lang: "zh-CN",
  timezone: "Asia/Shanghai",
  introAudio: {
    enabled: false, // 旧项目未启用；可按需开启
    src: "",
    isStream: false,
    label: "LOFI",
    duration: 30,
  },

  // ── Hero（首页签名区，来自旧项目 config.json hero）──
  hero: {
    name: "茗辰原",
    bio: "茶香四溢·编程世界。",
    description: "INFJ-T | 学生 | 网络安全爱好者",
    yiyan: "将喜欢的一切藏在身边，这就是努力的意义。",
  },

  // ── 随机强调色系统（AccentColorInjector 每页注入 --accent/--background 等）──
  color: {
    accent: [
      { light: "#F55555", dark: "#325ea3" },
      { light: "#0396FF", dark: "#ABDCFF" },
      { light: "#fb7287", dark: "#99D8CF" },
      { light: "#F072B6", dark: "#3ac8f6" },
      { light: "#9F44D3", dark: "#E2B0FF" },
      { light: "#FF6666", dark: "#A1CCD1" },
      { light: "#F6416C", dark: "#838BC6" },
      { light: "#32CCBC", dark: "#90F7EC" },
      { light: "#33A6B8", dark: "#79F1A4" },
      { light: "#F55555", dark: "#297aa0" },
    ],
    bg: {
      primary: { light: "#f2f5ec", dark: "#10131a" },
      secondary: { light: "#e9eddb", dark: "#1a2131" },
    },
    text: {
      primary: { light: "#33373a", dark: "#f6f7f8" },
      secondary: { light: "#5f6b5a", dark: "#a9b4c9" },
    },
    border: {
      primary: { light: "#d5dcc6", dark: "#2e3b59" },
    },
  },

  // ── Twikoo 评论 ──
  twikoo: {
    envId: "https://twikoo.mingcy.cn/",
  },

  // ── 页脚 ──
  footer: {
    /** 站点运行起算时间（备案/苟活计时） */
    startTime: "2024-01-21T00:00:00Z",
    /** ICP 备案 */
    beian: {
      icp: {
        text: "豫ICP备2026043588号",
        href: "https://beian.miit.gov.cn/",
      },
      /** 公安备案（可选，留空则不显示） */
      police: {
        text: "新公网安备65010602001220号",
        href: "https://beian.mps.gov.cn/#/query/webSearch?code=65010602001220",
      },
    },
    /** 页脚徽章（CDN / 框架等） */
    badges: [
      {
        name: "EdgeOne",
        href: "https://cloud.tencent.com/product/teo",
      },
      {
        name: "ASTRO",
        href: "https://github.com/0xdres/astro-devosfera",
      },
    ],
  },
} as const;
