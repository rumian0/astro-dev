// Live gallery engine: Fancybox lightbox + HeoLivePhoto thumbnails.
// Ported from the old Swup project; adapted for Astro View Transitions.
//
// - Fancybox UMD (/fancybox/fancybox.umd.min.js) and HeoLivePhoto
//   (/livephoto/heolivephoto.js) are loaded globally in Layout <head>.
//   They are is:inline <script src>, re-executed on each navigation but
//   idempotent (they just (re)define global Fancybox / window.HeoLivePhoto).
// - THIS module is a bundled <script> (not inline): Astro runs it ONCE on
//   first load, then never re-runs the module body. Closures (unpackPvt
//   cache, activePlayers, generation) are singletons; document-level
//   listeners (touchstart/click/astro:page-load) are registered once.
//   Per-page work (initFancybox + IO scan) is driven by astro:page-load,
//   which fires on first load and after every View Transition swap.

/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
function absolutize(url: string): string {
  try {
    return new URL(url, document.baseURI).href;
  } catch (e) {
    return url;
  }
}

/* ---- .pvt unpacker (zero-dependency ZIP parse, matches HeoLivePhoto) ---- */
const pvtCache: Record<string, Promise<any>> = Object.create(null);
function unpackPvt(url: string): Promise<{ cover: string; video: string }> {
  if (pvtCache[url]) return pvtCache[url];
  const task = fetch(url)
    .then(function (r) {
      if (!r.ok) throw new Error(".pvt HTTP " + r.status);
      return r.arrayBuffer();
    })
    .then(async function (buffer: ArrayBuffer) {
      const bytes = new Uint8Array(buffer);
      const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      let tail = -1;
      for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65558); i--) {
        if (view.getUint32(i, true) === 0x06054b50) {
          tail = i;
          break;
        }
      }
      if (tail < 0) throw new Error(".pvt 不是合法的 zip 包");
      const entries = view.getUint16(tail + 10, true);
      let cursor = view.getUint32(tail + 16, true);
      const decoder = new TextDecoder();
      let cover: any = null,
        video: any = null;
      for (let n = 0; n < entries; n++) {
        const method = view.getUint16(cursor + 10, true);
        const csize = view.getUint32(cursor + 20, true);
        const nameLen = view.getUint16(cursor + 28, true);
        const extraLen = view.getUint16(cursor + 30, true);
        const commentLen = view.getUint16(cursor + 32, true);
        const localHead = view.getUint32(cursor + 42, true);
        const name = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLen));
        cursor += 46 + nameLen + extraLen + commentLen;
        const base = name.split("/").pop() || "";
        if (!cover && /\.(jpe?g|webp|png)$/i.test(base))
          cover = { method, head: localHead, size: csize };
        else if (!video && /\.(mp4|mov)$/i.test(base))
          video = { method, head: localHead, size: csize };
        if (cover && video) break;
      }
      if (!cover || !video) throw new Error(".pvt 内没有封面或视频");
      function extract(entry: any): Promise<Blob> {
        const start =
          entry.head + 30 + view.getUint16(entry.head + 26, true) + view.getUint16(entry.head + 28, true);
        const data = bytes.subarray(start, start + entry.size);
        if (entry.method === 0) return Promise.resolve(new Blob([data]));
        if (entry.method === 8 && typeof DecompressionStream === "function") {
          return new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).blob();
        }
        return Promise.reject(new Error("不支持的 zip 压缩方式 " + entry.method));
      }
      const parts = await Promise.all([extract(cover), extract(video)]);
      return {
        cover: URL.createObjectURL(parts[0]),
        video: URL.createObjectURL(parts[1]),
      };
    });
  pvtCache[url] = task;
  task.catch(function () {
    delete pvtCache[url];
  });
  return task;
}

/* ---- Motion Photo unpacker (remote Google Motion Photo, jpg+trailing mp4) ---- */
const motionCache: Record<string, Promise<any>> = Object.create(null);
function unpackMotion(url: string): Promise<{ cover: string; video: string }> {
  if (motionCache[url]) return motionCache[url];
  const task = fetch(url)
    .then(function (r) {
      if (!r.ok) throw new Error("motion HTTP " + r.status);
      return r.arrayBuffer();
    })
    .then(function (buffer: ArrayBuffer) {
      const bytes = new Uint8Array(buffer);
      const head = new TextDecoder().decode(bytes.slice(0, Math.min(bytes.length, 200000)));
      const m = head.match(/MicroVideoOffset="(\d+)"/);
      const offset = m ? parseInt(m[1], 10) : null;
      let videoStart = -1;
      if (offset && offset > 0 && offset < bytes.length) {
        videoStart = bytes.length - offset;
        for (let d = -4; d <= 4; d++) {
          const p = videoStart + d;
          if (
            p >= 0 &&
            p + 7 < bytes.length &&
            bytes[p + 4] === 0x66 &&
            bytes[p + 5] === 0x74 &&
            bytes[p + 6] === 0x79 &&
            bytes[p + 7] === 0x70
          ) {
            videoStart = p;
            break;
          }
        }
      } else {
        for (let i = 0; i < bytes.length - 10; i++) {
          if (bytes[i] === 0xff && bytes[i + 1] === 0xd9) {
            for (let j = i + 2; j < Math.min(i + 100, bytes.length); j++) {
              if (
                j + 7 < bytes.length &&
                bytes[j + 4] === 0x66 &&
                bytes[j + 5] === 0x74 &&
                bytes[j + 6] === 0x79 &&
                bytes[j + 7] === 0x70
              ) {
                videoStart = j - 4;
                break;
              }
            }
            if (videoStart !== -1) break;
          }
        }
      }
      if (videoStart < 0) throw new Error("不是 Motion Photo（未找到内嵌视频）");
      let eoi = -1;
      for (let k = videoStart - 2; k >= Math.max(0, videoStart - 100000); k--) {
        if (bytes[k] === 0xff && bytes[k + 1] === 0xd9) {
          eoi = k + 2;
          break;
        }
      }
      if (eoi < 0) eoi = videoStart;
      if (videoStart < eoi) videoStart = eoi;
      const cover = bytes.slice(0, eoi);
      const video = bytes.slice(videoStart);
      if (
        cover.length < 1024 ||
        video.length < 1024 ||
        cover[0] !== 0xff ||
        cover[1] !== 0xd8 ||
        video[4] !== 0x66 ||
        video[5] !== 0x74
      ) {
        throw new Error("Motion Photo 结构不完整");
      }
      return {
        cover: URL.createObjectURL(new Blob([cover], { type: "image/jpeg" })),
        video: URL.createObjectURL(new Blob([video], { type: "video/mp4" })),
      };
    });
  motionCache[url] = task;
  task.catch(function () {
    delete motionCache[url];
  });
  return task;
}

/* ---- live player lifecycle ---- */
const activePlayers: any[] = [];
let currentPlayer: HTMLElement | null = null;
function isCurrentSlide(player: HTMLElement): boolean {
  return !!(player.closest && player.closest(".is-selected"));
}
function showSpin(player: HTMLElement) {
  if (player.querySelector(".lp-spin")) return;
  const s = document.createElement("div");
  s.className = "lp-spin";
  player.append(s);
}
function hideSpin(player: HTMLElement) {
  const s = player.querySelector(".lp-spin");
  if (s) s.parentNode!.removeChild(s);
}
function setCover(player: HTMLElement, url: string, caption?: string) {
  let img = player.querySelector<HTMLImageElement>(".lp-cover");
  if (!img) {
    img = document.createElement("img");
    img.className = "lp-cover";
    img.alt = "";
    player.insertBefore(img, player.firstChild);
  }
  if (img.getAttribute("src") !== url) img.setAttribute("src", url);
  if (caption && !player.querySelector(".lp-caption")) {
    const c = document.createElement("div");
    c.className = "lp-caption";
    c.textContent = caption;
    player.append(c);
  }
}
function attachVideo(player: HTMLElement, url: string) {
  const node = document.createElement("video");
  node.className = "lp-video is-waiting";
  node.muted = true;
  node.setAttribute("muted", "");
  node.setAttribute("autoplay", "");
  node.setAttribute("loop", "");
  node.setAttribute("playsinline", "");
  node.playsInline = true;
  node.loop = true;
  node.preload = "auto";
  node.src = url;
  node.addEventListener("canplay", function onReady() {
    node.removeEventListener("canplay", onReady);
    node.classList.remove("is-waiting");
    hideSpin(player);
  });
  node.addEventListener("error", function () {
    hideSpin(player);
  });
  player.append(node);
  const record = { player, video: node };
  activePlayers.push(record);
  if (isCurrentSlide(player)) {
    const p = node.play();
    if (p && p.catch) p.catch(function () {});
  }
}
function resumeVideo(record: any) {
  if (!activePlayers.some(r => r.player === record.player)) activePlayers.push(record);
  record.video.classList.add("is-waiting");
  showSpin(record.player);
  try {
    record.video.currentTime = 0;
  } catch (e) {}
  const p = record.video.play();
  if (p && p.catch)
    p.then(
      function () {
        record.video.classList.remove("is-waiting");
        hideSpin(record.player);
      },
      function () {
        record.video.classList.remove("is-waiting");
        hideSpin(record.player);
      }
    );
}
function stopPlayer(record: any) {
  try {
    if (record.video) {
      record.video.pause();
      record.video.removeAttribute("autoplay");
    }
  } catch (e) {}
  hideSpin(record.player);
}
function prunePlayers() {
  for (let i = activePlayers.length - 1; i >= 0; i--) {
    const r = activePlayers[i];
    const keep = r.player.isConnected && (r.player === currentPlayer || isCurrentSlide(r.player));
    if (!keep) {
      stopPlayer(r);
      activePlayers.splice(i, 1);
    }
  }
}
function stopAll() {
  activePlayers.forEach(stopPlayer);
  activePlayers.length = 0;
  currentPlayer = null;
}

function getAssets(slide: any) {
  const el = slide && slide.triggerEl;
  const ds = el && el.dataset ? el.dataset : {};
  return {
    cover: ds.cover || slide.cover || null,
    video: ds.video || slide.video || null,
    pvt: ds.pvt || slide.pvt || null,
    motion: ds.motion || slide.motion || null,
    caption: ds.caption || slide.caption || "",
  };
}
function resolveAssets(assets: any): Promise<{ cover: string | null; video: string | null }> {
  const coverAbs = assets.cover ? absolutize(assets.cover) : null;
  if (assets.video) return Promise.resolve({ cover: coverAbs, video: absolutize(assets.video) });
  if (assets.pvt)
    return unpackPvt(absolutize(assets.pvt)).then(p => ({ cover: p.cover || coverAbs, video: p.video }));
  if (assets.motion)
    return unpackMotion(absolutize(assets.motion)).then(p => ({ cover: p.cover || coverAbs, video: p.video }));
  return Promise.resolve({ cover: coverAbs, video: null });
}
function pauseThumb(slide: any) {
  try {
    const el = slide && slide.triggerEl;
    const img = el && el.querySelector("img.live-photo");
    if (img && img.parentNode && (img.parentNode as any)._heoLiveCtrl) (window as any).HeoLivePhoto.reset(img.parentNode);
  } catch (e) {}
}
function mountLivePlayer(player: HTMLElement, slide: any) {
  pauseThumb(slide);
  const existing = player.querySelector(".lp-video");
  if (existing) {
    resumeVideo({ player, video: existing });
    return;
  }
  const assets = getAssets(slide);
  if (!assets.pvt && !assets.motion && assets.cover) setCover(player, absolutize(assets.cover), assets.caption);
  showSpin(player);
  resolveAssets(assets)
    .then(function (r) {
      if (!player.isConnected) return;
      if (r.cover) setCover(player, r.cover, assets.caption);
      if (r.video) attachVideo(player, r.video);
      else hideSpin(player);
    })
    .catch(function (e) {
      if (assets.cover) setCover(player, absolutize(assets.cover), assets.caption);
      hideSpin(player);
      console.warn("[live-gallery] 实况素材加载失败：", e);
    });
}
function activateSlide() {
  for (let i = 0; i < arguments.length; i++) {
    const candidate: any = arguments[i];
    if (!candidate || !candidate.el || !candidate.el.querySelector) continue;
    const player = candidate.el.querySelector(".lp-player");
    if (!player) continue;
    currentPlayer = player;
    mountLivePlayer(player, candidate);
    break;
  }
  prunePlayers();
}

/* ---- duration isolation (mobile long-press vs tap, live items only) ---- */
const LIVE_SEL = "[data-fancybox][data-pvt], [data-fancybox][data-motion], [data-fancybox][data-video]";
let touchStartAt = 0,
  touchMoved = false,
  suppressNextClick = false;

function bindDocumentListeners() {
  document.addEventListener(
    "touchstart",
    function (e) {
      if (!e.target.closest || !e.target.closest(LIVE_SEL)) return;
      touchStartAt = Date.now();
      touchMoved = false;
    },
    { passive: true, capture: true }
  );
  document.addEventListener("touchmove", function () {
    touchMoved = true;
  }, { passive: true, capture: true });
  ["touchend", "touchcancel"].forEach(function (t) {
    document.addEventListener(
      t,
      function (e) {
        if (!e.target.closest || !e.target.closest(LIVE_SEL)) return;
        if (touchStartAt && Date.now() - touchStartAt >= 300 && !touchMoved) suppressNextClick = true;
        touchStartAt = 0;
      },
      { passive: true, capture: true }
    );
  });
  document.addEventListener(
    "click",
    function (e) {
      if (!suppressNextClick) return;
      suppressNextClick = false;
      if (!e.target.closest || !e.target.closest(LIVE_SEL)) return;
      e.preventDefault();
      e.stopPropagation();
    },
    true
  );
}

/* ---- Fancybox init ---- */
function initFancybox() {
  if (typeof (window as any).Fancybox === "undefined") return;
  if (!document.querySelector("[data-fancybox]")) return;
  try {
    (window as any).Fancybox.unbind(document.body);
  } catch (e) {}
  document
    .querySelectorAll(
      "[data-fancybox][data-pvt]:not([data-html]), [data-fancybox][data-motion]:not([data-html]), [data-fancybox][data-video]:not([data-html])"
    )
    .forEach(function (el) {
      el.setAttribute("data-html", '<div class="lp-player"></div>');
    });
  (window as any).Fancybox.bind("[data-fancybox]", {
    touch: { vertical: true },
    Carousel: { infinite: true },
    preload: 1,
    Caption: { type: "auto" },
    Toolbar: { display: { infobar: true, close: true } },
    Keyboard: { horizontal: true, vertical: true },
    backdrop: true,
    on: {
      "Carousel.contentReady": activateSlide,
      "Carousel.attachSlideEl": activateSlide,
      "Carousel.change": function () {
        prunePlayers();
      },
      "Carousel.settle": function () {
        prunePlayers();
      },
      backdropClick: function (_fancybox: any, event: Event) {
        const t: any = event.composedPath ? event.composedPath()[0] : event.target;
        if (t && t.closest && t.closest(".lp-player")) event.preventDefault();
      },
      close: stopAll,
      destroy: stopAll,
    },
  });
}

/* ---- HeoLivePhoto IO lazy scan ---- */
let observer: IntersectionObserver | null = null;
const MAX_CONCURRENT = 2;
let queue: HTMLElement[] = [];
let active = 0;
let generation = 0;

function scanItem(item: HTMLElement, done: () => void) {
  if (typeof (window as any).HeoLivePhoto === "undefined" || !(window as any).HeoLivePhoto.scan) return done();
  try {
    const r = (window as any).HeoLivePhoto.scan(item);
    if (r && r.then) r.then(done, done);
    else done();
  } catch (e) {
    done();
  }
}
function setupLiveScan() {
  generation++;
  const gen = generation;
  queue = [];
  active = 0;
  const liveImgs = document.querySelectorAll("img[data-live-pvt], img[data-live-motion], img[data-live-video]");
  if (!liveImgs.length) return;
  if (observer) observer.disconnect();
  if (!("IntersectionObserver" in window)) {
    liveImgs.forEach(function (img) {
      const item = (img as HTMLElement).closest("[data-fancybox]") || (img as HTMLElement).parentElement;
      if (item) scanItem(item as HTMLElement, function () {});
    });
    return;
  }
  function flush() {
    if (gen !== generation) return;
    while (active < MAX_CONCURRENT && queue.length) {
      const item = queue.shift()!;
      active++;
      scanItem(item, function () {
        if (gen !== generation) return;
        active--;
        flush();
      });
    }
  }
  observer = new IntersectionObserver(
    function (entries) {
      if (gen !== generation) return;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        observer!.unobserve(entry.target);
        queue.push(entry.target as HTMLElement);
      });
      flush();
    },
    { root: null, rootMargin: "0px", threshold: 0 }
  );
  liveImgs.forEach(function (img) {
    const item = (img as HTMLElement).closest("[data-fancybox]") || (img as HTMLElement).parentElement;
    if (item && !(img as HTMLElement).dataset.liveReady) observer!.observe(item as HTMLElement);
  });
}

/* ---- 按需懒加载（无灯箱/livephoto 元素的页面完全跳过 189KB fancybox）---- */
function ensureStylesheet(href: string): void {
  if (document.querySelector("link[href='" + href + "']")) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = href;
  document.head.appendChild(l);
}

function ensureScript(src: string, onload: () => void): void {
  if (document.querySelector("script[src='" + src + "']")) {
    setTimeout(onload, 0);
    return;
  }
  const s = document.createElement("script");
  s.src = src;
  s.onload = onload;
  document.head.appendChild(s);
}

function ensureFancybox(): void {
  if (!document.querySelector("[data-fancybox]")) return;
  if (typeof (window as any).Fancybox !== "undefined") {
    setTimeout(initFancybox, 200);
    return;
  }
  ensureStylesheet("/fancybox/fancybox.min.css");
  ensureScript("/fancybox/fancybox.umd.min.js", initFancybox);
}

function ensureHeoLivePhoto(): void {
  if (!document.querySelector("img[data-live-pvt], img[data-live-motion], img[data-live-video]")) return;
  if (typeof (window as any).HeoLivePhoto !== "undefined") {
    setTimeout(setupLiveScan, 200);
    return;
  }
  ensureScript("/livephoto/heolivephoto.js", setupLiveScan);
}

/* ---- bootstrap (runs once on first load; astro:page-load drives re-init) ---- */
function onPageLoad(): void {
  setTimeout(ensureFancybox, 200);
  setTimeout(ensureHeoLivePhoto, 200);
}

bindDocumentListeners();
document.addEventListener("astro:page-load", onPageLoad);
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", onPageLoad);
} else {
  onPageLoad();
}
