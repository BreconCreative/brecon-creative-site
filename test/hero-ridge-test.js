(function(){const rmMQ=matchMedia("(prefers-reduced-motion: reduce)");let reducedMotion=rmMQ.matches;const fineMQ=matchMedia("(hover: hover) and (pointer: fine)");
// Home hero: the ridge lines lean gently away from the cursor, then spring back
// (physics after Osmo's Interactive Wave Lines). At most about 8px, within
// about 180px of the pointer, so only the nearest two or three lines move.
// Mouse and trackpad only, never with reduced motion or while paused. The
// loop only runs while the pointer is near the lines or they are settling,
// so it costs nothing the rest of the time.
let heroRidge = null;

function initHeroRidge(scope) {
  const svg = scope.querySelector(".hero_home_lines");
  if (!svg || svg.bcRidge || reducedMotion || !fineMQ.matches) return;
  const paths = [0, 1, 2, 3, 4, 5].map(i => svg.querySelector("#hero-home-r" + i)).filter(Boolean);
  if (paths.length < 2 || typeof paths[0].getPointAtLength !== "function") return;
  svg.bcRidge = true;
  if (heroRidge) heroRidge.destroy();

  const ridge = svg.querySelector(".hero_home_ridge");
  const hero = svg.closest("[data-hero-home]");
  const wrap = svg.closest(".clients_wrap");
  const SAMPLES = 64, RADIUS = 180, PUSH = 0.17, FOLLOW = 0.6, MAX = 9;

  // Sample each line once. Points keep their own spring offset in pixels.
  const lines = paths.map(p => {
    const len = p.getTotalLength();
    const pts = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const q = p.getPointAtLength(len * i / SAMPLES);
      pts.push({ x: q.x, y: q.y, o: 0, v: 0, t: 0 });
    }
    return { path: p, d: p.getAttribute("d"), pts };
  });
  const ridgeD = ridge ? ridge.getAttribute("d") : "";
  const r1 = v => Math.round(v * 10) / 10;
  const build = (pts, sy) => {
    const P = pts.map(p => ({ x: p.x, y: p.y + p.o * sy }));
    let d = "M" + r1(P[0].x) + " " + r1(P[0].y);
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
      d += "C" + r1(p1.x + (p2.x - p0.x) / 6) + " " + r1(p1.y + (p2.y - p0.y) / 6) + " " +
        r1(p2.x - (p3.x - p1.x) / 6) + " " + r1(p2.y - (p3.y - p1.y) / 6) + " " + r1(p2.x) + " " + r1(p2.y);
    }
    return d;
  };

  const ptr = { x: 0, y: 0, tx: 0, ty: 0, s: 0, on: false, fresh: true };
  let raf = 0, last = 0, moved = false, alive = true;

  const blocked = () => reducedMotion || !fineMQ.matches || document.hidden ||
    (wrap && wrap.classList.contains("is-paused")) || (hero && hero.classList.contains("is-offscreen"));

  const frame = now => {
    raf = 0;
    if (!alive) return;
    if (!svg.isConnected) { destroy(); return; }
    const step = last ? Math.min((now - last) / 16.667, 2) : 1;
    last = now;
    const r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const sx = r.width / 1000, sy = r.height / 300;
    const off = blocked();
    // Pointer in the svg's own pixel space
    const px = ptr.tx - r.left, py = ptr.ty - r.top;
    const near = !off && ptr.on && px > -RADIUS && px < r.width + RADIUS && py > -RADIUS && py < r.height + RADIUS;
    const f = 1 - Math.exp(-0.16 * step);
    if (near && ptr.fresh) { ptr.x = px; ptr.y = py; ptr.fresh = false; }
    const lx = ptr.x, ly = ptr.y;
    ptr.x += (px - ptr.x) * f;
    ptr.y += (py - ptr.y) * f;
    ptr.s += ((near ? 1 : 0) - ptr.s) * f;
    if (!near) ptr.fresh = true;
    const vy = (ptr.y - ly) / Math.max(step, 0.001), vx = (ptr.x - lx) / Math.max(step, 0.001);
    const lim = Math.min(1, RADIUS * 0.1 / (Math.hypot(vx, vy) || 1));
    const my = vy * lim * FOLLOW;
    let busy = ptr.s > 0.01;
    lines.forEach(line => {
      const pts = line.pts;
      pts.forEach(p => {
        const dx = p.x * sx - ptr.x, dy = p.y * sy - ptr.y;
        const fall = Math.exp(-(dx * dx + dy * dy) / (RADIUS * RADIUS * 0.48));
        const t = (dy * PUSH + my) * fall * ptr.s;
        p.t = t > MAX ? MAX : t < -MAX ? -MAX : t;
      });
      const n = Math.ceil(step), dt = step / n;
      for (let k = 0; k < n; k++) {
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i], l = (pts[i - 1] || p).o, rr = (pts[i + 1] || p).o;
          p.v += ((p.t - p.o) * 0.028 + (l + rr - 2 * p.o) * 0.22) * dt;
          p.v *= Math.pow(0.88, dt);
        }
        for (let i = 0; i < pts.length; i++) pts[i].o += pts[i].v * dt;
      }
      for (let i = 0; i < pts.length; i++) if (Math.abs(pts[i].o) > 0.05 || Math.abs(pts[i].v) > 0.01) { busy = true; break; }
    });
    if (busy) {
      // Offsets are in pixels; the svg is stretched, so convert back to its units
      const k = 1 / sy;
      lines.forEach(line => line.path.setAttribute("d", build(line.pts, k)));
      if (ridge) ridge.setAttribute("d", build(lines[0].pts, k) + "L1000 300L0 300Z");
      moved = true;
      raf = requestAnimationFrame(frame);
    } else {
      // Settled: put the original drawing back exactly, and stop
      if (moved) {
        lines.forEach(line => { line.pts.forEach(p => { p.o = 0; p.v = 0; }); line.path.setAttribute("d", line.d); });
        if (ridge) ridge.setAttribute("d", ridgeD);
        moved = false;
      }
      last = 0;
    }
  };
  const kick = () => { if (alive && !raf) raf = requestAnimationFrame(frame); };
  const onMove = e => {
    if (e.pointerType && e.pointerType !== "mouse" && e.pointerType !== "pen") return;
    ptr.tx = e.clientX; ptr.ty = e.clientY; ptr.on = true;
    if (!blocked()) kick();
  };
  const onLeave = () => { ptr.on = false; kick(); };

  function destroy() {
    if (!alive) return;
    alive = false;
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener("pointermove", onMove);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    window.removeEventListener("blur", onLeave);
    if (svg.isConnected) {
      lines.forEach(line => line.path.setAttribute("d", line.d));
      if (ridge) ridge.setAttribute("d", ridgeD);
    }
    if (heroRidge && heroRidge.svg === svg) heroRidge = null;
  }

  window.addEventListener("pointermove", onMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);
  window.addEventListener("blur", onLeave);
  heroRidge = { svg, destroy };
}

function cleanupHeroRidge() {
  if (heroRidge && !heroRidge.svg.isConnected) heroRidge.destroy();
}
window.bcRidgeTest={get r(){return heroRidge}};initHeroRidge(document);})();
