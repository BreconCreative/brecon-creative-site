// -----------------------------------------
// BRECON CREATIVE | SITE SCRIPT
// Page transitions (Osmo Overlapping Parallax on Barba), Lenis smooth scroll
// and every interactive feature on the site. Loaded once, site-wide, from
// Site settings > Custom code > Footer. Add new features to the registry
// below, never as page-level embeds: scripts inside a page do not run
// after a Barba page swap.
// Needs Barba 2.10.3, Lenis 1.3.17 and GSAP 3.15 with CustomEase and
// ScrollTrigger. They load deferred from the head code as one request, so
// this starts once the page has been parsed and they have run.
// -----------------------------------------

(function () {
"use strict";

function run() {
if (!window.gsap || !window.barba) return;

// Tells the head code the script is running, so content it hides until
// its entrance animation stays hidden. If this never runs, it shows.
window.bcSiteReady = true;

gsap.registerPlugin(CustomEase);
const hasScrollTrigger = typeof window.ScrollTrigger !== "undefined";
if (hasScrollTrigger) gsap.registerPlugin(ScrollTrigger);

history.scrollRestoration = "manual";

let lenis = null;
let nextPage = document;
let onceFunctionsInitialized = false;
let closeNavMenu = null;
let restNavIndicator = null;
let isTransitioning = false;

const hasLenis = typeof window.Lenis !== "undefined";

const rmMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
let reducedMotion = rmMQ.matches;
rmMQ.addEventListener?.("change", e => (reducedMotion = e.matches));

const fineMQ = window.matchMedia("(hover: hover) and (pointer: fine)");
const has = (s) => !!nextPage.querySelector(s);
// A script hook can sit on a link, or on a component (Button Roll) that
// holds its link or button inside. This finds the real link either way.
const linkIn = (el) => (el.matches("a[href]") ? el : el.querySelector("a[href]"));
// Webflow writes component switches as "True" / "False", so match either case
const magneticSel = '[data-magnetic]:not([data-magnetic="false" i])';
const isMobile = () => window.innerWidth < 768;

CustomEase.create("osmo", "0.625, 0.05, 0, 1");
CustomEase.create("parallax", "0.7, 0.05, 0.13, 1");
CustomEase.create("glide", "0.16, 1, 0.3, 1");
gsap.defaults({ ease: "osmo", duration: 0.6 });

// Never run Barba inside the Webflow Editor
const inWebflowEditor = () =>
  !!(window.Webflow && Webflow.env && Webflow.env("editor"));


// -----------------------------------------
// FUNCTION REGISTRY
// Each feature is gated by has() so it only runs where it is needed.
// -----------------------------------------

function initOnceFunctions() {
  initLenis();
  if (onceFunctionsInitialized) return;
  onceFunctionsInitialized = true;
  initPrefetch();
  initNavMain();
}

function initBeforeEnterFunctions(next) {
  nextPage = next || document;
  if (has("[data-case-hero]")) initCaseIntro(nextPage);
  if (has("[data-card-spot][data-accent], [data-project-slug]")) initProjectCards(nextPage);
  if (has("[data-price]")) initPricing(nextPage);
  if (has("[data-faq-order]")) initFaqOrder(nextPage);
  if (has("[data-reveal]")) initReveal(nextPage);
}

function initAfterEnterFunctions(next) {
  nextPage = next || document;
  if (has("[data-card-spot]")) initCardSpot(nextPage);
  if (has(magneticSel)) initMagnetic(nextPage);
  if (has("[data-copy-email]")) initCopyEmail(nextPage);
  if (has("[data-count-up]")) initCountUp(nextPage);
  if (has("[data-projects-rail]")) initRail(nextPage);
  if (has("[data-case-hero]")) initCase(nextPage);
  if (has("[data-contact]")) initContact(nextPage);
  if (has("details[data-accordion]")) initAccordion(nextPage);
  if (has("[data-not-found]")) initNotFound(nextPage);
  if (restNavIndicator) restNavIndicator();

  if (hasLenis && lenis) lenis.resize();
  if (hasScrollTrigger) ScrollTrigger.refresh();
}


// -----------------------------------------
// PAGE TRANSITIONS | Overlapping Parallax
// -----------------------------------------

function runPageOnceAnimation(next) {
  const tl = gsap.timeline();
  tl.call(() => resetPage(next), null, 0);
  return tl;
}

function runPageLeaveAnimation(current, next) {
  const wrap = document.querySelector("[data-transition-wrap]");
  const dark = wrap ? wrap.querySelector("[data-transition-dark]") : null;
  const dur = isMobile() ? 0.9 : 1.2;

  const tl = gsap.timeline({ onComplete: () => current.remove() });

  if (reducedMotion || !wrap) return tl.set(current, { autoAlpha: 0 });

  tl.set(wrap, { zIndex: 2 });
  tl.fromTo(dark, { autoAlpha: 0 }, { autoAlpha: 0.8, duration: dur, ease: "parallax" }, 0);
  tl.fromTo(current, { y: "0vh" }, { y: "-25vh", duration: dur, ease: "parallax" }, 0);
  tl.set(dark, { autoAlpha: 0 });

  return tl;
}

function runPageEnterAnimation(next) {
  const tl = gsap.timeline();
  const dur = isMobile() ? 0.9 : 1.2;

  if (reducedMotion) {
    tl.set(next, { autoAlpha: 1 });
    tl.add("pageReady");
    tl.call(resetPage, [next], "pageReady");
    return new Promise(resolve => tl.call(resolve, null, "pageReady"));
  }

  // The new page rises on the kite's wing: its top edge is the wing's curve
  const kite = buildTransitionKite(next, dur);

  tl.add("startEnter", 0);
  tl.set(next, { zIndex: 3 });
  tl.fromTo(next, { y: kite.startY }, {
    y: 0, duration: dur, clearProps: "all", ease: "parallax",
    onUpdate: () => kite.update(gsap.getProperty(next, "y"))
  }, "startEnter");
  tl.add("pageReady");
  tl.call(resetPage, [next], "pageReady");

  return new Promise(resolve => tl.call(resolve, null, "pageReady"));
}

// Kite transition layer. A fixed layer moves in step with the incoming page.
// It carries a cap shaped like the outer edge of the kite's wing (the logo
// mark turned nose up), filled with the page's own top colour, so the page
// arrives with a curved top. The kite rides the peak. Once the page is two
// cap heights from the top, the curve relaxes flat as it lands and the kite
// beats its wings once, lets go and climbs out of view.
const KITE_WING = "M132.66,50.87h0c-.19-5.06-.88-9.94-2.09-13.71l-5.25,5.25c1.21,6.99,1.21,15.7,0,22.7l5.25,5.25c1.2-3.77,1.89-8.65,2.08-13.71h.01s2.88-2.89,2.88-2.89l-2.89-2.9Z";
const KITE_TAIL = "M120.11,59.9h0s-3.07-3.06-3.07-3.06h0c1.7-1.7,1.7-4.44,0-6.14h0s3.07-3.07,3.07-3.07l.02.02c3.37,3.39,3.37,8.87-.01,12.25Z";
const KITE_CURVE = "M0,143 C116,106 347,0 500,0 C653,0 884,106 1000,143";
let transitionKite = null;

function injectTransitionKiteStyles() {
  // Selectors carry the svg tag: Webflow's normalize sets svg:not(:root) { overflow: hidden },
  // which would otherwise beat a single class and crop the wings.
  if (document.getElementById("bc-tk-style")) return;
  const s = document.createElement("style");
  s.id = "bc-tk-style";
  s.textContent =
    ".bc-tk{position:fixed;top:0;left:0;width:100%;height:0;z-index:4;pointer-events:none;will-change:transform}" +
    ".bc-tk svg.bc-tk_cap{position:absolute;left:0;bottom:-1px;width:100%;display:block;overflow:visible;transform-origin:50% 100%;color:var(--_light-field---apricot,#ffa27e)}" +
    ".bc-tk_fill{fill:var(--bc-tk-bg,#0a0d1c)}" +
    ".bc-tk_line{fill:none;stroke:url(#bc-tk-line);stroke-width:1.5;vector-effect:non-scaling-stroke}" +
    ".bc-tk_rider{position:absolute;top:0;left:0;width:100%;height:0}" +
    ".bc-tk_halo{position:absolute;left:50%;bottom:-1rem;width:40vw;height:8rem;margin-left:-20vw;background:radial-gradient(50% 100% at 50% 100%,color-mix(in srgb,var(--swatch--brand-500,#ff6a3d) 24%,transparent),transparent 70%)}" +
    ".bc-tk_streak{position:absolute;left:50%;bottom:0;width:2px;height:100vh;margin-left:-1px;transform-origin:50% 100%;transform:scaleY(0);background:linear-gradient(0deg,transparent,color-mix(in srgb,var(--swatch--brand-500,#ff6a3d) 40%,transparent) 45%,var(--_light-field---apricot,#ffa27e))}" +
    ".bc-tk svg.bc-tk_kite{position:absolute;left:50%;top:0;width:3.25rem;height:5.4rem;margin:-3.3rem 0 0 -1.625rem;overflow:visible;fill:var(--swatch--brand-500,#ff6a3d)}" +
    "@media (max-width:767px){.bc-tk svg.bc-tk_kite{width:2.5rem;height:4.15rem;margin:-2.55rem 0 0 -1.25rem}}";
  document.head.appendChild(s);
}

// The colour at the very top of the incoming page, so the cap matches it
function pageTopColour(el) {
  const clear = c => !c || c === "transparent" || /^rgba\(.*,\s*0\)$/.test(c);
  let n = el;
  for (let d = 0; d < 8 && n; d++) {
    const c = getComputedStyle(n).backgroundColor;
    if (!clear(c)) return c;
    n = Array.from(n.children).find(k => {
      const p = getComputedStyle(k).position;
      return k.offsetHeight > 0 && p !== "absolute" && p !== "fixed";
    });
  }
  return getComputedStyle(document.body).backgroundColor;
}

function buildTransitionKite(next, dur) {
  if (transitionKite) transitionKite.destroy();
  injectTransitionKiteStyles();
  const vh = window.innerHeight;
  const capH = Math.round(window.innerWidth * 0.143);

  const layer = document.createElement("div");
  layer.className = "bc-tk";
  layer.setAttribute("aria-hidden", "true");
  layer.style.setProperty("--bc-tk-bg", pageTopColour(next));
  layer.innerHTML =
    '<svg class="bc-tk_cap" viewBox="0 0 1000 143" preserveAspectRatio="none" focusable="false" style="height:' + capH + 'px">' +
    '<defs><linearGradient id="bc-tk-line" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="currentColor" stop-opacity="0"/><stop offset="0.5" stop-color="currentColor"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>' +
    '<path class="bc-tk_fill" d="' + KITE_CURVE + ' L1000,146 L0,146 Z"/><path class="bc-tk_line" d="' + KITE_CURVE + '"/></svg>' +
    '<div class="bc-tk_rider"><div class="bc-tk_halo"></div><div class="bc-tk_streak"></div>' +
    '<svg class="bc-tk_kite" viewBox="115 36 22 36" focusable="false"><g class="bc-tk_body"><g class="bc-tk_tail"><path d="' + KITE_TAIL + '"/></g><path class="bc-tk_wing" d="' + KITE_WING + '"/></g></svg></div>';
  document.body.appendChild(layer);

  const cap = layer.querySelector(".bc-tk_cap");
  const line = layer.querySelector(".bc-tk_line");
  const rider = layer.querySelector(".bc-tk_rider");
  const halo = layer.querySelector(".bc-tk_halo");
  const streak = layer.querySelector(".bc-tk_streak");
  const kiteEl = layer.querySelector(".bc-tk_kite");
  const body = layer.querySelector(".bc-tk_body");
  const wing = layer.querySelector(".bc-tk_wing");
  const tail = layer.querySelector(".bc-tk_tail");

  gsap.set(body, { svgOrigin: "126 53.5", rotation: -90 });
  gsap.set(wing, { transformOrigin: "50% 50%" });
  gsap.set(tail, { svgOrigin: "120.6 53.4" });
  // A gentle sway while it rides the peak
  const sway = gsap.timeline();
  sway.to(kiteEl, { x: 6, duration: dur * 0.5, ease: "sine.inOut", yoyo: true, repeat: 1 }, 0);
  sway.to(body, { rotation: -86, duration: dur * 0.5, ease: "sine.inOut", yoyo: true, repeat: 1 }, 0);

  let released = false, flight = null;
  const destroy = () => {
    sway.kill();
    if (flight) flight.kill();
    layer.remove();
    if (transitionKite === api) transitionKite = null;
  };
  const release = () => {
    released = true;
    flight = gsap.timeline({ onComplete: destroy });
    flight.to(wing, { keyframes: [
      { scaleY: 0.45, scaleX: 1.12, duration: 0.12, ease: "power2.in" },
      { scaleY: 1.06, scaleX: 0.98, duration: 0.16, ease: "power2.out" },
      { scaleY: 1, scaleX: 1, duration: 0.2, ease: "sine.inOut" }
    ] }, 0);
    flight.to(tail, { keyframes: [
      { rotation: -16, duration: 0.12, ease: "power2.out" },
      { rotation: 0, duration: 0.32, ease: "back.out(2)" }
    ] }, 0.08);
    flight.to(kiteEl, { y: -vh * 1.15, duration: dur * 0.62, ease: "power2.in" }, 0.08);
    flight.to(streak, { scaleY: 1.1, duration: dur * 0.62, ease: "power2.in" }, 0.08);
    flight.to(streak, { autoAlpha: 0, duration: dur * 0.45, ease: "power1.out" }, 0.08 + dur * 0.4);
    flight.to([halo, line], { autoAlpha: 0, duration: dur * 0.5, ease: "power1.out" }, 0.08 + dur * 0.25);
  };
  const update = y => {
    const a = Math.min(1, Math.max(0, y / (2 * capH)));
    gsap.set(layer, { y: y });
    gsap.set(cap, { scaleY: a });
    gsap.set(rider, { y: -capH * a });
    if (!released && y <= 2 * capH) release();
  };

  const api = { startY: vh + capH, update, destroy };
  update(api.startY);
  transitionKite = api;
  return api;
}

// -----------------------------------------
// FIRST VISIT INTRO
// The logo animation plays once, on someone's first visit, then never again.
// The head code adds html.bc-intro before first paint (only when this
// browser has no record of a visit and motion is allowed), which covers the
// page in Midnight so nothing flashes. This builds the intro over that cover,
// plays it, then lifts it away with the kite's wing curve on its lower edge.
// Any click, key, scroll or touch skips straight to the lift.
// -----------------------------------------
const LOGO_LETTERS = ["M162.79,53.52c3.96-1.85,6.65-5.52,6.65-9.73,0-6.26-5.91-11.24-12.99-11.01v-.02h-21.33c1.74,4.72,2.72,11.26,2.94,18.03l2.98,2.98-2.98,2.97c-.22,6.77-1.2,13.3-2.94,18.02h21.33c7.95,0,14.7-4.41,14.7-11.02,0-4.62-3.45-8.58-8.36-10.22ZM146.48,45.01c.11-5.26.69-9.54,2.99-10.16h4.31c4.04,0,7.31,4,7.31,8.93s-3.27,8.94-7.31,8.94h-7.3v-7.71ZM154.64,72.67h-8.16v-17.87h8.16c4.51,0,8.16,4,8.16,8.94s-3.65,8.93-8.16,8.93Z", "M214.24,74.77c-3.56-3.4-5.93-6.13-8.37-9.37l-7.56-10.58h.76c6.92,0,12.52-4.94,12.52-11.02.01-6.1-5.6-11.04-12.52-11.04h-23.51c3.99,10.82,3.99,31.18,0,42h14.34c-1.74-4.75-2.89-11.9-2.98-19.95h3.38l2.61,4.34c2.83,5.26,5.2,11.82,3.79,15.62h17.54ZM195.93,52.72h-9.02v-7.71c.12-5.26.69-9.54,2.99-10.15h6.03c4.03,0,7.31,4,7.31,8.93s-3.27,8.93-7.31,8.93Z", "M231.51,72.65c-1.35-4.64-2.21-10.9-2.29-17.84,6.82.05,12.82.52,16.93,4.63v-11.36c-4.12,4.12-10.12,4.59-16.94,4.63v-17.86h1.3c8.48,0,16.02,4.45,18.56,13.94l2.45-16.03h-33.66c3.99,10.82,3.99,31.18,0,42h33.65l-2.44-16.03c-2.45,9.12-9.49,13.58-17.56,13.92Z", "M267.04,37.38c8.35-4.82,18.14,5.74,21.49,12.84v-14.34c-2.84-1.99-7.58-3.12-12.05-3.12-11.6,0-21,9.4-21,21s9.41,21,21,21c5.01,0,10.68-1.82,12.05-6.91-.71.92-1.57,1.7-2.59,2.29-6.04,3.49-15.18-1.01-20.4-10.06-5.22-9.04-4.55-19.2,1.5-22.7Z", "M311.28,32.76c-11.59,0-21,9.4-21,21s9.41,21,21,21,21-9.4,21-21-9.4-21-21-21ZM320.74,70.14c-6.05,3.49-15.18-1.01-20.4-10.06-5.22-9.04-4.56-19.2,1.49-22.7,6.04-3.49,15.18,1.02,20.4,10.07,5.22,9.04,4.55,19.2-1.49,22.69Z", "M369.19,49.91c.03-6.91.47-12.99,4.63-17.15h-11.36c4.16,4.16,4.59,10.24,4.63,17.14v7.71c-.02,4.12-.19,7.95-1.2,11.25l-8.42-15.1c-5.19-10.16-8.77-16.2-8.77-21h-17.14c4.16,4.16,4.6,10.24,4.63,17.14v7.71c-.03,6.91-.47,12.99-4.63,17.14h11.36c-4.16-4.15-4.6-10.24-4.63-17.14v-7.7c.02-4.12.19-7.95,1.2-11.24l8.42,15.1c5.2,10.16,8.77,16.19,8.77,21h17.14c-4.15-4.16-4.6-10.24-4.63-17.14v-7.72Z"];
// CREATIVE, from the October 2026 lockup, drawn 25.95 units lower in that file
const LOGO_CREATIVE = [["path", "d", "M210.43,122.81c-.44.47-.97.71-1.58.71-.58,0-1.07-.18-1.46-.54-.39-.36-.69-.88-.89-1.56-.2-.68-.3-1.51-.3-2.48s.1-1.82.3-2.51c.2-.68.5-1.21.89-1.57.39-.36.88-.54,1.46-.54s1.07.22,1.49.65.72,1.06.88,1.89l1.85-.1c-.24-1.29-.73-2.3-1.47-3.01-.75-.72-1.66-1.08-2.75-1.08-.96,0-1.78.26-2.45.77-.67.51-1.18,1.23-1.52,2.16s-.52,2.04-.52,3.33.17,2.39.52,3.32.86,1.65,1.52,2.16c.67.5,1.48.76,2.45.76,1.16,0,2.11-.38,2.86-1.15.75-.76,1.23-1.83,1.43-3.2l-1.83-.08c-.15.91-.44,1.6-.88,2.07Z"], ["path", "d", "M224.84,119.84c-.28-.24-.68-.4-1.16-.48.23-.07.46-.17.67-.3.41-.25.74-.59.99-1.03.25-.44.38-.94.38-1.52,0-1.1-.36-1.97-1.09-2.61-.72-.64-1.72-.96-2.99-.96h-3.72v11.96h1.77v-4.66h2.09c.49,0,.88.05,1.16.15.28.1.49.27.62.51s.22.55.25.94l.27,3.06h1.77l-.3-3.4c-.07-.76-.31-1.32-.72-1.66ZM221.61,118.59h-1.92v-3.97h1.92c.74,0,1.31.17,1.7.51.39.34.59.83.59,1.47s-.2,1.12-.59,1.46c-.39.35-.96.52-1.7.52Z"], ["polygon", "points", "233.1 119.71 238.47 119.71 238.47 118.1 233.1 118.1 233.1 114.61 238.67 114.61 238.67 112.94 231.33 112.94 231.33 124.9 238.8 124.9 238.8 123.23 233.1 123.23 233.1 119.71"], ["path", "d", "M246.8,112.94l-3.5,11.96h1.83l.87-3.12h3.89l.87,3.12h1.83l-3.5-11.96h-2.29ZM246.45,120.15l1.49-5.37,1.49,5.37h-2.98Z"], ["polygon", "points", "256.62 114.61 260.12 114.61 260.12 124.9 261.87 124.9 261.87 114.61 265.37 114.61 265.37 112.94 256.62 112.94 256.62 114.61"], ["polygon", "points", "270.31 114.61 273.17 114.61 273.17 123.23 270.31 123.23 270.31 124.9 277.78 124.9 277.78 123.23 274.92 123.23 274.92 114.61 277.78 114.61 277.78 112.94 270.31 112.94 270.31 114.61"], ["polygon", "points", "287.1 122.52 284.37 112.94 282.5 112.94 286.05 124.9 288.14 124.9 291.69 112.94 289.82 112.94 287.1 122.52"], ["polygon", "points", "298.34 123.23 298.34 119.71 303.71 119.71 303.71 118.1 298.34 118.1 298.34 114.61 303.92 114.61 303.92 112.94 296.57 112.94 296.57 124.9 304.05 124.9 304.05 123.23 298.34 123.23"]];
const KITE_CURVE_DOWN = "M0,0 C116,37 347,143 500,143 C653,143 884,37 1000,0 Z";

function initFirstVisitIntro() {
  const html = document.documentElement;
  if (!html.classList.contains("bc-intro")) return;
  window.bcIntroStarted = true;
  try { localStorage.setItem("bc-intro-seen", "1"); } catch (e) {}
  if (inWebflowEditor() || reducedMotion) { html.classList.remove("bc-intro"); return; }

  const css = document.createElement("style");
  css.textContent =
    ".bc-intro_wrap{position:fixed;inset:0;z-index:2147483001;pointer-events:auto;background:var(--swatch--dark-900,#0a0e22);display:flex;align-items:center;justify-content:center}" +
    ".bc-intro_wrap::before{content:\"\";position:absolute;inset:0;background:radial-gradient(48% 40% at 86% 56%,color-mix(in srgb,var(--swatch--brand-500,#ff6a3d) 22%,transparent),transparent 75%),radial-gradient(50% 45% at 6% 6%,color-mix(in srgb,var(--swatch--violet,#7b5cd6) 14%,transparent),transparent 72%)}" +
    ".bc-intro_wrap svg.bc-intro_svg{position:relative;width:min(70vw,34rem);height:auto;overflow:visible}" +
    ".bc-intro_wrap svg.bc-intro_cap{position:absolute;left:0;top:100%;width:100%;display:block;margin-top:-1px;fill:var(--swatch--dark-900,#0a0e22)}" +
    ".bc-intro_letter{fill:var(--swatch--light-200,#f2f1ec)}.bc-intro_word{fill:#dcd9d3}.bc-intro_kite{fill:var(--swatch--brand-500,#ff6a3d)}";
  document.head.appendChild(css);

  const capH = Math.round(window.innerWidth * 0.143);
  const wrap = document.createElement("div");
  wrap.className = "bc-intro_wrap";
  wrap.setAttribute("aria-hidden", "true");
  wrap.innerHTML =
    '<svg class="bc-intro_svg" viewBox="105 22 280 84" focusable="false">' +
    '<defs><linearGradient id="bc-intro-grad" gradientUnits="userSpaceOnUse" x1="94" y1="0" x2="112" y2="0"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>' +
    '<mask id="bc-intro-mask" maskUnits="userSpaceOnUse" x="100" y="20" width="300" height="70"><rect x="100" y="20" width="300" height="70" fill="url(#bc-intro-grad)"/></mask></defs>' +
    '<g mask="url(#bc-intro-mask)">' + LOGO_LETTERS.map(d => '<path class="bc-intro_letter" d="' + d + '"/>').join("") + "</g>" +
    '<g class="bc-intro_creative" transform="translate(0,-25.95)">' + LOGO_CREATIVE.map(c => "<" + c[0] + ' class="bc-intro_word" ' + c[1] + '="' + c[2] + '"/>').join("") + "</g>" +
    '<g class="bc-intro_bird"><g class="bc-intro_bob"><g class="bc-intro_tail"><path class="bc-intro_kite" d="' + KITE_TAIL + '"/></g><path class="bc-intro_wing bc-intro_kite" d="' + KITE_WING + '"/></g></g></svg>' +
    '<svg class="bc-intro_cap" viewBox="0 0 1000 143" preserveAspectRatio="none" focusable="false" style="height:' + capH + 'px"><path d="' + KITE_CURVE_DOWN + '"/></svg>';
  document.body.appendChild(wrap);
  html.classList.remove("bc-intro");
  if (lenis && typeof lenis.stop === "function") lenis.stop();

  const bird = wrap.querySelector(".bc-intro_bird");
  const bob = wrap.querySelector(".bc-intro_bob");
  const wing = wrap.querySelector(".bc-intro_wing");
  const tail = wrap.querySelector(".bc-intro_tail");
  const letters = wrap.querySelectorAll(".bc-intro_letter");
  const word = Array.from(wrap.querySelectorAll(".bc-intro_word"));
  const grad = wrap.querySelector("#bc-intro-grad");
  const cap = wrap.querySelector(".bc-intro_cap");

  CustomEase.create("retreat", "0.65, 0, 0.35, 1");
  CustomEase.create("unveil", "0.45, 0, 0.15, 1");
  const HOME_X = 126, HOME_Y = 53.5, HERO = 2.6;
  gsap.set(bird, { svgOrigin: HOME_X + " " + HOME_Y, x: 245 - HOME_X, y: 64 - HOME_Y, scale: HERO * 0.86, opacity: 0, filter: "blur(6px)" });
  // CREATIVE starts spread out from its centre and closes up
  word.forEach(w => { const b = w.getBBox(); gsap.set(w, { x: (b.x + b.width / 2 - 254.6) * 0.35, opacity: 0 }); });
  gsap.set(wing, { transformOrigin: "50% 50%", scaleY: 0.1 });
  gsap.set(tail, { svgOrigin: "120.6 53.4" });
  gsap.set(letters, { x: -10 });
  gsap.set(cap, { scaleY: 0, transformOrigin: "50% 0%" });

  const tl = gsap.timeline({ onComplete: finish });
  const beat = (t, s, k) => {
    tl.to(wing, { scaleY: 1 - 0.6 * s, scaleX: 1 + 0.1 * s, duration: 0.17 * k, ease: "power2.in" }, t);
    tl.to(wing, { scaleY: 1 + 0.06 * s, scaleX: 0.99, duration: 0.24 * k, ease: "power2.out" }, t + 0.17 * k);
    tl.to(wing, { scaleY: 1, scaleX: 1, duration: 0.26 * k, ease: "sine.inOut" }, t + 0.41 * k);
    tl.to(bob, { y: -2.2 * s, duration: 0.26 * k, ease: "power2.out" }, t + 0.1 * k);
    tl.to(bob, { y: 0, duration: 0.42 * k, ease: "sine.inOut" }, t + 0.36 * k);
  };
  // Alone in the centre
  tl.to(bird, { opacity: 1, duration: 0.5, ease: "sine.out" }, 0.15);
  tl.to(bird, { filter: "blur(0px)", duration: 0.6, ease: "power2.out" }, 0.15);
  tl.to(bird, { scale: HERO, duration: 1.2, ease: "expo.out" }, 0.15);
  tl.to(wing, { scaleY: 1, duration: 0.7, ease: "back.out(1.3)" }, 0.3);
  beat(0.75, 0.8, 1.1);
  beat(1.45, 0.8, 1.1);
  // Back to its place by the B
  tl.to(bird, { x: 0, y: 0, scale: 1, duration: 0.95, ease: "retreat" }, 2.05);
  beat(2.92, 0.45, 1);
  tl.to(tail, { keyframes: [
    { rotation: -16, duration: 0.16, ease: "power2.out" },
    { rotation: 7, duration: 0.18, ease: "sine.inOut" },
    { rotation: 0, duration: 0.32, ease: "back.out(2)" }
  ] }, 2.98);
  // The landing beat pushes the name out
  tl.to(grad, { attr: { x1: 380, x2: 398 }, duration: 0.95, ease: "unveil" }, 2.8);
  tl.to(letters, { x: 0, duration: 1.0, ease: "power3.out", stagger: 0.035 }, 2.85);
  // The full name settles in under it
  tl.to(word, { x: 0, opacity: 1, duration: 0.9, ease: "power3.out", stagger: { each: 0.03, from: "center" } }, 3.35);
  // Lift away on the wing curve
  tl.addLabel("exit", 4.35);
  tl.to(cap, { scaleY: 1, duration: 0.35, ease: "power2.out" }, "exit");
  tl.to(wrap, { y: -(window.innerHeight + capH), duration: 1.0, ease: "parallax" }, "exit");

  const skip = () => {
    off();
    if (tl.time() < tl.labels.exit) tl.seek("exit");
  };
  const evs = ["pointerdown", "keydown", "wheel", "touchstart"];
  const off = () => evs.forEach(e => window.removeEventListener(e, skip, true));
  evs.forEach(e => window.addEventListener(e, skip, { capture: true, passive: true }));

  function finish() {
    off();
    wrap.remove();
    css.remove();
    if (lenis && typeof lenis.start === "function") lenis.start();
    if (hasScrollTrigger) ScrollTrigger.refresh();
  }
}

// Case study to case study: the bottom of one page is already a copy of
// the next page's hero, so the new page is laid exactly over it and the
// old one removed. Nothing visibly changes.
function runCaseNextEnter(current, next) {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      current.remove();
      if (hasLenis && lenis) lenis.scrollTo(0, { immediate: true, force: true });
      resetPage(next);
      resolve();
    });
  });
}


// -----------------------------------------
// WEBFLOW RESET
// Each Webflow page has its own data-wf-page id. Forms and interactions
// only work after a Barba swap if the new id is copied across and Webflow
// is restarted.
// -----------------------------------------

function resetWebflow(data) {
  const dom = new DOMParser().parseFromString(data.next.html, "text/html");
  const pageId = dom.documentElement.getAttribute("data-wf-page");
  if (pageId) document.documentElement.setAttribute("data-wf-page", pageId);

  if (window.Webflow) {
    window.Webflow.destroy();
    window.Webflow.ready();
    const ix2 = window.Webflow.require && window.Webflow.require("ix2");
    if (ix2 && ix2.init) ix2.init();
  }
  document.dispatchEvent(new Event("readystatechange"));
}


// -----------------------------------------
// WEBFLOW FORMS AFTER A BARBA SWAP
// Webflow sets up its forms and spam check (Cloudflare Turnstile) on a full
// page load only. After a swap, Webflow.ready() rebinds the forms but leaves
// the submit button locked and never renders the Turnstile check, so the
// brief would be rejected as spam. This loads Turnstile if needed, renders
// the check into each form, hands the token to Webflow and unlocks the
// button once the check has passed. On a first load Webflow does it itself.
// -----------------------------------------

const turnstileSrc = "https://challenges.cloudflare.com/turnstile/v0/api.js";
let turnstileLoading = null;

function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (turnstileLoading) return turnstileLoading;
  if (!document.querySelector('script[src^="' + turnstileSrc + '"]')) {
    const s = document.createElement("script");
    s.src = turnstileSrc;
    s.async = true;
    document.head.appendChild(s);
  }
  turnstileLoading = new Promise(resolve => {
    const started = Date.now();
    const check = setInterval(() => {
      if (window.turnstile || Date.now() - started > 15000) {
        clearInterval(check);
        turnstileLoading = null;
        resolve(window.turnstile || null);
      }
    }, 100);
  });
  return turnstileLoading;
}

function initFormsAfterSwap(scope) {
  scope.querySelectorAll(".w-form form[data-turnstile-sitekey]").forEach(form => {
    if (form.dataset.turnstileInitialized) return;
    form.dataset.turnstileInitialized = "true";
    const wrap = form.closest(".w-form");
    const buttons = form.querySelectorAll('[type="submit"]');
    const lock = on => {
      if (wrap) wrap.classList.toggle("w-form-loading", on);
      buttons.forEach(b => { b.disabled = on; b.classList.toggle("w-form-loading", on); });
    };
    lock(true);
    loadTurnstile().then(ts => {
      // If Turnstile can't load, unlock anyway so Webflow can show its message
      if (!ts || !document.contains(form)) { lock(false); return; }
      form.querySelectorAll("[data-turnstile-widget]").forEach(el => el.remove());
      const box = document.createElement("div");
      box.setAttribute("data-turnstile-widget", "");
      form.appendChild(box);
      const state = window.jQuery ? window.jQuery.data(form, ".w-form") : null;
      ts.render(box, {
        sitekey: form.getAttribute("data-turnstile-sitekey"),
        callback: token => { if (state) state.turnstileToken = token; lock(false); },
        "error-callback": () => lock(false)
      });
    });
  });
}


// -----------------------------------------
// BARBA HOOKS + INIT
// -----------------------------------------

if (!inWebflowEditor()) {

  barba.hooks.before(() => {
    isTransitioning = true;
    if (closeNavMenu) closeNavMenu();
  });

  barba.hooks.after(() => {
    isTransitioning = false;
  });

  barba.hooks.beforeEnter(data => {
    // Retire the old page's scroll animations before the new page sets up its own
    if (hasScrollTrigger) ScrollTrigger.getAll().forEach(t => t.kill());
    gsap.set(data.next.container, { position: "fixed", top: 0, left: 0, right: 0 });
    if (lenis && typeof lenis.stop === "function") lenis.stop();
    initBeforeEnterFunctions(data.next.container);
  });

  barba.hooks.enter(data => {
    initBarbaNavUpdate(data);
  });

  barba.hooks.afterEnter(data => {
    resetWebflow(data);
    initFormsAfterSwap(data.next.container);
    initAfterEnterFunctions(data.next.container);
    if (hasLenis && lenis) { lenis.resize(); lenis.start(); }
    if (hasScrollTrigger) ScrollTrigger.refresh();
    trackPageView();
    announcePage(data.next.container);
  });

  barba.init({
    debug: false,
    timeout: 7000,
    preventRunning: true,
    // Normal page loads for downloads, new tabs, email, phone, same-page
    // anchors and anything marked data-barba-prevent
    prevent: ({ el }) =>
      el.hasAttribute("data-barba-prevent") ||
      el.hasAttribute("download") ||
      el.target === "_blank" ||
      /^(mailto:|tel:|#)/.test(el.getAttribute("href") || ""),
    transitions: [
      {
        name: "case-next",
        sync: true,
        custom: ({ trigger }) => trigger === "case-next",
        async leave() {},
        async enter(data) {
          return runCaseNextEnter(data.current.container, data.next.container);
        }
      },
      {
        name: "default",
        sync: true,
        async once(data) {
          initOnceFunctions();
          initFirstVisitIntro();
          initBeforeEnterFunctions(data.next.container);
          initAfterEnterFunctions(data.next.container);
          return runPageOnceAnimation(data.next.container);
        },
        async leave(data) {
          return runPageLeaveAnimation(data.current.container, data.next.container);
        },
        async enter(data) {
          return runPageEnterAnimation(data.next.container);
        }
      }
    ]
  });

} else {
  // In the Editor: smooth scroll and page features only
  document.documentElement.classList.remove("bc-intro");
  initLenis();
  initNavMain();
  if (document.querySelector("[data-case-hero]")) initCaseIntro(document);
  initAfterEnterFunctions(document);
}


// -----------------------------------------
// HELPERS
// -----------------------------------------

// Accessibility: a full page load tells screen readers about the new page
// and puts keyboard focus at the top. A Barba swap does neither, so this
// reads out the new page title and moves focus to the start of the main
// content. Tab then carries on from the new page, not the old link.
let pageAnnouncer = null;
function announcePage(container) {
  if (!pageAnnouncer) {
    pageAnnouncer = document.createElement("div");
    pageAnnouncer.setAttribute("aria-live", "polite");
    pageAnnouncer.setAttribute("aria-atomic", "true");
    pageAnnouncer.style.cssText = "position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0";
    document.body.appendChild(pageAnnouncer);
  }
  pageAnnouncer.textContent = "";
  setTimeout(() => { pageAnnouncer.textContent = document.title; }, 100);
  const target = container.querySelector("#main, main") || container;
  if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
}

function initLenis() {
  if (lenis || !hasLenis) return;
  lenis = new Lenis({ lerp: 0.165, wheelMultiplier: 1.25 });
  if (hasScrollTrigger) lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

function resetPage(container) {
  window.scrollTo(0, 0);
  gsap.set(container, { clearProps: "position,top,left,right" });
  if (hasLenis && lenis) { lenis.resize(); lenis.start(); }
}

// Start fetching the next page on hover or touch, so it is ready on click
function initPrefetch() {
  if (typeof barba.prefetch !== "function") return;
  const seen = new Set();
  const warm = (e) => {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.origin !== location.origin || seen.has(a.href)) return;
    if (a.hasAttribute("data-barba-prevent") || a.target === "_blank") return;
    if (a.pathname === location.pathname) return;
    seen.add(a.href);
    barba.prefetch(a.href);
  };
  document.addEventListener("pointerenter", warm, true);
  document.addEventListener("touchstart", warm, { capture: true, passive: true });
}

// Keeps the nav's current-page state in sync after each swap
function initBarbaNavUpdate(data) {
  const tpl = document.createElement("template");
  tpl.innerHTML = data.next.html.trim();
  const nextNodes = tpl.content.querySelectorAll("[data-barba-update]");
  const currentNodes = document.querySelectorAll("[data-nav-main] [data-barba-update]");
  const sync = (curr, next) => {
    const status = next.getAttribute("aria-current");
    if (status !== null) curr.setAttribute("aria-current", status);
    else curr.removeAttribute("aria-current");
    curr.setAttribute("class", next.getAttribute("class") || "");
  };
  currentNodes.forEach((curr, i) => {
    const next = nextNodes[i];
    if (!next) return;
    sync(curr, next);
    // Component buttons keep their link inside, so update that too
    const currLinks = curr.querySelectorAll("a");
    const nextLinks = next.querySelectorAll("a");
    currLinks.forEach((a, n) => { if (nextLinks[n]) sync(a, nextLinks[n]); });
  });
}

// GA4: Barba changes pages without a reload, so send each page view.
// In GA4, turn off "Page changes based on browser history events".
function trackPageView() {
  if (typeof window.gtag !== "function") return;
  gtag("event", "page_view", {
    page_location: location.href,
    page_path: location.pathname,
    page_title: document.title
  });
}


// -----------------------------------------
// FEATURES
// -----------------------------------------

// Nav Main: glass pill indicator and the mobile menu.
// The nav sits outside the Barba container, so this runs once.
function initNavMain() {
  const nav = document.querySelector("[data-nav-main]");
  if (!nav || nav.dataset.scriptInitialized) return;
  nav.dataset.scriptInitialized = "true";

  const pill = nav.querySelector("[data-nav-pill]");
  const indicator = nav.querySelector("[data-nav-indicator]");
  const links = Array.from(nav.querySelectorAll("[data-nav-link]"));

  const moveTo = (link) => {
    if (!indicator) return;
    if (!link) { indicator.style.setProperty("--o", "0"); return; }
    indicator.style.setProperty("--x", link.offsetLeft + "px");
    indicator.style.setProperty("--w", link.offsetWidth + "px");
    indicator.style.setProperty("--o", "1");
  };
  const rest = () => moveTo(links.find(l => l.classList.contains("w--current")) || null);
  restNavIndicator = rest;

  links.forEach(link => {
    link.addEventListener("pointerenter", () => moveTo(link));
    link.addEventListener("focus", () => moveTo(link));
  });
  if (pill) {
    pill.addEventListener("pointerleave", rest);
    pill.addEventListener("focusout", e => { if (!pill.contains(e.relatedTarget)) rest(); });
  }
  rest();

  const toggle = nav.querySelector("[data-nav-toggle]");
  const panel = nav.querySelector("[data-nav-panel]");
  if (!toggle || !panel) return;

  const setOpen = (open) => {
    nav.classList.toggle("is-active", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    const page = document.querySelector('[data-barba="container"]');
    if (open) {
      panel.removeAttribute("inert");
      if (page) page.setAttribute("inert", "");
      if (lenis) lenis.stop();
      document.documentElement.style.overflow = "hidden";
    } else {
      panel.setAttribute("inert", "");
      if (page) page.removeAttribute("inert");
      document.documentElement.style.overflow = "";
      if (lenis) lenis.start();
    }
  };
  closeNavMenu = () => { if (nav.classList.contains("is-active")) setOpen(false); };

  toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-active")));
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && nav.classList.contains("is-active")) { setOpen(false); toggle.focus(); }
  });
  nav.querySelectorAll("[data-nav-close]").forEach(a => a.addEventListener("click", () => setOpen(false)));
  window.matchMedia("(min-width: 62em)").addEventListener?.("change", e => { if (e.matches) closeNavMenu(); });
}

// Project and service cards: light follows the pointer
function initCardSpot(scope) {
  if (!fineMQ.matches) return;
  scope.querySelectorAll("[data-card-spot]").forEach(card => {
    if (card.dataset.scriptInitialized) return;
    card.dataset.scriptInitialized = "true";
    card.addEventListener("pointermove", e => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      card.style.setProperty("--mx", x + "px");
      card.style.setProperty("--my", y + "px");
      card.style.setProperty("--px", (x / r.width - 0.5).toFixed(3));
      card.style.setProperty("--py", (y / r.height - 0.5).toFixed(3));
    });
    card.addEventListener("pointerleave", () => {
      card.style.setProperty("--px", "0");
      card.style.setProperty("--py", "0");
    });
  });
}

// Client accent colours. Each project can carry its own brand colour from
// the CMS. Very dark brand colours (a black, say) would vanish on the dark
// site, so they are lifted towards Bone until they read clearly against
// Midnight (4.5:1). --accent gets the readable colour every style uses,
// --accent-brand keeps the exact hex. Returns null for anything that isn't a hex.
function accentColours(raw) {
  const v = (raw || "").trim().replace(/^#/, "");
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v)) return null;
  const full = v.length === 3 ? v.split("").map(c => c + c).join("") : v;
  const rgb = [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16));
  const lum = c => {
    const l = c.map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
    return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
  };
  const night = lum([10, 14, 34]), bone = [242, 241, 236];
  let ui = rgb, t = 0;
  while ((lum(ui) + 0.05) / (night + 0.05) < 4.5 && t < 1) {
    t = Math.min(1, t + 0.05);
    ui = rgb.map((x, i) => Math.round(x + (bone[i] - x) * t));
  }
  const hex = c => "#" + c.map(x => x.toString(16).padStart(2, "0")).join("");
  return { brand: hex(rgb), ui: hex(ui), lifted: t > 0 };
}
function applyAccent(el, raw) {
  const a = accentColours(raw);
  if (!a) return;
  el.style.setProperty("--accent", a.ui);
  el.style.setProperty("--accent-brand", a.brand);
  if (a.lifted) el.setAttribute("data-accent-lifted", "");
}

// Project cards on the Projects index (CMS list).
// Accent: sets --accent from the CMS hex (see accentColours) so the cover, dot
// and hover pick up the client's colour. Empty keeps Brecon orange.
// Link: the Webflow API can't point a list item at its own page, so the card
// carries its slug and this sets the href (same pattern as Next project).
function initProjectCards(scope) {
  scope.querySelectorAll("[data-card-spot][data-accent]").forEach(card => {
    applyAccent(card, card.getAttribute("data-accent"));
  });
  scope.querySelectorAll("a[data-project-slug]").forEach(link => {
    const slug = (link.getAttribute("data-project-slug") || "").trim();
    if (/^[a-z0-9-]+$/i.test(slug)) link.setAttribute("href", "/projects/" + slug);
  });  fitTitleUnderlines(scope);
}

// A title that wraps is as wide as its column, so its hover underline would
// run past the words. This narrows each title to its longest line, and again
// after fonts load and on resize.
let titleFitBound = false;
function fitTitleUnderlines(scope) {
  if (!scope.querySelector(".projects_card_title")) return;
  const fit = () => document.querySelectorAll(".projects_card_title").forEach(t => {
    t.style.width = "";
    const range = document.createRange();
    range.selectNodeContents(t);
    const left = t.getBoundingClientRect().left;
    let widest = 0;
    for (const r of range.getClientRects()) widest = Math.max(widest, r.right - left);
    if (widest > 0) t.style.width = Math.ceil(widest + 1) + "px";
  });
  fit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  if (!titleFitBound) {
    titleFitBound = true;
    let timer;
    window.addEventListener("resize", () => { clearTimeout(timer); timer = setTimeout(fit, 150); });
  }
}

// Magnetic call to action
function initMagnetic(scope) {
  if (!fineMQ.matches || reducedMotion) return;
  scope.querySelectorAll(magneticSel).forEach(el => {
    if (el.dataset.scriptInitialized) return;
    el.dataset.scriptInitialized = "true";
    el.addEventListener("pointermove", e => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--tx", ((e.clientX - (r.left + r.width / 2)) * 0.3).toFixed(1) + "px");
      el.style.setProperty("--ty", ((e.clientY - (r.top + r.height / 2)) * 0.4).toFixed(1) + "px");
    });
    el.addEventListener("pointerleave", () => {
      el.style.setProperty("--tx", "0rem");
      el.style.setProperty("--ty", "0rem");
    });
  });
}

// Copy email button
function initCopyEmail(scope) {
  scope.querySelectorAll("[data-copy-email]").forEach(btn => {
    if (btn.dataset.scriptInitialized) return;
    btn.dataset.scriptInitialized = "true";
    const email = btn.getAttribute("data-copy-email");
    const text = btn.querySelector("[data-copy-email-text]");
    const status = btn.querySelector("[data-copy-email-status]");
    let timer = null;
    btn.addEventListener("click", () => {
      if (!navigator.clipboard) { window.location.href = "mailto:" + email; return; }
      navigator.clipboard.writeText(email).then(() => {
        btn.classList.add("is-active");
        if (text) text.textContent = "Email copied";
        if (status) status.textContent = "Email address copied to clipboard";
        clearTimeout(timer);
        timer = setTimeout(() => {
          btn.classList.remove("is-active");
          if (text) text.textContent = email;
          if (status) status.textContent = "";
        }, 1800);
      }).catch(() => { window.location.href = "mailto:" + email; });
    });
  });
}

// Count-up figures. The real number is in the HTML, so it still reads
// correctly without JavaScript or with reduced motion.
function initCountUp(scope) {
  if (reducedMotion || !hasScrollTrigger) return;
  scope.querySelectorAll("[data-count-up]").forEach(el => {
    if (el.dataset.scriptInitialized) return;
    el.dataset.scriptInitialized = "true";
    const target = parseFloat(el.getAttribute("data-count-up")) || 0;
    const counter = { v: 0 };
    el.textContent = "0";
    ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      once: true,
      onEnter: () => gsap.to(counter, {
        v: target, duration: 1.8, ease: "power4.out",
        onUpdate: () => { el.textContent = Math.round(counter.v); }
      })
    });
  });
}

// Projects carousel on mobile: dots and counter follow the scroll
function initRail(scope) {
  scope.querySelectorAll("[data-projects-rail]").forEach(rail => {
    if (rail.dataset.scriptInitialized) return;
    rail.dataset.scriptInitialized = "true";
    const section = rail.closest("section") || scope;
    const dots = Array.from(section.querySelectorAll(".projects_home_dot"));
    const current = section.querySelector("[data-rail-current]");
    const cards = Array.from(rail.children);
    let ticking = false;
    const update = () => {
      ticking = false;
      if (!cards.length) return;
      const step = cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : rail.clientWidth;
      const i = Math.max(0, Math.min(cards.length - 1, Math.round(rail.scrollLeft / Math.max(step, 1))));
      dots.forEach((d, n) => d.classList.toggle("is-active", n === i));
      if (current) current.textContent = String(i + 1).padStart(2, "0");
    };
    rail.addEventListener("scroll", () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  });
}

// Scroll reveals. Content already in the first screen is left alone so
// nothing flickers during a page transition. Without JavaScript nothing
// is hidden.
function initReveal(scope) {
  if (reducedMotion || !hasScrollTrigger) return;
  const containerTop = scope === document ? 0 : scope.getBoundingClientRect().top;
  scope.querySelectorAll("[data-reveal]").forEach(el => {
    if (el.dataset.scriptInitialized) return;
    el.dataset.scriptInitialized = "true";
    const top = el.getBoundingClientRect().top - containerTop;
    if (top < window.innerHeight * 0.9) return;
    gsap.fromTo(el,
      { autoAlpha: 0, y: "2rem" },
      { autoAlpha: 1, y: 0, duration: 0.9, ease: "glide",
        scrollTrigger: { trigger: el, start: "top 92%", once: true } });
  });
}

// Case study intro. Runs before the page is shown (before the Barba slide,
// or straight away on a first load), so nothing appears and then resets.
// Sets the accent colour, starts the sticky call to action hidden, loads
// the hero image first and plays the hero entrance. During a slide the
// text rises in as the page arrives. After a seamless next project swap
// the hero is already on screen, so it is left alone.
function initCaseIntro(scope) {
  const hero = scope.querySelector("[data-case-hero]");
  if (!hero || hero.dataset.introInitialized) return;
  hero.dataset.introInitialized = "true";
  const root = scope === document ? document.documentElement : scope;

  // Accent colour from the CMS (hex). Empty keeps Brecon orange.
  applyAccent(root, hero.getAttribute("data-accent"));

  // Call to action starts hidden, with no fade on the way out
  const cta = scope.querySelector("[data-case-cta]");
  if (cta) {
    cta.style.transition = "none";
    cta.classList.add("is-hidden", "is-ready");
    void cta.offsetWidth;
    cta.style.transition = "";
  }

  // Hero image is the first thing seen, so load it now
  const poster = hero.querySelector(".case_hero_poster");
  if (poster) { poster.loading = "eager"; poster.fetchPriority = "high"; }

  const parts = hero.querySelectorAll(".case_hero_eyebrow, .case_hero_title, .case_hero_tagline, .case_hero_meta_item");
  if (window.__caseSeamless === true || reducedMotion || inWebflowEditor()) {
    gsap.set(parts, { autoAlpha: 1 });
    return;
  }
  const delay = isTransitioning ? (isMobile() ? 0.45 : 0.6) : 0.2;
  gsap.set(parts, { y: "2rem", autoAlpha: 0 });
  gsap.to(parts, { y: 0, autoAlpha: 1, duration: 1.1, ease: "glide", stagger: 0.06, delay });
}

// Case study pages: reels, count-up figures, parallax,
// the sticky call to action and the scroll-to-next-project hand-off.
// The next project section is a copy of the next page's hero. When its
// progress line fills, Barba swaps to that page with the "case-next"
// transition, so the swap is invisible.
function initCase(scope) {
  const hero = scope.querySelector("[data-case-hero]");
  if (!hero || hero.dataset.scriptInitialized) return;
  hero.dataset.scriptInitialized = "true";
  window.__caseSeamless = false;

  // Live site button only when there is a URL
  scope.querySelectorAll("[data-site-link]").forEach(el => {
    const a = linkIn(el);
    const h = a ? (a.getAttribute("href") || "").trim() : "";
    // A plain link hides its wrapper, a component hides itself
    const box = el.matches("a") ? (el.parentElement || el) : el;
    if (!h || h === "#") { box.style.display = "none"; return; }
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener");
  });

  // Reels: a Bunny direct MP4 plays muted on loop while in view. A Bunny
  // embed URL becomes a background iframe. Empty fields leave the image.
  const saveData = navigator.connection && navigator.connection.saveData;
  scope.querySelectorAll("video[data-case-video]").forEach(v => {
    const src = (v.getAttribute("src") || "").trim();
    if (!src || reducedMotion || saveData) { v.remove(); return; }
    if (/mediadelivery\.net\/(embed|play)\//.test(src)) {
      const u = new URL(src.replace("/play/", "/embed/"));
      ["autoplay", "loop", "muted", "preload"].forEach(k => u.searchParams.set(k, "true"));
      u.searchParams.set("responsive", "false");
      const f = document.createElement("iframe");
      f.src = u.toString();
      f.className = v.className;
      f.setAttribute("data-case-video", "true");
      f.setAttribute("title", "Project film");
      f.setAttribute("allow", "autoplay; encrypted-media; picture-in-picture");
      f.setAttribute("tabindex", "-1");
      f.setAttribute("aria-hidden", "true");
      f.addEventListener("load", () => setTimeout(() => f.classList.add("is-playing"), 700));
      v.replaceWith(f);
      return;
    }
    v.muted = true; v.loop = true; v.playsInline = true;
    v.addEventListener("playing", () => v.classList.add("is-playing"), { once: true });
    const play = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(entries => entries.forEach(e => (e.isIntersecting ? play() : v.pause())),
        { threshold: 0.1 }).observe(v.parentElement || v);
    } else play();
  });

  // Count-up figures read from the CMS text, e.g. 73.5M, 87%, 24/7
  if (!reducedMotion && hasScrollTrigger) {
    scope.querySelectorAll("[data-count-auto]").forEach(el => {
      const text = el.textContent.trim();
      const m = text.match(/^([^\d]*)(\d[\d.,]*)(.*)$/);
      if (!m) return;
      const clean = m[2].replace(/,/g, ""), num = parseFloat(clean);
      const dec = (clean.split(".")[1] || "").length;
      if (isNaN(num)) return;
      const fmt = v => m[1] + (dec ? v.toFixed(dec) : Math.round(v).toString()) + m[3];
      const c = { v: 0 };
      el.textContent = fmt(0);
      ScrollTrigger.create({ trigger: el, start: "top 90%", once: true, onEnter: () =>
        gsap.to(c, { v: num, duration: 1.8, ease: "power4.out",
          onUpdate: () => { el.textContent = fmt(c.v); },
          onComplete: () => { el.textContent = text; } }) });
    });
  }

  // Sticky call to action: hidden over the hero and the next project
  const cta = scope.querySelector("[data-case-cta]");
  const next = scope.querySelector("[data-case-next]");
  if (cta) {
    let inHero = true, inNext = false;
    const set = () => cta.classList.toggle("is-hidden", inHero || inNext);
    set();
    if (hasScrollTrigger) {
      ScrollTrigger.create({ trigger: hero, start: "top top", end: "bottom 40%",
        onToggle: self => { inHero = self.isActive; set(); } });
      if (next) ScrollTrigger.create({ trigger: next, start: "top 60%", end: "bottom top",
        onToggle: self => { inNext = self.isActive; set(); } });
    } else { inHero = false; set(); }
  }

  if (!reducedMotion && hasScrollTrigger) {
    // Hero media drifts on scroll
    const heroMedia = hero.querySelector(".case_hero_media");
    if (heroMedia) gsap.to(heroMedia, { yPercent: 14, ease: "none",
      scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });

    // Image parallax inside its frame
    scope.querySelectorAll("[data-parallax]").forEach(img => {
      gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: "none",
        scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: true } });
    });
  }

  // Next project
  if (!next) return;
  const link = next.querySelector("[data-next-slug]");
  const slug = link ? (link.getAttribute("data-next-slug") || "").trim() : "";
  if (!slug) { next.remove(); return; }
  const href = "/projects/" + slug;
  link.setAttribute("href", href);
  if (reducedMotion || !hasScrollTrigger || inWebflowEditor()) return;

  const media = next.querySelector(".case_hero_media");
  const content = next.querySelector(".case_hero_content");
  const fill = next.querySelector(".case_next_fill");
  const hint = next.querySelector(".case_next_hint");
  let gone = false;
  const go = () => {
    if (gone) return;
    gone = true;
    window.__caseSeamless = true;
    if (hint) hint.textContent = "Opening";
    barba.go(href, "case-next");
  };

  ScrollTrigger.create({ trigger: next, start: "top bottom", once: true,
    onEnter: () => { if (typeof barba.prefetch === "function") barba.prefetch(href); } });

  gsap.set(media, { clipPath: "inset(12% 6% 12% 6% round 2rem)" });
  gsap.set(content, { y: "3rem", autoAlpha: 0.35 });
  gsap.timeline({
    scrollTrigger: { trigger: next, start: "top top", end: "bottom bottom", scrub: true,
      onUpdate: self => { if (self.progress > 0.995) go(); } }
  })
    .to(media, { clipPath: "inset(0% 0% 0% 0% round 0rem)", ease: "none" }, 0)
    .to(content, { y: 0, autoAlpha: 1, ease: "none" }, 0)
    .fromTo(fill, { scaleX: 0 }, { scaleX: 1, ease: "none" }, 0);
}

// Contact page: live studio clock, the step by step project brief with its
// written summary, the reply-by date, the sent state and the Cal.com booking
// calendar. Without JavaScript the form still works as one long form.
function initContact(scope) {
  const root = scope.querySelector("[data-contact]");
  if (!root || root.dataset.scriptInitialized) return;
  root.dataset.scriptInitialized = "true";
  const motion = !reducedMotion && !!window.gsap;
  const pad = n => String(n).padStart(2, "0");

  // London time helpers. Working days skip weekends and Thursdays.
  const workDays = (root.getAttribute("data-work-days") || "1,2,3,5").split(",").map(Number);
  const london = () => new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/London" }));
  const minutes = s => { const [h, m] = (s || "0:0").split(":").map(Number); return h * 60 + (m || 0); };
  const nextWorkingDay = () => {
    const d = london();
    do { d.setDate(d.getDate() + 1); } while (!workDays.includes(d.getDay()));
    return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
  };

  // Live clock and studio status
  const clock = root.querySelector("[data-contact-clock]");
  const state = root.querySelector("[data-contact-state]");
  const stateDot = root.querySelector("[data-contact-state-dot]");
  if (clock) {
    const open = minutes(clock.getAttribute("data-open") || "09:00");
    const close = minutes(clock.getAttribute("data-close") || "17:30");
    const tick = () => {
      if (!document.contains(clock)) { clearInterval(timer); return; }
      const now = london();
      clock.textContent = pad(now.getHours()) + ":" + pad(now.getMinutes());
      const m = now.getHours() * 60 + now.getMinutes();
      const isOpen = workDays.includes(now.getDay()) && m >= open && m < close;
      if (state) state.textContent = isOpen ? "Studio open" : "Studio closed";
      if (stateDot) stateDot.classList.toggle("is-closed", !isOpen);
    };
    const timer = setInterval(tick, 10000);
    tick();
  }

  // Smooth scroll to the booking calendar
  scope.querySelectorAll("[data-contact-book]").forEach(el => {
    if (el.dataset.scriptInitialized) return;
    el.dataset.scriptInitialized = "true";
    el.addEventListener("click", e => {
      const a = linkIn(el);
      const id = a ? (a.getAttribute("href") || "").split("#")[1] : "";
      const target = id && (scope.querySelector("#" + id) || document.getElementById(id));
      if (!target) return;
      e.preventDefault();
      if (hasLenis && lenis) lenis.scrollTo(target, { offset: -32, duration: 1.4 });
      else target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
    });
  });

  // Brief builder
  const brief = root.querySelector("[data-brief]");
  const form = brief && brief.querySelector("form");
  if (brief && form) {
    const steps = Array.from(form.querySelectorAll("[data-brief-step]"));
    const total = steps.length;
    const count = brief.querySelector("[data-brief-count]");
    const live = brief.querySelector("[data-brief-live]");
    const summary = brief.querySelector("[data-brief-summary]");
    const output = form.querySelector("[data-brief-output]");
    const done = brief.querySelector(".w-form-done");
    const emptyText = summary ? summary.textContent.trim() : "";
    let current = 0;

    const value = name => {
      const el = form.querySelector('input[name="' + name + '"]:checked') || form.querySelector('[name="' + name + '"]:not([type="radio"])');
      return el ? (el.value || "").trim() : "";
    };
    // Budget bands follow the service picked in step 1. Bands and hints come
    // from the Pricing collection (hidden list on the page), split by |
    const budgetStep = form.querySelector("[data-budget-step]");
    const pricing = {};
    scope.querySelectorAll("[data-price-key]").forEach(el => {
      pricing[(el.getAttribute("data-price-key") || "").trim()] = {
        bands: el.getAttribute("data-price-bands") || "",
        hint: el.getAttribute("data-price-hint") || ""
      };
    });
    let budgetFor = "";
    const syncBudget = () => {
      if (!budgetStep) return;
      const key = (value("Service") || "Website").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (!key || key === budgetFor) return;
      const entry = pricing[key] || {};
      const bands = (entry.bands || budgetStep.getAttribute("data-budget-" + key) || "").split("|").map(b => b.trim()).filter(Boolean);
      if (!bands.length) return;
      const radios = Array.from(budgetStep.querySelectorAll('input[type="radio"]'));
      if (budgetFor) radios.forEach(r => { r.checked = false; });
      budgetFor = key;
      radios.forEach((r, n) => {
        const label = r.closest("label");
        if (label) label.style.display = bands[n] ? "" : "none";
        if (!bands[n]) return;
        r.value = bands[n];
        const text = label && label.querySelector(".contact_option_text");
        if (text) text.textContent = bands[n];
      });
      const hint = budgetStep.querySelector("[data-budget-hint]");
      const hintText = entry.hint || budgetStep.getAttribute("data-budget-hint-" + key);
      if (hint && hintText) hint.textContent = hintText;
    };
    const setProgress = p => root.style.setProperty("--brief-progress", String(Math.max(0, Math.min(1, p))));

    // The brief, written as a sentence from the answers so far
    const compose = () => {
      const service = value("Service"), budget = value("Budget"), timeline = value("Timeline");
      const org = value("Organisation");
      const lead = { "Website": "A new website", "Brand identity": "A brand identity", "Website and brand": "A new website and brand", "Something else": "A new project" }[service] || "";
      if (!lead) return "";
      let s = lead + (org ? " for " + org : "");
      if (budget) s += budget === "Not sure yet" ? ", budget to be agreed" : ", with a budget of " + budget.replace(/^Under/, "under");
      const t = { "As soon as possible": "starting as soon as possible", "In the next 3 months": "starting in the next 3 months", "In 3 to 6 months": "starting in 3 to 6 months", "Just exploring": "just exploring for now" }[timeline];
      if (t) s += ", " + t;
      return s + ".";
    };
    let shown = "";
    const scramble = (el, text) => {
      if (!motion) { el.textContent = text; return; }
      const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
      const from = el.textContent;
      const o = { p: 0 };
      gsap.killTweensOf(o);
      gsap.to(o, { p: 1, duration: 0.6, ease: "none", onUpdate: () => {
        const n = Math.floor(text.length * o.p);
        let out = text.slice(0, n);
        for (let i = n; i < Math.min(text.length, n + 6); i++) out += text[i] === " " ? " " : chars[(Math.random() * chars.length) | 0];
        el.textContent = out || from;
      }, onComplete: () => { el.textContent = text; } });
    };
    const updateSummary = () => {
      const s = compose();
      if (output) output.value = s;
      if (!summary || s === shown) return;
      shown = s;
      summary.classList.toggle("is-filled", !!s);
      if (!s) { summary.textContent = emptyText; return; }
      scramble(summary, s);
    };

    const say = msg => { if (live) { live.textContent = ""; setTimeout(() => { live.textContent = msg; }, 50); } };
    const show = (i, focus) => {
      steps.forEach((s, n) => { s.hidden = n !== i; });
      current = i;
      if (count) count.textContent = pad(i + 1) + " / " + pad(total);
      setProgress(i / total);
      const step = steps[i];
      if (motion && focus) gsap.fromTo(step, { autoAlpha: 0, y: "1rem" }, { autoAlpha: 1, y: 0, duration: 0.6, ease: "glide", clearProps: "transform,opacity,visibility" });
      if (focus) {
        const q = step.querySelector("[data-brief-question]");
        if (q) { q.setAttribute("tabindex", "-1"); q.focus({ preventScroll: true }); }
        const top = brief.getBoundingClientRect().top;
        if (top < 0) { if (hasLenis && lenis) lenis.scrollTo(brief, { offset: -96 }); else brief.scrollIntoView(); }
        say("Question " + (i + 1) + " of " + total);
      }
    };

    const valid = step => {
      const radios = step.querySelectorAll('input[type="radio"]');
      if (radios.length && !Array.from(radios).some(r => r.checked)) {
        const opts = step.querySelector(".contact_options");
        if (opts && motion) gsap.fromTo(opts, { x: 0 }, { keyframes: [{ x: -6 }, { x: 6 }, { x: -3 }, { x: 0 }], duration: 0.4, ease: "none" });
        radios[0].focus();
        say("Choose an option to continue");
        return false;
      }
      const bad = Array.from(step.querySelectorAll("input, textarea, select")).find(f => f.type !== "radio" && !f.checkValidity());
      if (bad) { bad.reportValidity(); bad.focus(); return false; }
      return true;
    };
    const next = () => { if (valid(steps[current]) && current < total - 1) show(current + 1, true); };
    const back = () => { if (current > 0) show(current - 1, true); };

    // Next and Back: a real button inside a Button Roll component, or a link
    // with role="button". No jump to the top, and Space works on the link
    // as it does on a real button (a real button handles Space itself).
    const asButton = (b, fn) => {
      b.addEventListener("click", e => { e.preventDefault(); fn(); });
      b.addEventListener("keydown", e => {
        if (e.key === " " && !e.target.closest("button")) { e.preventDefault(); fn(); }
      });
    };
    form.querySelectorAll("[data-brief-next]").forEach(b => asButton(b, next));
    form.querySelectorAll("[data-brief-back]").forEach(b => asButton(b, back));
    form.addEventListener("change", e => { if (e.target.name === "Service") syncBudget(); updateSummary(); });
    form.addEventListener("input", e => { if (e.target.name === "Organisation") updateSummary(); });

    // A real click on an option moves on. Keyboard users browse options with
    // the arrow keys, so for them it waits for Next.
    form.addEventListener("click", e => {
      if (!e.detail || !e.target.closest(".contact_option")) return;
      const i = current;
      setTimeout(() => {
        if (i === current && steps[i].querySelector('input[type="radio"]:checked') && i < total - 1) show(i + 1, true);
      }, 450);
    });
    // Enter in a text field moves on instead of sending early
    form.addEventListener("keydown", e => {
      if (e.key !== "Enter" || e.target.tagName === "TEXTAREA" || e.target.type === "radio" || e.target.type === "submit" || e.target.closest("a, button")) return;
      if (current < total - 1) { e.preventDefault(); next(); }
    });
    // Check every step before Webflow sends it
    form.addEventListener("submit", e => {
      const i = steps.findIndex(s => {
        const radios = s.querySelectorAll('input[type="radio"]');
        const ok = (!radios.length || Array.from(radios).some(r => r.checked)) &&
          Array.from(s.querySelectorAll("input, textarea")).every(f => f.type === "radio" || f.checkValidity());
        return !ok;
      });
      if (i !== -1) { e.preventDefault(); e.stopImmediatePropagation(); show(i, true); valid(steps[i]); return; }
      updateSummary();
      sendLabel("Sending");
      const date = brief.querySelector("[data-brief-reply]");
      if (date) date.textContent = nextWorkingDay();
      const nameEl = brief.querySelector("[data-brief-name]");
      const first = value("Name").split(" ")[0];
      if (nameEl) nameEl.textContent = first ? ", " + first : "";
    }, true);

    // The send button (a Button Roll) says Sending while the brief goes, and
    // goes back to its own label if Webflow shows the error message
    const sendLabel = text => {
      form.querySelectorAll('[type="submit"]').forEach(b => {
        const box = b.closest(".button-roll_wrap");
        if (!box) return;
        box.querySelectorAll(".button-roll_text").forEach(t => {
          if (!t.dataset.label) t.dataset.label = t.textContent;
          t.textContent = text || t.dataset.label;
        });
      });
    };
    const fail = brief.querySelector(".w-form-fail");
    if (fail && "MutationObserver" in window) {
      new MutationObserver(() => { if (getComputedStyle(fail).display !== "none") sendLabel(""); })
        .observe(fail, { attributes: true, attributeFilter: ["style"] });
    }

    // Sent: Webflow shows the success block, the card settles
    if (done && "MutationObserver" in window) {
      const mo = new MutationObserver(() => {
        if (getComputedStyle(done).display === "none") return;
        mo.disconnect();
        brief.classList.add("is-sent");
        setProgress(1);
        if (count) count.textContent = "Sent";
        if (motion) gsap.fromTo(done.children, { autoAlpha: 0, y: "1rem" }, { autoAlpha: 1, y: 0, duration: 0.8, ease: "glide", stagger: 0.08 });
        const title = done.querySelector("[data-brief-done-title]");
        if (title) { title.setAttribute("tabindex", "-1"); title.focus({ preventScroll: true }); }
        if (typeof window.gtag === "function") gtag("event", "generate_lead", { form_name: "Project brief" });
      });
      mo.observe(done, { attributes: true, attributeFilter: ["style"] });
    }

    brief.classList.add("is-ready");
    syncBudget();
    show(0, false);
    updateSummary();
  }

  // Cal.com booking calendar, loaded when it gets close to the screen
  const cal = scope.querySelector("[data-cal-link]");
  if (cal && !cal.dataset.scriptInitialized) {
    cal.dataset.scriptInitialized = "true";
    const link = cal.getAttribute("data-cal-link");
    const frame = cal.closest(".contact_cal") || cal;
    const load = () => {
      (function (C, A, L) { const p = (a, ar) => a.q.push(ar); const d = C.document; C.Cal = C.Cal || function () { const c = C.Cal; const ar = arguments; if (!c.loaded) { c.ns = {}; c.q = c.q || []; d.head.appendChild(d.createElement("script")).src = A; c.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const ns = ar[1]; api.q = api.q || []; if (typeof ns === "string") { c.ns[ns] = c.ns[ns] || api; p(c.ns[ns], ar); p(c, ["initNamespace", ns]); } else p(c, ar); return; } p(c, ar); }; })(window, "https://app.cal.com/embed/embed.js", "init");
      window.__calCount = (window.__calCount || 0) + 1;
      const ns = "brecon" + window.__calCount;
      if (!cal.id) cal.id = "contact-cal-" + window.__calCount;
      Cal("init", ns, { origin: "https://app.cal.com" });
      Cal.ns[ns]("inline", { elementOrSelector: "#" + cal.id, calLink: link, config: { layout: "month_view", theme: "dark" } });
      Cal.ns[ns]("ui", { theme: "dark", hideEventTypeDetails: false, layout: "month_view", cssVarsPerTheme: { dark: { "cal-brand": "#ff6a3d" } } });
      Cal.ns[ns]("on", { action: "linkReady", callback: () => frame.classList.add("is-loaded") });
    };
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: "800px 0px" });
      io.observe(cal);
    } else load();
  }
}

// Prices from the Pricing collection. A page that shows prices has a hidden
// Pricing list; elements tagged data-price="slug" get the figure dropped into
// their data-price-format. The text set in the Designer is the fallback.
function initPricing(scope) {
  const prices = {};
  scope.querySelectorAll("[data-price-key]").forEach(el => {
    const key = (el.getAttribute("data-price-key") || "").trim();
    const from = (el.getAttribute("data-price-from") || "").trim();
    if (key && from) prices[key] = from;
  });
  scope.querySelectorAll("[data-price]").forEach(el => {
    const price = prices[(el.getAttribute("data-price") || "").trim()];
    const format = el.getAttribute("data-price-format") || "{price}";
    if (price) el.textContent = format.replace("{price}", price);
  });
}

// FAQ lists from the CMS follow their Order field, even if the list's own
// sort setting is left off
function initFaqOrder(scope) {
  const lists = new Set();
  scope.querySelectorAll("[data-faq-order]").forEach(el => {
    const item = el.closest(".w-dyn-item");
    if (item && item.parentElement) lists.add(item.parentElement);
  });
  const rank = item => {
    const d = item.querySelector("[data-faq-order]");
    const v = d ? parseFloat(d.getAttribute("data-faq-order")) : NaN;
    return isNaN(v) ? 9999 : v;
  };
  lists.forEach(list => {
    Array.from(list.children).sort((a, b) => rank(a) - rank(b)).forEach(item => list.appendChild(item));
  });
}

// Accordions: native <details> tagged data-accordion open and close with a
// smooth height animation instead of snapping. Keyboard, find-in-page and
// no-JavaScript behaviour stay native. Reduced motion keeps the snap.
// -----------------------------------------
// 404 | THE KITE TOOK IT
// "Another excuse" cycles through excuses in a shuffled order, never the same
// one twice in a row. Tapping the kite does the same, with a startled flap.
// The text sits in a polite live region so screen readers hear each new excuse.
// -----------------------------------------
const NOT_FOUND_EXCUSES = [
  "The intern deleted it. There is no intern.",
  "It went for a walk up Pen y Fan. Back by teatime, probably.",
  "It fell in the Wye near Glasbury. We've sent a canoe.",
  "The client asked for the logo to be bigger. Something had to go.",
  "It's in round two of amends. It may be some time.",
  "We turned it off and on again. Now it's just off.",
  "It was here a minute ago. We've checked behind the sofa twice.",
  "It's lining a nest somewhere over Brecon. Very cosy, apparently.",
  "Someone typed the address with their elbow. We're not saying it was you.",
  "A red kite took it. We did mention they do that."
];

function initNotFound(scope) {
  const root = scope.querySelector("[data-not-found]");
  if (!root || root.dataset.scriptInitialized) return;
  root.dataset.scriptInitialized = "true";
  const text = root.querySelector("[data-excuse-text]");
  const count = root.querySelector("[data-excuse-count]");
  const next = root.querySelector("[data-excuse-next]");
  const kite = root.querySelector("[data-nf-kite]");
  const sky = root.querySelector("[data-nf-sky]");
  if (!text) return;

  const total = NOT_FOUND_EXCUSES.length;
  let order = [], pos = -1, last = 0;
  const shuffle = () => {
    order = [...Array(total).keys()].sort(() => Math.random() - 0.5);
    // First round: the excuse already on screen goes to the back of the queue
    if (pos < 0) order = order.filter(i => i !== last).concat(last);
    else if (order[0] === last) order.push(order.shift());
    pos = 0;
  };
  let seen = 1;
  const show = () => {
    if (pos < 0 || pos >= order.length - 1) shuffle(); else pos++;
    last = order[pos];
    seen++; // keeps counting past the total: "Excuse 11 of 10" is part of the joke
    const swap = () => {
      text.textContent = NOT_FOUND_EXCUSES[last];
      if (count) count.textContent = "Excuse " + String(seen).padStart(2, "0") + " of " + total;
    };
    if (reducedMotion || typeof gsap === "undefined") { swap(); return; }
    gsap.timeline()
      .to(text, { opacity: 0, y: -6, duration: 0.18, ease: "power2.in", onComplete: swap })
      .fromTo(text, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" });
  };
  last = 0;
  text.textContent = NOT_FOUND_EXCUSES[0];
  if (count) count.textContent = "Excuse 01 of " + total;

  if (next) next.addEventListener("click", show);
  if (kite) kite.addEventListener("click", () => {
    show();
    kite.classList.remove("is-startled");
    void kite.getBoundingClientRect();
    kite.classList.add("is-startled");
  });

  // The kite leans a little towards the pointer, on mouse and trackpad only
  if (sky && !reducedMotion && typeof gsap !== "undefined" && matchMedia("(hover: hover) and (pointer: fine)").matches) {
    const tx = gsap.quickTo(sky, "x", { duration: 1.2, ease: "power3.out" });
    const ty = gsap.quickTo(sky, "y", { duration: 1.2, ease: "power3.out" });
    root.addEventListener("pointermove", e => {
      const b = root.getBoundingClientRect();
      tx(((e.clientX - b.left) / b.width - 0.5) * 24);
      ty(((e.clientY - b.top) / b.height - 0.5) * 16);
    });
    root.addEventListener("pointerleave", () => { tx(0); ty(0); });
  }
}

function initAccordion(scope) {
  scope.querySelectorAll("details[data-accordion]").forEach(d => {
    if (d.dataset.scriptInitialized) return;
    d.dataset.scriptInitialized = "true";
    const summary = d.querySelector("summary");
    if (!summary) return;
    const body = Array.from(d.children).filter(c => c !== summary);

    const done = () => {
      d.classList.remove("is-closing");
      gsap.set(d, { clearProps: "height,overflow" });
      if (hasLenis && lenis) lenis.resize();
      if (hasScrollTrigger) ScrollTrigger.refresh();
    };

    summary.addEventListener("click", e => {
      if (reducedMotion) return;
      e.preventDefault();
      gsap.killTweensOf(d);
      gsap.killTweensOf(body);
      const closing = d.open && !d.classList.contains("is-closing");
      const from = d.offsetHeight;
      d.style.overflow = "hidden";

      if (closing) {
        // Measure the closed height, then animate down to it
        d.style.height = "auto";
        d.open = false;
        const to = d.offsetHeight;
        d.open = true;
        d.style.height = from + "px";
        d.classList.add("is-closing");
        gsap.to(body, { autoAlpha: 0, duration: 0.25, ease: "power1.out" });
        gsap.to(d, { height: to, duration: 0.5, ease: "osmo", onComplete: () => {
          d.open = false;
          gsap.set(body, { clearProps: "opacity,visibility" });
          done();
        } });
      } else {
        // Opening, or reopening part way through a close
        const wasClosed = !d.open;
        d.classList.remove("is-closing");
        d.style.height = "auto";
        d.open = true;
        const to = d.offsetHeight;
        d.style.height = from + "px";
        if (wasClosed) gsap.set(body, { autoAlpha: 0, y: "0.5rem" });
        gsap.to(body, { autoAlpha: 1, y: 0, duration: 0.6, delay: wasClosed ? 0.1 : 0, ease: "glide", clearProps: "opacity,visibility,transform" });
        gsap.to(d, { height: to, duration: 0.6, ease: "glide", onComplete: done });
      }
    });
  });
}

}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
else run();

})();
