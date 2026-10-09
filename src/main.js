import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import './style.css';
import {
  SECTIONS, PHOTOS, PHOTO_BASE, IG_URL, IG_HANDLE, WA_URL, WA_NUMBER, BUILDER_URL, BOARDS,
} from './content.js';
import { boardTexture, makeBoard, makeArch } from './boards.js';

const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

const isTouch = 'ontouchstart' in window || window.matchMedia('(pointer: coarse)').matches
  || /[?&]touch=1/.test(location.search);
if (isTouch) document.body.classList.add('touch');
let autoGas = false;

const RED = 0xff2e2e;
const LIME = 0xc8ff00;

/* ------------------------------------------------------------------ */
/* Classic (scroll) site: also the fallback if WebGL is unavailable    */
/* ------------------------------------------------------------------ */
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function sectionHTML(s) {
  let h = `<div class="k">${esc(s.kicker)}</div><h2>${esc(s.title)}</h2>`;
  if (s.sub) h += `<div class="s">${esc(s.sub)}</div>`;
  if (s.list) h += '<ul>' + s.list.map(([a, b]) => `<li><b>${esc(a)}</b><span>${esc(b)}</span></li>`).join('') + '</ul>';
  if (s.partners) h += '<div class="chips">' + s.partners.map(([n, , main]) => `<span class="chip ${main ? 'main' : ''}">${esc(n)}</span>`).join('') + '</div>';
  if (s.chips) h += '<div class="chips">' + s.chips.map((c) => `<span class="chip">${esc(c)}</span>`).join('') + '</div>';
  if (s.body) h += `<p>${esc(s.body)}</p>`;
  if (s.links) h += '<div class="links">' + s.links.map(([t, u]) => `<a class="btn" href="${u}" target="_blank" rel="noopener">${esc(t)}</a>`).join('') + '</div>';
  return h;
}

function buildClassic() {
  const el = $('#classic');
  const secs = SECTIONS.map((s) => `<section class="cl-sec">${sectionHTML(s)}</section>`).join('');
  const gallery = `<section class="cl-sec"><div class="k">ON TRACK</div><h2>ACTION SHOTS</h2><div class="cl-gal">${
    PHOTOS.map((p) => `<img loading="lazy" alt="Adriano Catalano #746 racing" src="${PHOTO_BASE}${p}" />`).join('')
  }</div></section>`;
  el.innerHTML = `
    <div class="cl-wrap">
      <div class="cl-top"><div class="b">ADRIANO CATALANO #746</div><button type="button" id="backBtn">BACK TO THE TRACK</button></div>
      <div class="cl-hero"><h1>ADRIANO CATALANO</h1><div class="n">#746</div><div class="t">THE ITALIAN STALLION · FREE RIDER</div></div>
      ${secs}${gallery}
      <div class="cl-foot">Website created by <a href="${BUILDER_URL}" target="_blank" rel="noopener">Adriano's Best Friend</a></div>
    </div>`;
  $('#backBtn').addEventListener('click', () => toggleClassic(false));
}

let classicOpen = false;
function toggleClassic(open) {
  classicOpen = open;
  $('#classic').classList.toggle('hidden', !open);
  if (open) $('#classic').scrollTop = 0;
}
buildClassic();
$('#classicBtn').addEventListener('click', () => toggleClassic(true));

/* ------------------------------------------------------------------ */
/* Renderer                                                            */
/* ------------------------------------------------------------------ */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: $('#scene'), antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  console.warn('WebGL unavailable, showing classic site', e);
  $('#loader').classList.add('done');
  toggleClassic(true);
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isTouch ? 1.5 : 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());

const scene = new THREE.Scene();
const SKY = 0x232540;
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 110, 470);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
camera.position.set(0, 6, 56);
let baseFov = window.innerWidth / window.innerHeight < 1 ? 78 : 60;

scene.add(new THREE.HemisphereLight(0xc6ceff, 0x4a3524, 1.5));
const moon = new THREE.DirectionalLight(0xfff1dd, 2.1);
moon.position.set(-60, 90, 50);
scene.add(moon);

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05, flatShading: true, ...extra });
const glow = (color) => new THREE.MeshBasicMaterial({ color });

/* ------------------------------------------------------------------ */
/* World                                                               */
/* ------------------------------------------------------------------ */
const X0 = -225; const X1 = 225; const Z_N = -495; const Z_S = 55;
const WORLD_W = X1 - X0; const WORLD_H = Z_S - Z_N;

function dirtTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#5a4128';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5200; i++) {
    const v = 70 + Math.random() * 50;
    g.fillStyle = `rgba(${v + 30},${v + 6},${v - 20},${Math.random() * 0.45})`;
    g.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 6, 2 + Math.random() * 5);
  }
  for (let i = 0; i < 18; i++) {
    g.fillStyle = `rgba(30,18,8,${0.06 + Math.random() * 0.08})`;
    g.beginPath();
    g.ellipse(Math.random() * 512, Math.random() * 512, 30 + Math.random() * 60, 8 + Math.random() * 20, Math.random() * 3, 0, 7);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(WORLD_W / 18, (WORLD_H + 200) / 18);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = ANISO;
  return t;
}

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(WORLD_W + 400, WORLD_H + 400),
  new THREE.MeshStandardMaterial({ map: dirtTexture(), roughness: 1, metalness: 0 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.set(0, -0.02, (Z_S + Z_N) / 2);
ground.material.map.repeat.set((WORLD_W + 400) / 18, (WORLD_H + 400) / 18);
scene.add(ground);

// perimeter tyre wall
{
  const tyreGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.7, 10);
  const pts = [];
  for (let x = X0; x <= X1; x += 5) { pts.push([x, Z_S + 4], [x, Z_N - 4]); }
  for (let z = Z_N; z <= Z_S; z += 5) { pts.push([X0 - 4, z], [X1 + 4, z]); }
  const tyres = new THREE.InstancedMesh(tyreGeo, std(0xffffff), pts.length);
  const m = new THREE.Matrix4();
  const col = new THREE.Color();
  pts.forEach(([x, z], i) => {
    m.makeTranslation(x, 0.35, z);
    tyres.setMatrixAt(i, m);
    col.set(i % 4 < 2 ? 0xffffff : RED);
    tyres.setColorAt(i, col);
  });
  scene.add(tyres);
}

/* ---- ramps (oriented wedges) ---- */
const WEDGES = [];
function wedge(x, z, a, w, len, h0, h1, lip) {
  const W = { x, z, a, s: Math.sin(a), c: Math.cos(a), w, len, h0, h1, rad: Math.hypot(len, w / 2) + 1 };
  WEDGES.push(W);
  const shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.lineTo(len, 0); shape.lineTo(len, h1); shape.lineTo(0, h0); shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false });
  geo.rotateY(Math.PI / 2);
  geo.translate(-w / 2, 0, 0);
  const mesh = new THREE.Mesh(geo, std(lip ? 0x7d5535 : 0x6a4a30));
  mesh.position.set(x, 0, z);
  mesh.rotation.y = -a;
  scene.add(mesh);
  if (lip) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(w, 0.14, 0.4), glow(LIME));
    l.position.set(0, h1 + 0.02, -len + 0.1);
    mesh.add(l);
  }
  return W;
}
function jump(x, z, a, w, len, h, gap, land, landH) {
  const s = Math.sin(a); const c = Math.cos(a);
  wedge(x, z, a, w, len, 0, h, true);
  const d = len + gap;
  wedge(x + s * d, z - c * d, a, w * 1.15, land, landH, 0, false);
  return { x: x + s * (d + land * 0.4), z: z - c * (d + land * 0.4) };
}
function whoops(x, z, n) {
  for (let i = 0; i < n; i++) {
    wedge(x, z - i * 9, 0, 9, 4.5, 0, 0.9, false);
    wedge(x, z - i * 9 - 4.5, 0, 9, 4.5, 0.9, 0, false);
  }
}

jump(-9, -52, 0, 6, 7, 1.6, 7, 8, 1.0);
jump(9, -52, 0, 6, 7, 1.6, 7, 8, 1.0);
jump(0, -96, 0, 14, 16, 6.2, 20, 18, 4);
whoops(95, -100, 6);
const WHIP_J = jump(22, -188, 0, 14, 14, 5.2, 18, 16, 3.2);
jump(-105, -270, 0.55, 12, 12, 4.4, 16, 14, 3);
jump(70, -300, -0.5, 14, 14, 5, 18, 16, 3.4);
jump(0, -410, 0, 12, 12, 4, 14, 14, 2.6);
jump(-10, -230, -0.25, 9, 9, 3.2, 12, 12, 2.2);

function groundY(x, z) {
  let y = 0;
  for (let i = 0; i < WEDGES.length; i++) {
    const W = WEDGES[i];
    const dx = x - W.x; const dz = z - W.z;
    if (dx * dx + dz * dz > W.rad * W.rad) continue;
    const u = dx * W.s - dz * W.c;
    if (u < 0 || u > W.len) continue;
    const v = dx * W.c + dz * W.s;
    if (Math.abs(v) > W.w / 2) continue;
    const h = W.h0 + (W.h1 - W.h0) * u / W.len;
    if (h > y) y = h;
  }
  return y;
}

/* ---- hills, stars, rocks, bushes ---- */
{
  const hillMat = std(0x1a1a26);
  for (let i = 0; i < 90; i++) {
    const t = Math.random() * 4;
    let x; let z;
    const off = 40 + Math.random() * 110;
    if (t < 1) { x = X0 + Math.random() * WORLD_W; z = Z_N - off; }
    else if (t < 2) { x = X0 + Math.random() * WORLD_W; z = Z_S + off; }
    else if (t < 3) { x = X0 - off; z = Z_N + Math.random() * WORLD_H; }
    else { x = X1 + off; z = Z_N + Math.random() * WORLD_H; }
    const r = 20 + Math.random() * 30;
    const hgt = 16 + Math.random() * 40;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, hgt, 6 + Math.floor(Math.random() * 3)), hillMat);
    cone.position.set(x, hgt / 2 - 1, z);
    cone.rotation.y = Math.random() * 3;
    scene.add(cone);
  }
  const n = 500;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = 380 + Math.random() * 80;
    pos[i * 3] = Math.cos(a) * rr;
    pos[i * 3 + 1] = 90 + Math.random() * 220;
    pos[i * 3 + 2] = Math.sin(a) * rr - 220;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.7, sizeAttenuation: false, fog: false })));
}

// floodlights around the start
for (let k = 0; k < 3; k++) {
  [-1, 1].forEach((s) => {
    const z = 40 - k * 40;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 18, 6), std(0x2b2b2b));
    pole.position.set(s * 52, 9, z);
    scene.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.6, 1.3), glow(0xfff4d6));
    head.position.set(s * 51, 18.3, z);
    head.rotation.y = s * 0.2;
    scene.add(head);
  });
}

function bigNumber(x, z, rotY) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.font = '230px "Bebas Neue", Impact, sans-serif';
  g.textAlign = 'center';
  g.fillStyle = '#ff2e2e';
  g.shadowColor = '#ff2e2e'; g.shadowBlur = 40;
  g.fillText('#746', 256, 205);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(90, 45), new THREE.MeshBasicMaterial({ map: t, transparent: true, fog: false, opacity: 0.8 }));
  m.position.set(x, 42, z);
  m.rotation.y = rotY;
  scene.add(m);
}


/* ------------------------------------------------------------------ */
/* Assets (Blender GLBs)                                               */
/* ------------------------------------------------------------------ */
const gltfLoader = new GLTFLoader();
gltfLoader.setMeshoptDecoder(MeshoptDecoder);
const PROP = {};
let bikeSrc; let riderSrc;
async function loadAssets() {
  const [b, r, p] = await Promise.all(['bike', 'rider', 'props'].map((n) => gltfLoader.loadAsync(`/models/${n}.glb`)));
  bikeSrc = b.scene; riderSrc = r.scene;
  [bikeSrc, riderSrc, p.scene].forEach((s) => s.traverse((o) => {
    if (o.isMesh && o.material) { o.material.roughness = 0.78; o.material.metalness = 0.05; o.castShadow = false; }
  }));
  p.scene.children.slice().forEach((c) => { PROP[c.name] = c; });
}
const propMesh = (n) => { let m; PROP[n].traverse((o) => { if (o.isMesh && !m) m = o; }); return m; };
const tmpM = new THREE.Matrix4(); const tmpQ = new THREE.Quaternion(); const tmpE = new THREE.Euler(); const tmpP = new THREE.Vector3(); const tmpS = new THREE.Vector3();
function instanced(name, list, tint) {
  const pm = propMesh(name);
  const im = new THREE.InstancedMesh(pm.geometry, pm.material, Math.max(1, list.length));
  list.forEach((o, i) => {
    tmpE.set(o.rx || 0, o.ry || 0, o.rz || 0);
    tmpQ.setFromEuler(tmpE);
    tmpP.set(o.x, o.y || 0, o.z);
    tmpS.set(o.sx || o.s || 1, o.s || 1, o.sz || o.s || 1);
    tmpM.compose(tmpP, tmpQ, tmpS);
    im.setMatrixAt(i, tmpM);
    if (tint) im.setColorAt(i, new THREE.Color(o.c !== undefined ? o.c : 0xffffff));
  });
  im.count = list.length;
  scene.add(im);
  return im;
}

/* ------------------------------------------------------------------ */
/* Layout: route, colliders, scatter, zones, minefields                */
/* ------------------------------------------------------------------ */
const rng = (() => { let a = 0x2f6e2b1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();
const rr = (a, b) => a + rng() * (b - a);
const COLS = []; // static circle colliders { x, z, r, k }
const DYN = []; // knockable props
const MINES = [];
const FIELDS = [];
const boardsById0 = Object.fromEntries(BOARDS.map((b) => [b.id, b]));
const SPAWN = { x: 0, z: 48 };

function bearingName(dx, dz) {
  const a = (Math.atan2(dx, -dz) + Math.PI * 2) % (Math.PI * 2);
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(a / (Math.PI / 4)) % 8];
}
const DRAGON_TEX = new THREE.TextureLoader().load('/logos/dragon.png'); DRAGON_TEX.colorSpace = THREE.SRGBColorSpace; DRAGON_TEX.anisotropy = 4;
const ROUTE_ORDER = ['controls', 'cycleworx', 'pit', 'rider', 'fuel', 'whip', 'results', 'goals', 'dragon', 'partners', 'contact'];
const boardFrontPt = (b, d) => ({ x: b.x + Math.sin(b.ry) * d, z: b.z + Math.cos(b.ry) * d });
const ROUTE = [{ x: 0, z: 10 }, ...ROUTE_ORDER.map((id) => boardFrontPt(boardsById0[id], 15))];
function segDist(px, pz, a, b) {
  const vx = b.x - a.x; const vz = b.z - a.z;
  const t = clamp(((px - a.x) * vx + (pz - a.z) * vz) / (vx * vx + vz * vz || 1), 0, 1);
  return Math.hypot(px - (a.x + vx * t), pz - (a.z + vz * t));
}
function routeDist(x, z) {
  let d = 1e9;
  for (let i = 0; i < ROUTE.length - 1; i++) d = Math.min(d, segDist(x, z, ROUTE[i], ROUTE[i + 1]));
  return d;
}
function clearAt(x, z, o = {}) {
  const margin = o.margin || 0;
  if (x < X0 + 8 || x > X1 - 8 || z < Z_N + 8 || z > Z_S - 8) return false;
  if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < (o.spawn || 28) + margin) return false;
  for (const W of WEDGES) if (Math.hypot(x - W.x, z - W.z) < W.rad + 4 + margin) return false;
  for (const b of BOARDS) if (Math.hypot(b.x - x, b.z - z) < (o.board || 18) + margin) return false;
  for (const m of MINES) if (Math.hypot(m.x - x, m.z - z) < 4) return false;
  if (routeDist(x, z) < (o.route || 6) + margin) return false;
  return true;
}
function scatter(n, o, make) {
  const out = [];
  for (let k = 0; k < n * 14 && out.length < n; k++) {
    const x = rr(X0 + 8, X1 - 8); const z = rr(Z_N + 8, Z_S - 8);
    if (!clearAt(x, z, o)) continue;
    if (o.apart && out.some((p) => Math.hypot(p.x - x, p.z - z) < o.apart)) continue;
    out.push(make(x, z));
  }
  return out;
}

function buildMinefields() {
  // two big fields, picked deterministically away from everything you are meant to ride through
  const cands = [];
  for (let k = 0; k < 4000 && cands.length < 400; k++) {
    const x = rr(X0 + 40, X1 - 40); const z = rr(Z_N + 40, Z_S - 90);
    if (clearAt(x, z, { margin: 30, route: 8, board: 22, spawn: 50 })) cands.push({ x, z });
  }
  const A = cands[0] || { x: -70, z: -260 };
  const B = cands.find((c) => Math.hypot(c.x - A.x, c.z - A.z) > 170) || { x: 100, z: -250 };
  [A, B].forEach((c, i) => {
    const f = { x: c.x, z: c.z, r: 26, name: i ? 'MINEFIELD B' : 'MINEFIELD A' };
    FIELDS.push(f);
    for (let k = 0; k < 400 && MINES.filter((m) => m.f === f).length < 9; k++) {
      const a = rng() * 6.283; const d = Math.sqrt(rng()) * (f.r - 3);
      const x = f.x + Math.cos(a) * d; const z = f.z + Math.sin(a) * d;
      if (MINES.some((m) => Math.hypot(m.x - x, m.z - z) < 5.3)) continue;
      MINES.push({ x, z, f, armed: true, t: -1 });
    }
  });
  scatter(11, { margin: 4, route: 8, board: 20, spawn: 40, apart: 40 }, (x, z) => {
    if (FIELDS.some((f) => Math.hypot(f.x - x, f.z - z) < f.r + 12)) return { x, z };
    MINES.push({ x, z, f: null, armed: true, t: -1 });
    return { x, z };
  });
}

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 1, 32, 32, 31);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
const GLOW = glowTexture();
function textPlane(text, w, h, fg, bg, font = 160) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
  const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); }
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `${font}px "Bebas Neue", Impact, sans-serif`;
  g.fillText(text, c.width / 2, c.height / 2 + 6, c.width - 24);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: !bg }));
}

const DYN_SPEC = {
  barrel: { r: 0.32, h: 0.9, m: 1.3 }, cone: { r: 0.26, h: 0.7, m: 0.35 }, tyre: { r: 0.58, h: 0.34, m: 0.9 },
  hay: { r: 0.62, h: 1.1, m: 2.8 }, crate: { r: 0.5, h: 0.8, m: 1.6 },
};
function addDyn(name, x, z, o = {}) {
  const sp = DYN_SPEC[name]; const s = o.s || 1;
  const obj = PROP[name].clone();
  obj.scale.setScalar(s);
  if (name === 'tyre' && obj.isMesh) { obj.material = obj.material.clone(); obj.material.color.set(o.c !== undefined ? o.c : 0x222222); }
  const d = { obj, name, x, y: o.y || 0, z, vx: 0, vy: 0, vz: 0, r: sp.r * s, h: sp.h * s, m: sp.m * s * s, w: new THREE.Vector3(), awake: (o.y || 0) > 0, yaw: o.ry || 0 };
  obj.position.set(x, d.y, z);
  obj.rotation.y = d.yaw;
  scene.add(obj);
  DYN.push(d);
  return d;
}
const zp = (b, lat, fwd) => ({ x: b.x + Math.cos(b.ry) * lat + Math.sin(b.ry) * fwd, z: b.z - Math.sin(b.ry) * lat + Math.cos(b.ry) * fwd });
function addStatic(name, x, z, ry, s, col) {
  const o = PROP[name].clone();
  o.position.set(x, 0, z); o.rotation.y = ry; o.scale.setScalar(s || 1);
  scene.add(o);
  if (col) COLS.push({ x, z, r: col, k: 'bld', h: 3 });
  return o;
}
function flag(x, z, color, ry) {
  addStatic('pole', x, z, 0, 1);
  const f = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.2), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
  f.position.set(x + Math.cos(ry) * 1.0, 3.3, z - Math.sin(ry) * 1.0); f.rotation.y = ry;
  scene.add(f);
  return f;
}
const FLAGS = [];

function buildWorld() {
  buildMinefields();
  const rocks = { a: [], b: [], c: [] }; const rb = { a: 0.9, b: 0.7, c: 1.1 };
  scatter(150, { route: 7, apart: 7 }, (x, z) => {
    const t = 'abc'[Math.floor(rng() * 3)]; const s = rr(0.7, 2.1);
    rocks[t].push({ x, z, ry: rr(0, 6.28), s, sx: s * rr(0.9, 1.3) });
    COLS.push({ x, z, r: rb[t] * s * 0.8, k: 'rock', h: rb[t] * s * 0.75 });
    return { x, z };
  });
  ['a', 'b', 'c'].forEach((t) => instanced('rock_' + t, rocks[t]));
  const trees = scatter(40, { route: 9, apart: 14, board: 22 }, (x, z) => { COLS.push({ x, z, r: 0.6, k: 'tree', h: 6 }); return { x, z, ry: rr(0, 6.28), s: rr(1.1, 1.8) }; });
  instanced('tree', trees);
  instanced('bush', scatter(110, { route: 4, apart: 3 }, (x, z) => ({ x, z, ry: rr(0, 6.28), s: rr(0.8, 1.7) })));
  instanced('aloe', scatter(60, { route: 4, apart: 3 }, (x, z) => ({ x, z, ry: rr(0, 6.28), s: rr(0.8, 1.5) })));

  // mines (blinking LED + glow)
  const mm = propMesh('mine'); const ml = propMesh('mine_led');
  MINES.forEach((m, i) => { m.i = i; });
  MINES.body = instanced('mine', MINES.map((m) => ({ x: m.x, z: m.z, ry: rr(0, 6) })));
  const ledMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const ledIM = new THREE.InstancedMesh(ml.geometry, ledMat, MINES.length);
  MINES.forEach((m, i) => { tmpM.makeTranslation(m.x, 0, m.z); ledIM.setMatrixAt(i, tmpM); ledIM.setColorAt(i, new THREE.Color(0x330000)); });
  scene.add(ledIM);
  const gp = new Float32Array(MINES.length * 3); const gc = new Float32Array(MINES.length * 3);
  MINES.forEach((m, i) => { gp[i * 3] = m.x; gp[i * 3 + 1] = 0.3; gp[i * 3 + 2] = m.z; });
  const gg = new THREE.BufferGeometry();
  gg.setAttribute('position', new THREE.BufferAttribute(gp, 3)); gg.setAttribute('color', new THREE.BufferAttribute(gc, 3));
  const glowPts = new THREE.Points(gg, new THREE.PointsMaterial({ size: 2.4, map: GLOW, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true, fog: false }));
  glowPts.frustumCulled = false;
  scene.add(glowPts);
  MINES.mesh = { ledIM, gg, mm };

  // minefield warning boards, turned toward the spawn
  FIELDS.forEach((f) => {
    const a = Math.atan2(SPAWN.x - f.x, SPAWN.z - f.z);
    const tex = boardTexture({ kicker: 'WARNING', title: 'MINEFIELD', sub: 'STAY ON THE DASHES', accent: '#ff2e2e', w: 12, h: 6 }, ANISO);
    const g = makeBoard(tex, 12, 6, std);
    const px = f.x + Math.sin(a) * (f.r + 4); const pz = f.z + Math.cos(a) * (f.r + 4);
    g.position.set(px, 0, pz); g.rotation.y = a; scene.add(g);
    [-1, 1].forEach((s) => COLS.push({ x: px + Math.cos(a) * 5.1 * s, z: pz - Math.sin(a) * 5.1 * s, r: 0.9, k: 'post', h: 8 }));
    // ring of cones marking the edge
    for (let k = 0; k < 14; k++) {
      const ang = k / 14 * 6.283;
      addDyn('cone', f.x + Math.cos(ang) * (f.r + 1), f.z + Math.sin(ang) * (f.r + 1), { c: 0xff6a00 });
    }
  });

  // station dressing
  const B = boardsById0;
  { // CycleWorx shed, fork stand, tyres
    const b = B.cycleworx; const p = zp(b, -17, 9);
    const shed = addStatic('shed', p.x, p.z, b.ry + Math.PI, 1, 2.7);
    const sign = textPlane('CYCLEWORX', 3.3, 0.66, '#101010', '#c8ff00', 150);
    sign.position.set(0, 2.15, -1.63); sign.rotation.y = Math.PI; shed.add(sign);
    const f = zp(b, -10, 9.5); addStatic('forkstand', f.x, f.z, b.ry, 1.2, 0.8);
    for (let i = 0; i < 5; i++) { const t = zp(b, -25 + i * 0.1, 3 + i * 0.1); addDyn('tyre', t.x, t.z, { y: i * 0.34, c: 0x333333 }); }
    for (let i = 0; i < 3; i++) { const t = zp(b, -23 + i, 13); addDyn('barrel', t.x, t.z); }
  }
  { const b = B.pit;
    [-1, 1].forEach((s) => { const p = zp(b, s * 13, 5); addStatic('tent', p.x, p.z, b.ry + s, 1, 2.1); });
    for (let i = 0; i < 4; i++) { const p = zp(b, -7, 6 + i * 1.1); addDyn('barrel', p.x, p.z); }
    for (let i = 0; i < 3; i++) { const p = zp(b, 7, 6); addDyn('tyre', p.x, p.z, { y: i * 0.34, c: 0xe1306c }); }
  }
  { const b = B.rider;
    for (let i = 0; i < 4; i++) { const p = zp(b, -15 + (i % 2) * 1.05, 5); addDyn('crate', p.x, p.z, { y: Math.floor(i / 2) * 0.8 }); }
    for (let i = 0; i < 3; i++) { const p = zp(b, 15, 4 + i * 1.3); addDyn('hay', p.x, p.z, { ry: 0.6 }); }
    [-1, 1].forEach((s) => { const p = zp(b, s * 17, 9); addStatic('lamp', p.x, p.z, 0, 1, 0.5); });
  }
  { const b = B.fuel;
    let n = 0; for (let r = 0; r < 3; r++) for (let c = 0; c < 3 - r; c++) { const p = zp(b, -12 + c * 0.7 + r * 0.35, 6); addDyn('barrel', p.x, p.z, { y: r * 0.9 }); n++; }
    for (let i = 0; i < 6; i++) { const p = zp(b, 8 + i * 1.3, 7); addDyn('cone', p.x, p.z); }
  }
  { const b = B.whip;
    [-1, 1].forEach((s) => { const p = zp(b, s * 12, 3); FLAGS.push(flag(p.x, p.z, s < 0 ? 0xff2e2e : 0xc8ff00, b.ry)); COLS.push({ x: p.x, z: p.z, r: 0.4, k: 'post', h: 8 }); });
    for (let i = 0; i < 4; i++) { const p = zp(b, -9 + i * 1.3, 8); addDyn('hay', p.x, p.z); }
  }
  { const b = B.results;
    const p = zp(b, 0, 9); addStatic('podium', p.x, p.z, b.ry, 1.3, 1.1);
    [-1, 1].forEach((s) => { const q = zp(b, s * 4, 9); addStatic('podium', q.x, q.z, b.ry, 1, 0.8); });
    for (let i = 0; i < 8; i++) { const q = zp(b, -8 + i * 2.3, 12); addDyn('cone', q.x, q.z); }
  }
  { const b = B.goals;
    [-1, 1].forEach((s) => { const p = zp(b, s * 15, 4); addStatic('signpost', p.x, p.z, b.ry, 1, 0.5); });
    for (let i = 0; i < 6; i++) { const q = zp(b, -7 + i * 2.8, 8); addDyn('cone', q.x, q.z); }
  }
  { const b = B.dragon;
    for (let i = -1; i <= 1; i++) {
      const p = zp(b, i * 8.5, 7);
      const can = addStatic('can', p.x, p.z, b.ry, 2.2, 1.2);
      const bk = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.4), new THREE.MeshBasicMaterial({ color: 0x101010 })); bk.position.set(0, 1.0, 0.535); can.add(bk);
      const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.84, 0.306), new THREE.MeshBasicMaterial({ map: DRAGON_TEX, transparent: true, toneMapped: false })); lab.position.set(0, 1.0, 0.54); can.add(lab);
    }
    [-1, 1].forEach((s) => { const p = zp(b, s * 17, 6); addStatic('lamp', p.x, p.z, 0, 1, 0.5); });
    const t = zp(b, 21, 9); addStatic('tent', t.x, t.z, b.ry, 1, 2.1);
    for (let i = 0; i < 4; i++) { const q = zp(b, -18, 8 + i * 1.2); addDyn('barrel', q.x, q.z); }
  }
  { const b = B.partners;
    [-1, 1].forEach((s) => { const p = zp(b, s * 13, 3); FLAGS.push(flag(p.x, p.z, s < 0 ? 0xc8ff00 : 0xff6a00, b.ry)); COLS.push({ x: p.x, z: p.z, r: 0.4, k: 'post', h: 8 }); });
    for (let i = 0; i < 3; i++) { const p = zp(b, 14, 5 + i * 1.3); addDyn('hay', p.x, p.z); }
  }
  { const b = B.contact;
    [-1, 1].forEach((s) => { const p = zp(b, s * 15, 6); addStatic('lamp', p.x, p.z, 0, 1, 0.5); });
    for (let i = 0; i < 6; i++) { const p = zp(b, -9 + i * 3.6, 10); addDyn('cone', p.x, p.z); }
  }
  // cones along the opening straight
  for (let i = 0; i < 8; i++) { addDyn('cone', -6, 40 - i * 4); addDyn('cone', 6, 40 - i * 4); }
  // loose junk scattered along the edges of the route (always knock-over-able, never in the way)
  scatter(40, { route: 7, apart: 6, board: 24 }, (x, z) => { addDyn(['barrel', 'crate', 'tyre', 'hay'][Math.floor(rng() * 4)], x, z, { ry: rng() * 6, c: 0x333333 }); return { x, z }; });
  // lamps on the start straight
  for (let k = 0; k < 3; k++) [-1, 1].forEach((s) => { addStatic('lamp', s * 24, 40 - k * 40, 0, 1.4); });
}

const DUST_N = 200;
const dust = (() => {
  const pos = new Float32Array(DUST_N * 3);
  const col = new Float32Array(DUST_N * 3);
  const vel = new Float32Array(DUST_N * 3);
  const life = new Float32Array(DUST_N);
  for (let i = 0; i < DUST_N; i++) pos[i * 3 + 1] = -50;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const mat = new THREE.PointsMaterial({ size: 1.8, map: new THREE.CanvasTexture(c), vertexColors: true, transparent: true, depthWrite: false, opacity: 0.55 });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  scene.add(pts);
  return { pos, col, vel, life, geo, i: 0 };
})();
const DUST_COLOR = new THREE.Color(0xc2a074);
const DUST_FADE = new THREE.Color(0x1a1612);
const tmpC = new THREE.Color();

function emitDust(x, y, z, vx, vz, n = 1, spread = 1) {
  for (let k = 0; k < n; k++) {
    const i = dust.i = (dust.i + 1) % DUST_N;
    dust.pos[i * 3] = x + (Math.random() - 0.5) * 0.5;
    dust.pos[i * 3 + 1] = y + 0.2;
    dust.pos[i * 3 + 2] = z + (Math.random() - 0.5) * 0.5;
    dust.vel[i * 3] = vx + (Math.random() - 0.5) * 2 * spread;
    dust.vel[i * 3 + 1] = 0.8 + Math.random() * 1.8 * spread;
    dust.vel[i * 3 + 2] = vz + (Math.random() - 0.5) * 2 * spread;
    dust.life[i] = 1;
  }
}
function updateDust(dt) {
  for (let i = 0; i < DUST_N; i++) {
    if (dust.life[i] <= 0) { dust.pos[i * 3 + 1] = -50; continue; }
    dust.life[i] -= dt * 1.1;
    dust.pos[i * 3] += dust.vel[i * 3] * dt;
    dust.pos[i * 3 + 1] += dust.vel[i * 3 + 1] * dt;
    dust.pos[i * 3 + 2] += dust.vel[i * 3 + 2] * dt;
    dust.vel[i * 3 + 1] *= 0.97;
    tmpC.copy(DUST_FADE).lerp(DUST_COLOR, clamp(dust.life[i], 0, 1));
    dust.col[i * 3] = tmpC.r; dust.col[i * 3 + 1] = tmpC.g; dust.col[i * 3 + 2] = tmpC.b;
  }
  dust.geo.attributes.position.needsUpdate = true;
  dust.geo.attributes.color.needsUpdate = true;
}


/* ------------------------------------------------------------------ */
/* Rigid bodies (crash tumble + rider ragdoll)                         */
/* ------------------------------------------------------------------ */
const V3 = THREE.Vector3;
const _r = new V3(); const _p = new V3(); const _vr = new V3(); const _n = new V3(0, 1, 0); const _t = new V3(); const _rxn = new V3(); const _a = new V3(); const _q = new THREE.Quaternion(); const _o = new V3();
class RB {
  constructor(obj, pts, m, I, com) {
    this.obj = obj; this.pts = pts; this.invM = 1 / m; this.invI = 1 / I; this.com = com || new V3();
    this.pos = new V3(); this.q = new THREE.Quaternion(); this.v = new V3(); this.w = new V3(); this.touch = false; this.rest = 0;
  }
  step(dt) {
    this.v.y -= GRAVITY * dt;
    this.v.multiplyScalar(Math.exp(-0.04 * dt));
    this.pos.addScaledVector(this.v, dt);
    const wl = this.w.length();
    if (wl > 1e-5) { _q.setFromAxisAngle(_a.copy(this.w).divideScalar(wl), wl * dt); this.q.premultiply(_q).normalize(); }
    let maxPen = 0;
    for (const pt of this.pts) {
      _r.copy(pt.p).applyQuaternion(this.q);
      const pen = groundY(this.pos.x + _r.x, this.pos.z + _r.z) + pt.r - (this.pos.y + _r.y);
      if (pen > maxPen) maxPen = pen;
    }
    this.touch = maxPen > 0;
    if (maxPen > 0) this.pos.y += maxPen * 0.85;
    for (const pt of this.pts) {
      _r.copy(pt.p).applyQuaternion(this.q);
      const pen = groundY(this.pos.x + _r.x, this.pos.z + _r.z) + pt.r - (this.pos.y + _r.y);
      if (pen < -0.02) continue;
      _vr.crossVectors(this.w, _r).add(this.v);
      const vn = _vr.y;
      if (vn >= 0) continue;
      _rxn.crossVectors(_r, _n);
      const e = vn < -2.5 ? 0.28 : 0;
      const den = this.invM + _rxn.lengthSq() * this.invI;
      const j = -(1 + e) * vn / den;
      this.v.y += j * this.invM;
      this.w.addScaledVector(_rxn, j * this.invI);
      _t.set(_vr.x, 0, _vr.z);
      const vt = _t.length();
      if (vt > 1e-4) {
        _t.divideScalar(vt);
        _a.crossVectors(_r, _t);
        const jt = Math.min(0.75 * j, vt / (this.invM + _a.lengthSq() * this.invI));
        this.v.addScaledVector(_t, -jt * this.invM);
        this.w.addScaledVector(_a, -jt * this.invI);
      }
    }
    if (this.touch) {
      const k = Math.exp(-0.7 * dt);
      this.v.x *= k; this.v.z *= k; this.w.multiplyScalar(Math.exp(-1.1 * dt));
      this.rest = (this.v.lengthSq() < 0.25 && this.w.lengthSq() < 0.4) ? this.rest + dt : 0;
    } else this.rest = 0;
  }
  sync() {
    this.obj.quaternion.copy(this.q);
    this.obj.position.copy(this.pos).sub(_o.copy(this.com).applyQuaternion(this.q));
  }
}

/* ------------------------------------------------------------------ */
/* Bike + rider from the Blender models                                */
/* ------------------------------------------------------------------ */
const HIP = new V3(0, 1.42, 0.34);
const BIKE_COM = new V3(0, 0.75, 0.1);
let bike; let rag;
function plateTexture(num, bg, fg) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#111'; g.lineWidth = 10; g.strokeRect(5, 5, 246, 246);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '190px "Bebas Neue", Impact, sans-serif';
  g.fillText(num, 128, 140, 230);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO;
  return t;
}
function planarUV(geo, fu, fv) {
  const pos = geo.attributes.position; const n = pos.count;
  const mn = [1e9, 1e9, 1e9]; const mx = [-1e9, -1e9, -1e9];
  for (let i = 0; i < n; i++) for (let a = 0; a < 3; a++) { const v = [pos.getX(i), pos.getY(i), pos.getZ(i)][a]; if (v < mn[a]) mn[a] = v; if (v > mx[a]) mx[a] = v; }
  const ext = [0, 1, 2].map((a) => mx[a] - mn[a]);
  const axes = [0, 1, 2].sort((a, b) => ext[b] - ext[a]).slice(0, 2);
  const uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const v = [pos.getX(i), pos.getY(i), pos.getZ(i)];
    const u = (v[axes[0]] - mn[axes[0]]) / (ext[axes[0]] || 1); const w = (v[axes[1]] - mn[axes[1]]) / (ext[axes[1]] || 1);
    uv[i * 2] = fu ? 1 - u : u; uv[i * 2 + 1] = fv ? 1 - w : w;
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
const PLATE_FLIP = { plate_front: [0, 0], plate_side_L: [0, 0], plate_side_R: [0, 1], plate_rear: [0, 1] };
function buildBike() {
  const root = new THREE.Group(); const slope = new THREE.Group(); const trick = new THREE.Group(); const lean = new THREE.Group();
  root.add(slope); slope.add(trick); trick.add(lean);
  const sc = bikeSrc.clone(true);
  lean.add(sc);
  const N = {};
  sc.traverse((o) => { if (o.name) N[o.name] = o; });
  const ptex = plateTexture('746', '#f4f4f4', '#101010');
  ['plate_front', 'plate_side_L', 'plate_side_R', 'plate_rear'].forEach((n) => {
    const m = N[n]; if (!m) return;
    m.traverse((o) => { if (o.isMesh) { planarUV(o.geometry, PLATE_FLIP[n][0], PLATE_FLIP[n][1]); o.material = new THREE.MeshStandardMaterial({ map: ptex, roughness: 0.6, side: THREE.DoubleSide }); } });
  });
  const rider = new THREE.Group();
  rider.position.copy(HIP);
  const rIn = riderSrc.clone(true);
  rIn.position.copy(HIP).negate();
  rider.add(rIn);
  lean.add(rider);
  const RN = {}; rIn.traverse((o) => { if (o.name) RN[o.name] = o; });
  if (RN.jersey_back) {
    const t = textPlane('746', 0.42, 0.42, '#ff5a00', null, 300);
    RN.jersey_back.traverse((o) => { if (o.isMesh) { planarUV(o.geometry); o.material = t.material; o.material.side = THREE.DoubleSide; o.material.polygonOffset = true; o.material.polygonOffsetFactor = -2; } });
  }
  scene.add(root);
  const fl0 = N.fork_lower.position.clone();
  return { root, slope, trick, lean, steerG: N.fork_upper, rider, front: N.front_wheel, rear: N.rear_wheel, forkLower: N.fork_lower, fl0, swing: N.swingarm, WR: 0.475 };
}

function buildRagdoll() {
  const g = new THREE.Group(); g.visible = false; scene.add(g);
  const src = riderSrc.clone(true);
  const mk = (name, pts, m, I, pivot) => {
    const node = src.getObjectByName(name);
    const holder = new THREE.Group();
    node.position.set(0, 0, 0);
    holder.add(node);
    g.add(holder);
    const rb = new RB(holder, pts.map(([x, y, z, r]) => ({ p: new V3(x, y, z), r })), m, I);
    rb.pivot = pivot;
    return rb;
  };
  const torso = mk('torso', [[0, 0.7, -0.45, 0.2], [0, 1.2, -0.5, 0.2], [0, 0, 0, 0.2], [0.4, 0.8, -0.5, 0.1], [-0.4, 0.8, -0.5, 0.1]], 1.3, 0.5, HIP.clone());
  const legL = mk('leg_L', [[-0.2, -0.3, -0.45, 0.12], [-0.14, -0.8, -0.12, 0.12], [0, 0, 0, 0.1]], 0.5, 0.18, new V3(-0.16, 1.42, 0.34));
  const legR = mk('leg_R', [[0.2, -0.3, -0.45, 0.12], [0.14, -0.8, -0.12, 0.12], [0, 0, 0, 0.1]], 0.5, 0.18, new V3(0.16, 1.42, 0.34));
  return { g, bodies: [torso, legL, legR] };
}

/* ------------------------------------------------------------------ */
/* Effects: skids, explosions, debris, craters                         */
/* ------------------------------------------------------------------ */
const FXN = { fire: 34, smoke: 26, debris: 90, ring: 4, crater: 28, skid: 520 };
let fireS; let smokeS; let debris; let rings; let craters; let skids; let flashLight; let flashEl;
const debrisD = [];
let craterI = 0; let skidI = 0;
function buildFX() {
  fireS = Array.from({ length: FXN.fire }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xff8a20, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.visible = false; scene.add(s); return { s, life: 0, max: 1, v: new V3(), s0: 2, s1: 6 };
  });
  smokeS = Array.from({ length: FXN.smoke }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0x2b2622, transparent: true, depthWrite: false, opacity: 0.6 }));
    s.visible = false; scene.add(s); return { s, life: 0, max: 1, v: new V3(), s0: 2, s1: 8 };
  });
  const dg = new THREE.BoxGeometry(0.22, 0.16, 0.22);
  debris = new THREE.InstancedMesh(dg, std(0xffffff), FXN.debris);
  for (let i = 0; i < FXN.debris; i++) {
    debrisD.push({ p: new V3(0, -50, 0), v: new V3(), life: 0, rot: new V3(), s: 1 });
    debris.setColorAt(i, new THREE.Color([0x5a4128, 0x7a5a38, 0x2a2018, 0x4a3a2a][i % 4]));
    tmpM.makeScale(0, 0, 0); debris.setMatrixAt(i, tmpM);
  }
  debris.frustumCulled = false; scene.add(debris);
  const rg = new THREE.RingGeometry(0.88, 1, 56); rg.rotateX(-Math.PI / 2);
  rings = Array.from({ length: FXN.ring }, () => {
    const m = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.visible = false; scene.add(m); return { m, t: 9 };
  });
  const cc = document.createElement('canvas'); cc.width = cc.height = 128;
  const g = cc.getContext('2d'); const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(8,5,3,0.95)'); gr.addColorStop(0.55, 'rgba(14,9,5,0.85)'); gr.addColorStop(0.8, 'rgba(30,20,10,0.4)'); gr.addColorStop(1, 'rgba(30,20,10,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const ct = new THREE.CanvasTexture(cc);
  const cg = new THREE.CircleGeometry(3.2, 28); cg.rotateX(-Math.PI / 2);
  craters = Array.from({ length: FXN.crater }, (_, i) => {
    const m = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({ map: ct, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }));
    m.visible = false; m.position.y = 0.03 + i * 0.0006; scene.add(m); return m;
  });
  const sg = new THREE.PlaneGeometry(0.2, 0.7); sg.rotateX(-Math.PI / 2);
  skids = new THREE.InstancedMesh(sg, new THREE.MeshBasicMaterial({ color: 0x120c07, transparent: true, opacity: 0.55, depthWrite: false }), FXN.skid);
  for (let i = 0; i < FXN.skid; i++) { tmpM.makeScale(0, 0, 0); skids.setMatrixAt(i, tmpM); }
  skids.frustumCulled = false; scene.add(skids);
  flashLight = new THREE.PointLight(0xff8a30, 0, 70, 1.3); scene.add(flashLight);
  flashEl = $('#flash');
}
function addSkid(x, z, heading) {
  tmpQ.setFromAxisAngle(_n, -heading);
  tmpP.set(x, 0.036, z); tmpS.set(1, 1, 1);
  tmpM.compose(tmpP, tmpQ, tmpS);
  skids.setMatrixAt(skidI, tmpM); skidI = (skidI + 1) % FXN.skid;
  skids.instanceMatrix.needsUpdate = true;
}
function spawnFire(x, y, z, scale = 1) {
  fireS.forEach((f, i) => {
    f.life = f.max = rr(0.45, 1.0) * (0.8 + scale * 0.2);
    f.s.position.set(x + rr(-1, 1) * scale, y + rr(0.2, 1.2), z + rr(-1, 1) * scale);
    const a = rng() * 6.283; const sp = rr(2, 9) * scale;
    f.v.set(Math.cos(a) * sp, rr(2, 9), Math.sin(a) * sp);
    f.s0 = rr(2.5, 5); f.s1 = rr(9, 16) * scale; f.s.visible = true;
    f.s.material.color.setHex(i % 3 === 0 ? 0xffd070 : 0xff7a1a);
  });
  smokeS.forEach((f) => {
    f.life = f.max = rr(2, 3.8);
    f.s.position.set(x + rr(-1.5, 1.5), y + rr(0.3, 1.5), z + rr(-1.5, 1.5));
    f.v.set(rr(-2, 2), rr(2.5, 6), rr(-2, 2));
    f.s0 = rr(2, 4); f.s1 = rr(8, 14); f.s.visible = true;
  });
  for (let i = 0; i < FXN.debris; i++) {
    const d = debrisD[i];
    d.life = rr(1.6, 3.2); d.p.set(x + rr(-0.6, 0.6), y + 0.3, z + rr(-0.6, 0.6));
    const a = rng() * 6.283; const sp = rr(3, 15) * scale;
    d.v.set(Math.cos(a) * sp, rr(6, 20), Math.sin(a) * sp);
    d.rot.set(rr(-8, 8), rr(-8, 8), rr(-8, 8)); d.s = rr(0.7, 2.2);
  }
  const rg = rings.find((r) => r.t > 1) || rings[0];
  rg.t = 0; rg.m.position.set(x, 0.25, z); rg.m.visible = true;
  flashLight.position.set(x, 3, z); flashLight.intensity = 700 * scale; flashLight.userData.t = 0.35;
  const cr = craters[craterI]; craterI = (craterI + 1) % FXN.crater; cr.position.x = x; cr.position.z = z; cr.visible = true; cr.rotation.y = rng() * 6;
  flashEl.style.opacity = String(clamp(0.55 * scale, 0, 0.8));
}
function updateFX(dt) {
  for (const f of fireS) {
    if (f.life <= 0) continue;
    f.life -= dt; if (f.life <= 0) { f.s.visible = false; continue; }
    const k = 1 - f.life / f.max;
    f.s.position.addScaledVector(f.v, dt); f.v.multiplyScalar(Math.exp(-1.8 * dt)); f.v.y += 3 * dt;
    f.s.scale.setScalar(lerp(f.s0, f.s1, Math.sqrt(k)));
    f.s.material.opacity = Math.min(1, (1 - k) * 1.5);
  }
  for (const f of smokeS) {
    if (f.life <= 0) continue;
    f.life -= dt; if (f.life <= 0) { f.s.visible = false; continue; }
    const k = 1 - f.life / f.max;
    f.s.position.addScaledVector(f.v, dt); f.v.multiplyScalar(Math.exp(-0.7 * dt));
    f.s.scale.setScalar(lerp(f.s0, f.s1, Math.sqrt(k)));
    f.s.material.opacity = 0.55 * Math.sin(Math.min(1, k * 3) * 1.4) * (1 - k);
  }
  let any = false;
  for (let i = 0; i < FXN.debris; i++) {
    const d = debrisD[i];
    if (d.life <= 0) continue;
    any = true;
    d.life -= dt;
    if (d.life <= 0) { tmpM.makeScale(0, 0, 0); debris.setMatrixAt(i, tmpM); continue; }
    d.v.y -= GRAVITY * dt; d.p.addScaledVector(d.v, dt);
    const gy = groundY(d.p.x, d.p.z) + 0.08;
    if (d.p.y < gy) { d.p.y = gy; d.v.y *= -0.35; d.v.x *= 0.7; d.v.z *= 0.7; d.rot.multiplyScalar(0.6); }
    tmpE.set(d.rot.x * d.life, d.rot.y * d.life, d.rot.z * d.life);
    tmpQ.setFromEuler(tmpE); tmpS.setScalar(d.s * Math.min(1, d.life * 1.5));
    tmpM.compose(d.p, tmpQ, tmpS); debris.setMatrixAt(i, tmpM);
  }
  if (any) debris.instanceMatrix.needsUpdate = true;
  for (const r of rings) {
    if (r.t > 1) continue;
    r.t += dt * 2.2;
    if (r.t > 1) { r.m.visible = false; continue; }
    r.m.scale.setScalar(1 + r.t * 18); r.m.material.opacity = (1 - r.t) * 0.7;
  }
  if (flashLight.intensity > 0) flashLight.intensity = Math.max(0, flashLight.intensity - dt * 2400);
  const fo = parseFloat(flashEl.style.opacity || '0');
  if (fo > 0) flashEl.style.opacity = String(Math.max(0, fo - dt * 1.6));
}


/* ------------------------------------------------------------------ */
/* Game state and physics                                              */
/* ------------------------------------------------------------------ */
const MAX_SPEED = 32;
const GRAVITY = 30;
const WHIP_ROLL = 1.3;
const WHIP_YAW = 0.62;
const TRAVEL = 0.3;
const WB = 1.96;
const TUNES = [
  { n: 'SOFT', k: 115, c: 8, grip: 1.12, lift: 1.1, harsh: 0.5 },
  { n: 'RACE', k: 200, c: 15, grip: 1.0, lift: 1.0, harsh: 1.0 },
  { n: 'STIFF', k: 330, c: 22, grip: 0.9, lift: 0.9, harsh: 1.8 },
];
let tuneI = 1;
const st = {
  x: SPAWN.x, z: SPAWN.z, y: 0, vy: 0, vx: 0, vz: 0, heading: 0, speed: 0, yawV: 0, thr: 0, brk: 0,
  grounded: true, lastVyG: 0, carve: 0, slope: 0,
  wRoll: 0, wRollV: 0, wYaw: 0, wYawV: 0, whipDir: 1, whipPeak: 0, whipHold: 0, whipTarget: 0,
  tp: 0, tpV: 0, airT: 0, whips: 0, bestAir: 0, wheelieT: 0, bestWheelie: 0, stoppieT: 0, bestStoppie: 0,
  shake: 0, crash: 0, hotT: 0, hotLabel: '', liveMsg: '', liveT: 0,
  nearMine: 1e9, booms: 0, crashes: 0, smashed: 0, inv: 0, cf: 0, cfv: 0, cr: 0, crv: 0, ax: 0, prevVf: 0, revT: 0, skidAcc: 0,
  prevTrick: false, prevBrake: false, vl: 0, sway: 0,
};
const crash = { on: false, t: 0, kind: '', bike: null, rag: null };
let wpTarget = null;

function resetBikePose() {
  bike.slope.rotation.set(0, 0, 0); bike.trick.rotation.set(0, 0, 0); bike.trick.position.set(0, 0, 0);
  bike.lean.rotation.set(0, 0, 0); bike.steerG.rotation.set(0, 0, 0); bike.rider.rotation.set(0, 0, 0);
  bike.forkLower.position.copy(bike.fl0); bike.swing.rotation.set(0, 0, 0);
  bike.root.rotation.set(0, 0, 0); bike.root.quaternion.identity();
}
function respawn() {
  if (crash.on) endCrash();
  st.x = SPAWN.x; st.z = SPAWN.z; st.y = 0; st.vy = 0; st.vx = st.vz = 0; st.heading = 0; st.speed = 0; st.yawV = 0; st.grounded = true; st.lastVyG = 0;
  st.wRoll = st.wRollV = st.wYaw = st.wYawV = st.tp = st.tpV = 0; st.cf = st.cfv = st.cr = st.crv = 0; st.inv = 1;
  camera.position.set(0, 6, 60);
}

/* ---------- crash / ragdoll ---------- */
function startCrash(kind, o = {}) {
  if (crash.on || st.inv > 0) return;
  crash.on = true; crash.t = 0; crash.kind = kind; st.crashes++;
  bike.root.updateMatrixWorld(true);
  const bq = new THREE.Quaternion(); bike.lean.getWorldQuaternion(bq);
  const bpos = bike.lean.localToWorld(BIKE_COM.clone());
  const rq = new THREE.Quaternion(); bike.rider.getWorldQuaternion(rq);
  const bb = crash.bike;
  bb.pos.copy(bpos); bb.q.copy(bq);
  bb.v.set(o.bvx !== undefined ? o.bvx : st.vx, o.bvy !== undefined ? o.bvy : st.vy, o.bvz !== undefined ? o.bvz : st.vz);
  bb.w.set(o.bw ? o.bw[0] : rr(-3, 3), o.bw ? o.bw[1] : rr(-2, 2), o.bw ? o.bw[2] : rr(-3, 3)); bb.rest = 0;
  const rv = o.rv || [st.vx, 3, st.vz];
  rag.bodies.forEach((b, i) => {
    b.pos.copy(bike.lean.localToWorld(b.pivot.clone())); b.q.copy(rq);
    b.v.set(rv[0] + rr(-1.5, 1.5), rv[1] + rr(-0.5, 2), rv[2] + rr(-1.5, 1.5));
    b.w.set(rr(-7, 7), rr(-4, 4), rr(-7, 7)); b.rest = 0;
  });
  resetBikePose();
  bike.rider.visible = false; rag.g.visible = true;
  bb.sync(); rag.bodies.forEach((b) => b.sync());
  st.tp = st.tpV = 0; st.wRoll = st.wRollV = st.wYaw = st.wYawV = 0;
  st.vx = st.vz = 0; st.speed = 0;
  st.shake = Math.max(st.shake, kind === 'mine' ? 1.8 : 0.9);
  sfxCrash(kind === 'mine' ? 1 : 0.7);
  emitDust(bpos.x, st.y, bpos.z, 0, 0, 24, 4);
  const msgs = { mine: 'BOOM', hit: 'THAT HURT', loop: 'LOOPED OUT', endo: 'OVER THE BARS', land: 'CROSSED UP', hay: 'HAY BALE: 1, ADRIANO: 0' };
  st.liveMsg = msgs[kind] || 'SEND IT'; st.liveT = 2.6;
}
function endCrash() {
  const bb = crash.bike;
  _a.set(0, 0, -1).applyQuaternion(bb.q);
  if (Math.hypot(_a.x, _a.z) > 0.35) st.heading = Math.atan2(_a.x, -_a.z);
  st.x = bb.pos.x; st.z = bb.pos.z; st.y = groundY(st.x, st.z); st.vy = 0; st.vx = st.vz = 0; st.speed = 0; st.yawV = 0;
  st.grounded = true; st.tp = st.tpV = 0; st.cf = st.cfv = st.cr = st.crv = 0; st.inv = 1.4;
  st.x = clamp(st.x, X0 + 2, X1 - 2); st.z = clamp(st.z, Z_N + 2, Z_S - 2);
  crash.on = false;
  bike.rider.visible = true; rag.g.visible = false;
  resetBikePose();
  bike.root.position.set(st.x, st.y, st.z);
  st.liveMsg = 'GET UP, ITALIAN STALLION'; st.liveT = 1.4;
}
const camFocus = new V3();
function stepCrash(dt) {
  crash.t += dt;
  const bb = crash.bike; const [tor, lL, lR] = rag.bodies;
  const n = Math.ceil(dt / (1 / 100)); const h = dt / n;
  for (let i = 0; i < n; i++) {
    bb.step(h); tor.step(h); lL.step(h); lR.step(h);
    [[lL, -0.16], [lR, 0.16]].forEach(([l, s]) => {
      _o.set(s, 0, 0).applyQuaternion(tor.q).add(tor.pos);
      _a.copy(l.pos).sub(_o);
      l.pos.addScaledVector(_a, -0.6); tor.pos.addScaledVector(_a, 0.15);
      _t.copy(l.v).sub(tor.v); l.v.addScaledVector(_t, -0.2); tor.v.addScaledVector(_t, 0.08);
    });
    keepIn(bb); keepIn(tor); keepIn(lL); keepIn(lR);
  }
  bb.sync(); rag.bodies.forEach((b) => b.sync());
  camFocus.copy(tor.pos).lerp(bb.pos, 0.35);
  const calm = bb.rest > 0.4 || bb.v.lengthSq() < 0.4;
  if ((crash.t > 2.6 && calm) || crash.t > 5) endCrash();
}
function keepIn(b) {
  if (b.pos.x < X0 + 1) { b.pos.x = X0 + 1; b.v.x = Math.abs(b.v.x) * 0.3; }
  if (b.pos.x > X1 - 1) { b.pos.x = X1 - 1; b.v.x = -Math.abs(b.v.x) * 0.3; }
  if (b.pos.z < Z_N + 1) { b.pos.z = Z_N + 1; b.v.z = Math.abs(b.v.z) * 0.3; }
  if (b.pos.z > Z_S - 1) { b.pos.z = Z_S - 1; b.v.z = -Math.abs(b.v.z) * 0.3; }
}

/* ---------- mines ---------- */
function detonate(m) {
  if (!m.armed) return;
  m.armed = false; m.t = -1; st.booms++;
  tmpM.makeScale(0, 0, 0); MINES.body.setMatrixAt(m.i, tmpM); MINES.body.instanceMatrix.needsUpdate = true;
  MINES.mesh.ledIM.setMatrixAt(m.i, tmpM); MINES.mesh.ledIM.instanceMatrix.needsUpdate = true;
  spawnFire(m.x, 0.2, m.z, 1);
  sfxBoom(Math.hypot(st.x - m.x, st.z - m.z));
  // blast on the bike and rider
  const R = 11;
  const dx = (crash.on ? crash.bike.pos.x : st.x) - m.x; const dz = (crash.on ? crash.bike.pos.z : st.z) - m.z;
  const d = Math.hypot(dx, dz); const nx = dx / (d || 1); const nz = dz / (d || 1);
  const s = clamp(1 - d / R, 0, 1);
  if (d < R) {
    st.shake = Math.max(st.shake, 0.6 + s * 1.6);
    if (!crash.on) {
      if (st.y < 4 || s > 0.3) {
        startCrash('mine', {
          bvx: st.vx * 0.4 + nx * 20 * s, bvy: 9 + 14 * s, bvz: st.vz * 0.4 + nz * 20 * s,
          bw: [rr(-8, 8) * (0.5 + s), rr(-5, 5), rr(-9, 9) * (0.5 + s)],
          rv: [st.vx * 0.6 + nx * 22 * s, 7 + 14 * s, st.vz * 0.6 + nz * 22 * s],
        });
      }
    } else {
      const b = crash.bike;
      b.v.x += nx * 16 * s; b.v.z += nz * 16 * s; b.v.y += 8 + 10 * s; b.w.x += rr(-8, 8) * s; b.w.z += rr(-8, 8) * s;
      rag.bodies.forEach((r) => { r.v.x += nx * 18 * s; r.v.z += nz * 18 * s; r.v.y += 7 + 10 * s; r.w.x += rr(-9, 9); r.w.z += rr(-9, 9); });
      crash.t = Math.min(crash.t, 1.0);
    }
  }
  // props go flying
  DYN.forEach((p) => {
    const px = p.x - m.x; const pz = p.z - m.z; const pd = Math.hypot(px, pz);
    if (pd > 14) return;
    const k = (1 - pd / 14) / Math.sqrt(p.m);
    p.vx += (px / (pd || 1)) * 24 * k; p.vz += (pz / (pd || 1)) * 24 * k; p.vy += 10 * k + 3;
    p.w.set(rr(-8, 8), rr(-8, 8), rr(-8, 8)); p.awake = true;
  });
  // chain reaction
  MINES.forEach((o) => {
    if (!o.armed || o.t > 0) return;
    const od = Math.hypot(o.x - m.x, o.z - m.z);
    if (od < 8) o.t = 0.12 + od * 0.045;
  });
  st.liveMsg = st.booms % 3 === 0 ? 'KABOOM' : 'BOOM'; st.liveT = 1.4;
}
function updateMines(dt, tt) {
  const bx = crash.on ? crash.bike.pos.x : st.x; const bz = crash.on ? crash.bike.pos.z : st.z;
  let near = 1e9;
  MINES.forEach((m) => {
    if (!m.armed) return;
    if (m.t > 0) { m.t -= dt; if (m.t <= 0) { detonate(m); return; } }
    const d = Math.hypot(bx - m.x, bz - m.z);
    near = Math.min(near, d);
    if (!crash.on && st.inv <= 0 && d < 1.75 && st.y < 0.7 && m.t < 0) detonate(m);
  });
  st.nearMine = near;
  // LED blink + glow
  const gc = MINES.mesh.gg.attributes.color; const li = MINES.mesh.ledIM;
  MINES.forEach((m, i) => {
    if (!m.armed) { gc.setXYZ(i, 0, 0, 0); return; }
    const on = ((tt * 1.7 + i * 0.37) % 1) < 0.18 || m.t > 0;
    gc.setXYZ(i, on ? 1 : 0, on ? 0.12 : 0, 0);
    _c1.setHex(on ? 0xff2a1a : 0x2a0000); li.setColorAt(i, _c1);
  });
  gc.needsUpdate = true; if (li.instanceColor) li.instanceColor.needsUpdate = true;
}
const _c1 = new THREE.Color();

/* ---------- knockable props ---------- */
function stepProps(dt) {
  const bx = st.x; const bz = st.z;
  for (let i = 0; i < DYN.length; i++) {
    const p = DYN[i];
    // bike hit
    if (!crash.on) {
      const dx = p.x - bx; const dz = p.z - bz; const R = p.r + 0.55;
      if (dx < R && dx > -R && dz < R && dz > -R && st.y < p.y + p.h) {
        const d = Math.hypot(dx, dz);
        if (d < R) {
          const nx = dx / (d || 1); const nz = dz / (d || 1);
          const rel = (st.vx - p.vx) * nx + (st.vz - p.vz) * nz;
          if (rel > 0.3) {
            const mb = 9;
            const j = (1 + 0.35) * rel / (1 / mb + 1 / p.m);
            p.vx += nx * j / p.m; p.vz += nz * j / p.m; p.vy += Math.min(9, rel * 0.28) + 1;
            p.w.set(rr(-1, 1) * rel * 0.5, rr(-1, 1) * rel * 0.5, rr(-1, 1) * rel * 0.5);
            st.vx -= nx * j / mb; st.vz -= nz * j / mb;
            p.awake = true;
            if (rel > 5 && !p.hit) { p.hit = true; st.smashed++; sfxThud(clamp(rel / 20, 0.2, 1)); st.shake = Math.max(st.shake, 0.15 + rel * 0.01); }
            if (p.name === 'hay' && rel > 10) startCrash('hay', { bvx: st.vx * 0.2, bvz: st.vz * 0.2, bvy: 2, rv: [st.vx * 0.9, 5, st.vz * 0.9] });
          }
          p.x = bx + nx * R; p.z = bz + nz * R;
        }
      }
    } else if (crash.on) {
      const dx = p.x - crash.bike.pos.x; const dz = p.z - crash.bike.pos.z;
      if (dx * dx + dz * dz < 1.2) { p.vx += crash.bike.v.x * 0.3; p.vz += crash.bike.v.z * 0.3; p.awake = true; }
    }
    if (!p.awake) continue;
    p.vy -= GRAVITY * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    const gy = groundY(p.x, p.z);
    let onG = false;
    if (p.y <= gy) {
      p.y = gy; onG = true;
      if (p.vy < -1.5) { p.vy = -p.vy * 0.34; if (p.vy > 2) sfxThud(clamp(p.vy / 12, 0.1, 0.5) * 0.4); } else p.vy = 0;
      const k = Math.exp(-2.4 * dt); p.vx *= k; p.vz *= k; p.w.multiplyScalar(Math.exp(-2 * dt));
    }
    // static colliders and other props
    for (let c = 0; c < COLS.length; c++) {
      const o = COLS[c];
      const dx = p.x - o.x; const dz = p.z - o.z; const R = o.r + p.r;
      if (dx > R || dx < -R || dz > R || dz < -R || p.y > o.h) continue;
      const d = Math.hypot(dx, dz); if (d >= R) continue;
      const nx = dx / (d || 1); const nz = dz / (d || 1);
      p.x = o.x + nx * R; p.z = o.z + nz * R;
      const vn = p.vx * nx + p.vz * nz; if (vn < 0) { p.vx -= 1.4 * vn * nx; p.vz -= 1.4 * vn * nz; }
    }
    for (let j = 0; j < DYN.length; j++) {
      if (j === i) continue;
      const q = DYN[j];
      const dx = q.x - p.x; const dz = q.z - p.z; const R = q.r + p.r;
      if (dx > R || dx < -R || dz > R || dz < -R || Math.abs(q.y - p.y) > 0.9) continue;
      const d = Math.hypot(dx, dz); if (d >= R) continue;
      const nx = dx / (d || 1); const nz = dz / (d || 1);
      const rel = (p.vx - q.vx) * nx + (p.vz - q.vz) * nz;
      const ov = R - d;
      q.x += nx * ov * 0.5; q.z += nz * ov * 0.5; p.x -= nx * ov * 0.5; p.z -= nz * ov * 0.5;
      if (rel > 0) {
        const jn = 1.4 * rel / (1 / p.m + 1 / q.m);
        p.vx -= nx * jn / p.m; p.vz -= nz * jn / p.m; q.vx += nx * jn / q.m; q.vz += nz * jn / q.m; q.vy += 1.5; q.awake = true;
        q.w.set(rr(-3, 3), rr(-3, 3), rr(-3, 3));
      }
    }
    // orientation: tumble while moving, right itself when it stops
    if (p.w.lengthSq() > 1e-4) {
      const wl = p.w.length(); _q.setFromAxisAngle(_a.copy(p.w).divideScalar(wl), wl * dt);
      p.obj.quaternion.premultiply(_q);
    }
    if (onG) {
      _q.setFromEuler(tmpE.set(0, p.yaw, 0));
      p.obj.quaternion.slerp(_q, 1 - Math.exp(-3.5 * dt));
    }
    p.obj.position.set(p.x, p.y, p.z);
    if (onG && p.vx * p.vx + p.vz * p.vz < 0.01 && p.w.lengthSq() < 0.05) { p.awake = false; p.hit = false; }
  }
}

/* ---------- static collisions ---------- */
function collideStatic() {
  for (let i = 0; i < COLS.length; i++) {
    const c = COLS[i];
    const dx = st.x - c.x; const dz = st.z - c.z; const R = c.r + 0.55;
    if (dx > R || dx < -R || dz > R || dz < -R || st.y > c.h) continue;
    const d = Math.hypot(dx, dz); if (d >= R) continue;
    const nx = dx / (d || 1); const nz = dz / (d || 1);
    st.x = c.x + nx * R; st.z = c.z + nz * R;
    const vn = -(st.vx * nx + st.vz * nz);
    if (vn > 0) {
      const lim = c.k === 'rock' ? 10.5 : 9;
      if (vn > lim) {
        startCrash('hit', { bvx: st.vx * 0.15 + nx * 3, bvy: 2.5, bvz: st.vz * 0.15 + nz * 3, rv: [st.vx * 0.95, 4 + vn * 0.25, st.vz * 0.95], bw: [rr(-4, 4) - vn * 0.3, rr(-3, 3), rr(-4, 4)] });
        return;
      }
      st.vx += nx * vn * 1.25; st.vz += nz * vn * 1.25;
      if (vn > 2.5) { st.shake = Math.max(st.shake, 0.12 + vn * 0.03); st.yawV += (nx * Math.cos(st.heading) + nz * Math.sin(st.heading)) * vn * 0.25; sfxThud(clamp(vn / 12, 0.15, 0.7)); emitDust(st.x, st.y, st.z, 0, 0, 5, 2); }
    }
  }
}

/* ---------- landing ---------- */
const fwd = new V3(); const tmpV = new V3(); const camLook = new V3(0, 1, 30); const tgtV = new V3();
function spring(x, v, target, k, c, dt) { const a = k * (target - x) - c * v; v += a * dt; x += v * dt; return [x, v]; }
function onLand(impact) {
  const air = st.airT; const roll = Math.abs(st.wRoll); const T = TUNES[tuneI];
  st.shake = Math.max(st.shake, clamp(air * 0.25, 0, 0.5));
  emitDust(st.x, st.y, st.z, 0, 0, 20, 3.5);
  if (air > 0.35 && air > st.bestAir) st.bestAir = air;
  st.cfv += impact * 0.35 * (st.tp > 0.3 ? 0.1 : st.tp < -0.2 ? 1.3 : 0.55);
  st.crv += impact * 0.35 * (st.tp > 0.3 ? 1.4 : 0.55);
  if (impact > 9) st.tpV += (rng() - 0.5) * 1.3 * T.harsh * clamp((impact - 8) / 10, 0, 1);
  sfxThud(clamp(impact / 22, 0.2, 0.8));
  if (roll > 0.8 || st.tp > 1.0 || st.tp < -0.75) {
    startCrash('land', { bvx: st.vx * 0.5, bvz: st.vz * 0.5, bvy: 3, rv: [st.vx * 0.9, 4, st.vz * 0.9] });
    st.whipPeak = 0; st.whipHold = 0; return;
  }
  if (roll > 0.42) {
    st.vx *= 0.55; st.vz *= 0.55; st.wRollV += -Math.sign(st.wRoll) * 7; st.wYawV += -Math.sign(st.wYaw) * 3; st.shake = 0.6; st.crash = 1.2;
    emitDust(st.x, st.y, st.z, 0, 0, 20, 5);
  } else if (st.whipPeak > 0.7 && st.whipHold > 0.2) {
    st.whips++; st.crash = 0; st.liveMsg = 'WHIP LANDED'; st.liveT = 1.6;
    if (Math.hypot(st.x - WHIP_J.x, st.z - WHIP_J.z) < 55) { st.hotT = 14; st.hotLabel = 'WHIP LANDED'; }
  } else if (air > 1.1) { st.liveMsg = 'BIG AIR ' + air.toFixed(1) + 's'; st.liveT = 1.4; }
  st.whipPeak = 0; st.whipHold = 0;
}

/* ---------- suspension ---------- */
function updateSus(dt) {
  const T = TUNES[tuneI];
  let fT = 0; let rT = 0;
  if (st.grounded) {
    fT = 9 + clamp(-st.ax, 0, 40) * 0.55 + clamp(-st.tp, 0, 1) * 30;
    rT = 9 + clamp(st.ax, 0, 30) * 0.5 + clamp(st.tp, 0, 1.2) * 14;
    if (st.tp > 0.25) fT *= 0.1;
    if (st.tp < -0.25) rT *= 0.1;
  }
  const sub = 3; const h = dt / sub;
  for (let i = 0; i < sub; i++) {
    st.cfv += (fT - T.k * st.cf - T.c * st.cfv) * h; st.cf += st.cfv * h;
    st.crv += (rT - T.k * st.cr - T.c * st.crv) * h; st.cr += st.crv * h;
    if (st.cf < 0) { st.cf = 0; if (st.cfv < 0) st.cfv = 0; }
    if (st.cr < 0) { st.cr = 0; if (st.crv < 0) st.crv = 0; }
    ['cf', 'cr'].forEach((k) => {
      if (st[k] > TRAVEL) {
        const sh = st[k + 'v']; st[k] = TRAVEL;
        if (sh > 0) {
          st[k + 'v'] = -sh * 0.25;
          if (sh > 1.2) {
            st.vx *= 1 - Math.min(0.1, sh * 0.02); st.vz *= 1 - Math.min(0.1, sh * 0.02);
            st.shake = Math.max(st.shake, Math.min(0.5, sh * 0.06));
            if (sh > 2.2 && st.liveT <= 0) { st.liveMsg = 'BOTTOMED OUT'; st.liveT = 1; }
          }
        }
      }
    });
  }
}

/* ---------- the ride ---------- */
function stepRide(dt) {
  const T = TUNES[tuneI];
  const steer = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const gasOn = keys.gas || (autoGas && !keys.brake);
  st.thr += ((gasOn ? 1 : 0) - st.thr) * Math.min(1, dt * (gasOn ? 6 : 12));
  st.brk += ((keys.brake ? 1 : 0) - st.brk) * Math.min(1, dt * 10);
  const trickEdge = keys.trick && !st.prevTrick; const brakeEdge = keys.brake && !st.prevBrake;
  st.prevTrick = keys.trick; st.prevBrake = keys.brake;
  const hs = Math.sin(st.heading); const hc = Math.cos(st.heading);
  fwd.set(hs, 0, -hc);
  let vf = st.vx * hs - st.vz * hc; let vl = st.vx * hc + st.vz * hs;

  if (st.grounded) {
    let a = 0;
    const power = st.thr * 22 * Math.max(0, 1 - Math.pow(Math.max(vf, 0) / MAX_SPEED, 2.3));
    a += power;
    a -= Math.sign(vf) * (1.0 + 0.0026 * vf * vf);
    if (st.thr < 0.2) a -= Math.sign(vf) * 4.5 * (1 - st.thr / 0.2) * Math.min(1, Math.abs(vf) / 3);
    let gripK = 6.5 * T.grip;
    if (keys.brake) {
      if (vf > 0.7) {
        a -= 40 * Math.min(1, 0.4 + st.brk);
        if (vf > 9) gripK = 3 * T.grip; // rear locks and steps out
      } else if (!touchMode) {
        st.revT += dt;
        if (st.revT > 0.3 && vf > -6) a -= 9;
      }
    } else st.revT = 0;
    if (st.tp > 0.3) gripK = 12;
    if (Math.abs(st.wRoll) > 0.3) gripK = 2.5;
    if (st.crash > 0) gripK = 4;
    const vf0 = vf;
    vf += a * dt;
    if (keys.brake && vf0 > 0 && vf < 0 && (touchMode || st.revT < 0.3)) vf = 0;
    if (!gasOn && !keys.brake && vf0 * vf < 0) vf = 0;
    vl *= Math.exp(-gripK * dt);
    // yaw: bicycle model plus a small pivot at a standstill
    const sp = Math.abs(vf);
    const delta = steer * 0.5 / (1 + sp / 6);
    let w = vf * Math.tan(delta) / 1.4;
    w += steer * 1.3 * (1 - clamp(sp / 3.5, 0, 1));
    if (st.tp > 0.3) w *= 0.55;
    w = clamp(w, -2.7, 2.7);
    st.yawV += (w - st.yawV) * Math.min(1, dt * 10);
    st.ax = lerp(st.ax, (vf - st.prevVf) / Math.max(dt, 1e-3), Math.min(1, dt * 8));
    st.prevVf = vf;
    // rebuild the velocity in the OLD heading frame, then turn: the lag between heading and travel is the drift
    st.vx = vf * hs + vl * hc; st.vz = -vf * hc + vl * hs;
    st.heading += st.yawV * dt;
    fwd.set(Math.sin(st.heading), 0, -Math.cos(st.heading));
  } else {
    st.heading += steer * 0.5 * dt;
    const k = Math.exp(-0.05 * dt); st.vx *= k; st.vz *= k;
    st.ax = 0; st.prevVf = vf;
  }
  st.vl = vl;
  st.x += st.vx * dt; st.z += st.vz * dt;

  // tyre wall
  if (st.x < X0) { st.x = X0; st.vx = Math.abs(st.vx) * 0.3; st.shake = Math.max(st.shake, 0.15); }
  if (st.x > X1) { st.x = X1; st.vx = -Math.abs(st.vx) * 0.3; st.shake = Math.max(st.shake, 0.15); }
  if (st.z < Z_N) { st.z = Z_N; st.vz = Math.abs(st.vz) * 0.3; st.shake = Math.max(st.shake, 0.15); }
  if (st.z > Z_S) { st.z = Z_S; st.vz = -Math.abs(st.vz) * 0.3; st.shake = Math.max(st.shake, 0.15); }
  collideStatic();
  if (crash.on) return;

  const gy = groundY(st.x, st.z);
  if (st.grounded) {
    const vyG = (gy - st.y) / Math.max(dt, 1e-4);
    if (gy < st.y - 0.03 && st.lastVyG > 1) {
      st.grounded = false; st.vy = st.lastVyG; st.airT = 0; st.whipPeak = 0; st.whipHold = 0;
      emitDust(st.x, st.y, st.z, 0, 0, 6, 1.5);
    } else if (gy < st.y - 0.8) {
      st.grounded = false; st.vy = 0; st.airT = 0; st.whipPeak = 0; st.whipHold = 0;
    } else st.y = gy;
    st.lastVyG = lerp(st.lastVyG, vyG, 0.5);
  }
  if (!st.grounded) {
    st.vy -= GRAVITY * dt; st.y += st.vy * dt; st.airT += dt;
    if (st.y <= gy) { const imp = -st.vy; st.y = gy; st.grounded = true; st.vy = 0; st.lastVyG = 0; onLand(imp); if (crash.on) return; }
  }

  /* whip springs */
  const whipping = keys.whip && !st.grounded;
  if (whipping && st.whipTarget !== 1) { st.whipTarget = 1; if (steer < 0) st.whipDir = 1; else if (steer > 0) st.whipDir = -1; }
  if (!whipping) st.whipTarget = 0;
  const tr = whipping ? WHIP_ROLL * st.whipDir : 0; const ty = whipping ? -WHIP_YAW * st.whipDir : 0;
  const stiff = st.grounded ? 120 : 70; const damp = st.grounded ? 14 : 8.5;
  for (let i = 0; i < 2; i++) {
    [st.wRoll, st.wRollV] = spring(st.wRoll, st.wRollV, tr, stiff, damp, dt / 2);
    [st.wYaw, st.wYawV] = spring(st.wYaw, st.wYawV, ty, stiff, damp, dt / 2);
  }
  const wf = Math.abs(st.wRoll) / WHIP_ROLL;
  if (!st.grounded) { st.whipPeak = Math.max(st.whipPeak, wf); if (wf > 0.7) st.whipHold += dt; }

  /* wheelie / stoppie balance */
  if (st.grounded) {
    const spd = Math.abs(vf);
    if (spd > 2 && ((trickEdge && keys.brake) || (brakeEdge && keys.trick))) {
      if (spd > 8 && st.tp < 0.15) st.tpV -= 2.8;
    } else if (trickEdge && st.thr > 0.3 && vf > 2 && st.tp < 0.3) st.tpV += 2.7 * T.lift;
    const accW = (tp) => {
      let a = 0;
      if (vf > 1.2) a += 6 * T.lift * st.thr * clamp(1.1 - vf / 40, 0.45, 1);
      a -= 7.5 * Math.sin(1.0 - tp);
      if (tp > 0.1 && keys.brake) a -= 4.6;
      if (touchMode && keys.trick && tp > 0.2) a += clamp(10 * (0.8 - tp), -4, 4) + 7.5 * Math.sin(1.0 - tp) * 0.8;
      return a;
    };
    const accS = (tp) => {
      let a = 7.5 * Math.sin(tp + 0.7);
      if (keys.brake && vf > 3) a -= 2.5 * clamp(vf / 20, 0.2, 1.2) * st.brk;
      return a;
    };
    let reg = 0; let acc = 0;
    if (st.tp > 0 || st.tpV > 0) { reg = 1; acc = accW(st.tp); }
    else if (st.tp < 0 || st.tpV < 0) { reg = -1; acc = accS(st.tp); }
    else { const a1 = accW(0); const a2 = accS(0); if (a1 > 0) { reg = 1; acc = a1; } else if (a2 < 0) { reg = -1; acc = a2; } }
    acc -= 1.5 * st.tpV;
    st.tpV += acc * dt; st.tp += st.tpV * dt;
    if (reg === 1 && st.tp < 0) { st.tp = 0; st.tpV = 0; }
    if (reg === -1 && st.tp > 0) { st.tp = 0; st.tpV = 0; }
    if (st.tp > 1.38) { startCrash('loop', { bvx: st.vx * 0.85, bvz: st.vz * 0.85, bvy: 1.5, bw: [-2, rr(-1, 1), rr(-2, 2)], rv: [st.vx * 0.3 - fwd.x * 3, 3, st.vz * 0.3 - fwd.z * 3] }); return; }
    if (st.tp < -1.15) { startCrash('endo', { bvx: st.vx * 0.45, bvz: st.vz * 0.45, bvy: 2, bw: [4, rr(-1, 1), rr(-2, 2)], rv: [st.vx * 1.15, 5, st.vz * 1.15] }); return; }
    if (st.tp > 0.45) { st.wheelieT += dt; st.bestWheelie = Math.max(st.bestWheelie, st.wheelieT); } else st.wheelieT = 0;
    if (st.tp < -0.3) { st.stoppieT += dt; st.bestStoppie = Math.max(st.bestStoppie, st.stoppieT); } else st.stoppieT = 0;
  } else {
    const tpT = keys.trick ? 0.75 : keys.brake ? -0.75 : 0;
    [st.tp, st.tpV] = spring(st.tp, st.tpV, tpT, 38, 8, dt);
    st.wheelieT = 0; st.stoppieT = 0;
  }

  updateSus(dt);

  /* dust + skid marks */
  const spdAbs = Math.hypot(st.vx, st.vz);
  const slip = Math.abs(vl) > 2.4 || (keys.brake && vf > 9) || (st.thr > 0.85 && vf > 0.5 && vf < 7 && st.tp < 0.3);
  if (st.grounded && spdAbs > 3 && Math.random() < 0.7) emitDust(st.x - fwd.x, st.y, st.z - fwd.z, -fwd.x * 2, -fwd.z * 2, 1, 0.8);
  if (st.grounded && slip && spdAbs > 1) {
    st.skidAcc += spdAbs * dt;
    if (st.skidAcc > 0.5) { st.skidAcc = 0; addSkid(st.x - fwd.x * 0.98, st.z - fwd.z * 0.98, Math.atan2(st.vx, -st.vz)); emitDust(st.x - fwd.x, st.y, st.z - fwd.z, 0, 0, 2, 1.2); }
  }
  st.speed = vf;

  /* pit ring */
  const pd = Math.hypot(st.x - PIT.x, st.z - PIT.z);
  const stopped = Math.abs(vf) < 1.8; const inRing = pd < PIT.r && st.grounded;
  if (inRing && stopped && st.hotT <= 0) PIT.dwell += dt; else PIT.dwell = Math.max(0, PIT.dwell - dt * 2);
  PIT.show = st.grounded && pd < PIT.r + 7 && st.hotT <= 0; PIT.inRing = inRing;
  if (PIT.dwell >= 2) { PIT.dwell = 0; st.hotT = 14; st.hotLabel = 'PIT STOP DONE'; }

  collidePropsDone = true;
}
let collidePropsDone = false;

function applyPose(dt) {
  const T = TUNES[tuneI];
  const steer = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  bike.root.position.set(st.x, st.y, st.z);
  bike.root.rotation.y = -st.heading;
  const vf = st.speed;
  const slopeT = st.grounded ? Math.atan2(clamp(st.lastVyG, -20, 20), Math.max(8, Math.abs(vf))) : clamp(st.vy * 0.03, -0.55, 0.55);
  st.slope = lerp(st.slope, slopeT, Math.min(1, dt * 8));
  const susPitch = (st.cr - st.cf) / WB;
  bike.slope.rotation.x = st.slope + susPitch;
  {
    const th = st.tp;
    const py = st.grounded ? 0.47 : 0.95; const pz = st.grounded ? (th >= 0 ? 0.98 : -0.98) : 0.1;
    const s = Math.sin(th); const c = Math.cos(th);
    bike.trick.rotation.set(th, 0, 0);
    bike.trick.position.set(0, py - (py * c - pz * s) - (st.cf + st.cr) * 0.5, pz - (py * s + pz * c));
  }
  const carveT = -steer * 0.38 * clamp(Math.abs(vf) / MAX_SPEED, 0, 1) * (st.grounded ? 1 : 0.3) - clamp(st.vl * 0.03, -0.3, 0.3) * (st.grounded ? 1 : 0);
  st.carve = lerp(st.carve, carveT, Math.min(1, dt * 7));
  bike.lean.rotation.set(0, st.wYaw, st.carve + st.wRoll, 'XYZ');
  bike.steerG.rotation.y = lerp(bike.steerG.rotation.y, -steer * 0.35 * (st.grounded ? 1 : 0.4), Math.min(1, dt * 10));
  bike.rider.rotation.set(st.tp * 0.3 - (st.cf + st.cr) * 0.4, 0, -(st.wRoll + st.carve * 0.4) * 0.42, 'XYZ');
  bike.forkLower.position.set(bike.fl0.x, bike.fl0.y + 0.945 * st.cf, bike.fl0.z + 0.285 * st.cf);
  bike.swing.rotation.x = -st.cr / 0.72;
  const spin = vf * dt / bike.WR;
  bike.front.rotation.x -= spin * (st.tp > 0.3 ? 0.2 : 1);
  bike.rear.rotation.x -= (st.thr > 0.5 && st.grounded && Math.abs(vf) < 7 ? 14 * dt : spin);
}

function updateCamera(dt) {
  const focusX = crash.on ? camFocus.x : st.x; const focusZ = crash.on ? camFocus.z : st.z;
  const focusY = crash.on ? camFocus.y : st.y;
  const speedAbs = Math.hypot(st.vx, st.vz);
  const camBack = (camera.aspect < 1 ? 12 : 9.5) + speedAbs * 0.05;
  const desired = tmpV.set(focusX - fwd.x * camBack, 4.4 + focusY * 0.55 + (crash.on ? 1.5 : 0), focusZ - fwd.z * camBack);
  camera.position.lerp(desired, 1 - Math.exp(-dt * (crash.on ? 2.2 : 4.5)));
  if (st.shake > 0) {
    camera.position.x += (Math.random() - 0.5) * st.shake;
    camera.position.y += (Math.random() - 0.5) * st.shake;
    st.shake = Math.max(0, st.shake - dt * 1.5);
  }
  tgtV.set(focusX + (crash.on ? 0 : fwd.x * 8), 1.8 + focusY * 0.7, focusZ + (crash.on ? 0 : fwd.z * 8));
  camLook.lerp(tgtV, 1 - Math.exp(-dt * 6));
  camera.lookAt(camLook);
  const fovT = baseFov + (speedAbs / MAX_SPEED) * 12 + (st.grounded ? 0 : 3);
  camera.fov = lerp(camera.fov, fovT, Math.min(1, dt * 3));
  camera.updateProjectionMatrix();
}

function step(dt) {
  if (st.hotT > 0) st.hotT -= dt;
  if (st.liveT > 0) st.liveT -= dt;
  if (st.crash > 0) st.crash -= dt;
  if (st.inv > 0) st.inv -= dt;
  if (crash.on) { stepCrash(dt); } else {
    stepRide(dt);
    if (!crash.on) applyPose(dt);
  }
  updateMines(dt, clockT);
  stepProps(dt);
  updateFX(dt);
  updateCamera(dt);
}
let clockT = 0;


/* ------------------------------------------------------------------ */
/* Stations, directory board, beacons                                  */
/* ------------------------------------------------------------------ */
const NAMES = {
  START: 'START GATE', CYCLEWORX: 'CYCLEWORX', PIT: 'PIT STOP', RIDER: 'THE RIDER', RESULTS: 'RESULTS', WHIP: 'WHIP RAMP',
  GOALS: '2026 GOALS', SPONSORS: 'DRAGON ENERGY', FINISH: 'FINISH LINE',
};
const BEACON = { CYCLEWORX: 0xff6a00, PIT: 0xe1306c, WHIP: 0xff2e2e, SPONSORS: 0xc8ff00, RESULTS: 0xffc400, RIDER: 0xff2e2e, GOALS: 0x38b6ff, FINISH: 0xffffff };
const STATIONS = [{ id: 'start', label: 'START', name: 'START GATE', x: 0, z: 30 }];
ROUTE_ORDER.forEach((id) => {
  const b = boardsById0[id];
  if (!b.map) return;
  const p = boardFrontPt(b, id === 'pit' ? 17 : 14);
  STATIONS.push({ id, label: b.map, name: NAMES[b.map] || b.map, x: p.x, z: p.z, bx: b.x, bz: b.z });
});
BOARDS.push({
  id: 'dir', x: -44, z: 6, ry: 0.55, w: 24, h: 19, kicker: 'THE MAP', title: 'WHERE TO?', sub: 'PRESS M OR TAP MAP FOR THE FULL MAP', accent: '#c8ff00',
  lines: STATIONS.slice(1).map((s) => [s.name, bearingName(s.x - SPAWN.x, s.z - SPAWN.z) + ' ' + Math.round(Math.hypot(s.x - SPAWN.x, s.z - SPAWN.z)) + 'M']),
});
function buildBeacons() {
  STATIONS.forEach((s) => {
    if (s.id === 'start') return;
    const col = BEACON[s.label] || 0xc8ff00;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 90, 14, 1, true), new THREE.MeshBasicMaterial({
      color: col, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    }));
    beam.position.set(s.bx, 45, s.bz);
    scene.add(beam);
  });
  FIELDS.forEach((f) => {
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 40, 14, 1, true), new THREE.MeshBasicMaterial({
      color: 0xff2a1a, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    }));
    beam.position.set(f.x, 20, f.z); scene.add(beam);
  });
}
/* ------------------------------------------------------------------ */
/* Signage, pit ring, guide dashes, solid posts                        */
/* ------------------------------------------------------------------ */
const POSTS = { push(o) { COLS.push({ k: 'post', h: 8, ...o }); } };
const boardsById = Object.fromEntries(BOARDS.map((b) => [b.id, b]));
const PIT = { x: 0, z: 0, r: 4.2, dwell: 0 };
let pitRing; let pitBeam;

function boardFront(b, d) { return { x: b.x + Math.sin(b.ry) * d, z: b.z + Math.cos(b.ry) * d }; }

function buildSigns() {
  BOARDS.forEach((b) => {
    const tex = boardTexture(b, ANISO);
    const g = makeBoard(tex, b.w, b.h, std);
    g.position.set(b.x, 0, b.z);
    g.rotation.y = b.ry;
    scene.add(g);
    [-1, 1].forEach((s) => {
      const lx = (b.w / 2 - 0.9) * s;
      POSTS.push({ x: b.x + lx * Math.cos(b.ry), z: b.z - lx * Math.sin(b.ry), r: 1.3 });
    });
  });

  // start gate
  const gate = makeArch(boardTexture({
    kicker: 'ADRIANO CATALANO #746', title: 'THE ITALIAN STALLION', sub: 'RIDE ANYWHERE. READ EVERYTHING.', accent: '#ff2e2e', w: 27, h: 10.26,
  }, ANISO), 30, std);
  gate.position.set(0, 0, 22);
  scene.add(gate);
  [-1, 1].forEach((s) => POSTS.push({ x: s * 15, z: 22, r: 1.2 }));

  // finish gate behind the contact board
  const fin = makeArch(boardTexture({
    kicker: 'FINISH LINE', title: 'LET\'S BUILD', title2: 'SOMETHING WILD', sub: 'INSTAGRAM · WHATSAPP', accent: '#c8ff00', w: 27, h: 10.26,
  }, ANISO), 30, std);
  fin.position.set(0, 0, -480);
  scene.add(fin);
  [-1, 1].forEach((s) => POSTS.push({ x: s * 15, z: -480, r: 1.2 }));

  bigNumber(0, 120, Math.PI);
  bigNumber(0, -600, 0);

  // chequered strips
  const cc = document.createElement('canvas');
  cc.width = 256; cc.height = 32;
  const cg = cc.getContext('2d');
  for (let x = 0; x < 32; x++) for (let y = 0; y < 4; y++) { cg.fillStyle = (x + y) % 2 ? '#fff' : '#000'; cg.fillRect(x * 8, y * 8, 8, 8); }
  const ct = new THREE.CanvasTexture(cc);
  ct.magFilter = THREE.NearestFilter;
  [22, -480].forEach((z) => {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(30, 3), new THREE.MeshBasicMaterial({ map: ct }));
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(0, 0.04, z);
    scene.add(strip);
  });

  // pit ring in front of the pit board
  const pb = boardsById.pit;
  const pf = boardFront(pb, 17);
  PIT.x = pf.x; PIT.z = pf.z;
  const grp = new THREE.Group();
  grp.position.set(PIT.x, 0, PIT.z);
  pitRing = new THREE.Mesh(new THREE.RingGeometry(PIT.r - 0.8, PIT.r, 48), new THREE.MeshBasicMaterial({ color: 0xe1306c, side: THREE.DoubleSide, transparent: true, opacity: 0.95 }));
  pitRing.rotation.x = -Math.PI / 2; pitRing.position.y = 0.06;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(PIT.r - 0.8, 48), new THREE.MeshBasicMaterial({ color: 0xfcaf45, side: THREE.DoubleSide, transparent: true, opacity: 0.22 }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.05;
  pitBeam = new THREE.Mesh(new THREE.CylinderGeometry(PIT.r, PIT.r, 18, 32, 1, true), new THREE.MeshBasicMaterial({
    color: 0xe1306c, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  pitBeam.position.y = 9;
  grp.add(pitRing, disc, pitBeam);
  scene.add(grp);

  // lime guide dashes between the stations
  const route = ROUTE;
  const dashes = [];
  for (let i = 0; i < route.length - 1; i++) {
    const a = route[i]; const b = route[i + 1];
    const L = Math.hypot(b.x - a.x, b.z - a.z);
    const n = Math.floor(L / 8);
    const ang = Math.atan2(-(b.z - a.z), b.x - a.x);
    for (let k = 1; k < n; k++) dashes.push([lerp(a.x, b.x, k / n), lerp(a.z, b.z, k / n), ang]);
  }
  const dgeo = new THREE.PlaneGeometry(2.6, 0.45);
  dgeo.rotateX(-Math.PI / 2);
  const dm = new THREE.InstancedMesh(dgeo, new THREE.MeshBasicMaterial({ color: LIME, transparent: true, opacity: 0.35 }), dashes.length);
  const mm = new THREE.Matrix4(); const qq = new THREE.Quaternion(); const vv = new THREE.Vector3(); const one = new THREE.Vector3(1, 1, 1);
  dashes.forEach(([x, z, ang], i) => {
    qq.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ang);
    vv.set(x, 0.05, z);
    mm.compose(vv, qq, one);
    dm.setMatrixAt(i, mm);
  });
  scene.add(dm);
}

/* ------------------------------------------------------------------ */
/* Input                                                               */
/* ------------------------------------------------------------------ */
let touchMode = isTouch;
let mapOpen = false;
const keys = { gas: false, brake: false, left: false, right: false, whip: false, trick: false };
const KEYMAP = {
  KeyW: 'gas', ArrowUp: 'gas', KeyS: 'brake', ArrowDown: 'brake',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', Space: 'whip',
  ShiftLeft: 'trick', ShiftRight: 'trick', KeyE: 'trick',
};
const hintEl = $('#hint');
function cycleTune() { tuneI = (tuneI + 1) % TUNES.length; $('#tuneBtn').textContent = 'TUNE: ' + TUNES[tuneI].n; st.liveMsg = 'CYCLEWORX TUNE: ' + TUNES[tuneI].n; st.liveT = 1.6; }
window.addEventListener('keydown', (e) => {
  if (classicOpen) return;
  audioInit();
  if (e.code === 'KeyM') { toggleMap(); e.preventDefault(); return; }
  if (e.code === 'Escape' && mapOpen) { toggleMap(false); return; }
  if (mapOpen) return;
  if (e.code === 'KeyR') { respawn(); return; }
  if (e.code === 'KeyT') { if (!e.repeat) cycleTune(); return; }
  const k = KEYMAP[e.code];
  if (!k) return;
  keys[k] = true;
  e.preventDefault();
  hintEl.classList.add('fade');
  if (touchMode) { touchMode = false; autoGas = false; document.body.classList.remove('touch'); $('#touch').classList.add('hidden'); }
});
window.addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) { keys[k] = false; e.preventDefault(); } });
window.addEventListener('blur', () => Object.keys(keys).forEach((k) => { keys[k] = false; }));
$('#resetBtn').addEventListener('click', () => respawn());
$('#tuneBtn').addEventListener('click', () => cycleTune());
$('#mapBtn').addEventListener('click', () => toggleMap());
$('#mapClose').addEventListener('click', () => toggleMap(false));
$('#muteBtn').addEventListener('click', () => { audio.muted = !audio.muted; $('#muteBtn').textContent = audio.muted ? 'SOUND OFF' : 'SOUND'; if (audio.master) audio.master.gain.value = audio.muted ? 0 : 0.8; audioInit(); });
$('#mini').style.pointerEvents = 'auto';
$('#mini').addEventListener('click', () => toggleMap());

if (isTouch) {
  $('#touch').classList.remove('hidden');
  window.addEventListener('pointerdown', (e) => {
    audioInit();
    if (touchMode && e.pointerType !== 'mouse') { autoGas = true; hintEl.classList.add('fade'); }
  });
  document.querySelectorAll('#touch button').forEach((b) => {
    b.addEventListener('contextmenu', (e) => e.preventDefault());
    const k = b.dataset.k;
    const on = (e) => { e.preventDefault(); keys[k] = true; b.classList.add('on'); hintEl.classList.add('fade'); };
    const off = (e) => { e.preventDefault(); keys[k] = false; b.classList.remove('on'); };
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off);
    b.addEventListener('pointerleave', off);
  });
} else {
  window.addEventListener('pointerdown', () => audioInit());
}

/* ------------------------------------------------------------------ */
/* Sound (WebAudio, all synthesised)                                   */
/* ------------------------------------------------------------------ */
const audio = { ctx: null, master: null, muted: false, noise: null, osc: null };
function audioInit() {
  if (audio.ctx) { if (audio.ctx.state === 'suspended') audio.ctx.resume(); return; }
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = new AC(); audio.ctx = c;
    audio.master = c.createGain(); audio.master.gain.value = audio.muted ? 0 : 0.8; audio.master.connect(c.destination);
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    audio.noise = nb;
    const o1 = c.createOscillator(); o1.type = 'sawtooth'; const o2 = c.createOscillator(); o2.type = 'square';
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; f.Q.value = 2;
    const g = c.createGain(); g.gain.value = 0;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(audio.master); o1.start(); o2.start();
    audio.eng = { o1, o2, f, g };
  } catch (e) { audio.ctx = null; }
}
function noiseBurst(dur, f0, f1, vol, type = 'lowpass', delay = 0) {
  const c = audio.ctx; if (!c || audio.muted) return;
  const s = c.createBufferSource(); s.buffer = audio.noise; s.loop = true;
  const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, c.currentTime + delay); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), c.currentTime + delay + dur);
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, c.currentTime + delay); g.gain.exponentialRampToValueAtTime(vol, c.currentTime + delay + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + delay + dur);
  s.connect(f); f.connect(g); g.connect(audio.master); s.start(c.currentTime + delay); s.stop(c.currentTime + delay + dur + 0.05);
}
function sfxBoom(dist) {
  const c = audio.ctx; if (!c || audio.muted) return;
  const v = clamp(1.1 / (1 + dist * 0.035), 0.15, 1.1);
  noiseBurst(1.6, 1400, 60, v, 'lowpass');
  noiseBurst(0.5, 3000, 300, v * 0.5, 'lowpass');
  const o = c.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(90, c.currentTime); o.frequency.exponentialRampToValueAtTime(26, c.currentTime + 0.9);
  const g = c.createGain(); g.gain.setValueAtTime(v * 1.1, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 1.0);
  o.connect(g); g.connect(audio.master); o.start(); o.stop(c.currentTime + 1.1);
}
function sfxThud(v = 0.5) { noiseBurst(0.18, 700, 120, 0.5 * v, 'lowpass'); }
function sfxCrash(v = 0.7) { noiseBurst(0.3, 900, 100, 0.7 * v, 'lowpass'); noiseBurst(0.9, 2400, 400, 0.25 * v, 'bandpass', 0.05); }
function updateEngine(dt) {
  const e = audio.eng; if (!e || !audio.ctx) return;
  const c = audio.ctx;
  const sp = Math.abs(st.speed);
  let rpm = 0.2 + 0.8 * ((sp % 9) / 9);
  rpm = Math.max(rpm, st.thr * (st.grounded ? 0.5 : 0.95));
  if (!st.grounded) rpm = Math.max(0.25, st.thr);
  const on = !crash.on && !mapOpen;
  const fr = 36 + rpm * 100;
  e.o1.frequency.setTargetAtTime(fr, c.currentTime, 0.05);
  e.o2.frequency.setTargetAtTime(fr * 0.5, c.currentTime, 0.05);
  e.f.frequency.setTargetAtTime(380 + rpm * 1100 + st.thr * 500, c.currentTime, 0.06);
  e.g.gain.setTargetAtTime(on ? 0.035 + 0.05 * (0.4 + st.thr * 0.6) : 0, c.currentTime, 0.08);
}

/* ------------------------------------------------------------------ */
/* HUD, map, waypoint                                                  */
/* ------------------------------------------------------------------ */
const speedB = $('#speed b');
const airEl = $('#airStat'); const whipEl = $('#whipStat'); const wheelEl = $('#wheelStat'); const liveEl = $('#live'); const mineEl = $('#mineStat');
const balEl = $('#bal'); const balN = balEl.querySelector('.needle'); const balZ = balEl.querySelector('.zone');
const wpEl = $('#wp'); const wpArrow = wpEl.querySelector('svg');
const cache = {};
function setText(el, key, text) { if (cache[key] !== text) { cache[key] = text; el.textContent = text; } }
const pill = $('#pill');
let pillKey = ''; let pillBar = null;
function setPill(key, html) {
  if (pillKey === key) return;
  pillKey = key;
  if (!html) { pill.classList.add('hidden'); pill.classList.remove('hot'); pill.innerHTML = ''; pillBar = null; return; }
  pill.classList.remove('hidden');
  pill.classList.toggle('hot', key.startsWith('hot'));
  pill.innerHTML = html;
  pillBar = pill.querySelector('.bar i');
}
const igA = (t) => `<a class="pa ig" href="${IG_URL}" target="_blank" rel="noopener">${t || 'INSTAGRAM ' + IG_HANDLE}</a>`;
const waA = `<a class="pa wa" href="${WA_URL}" target="_blank" rel="noopener">WHATSAPP ${WA_NUMBER}</a>`;
function updatePill() {
  if (st.hotT > 0) { setPill('hot-' + st.hotLabel, `<span class="pt">${esc(st.hotLabel)} · YOU UNLOCKED IT</span>${igA('OPEN INSTAGRAM')}`); return; }
  if (PIT.show) {
    setPill('pit', '<span class="pt">PARK ON THE RING FOR 2 SECONDS</span><span class="bar"><i></i></span>');
    if (pillBar) pillBar.style.width = Math.min(100, (PIT.dwell / 2) * 100) + '%';
    return;
  }
  const c = boardsById.contact;
  if (Math.hypot(st.x - c.x, st.z - c.z) < 36) { setPill('contact', igA() + waA); return; }
  const pb = boardsById.pit;
  if (Math.hypot(st.x - pb.x, st.z - pb.z) < 34) { setPill('pitnear', igA()); return; }
  const cw = boardsById.cycleworx;
  if (Math.hypot(st.x - cw.x, st.z - cw.z) < 40) { setPill('tune' + tuneI + touchMode, `<span class="pt">CYCLEWORX BAY · ${touchMode ? 'TAP TUNE' : 'PRESS T'} TO RETUNE · ${TUNES[tuneI].n}</span>`); return; }
  setPill('', '');
}

function setWaypoint(s) {
  wpTarget = s;
  wpEl.classList.toggle('hidden', !s);
  document.querySelectorAll('#mapList button').forEach((b) => b.classList.toggle('on', !!s && b.dataset.id === s.id));
  if (s) { $('#wpName').textContent = s.name; st.liveMsg = 'WAYPOINT: ' + s.name; st.liveT = 1.6; }
}
function updateWaypoint() {
  if (!wpTarget) return;
  const dx = wpTarget.x - st.x; const dz = wpTarget.z - st.z; const d = Math.hypot(dx, dz);
  if (d < 14) { setWaypoint(null); st.liveMsg = 'YOU MADE IT'; st.liveT = 1.6; return; }
  const rel = Math.atan2(dx, -dz) - st.heading;
  wpArrow.style.transform = `rotate(${rel}rad)`;
  setText($('#wpDist'), 'wpd', Math.round(d) + ' M ' + bearingName(dx, dz));
}

const mini = $('#mini'); const mg = mini.getContext('2d');
function drawMap(cv, g, big) {
  const w = cv.width; const h = cv.height;
  const mx = (x) => ((x - X0) / WORLD_W) * w; const my = (z) => ((z - Z_N) / WORLD_H) * h;
  const sc = w / WORLD_W;
  g.clearRect(0, 0, w, h);
  g.fillStyle = big ? '#17120c' : 'rgba(10,10,14,0.78)'; g.fillRect(0, 0, w, h);
  if (big) {
    g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 1;
    for (let x = Math.ceil(X0 / 50) * 50; x < X1; x += 50) { g.beginPath(); g.moveTo(mx(x), 0); g.lineTo(mx(x), h); g.stroke(); }
    for (let z = Math.ceil(Z_N / 50) * 50; z < Z_S; z += 50) { g.beginPath(); g.moveTo(0, my(z)); g.lineTo(w, my(z)); g.stroke(); }
  }
  g.strokeStyle = 'rgba(200,255,0,0.5)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
  // ramps
  WEDGES.forEach((W) => {
    g.strokeStyle = W.h1 > 2 ? 'rgba(255,170,60,0.9)' : 'rgba(150,110,70,0.8)';
    g.lineWidth = Math.max(2, W.w * sc * 0.9);
    g.beginPath(); g.moveTo(mx(W.x), my(W.z)); g.lineTo(mx(W.x + W.s * W.len), my(W.z - W.c * W.len)); g.stroke();
  });
  // minefields
  FIELDS.forEach((f) => {
    g.fillStyle = 'rgba(255,40,30,0.18)'; g.strokeStyle = 'rgba(255,60,40,0.9)'; g.lineWidth = 2; g.setLineDash([6, 5]);
    g.beginPath(); g.arc(mx(f.x), my(f.z), f.r * sc, 0, 7); g.fill(); g.stroke(); g.setLineDash([]);
    g.fillStyle = '#ff5a40'; g.font = `${Math.round(w * (big ? 0.032 : 0.07))}px "Bebas Neue", Impact, sans-serif`; g.textAlign = 'center';
    if (big || mini.clientWidth >= 120) g.fillText(big ? 'MINES' : '!', mx(f.x), my(f.z) + 4);
  });
  // guide dashes
  g.strokeStyle = 'rgba(200,255,0,0.55)'; g.lineWidth = big ? 2.5 : 1.5; g.setLineDash([8, 6]);
  g.beginPath(); ROUTE.forEach((p, i) => { if (i) g.lineTo(mx(p.x), my(p.z)); else g.moveTo(mx(p.x), my(p.z)); }); g.stroke(); g.setLineDash([]);
  // stations
  const fs = Math.round(w * (big ? 0.034 : 0.072)); g.font = `${fs}px "Bebas Neue", Impact, sans-serif`; g.textAlign = 'center';
  const labels = big || mini.clientWidth >= 120;
  STATIONS.forEach((s) => {
    const col = s.label === 'PIT' ? '#e1306c' : s.label === 'CYCLEWORX' ? '#ff6a00' : '#c8ff00';
    const isW = wpTarget && wpTarget.id === s.id;
    g.fillStyle = col; g.beginPath(); g.arc(mx(s.x), my(s.z), w * (big ? 0.012 : 0.022) * (isW ? 1.5 : 1), 0, 7); g.fill();
    if (isW) { g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); }
    if (labels) { g.fillStyle = '#fff'; g.fillText(big ? s.name : s.label, mx(s.x), my(s.z) - w * (big ? 0.02 : 0.035)); }
  });
  if (wpTarget) {
    g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = 2; g.setLineDash([3, 5]);
    g.beginPath(); g.moveTo(mx(st.x), my(st.z)); g.lineTo(mx(wpTarget.x), my(wpTarget.z)); g.stroke(); g.setLineDash([]);
  }
  g.save(); g.translate(mx(st.x), my(st.z)); g.rotate(st.heading);
  const a = w * (big ? 0.022 : 0.04);
  g.fillStyle = '#ff2e2e'; g.strokeStyle = '#fff'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(0, -a * 1.4); g.lineTo(a, a); g.lineTo(-a, a); g.closePath(); g.fill(); g.stroke();
  g.restore();
}
function toggleMap(force) {
  mapOpen = force === undefined ? !mapOpen : force;
  $('#map').classList.toggle('hidden', !mapOpen);
  if (mapOpen) { Object.keys(keys).forEach((k) => { keys[k] = false; }); drawMap($('#mapC'), $('#mapC').getContext('2d'), true); }
}
function buildMapUI() {
  const list = $('#mapList');
  list.innerHTML = STATIONS.map((s) => `<button type="button" data-id="${s.id}">${esc(s.name)}<small>${Math.round(Math.hypot(s.x - SPAWN.x, s.z - SPAWN.z))} M</small></button>`).join('');
  list.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => { setWaypoint(STATIONS.find((s) => s.id === b.dataset.id)); toggleMap(false); }));
  const mc = $('#mapC');
  mc.addEventListener('click', (e) => {
    const r = mc.getBoundingClientRect();
    const cx = (e.clientX - r.left) / r.width * mc.width; const cy = (e.clientY - r.top) / r.height * mc.height;
    let best = null; let bd = 60;
    STATIONS.forEach((s) => { const d = Math.hypot(((s.x - X0) / WORLD_W) * mc.width - cx, ((s.z - Z_N) / WORLD_H) * mc.height - cy); if (d < bd) { bd = d; best = s; } });
    if (best) { setWaypoint(best); toggleMap(false); }
  });
}

function updateHud(frameN) {
  setText(speedB, 'spd', String(Math.round(Math.abs(st.speed) * 3.4)));
  setText(airEl, 'air', `BEST AIR ${st.bestAir.toFixed(1)}s`);
  setText(whipEl, 'whip', `WHIPS ${st.whips}`);
  setText(wheelEl, 'wh', `WHEELIE ${st.bestWheelie.toFixed(1)}s`);
  setText(mineEl, 'mn', `BOOMS ${st.booms} · CRASHES ${st.crashes} · SMASHED ${st.smashed}`);
  let live = '';
  if (st.liveT > 0 && st.liveMsg) live = st.liveMsg;
  else if (crash.on) live = '';
  else if (st.crash > 0) live = 'SKETCHY LANDING';
  else if (!st.grounded && Math.abs(st.wRoll) > 0.4) live = 'WHIP ' + Math.round(Math.min(1, Math.abs(st.wRoll) / WHIP_ROLL) * 100) + '%';
  else if (!st.grounded && st.airT > 0.4) live = 'AIR ' + st.airT.toFixed(1) + 's';
  else if (st.grounded && st.tp > 0.45) live = 'WHEELIE ' + st.wheelieT.toFixed(1) + 's';
  else if (st.grounded && st.tp < -0.3) live = 'STOPPIE ' + st.stoppieT.toFixed(1) + 's';
  else if (st.nearMine < 7.5 && !crash.on) live = 'THAT BEEPING ISN\'T THE ENGINE';
  setText(liveEl, 'live', live);
  // balance meter
  const showBal = !crash.on && st.grounded && (st.tp > 0.12 || st.tp < -0.1);
  balEl.classList.toggle('hidden', !showBal);
  if (showBal) {
    const frac = st.tp >= 0 ? st.tp / 1.4 : -st.tp / 1.15;
    balN.style.left = `calc(${clamp(frac, 0, 1) * 100}% - 2px)`;
    balZ.style.left = '32%'; balZ.style.width = '40%';
    balEl.classList.toggle('bad', frac > 0.8);
    setText(balEl.querySelector('span'), 'balt', st.tp >= 0 ? 'WHEELIE · FEATHER GAS, DAB BRAKE' : 'STOPPIE · EASE OFF THE BRAKE');
  }
  updatePill();
  updateWaypoint();
  if (frameN % 3 === 0) drawMap(mini, mg, false);
}

/* ------------------------------------------------------------------ */
/* Loop                                                                */
/* ------------------------------------------------------------------ */
const clock = new THREE.Clock();
let frameN = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (classicOpen || mapOpen) { updateEngine(dt); return; }
  clockT += dt;
  step(dt);
  updateDust(dt);
  updateHud(frameN++);
  updateEngine(dt);
  if (pitBeam) { pitBeam.material.opacity = 0.14 + 0.06 * Math.sin(clockT * 3); pitRing.scale.setScalar(1 + 0.04 * Math.sin(clockT * 4)); }
  FLAGS.forEach((f, i) => { f.rotation.y += Math.sin(clockT * 3 + i) * 0.004; });
  renderer.render(scene, camera);
}
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  baseFov = camera.aspect < 1 ? 78 : 60;
  camera.updateProjectionMatrix();
});

async function init() {
  try {
    await Promise.race([
      Promise.all([document.fonts.load('80px "Bebas Neue"'), document.fonts.load('20px Inter')]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch (e) { /* fall back to Impact */ }
  try {
    await loadAssets();
    bike = buildBike();
    rag = buildRagdoll();
    const bp = [[0, 0.47, -0.98, 0.47], [0, 0.47, 0.98, 0.47], [0, 1.55, -0.6, 0.12], [0, 1.45, 1.3, 0.1], [0, 1.38, 0.5, 0.1], [-0.45, 1.58, -0.58, 0.08], [0.45, 1.58, -0.58, 0.08], [-0.3, 0.55, 0.28, 0.08], [0.3, 0.55, 0.28, 0.08]];
    crash.bike = new RB(bike.root, bp.map(([x, y, z, r]) => ({ p: new V3(x, y, z).sub(BIKE_COM), r })), 1, 0.55, BIKE_COM);
    crash.rag = rag;
    buildWorld();
    buildSigns();
    buildBeacons();
    buildFX();
    buildMapUI();
  } catch (e) {
    console.error('init failed', e);
    $('#loader').classList.add('done');
    toggleClassic(true);
    return;
  }
  respawn();
  camera.position.set(0, 6, 62);
  camLook.set(0, 1, 30);
  frame();
  setTimeout(() => $('#loader').classList.add('done'), 350);
}
init();

// small hook for testing in the console
window.__ride = {
  st, keys, PIT, WHIP_J, step, cam: camera, bike: () => bike, groundY, COLS, DYN, MINES, FIELDS, STATIONS, TUNES, crash,
  render() { renderer.render(scene, camera); },
  tp(x, z, heading = 0) { st.x = x; st.z = z; st.heading = heading; st.y = groundY(x, z); camera.position.set(x, 5, z + 10); },
  det(i) { detonate(MINES[i]); },
  setWp: setWaypoint,
};
