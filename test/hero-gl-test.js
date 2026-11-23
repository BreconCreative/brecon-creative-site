(function(){const rmMQ=matchMedia("(prefers-reduced-motion: reduce)");let reducedMotion=rmMQ.matches;
// Home hero: the WebGL sunset. A small hand-written shader paints the same
// sunset as the CSS layers in the hero_home_bg embed, but the colours flow
// and fold through each other, and the sun sinks behind the lines as you
// scroll. It reads the layer sizes (--warm, --rose and so on) and the brand
// colour variables from the embed, so the look is still tuned in Webflow.
// The CSS sunset paints first and stays as the fallback: with reduced motion,
// Save-Data, no WebGL or a slow software renderer, nothing changes.
// Half resolution, 30 frames a second at most, and it stops completely when
// the hero is off screen, the tab is hidden or the pause button is pressed.
let heroGl = null;

const HERO_GL_VERT = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";
const HERO_GL_FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uR;
uniform float uT, uS;
uniform vec4 uW, uRo, uPl, uVt, uVl, uM;
uniform vec3 cCr, cPe, cCo, cBr, cRo, cPl, cIn, cPw, cNv;
vec3 pm(vec3 x){return mod((x*34.+1.)*x,289.);}
float sn(vec2 v){
  const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
  vec2 i=floor(v+dot(v,C.yy)),x0=v-i+dot(i,C.xx);
  vec2 i1=x0.x>x0.y?vec2(1.,0.):vec2(0.,1.);
  vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod(i,289.);
  vec3 p=pm(pm(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));
  vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);m*=m;m*=m;
  vec3 x=2.*fract(p*C.www)-1.,h=abs(x)-.5,a0=x-floor(x+.5);
  m*=1.79284291400159-.85373472095314*(a0*a0+h*h);
  vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;
  return 130.*dot(m,g);
}
float rd(vec2 p,vec4 e){return length((p-e.zw)/e.xy);}
vec4 st(vec3 c,float a){return vec4(c*a,a);}
vec4 ov(vec4 b,vec4 s){return s+b*(1.-s.a);}
vec4 seg(float d,float d0,float d1,vec4 a,vec4 b){return mix(a,b,clamp((d-d0)/(d1-d0),0.,1.));}
void main(){
  vec2 p=vec2(gl_FragCoord.x/uR.x,1.-gl_FragCoord.y/uR.y);
  vec2 q=vec2(p.x*uR.x/uR.y,p.y)*1.5;
  float t=uT,s=uS;
  vec2 fl=vec2(-t*.11,t*.025);
  float n1=sn(q+fl),n2=sn(q*1.7+vec2(5.2,1.3)+fl*1.3),n3=sn(q*.8+vec2(9.1,-t*.04)-fl*.6);
  vec2 w=vec2(n1,n2)*.035;
  vec3 sunC=mix(cBr,cPl,s*.45);
  vec4 c=vec4(0.);
  float d=rd(p+w*1.2,vec4(uVl.xy*(1.+.06*sin(t*.48)),uVl.zw))+.06*n3;
  vec4 vl=seg(d,0.,.5,st(cIn,.8),st(cPw*.25+cNv*.75,.7));
  c=ov(c,d<.5?vl:seg(d,.5,.78,st(cPw*.25+cNv*.75,.7),vec4(0.)));
  d=rd(p-w,vec4(uVt.xy*(1.+.06*sin(t*.48+1.)),uVt.zw))+.05*n2;
  c=ov(c,seg(d,0.,.72,st(cIn,.7),vec4(0.)));
  d=rd(p+w,uPl)+.05*n1;
  c=ov(c,seg(d,0.,.75,st(cPl,.7),vec4(0.)));
  d=rd(p+vec2(w.y,w.x)*1.4,vec4(uRo.xy,uRo.zw+vec2(0.,.02*sin(t*.33))))+.08*n3;
  c=ov(c,d<.4?seg(d,0.,.4,st(cRo,1.),st(cPl,.85)):seg(d,.4,.76,st(cPl,.85),vec4(0.)));
  float k=(1.+.04*(1.+sin(t*.698)))*(1.-.3*s);
  vec4 e=vec4(uW.xy*k,uW.z,uW.w+.03*sin(t*.349)+s*.2);
  d=rd(p+w*1.5,e)+.1*n1+.04*n2;
  vec4 wm;
  if(d<.09)wm=seg(d,0.,.09,st(cCr,1.),st(cPe,1.));
  else if(d<.2)wm=seg(d,.09,.2,st(cPe,1.),st(cCo,1.));
  else if(d<.34)wm=seg(d,.2,.34,st(cCo,1.),st(sunC,1.));
  else if(d<.52)wm=seg(d,.34,.52,st(sunC,1.),st(sunC,.6));
  else wm=seg(d,.52,.74,st(sunC,.6),vec4(0.));
  wm*=.9+.1*sin(t*.698);
  c=ov(c,wm);
  float r1=smoothstep(.2,.75,sn(vec2(q.x*.7-t*.09,q.y*1.8+.5*sin(q.x*1.2+t*.21)))),
        r2=smoothstep(.3,.85,sn(vec2(q.x*.9+3.7-t*.07,q.y*1.4-1.9)));
  c.rgb=mix(c.rgb,cRo*c.a,r1*.32*c.a);
  c.rgb=mix(c.rgb,mix(cIn,cPw,.35)*c.a,r2*(.25+.35*s)*c.a);
  c*=clamp((.82-rd(p,uM))/.4,0.,1.);
  float g=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;
  gl_FragColor=c+vec4(vec3(g/255.),0.)*c.a;
}`;

function heroGlStyles() {
  if (document.getElementById("bc-hero-gl-style")) return;
  const s = document.createElement("style");
  s.id = "bc-hero-gl-style";
  // The canvas takes the CSS layers' size and place, fades in over them, then they hide
  s.textContent =
    ".hero_home_aura.is-gl{display:block;width:100%;-webkit-mask-image:none;mask-image:none;opacity:0;transition:opacity .8s cubic-bezier(.2,.7,.3,1)}" +
    ".hero_home_aura.is-gl.is-on{opacity:1}" +
    ".hero_home_bg.has-gl .hero_home_aura:not(.is-gl){filter:opacity(0);transition:filter .8s cubic-bezier(.7,0,.8,.3)}" +
    ".hero_home_bg.has-gl-done .hero_home_aura:not(.is-gl){display:none}";
  document.head.appendChild(s);
}

function initHeroGl(scope) {
  const bg = scope.querySelector(".hero_home_bg");
  const warm = bg && bg.querySelector(".hero_home_aura.is-warm");
  if (!warm || bg.bcGl || reducedMotion) return;
  if (navigator.connection && navigator.connection.saveData) return;
  bg.bcGl = true;
  if (heroGl) heroGl.destroy();

  const canvas = document.createElement("canvas");
  canvas.className = "hero_home_aura is-gl";
  canvas.setAttribute("aria-hidden", "true");
  const gl = canvas.getContext("webgl", {
    alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false,
    preserveDrawingBuffer: false, powerPreference: "low-power", failIfMajorPerformanceCaveat: true
  });
  if (!gl) return;
  const shader = (type, src) => {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    return gl.getShaderParameter(sh, gl.COMPILE_STATUS) ? sh : null;
  };
  const vs = shader(gl.VERTEX_SHADER, HERO_GL_VERT);
  const fs = shader(gl.FRAGMENT_SHADER, HERO_GL_FRAG);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  // One triangle that covers the whole canvas
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aLoc = gl.getAttribLocation(prog, "a");
  gl.enableVertexAttribArray(aLoc);
  gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
  const u = {};
  ["uR", "uT", "uS", "uW", "uRo", "uPl", "uVt", "uVl", "uM",
   "cCr", "cPe", "cCo", "cBr", "cRo", "cPl", "cIn", "cPw", "cNv"].forEach(n => (u[n] = gl.getUniformLocation(prog, n)));

  heroGlStyles();
  warm.after(canvas);

  // Brand colours, read from the same variables the CSS layers use
  const colours = {
    cCr: ["--_light-field---cream", "#fff6ea"], cPe: ["--_light-field---peach", "#ffd0a8"],
    cCo: ["--_light-field---coral", "#ff8a5c"], cBr: ["--swatch--brand-500", "#ff6a3d"],
    cRo: ["--_light-field---rose", "#f1c6e0"], cPl: ["--_light-field---plum", "#781c48"],
    cIn: ["--_light-field---indigo", "#6e5ae6"], cPw: ["--_light-field---periwinkle", "#8fa9ff"],
    cNv: ["--swatch--dark-900", "#0a0e22"]
  };
  const probe = document.createElement("i");
  probe.style.display = "none";
  bg.appendChild(probe);
  Object.keys(colours).forEach(k => {
    const [v, hex] = colours[k];
    probe.style.color = hex;
    probe.style.color = "var(" + v + ", " + hex + ")";
    const m = (getComputedStyle(probe).color.match(/[\d.]+/g) || []).map(Number);
    gl.uniform3f(u[k], (m[0] || 0) / 255, (m[1] || 0) / 255, (m[2] || 0) / 255);
  });
  probe.remove();

  // Layer sizes and positions, read from the embed's variables (they change per screen size)
  const layers = { uW: "--warm", uRo: "--rose", uPl: "--plum", uVt: "--vio-top", uVl: "--vio-left", uM: "--mask" };
  const readLayers = () => {
    const cs = getComputedStyle(canvas);
    Object.keys(layers).forEach(k => {
      const n = (cs.getPropertyValue(layers[k]).match(/-?[\d.]+/g) || []).map(v => Number(v) / 100);
      if (n.length >= 4) gl.uniform4f(u[k], Math.max(n[0], 0.01), Math.max(n[1], 0.01), n[2], n[3]);
    });
  };

  const hero = bg.closest("[data-hero-home]");
  const wrap = bg.closest(".clients_wrap");
  let t = 0, last = 0, raf = 0, alive = true, shown = false, doneTimer = 0;

  const draw = () => {
    if (!canvas.width || !canvas.height) return;
    const sunk = Math.min(Math.max(window.scrollY / (window.innerHeight * 0.7), 0), 1);
    gl.uniform1f(u.uT, t);
    gl.uniform1f(u.uS, sunk);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!shown) {
      shown = true;
      requestAnimationFrame(() => {
        if (!alive) return;
        canvas.classList.add("is-on");
        bg.classList.add("has-gl");
        doneTimer = setTimeout(() => alive && bg.classList.add("has-gl-done"), 900);
      });
    }
  };
  const resize = () => {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width * 0.5));
    const h = Math.max(1, Math.round(r.height * 0.5));
    if (w !== canvas.width || h !== canvas.height) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform2f(u.uR, w, h);
    }
    readLayers();
    draw();
  };

  const visible = () => !document.hidden && !(hero && hero.classList.contains("is-offscreen"));
  const paused = () => !!(wrap && wrap.classList.contains("is-paused"));
  const frame = now => {
    raf = 0;
    if (!alive) return;
    if (!canvas.isConnected || reducedMotion) { destroy(); return; }
    if (!visible() || paused()) { last = 0; return; }
    if (last && now - last < 31) { raf = requestAnimationFrame(frame); return; }
    if (last) t += Math.min(now - last, 100) / 1000;
    last = now;
    draw();
    raf = requestAnimationFrame(frame);
  };
  const kick = () => { if (alive && !raf) raf = requestAnimationFrame(frame); };
  // While paused, scrolling still sinks the sun, one frame at a time
  const onScroll = () => {
    if (!alive) return;
    if (paused() && visible()) { if (!raf) raf = requestAnimationFrame(() => { raf = 0; if (alive) draw(); }); }
    else kick();
  };

  const ro = new ResizeObserver(resize);
  const mo = new MutationObserver(kick);
  const onMotion = e => { if (e.matches) destroy(); };
  const onLost = e => { e.preventDefault(); destroy(); };

  function destroy() {
    if (!alive) return;
    alive = false;
    if (raf) cancelAnimationFrame(raf);
    clearTimeout(doneTimer);
    ro.disconnect();
    mo.disconnect();
    document.removeEventListener("visibilitychange", kick);
    window.removeEventListener("scroll", onScroll);
    rmMQ.removeEventListener?.("change", onMotion);
    canvas.removeEventListener("webglcontextlost", onLost);
    bg.classList.remove("has-gl", "has-gl-done");
    canvas.remove();
    const lose = gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext();
    if (heroGl && heroGl.canvas === canvas) heroGl = null;
  }

  ro.observe(canvas);
  if (hero) mo.observe(hero, { attributes: true, attributeFilter: ["class"] });
  if (wrap) mo.observe(wrap, { attributes: true, attributeFilter: ["class"] });
  document.addEventListener("visibilitychange", kick);
  window.addEventListener("scroll", onScroll, { passive: true });
  rmMQ.addEventListener?.("change", onMotion);
  canvas.addEventListener("webglcontextlost", onLost);
  heroGl = { canvas, destroy };
  resize();
  kick();
}

// After a page swap, retire the sunset if its hero has left the page
function cleanupHeroGl() {
  if (heroGl && !heroGl.canvas.isConnected) heroGl.destroy();
}
window.bcHeroGlTest={init:()=>initHeroGl(document),get gl(){return heroGl}};initHeroGl(document);})();
