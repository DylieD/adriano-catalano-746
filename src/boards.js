import * as THREE from 'three';

const FONT = '"Bebas Neue", Impact, "Arial Narrow", sans-serif';

function fit(ctx, text, maxW, px, min = 18) {
  let size = px;
  while (size > min) {
    ctx.font = `${size}px ${FONT}`;
    if (ctx.measureText(text).width <= maxW) break;
    size -= 2;
  }
  ctx.font = `${size}px ${FONT}`;
  return size;
}

// Draws a billboard to a canvas. Text is big on purpose: boards are read from a moving bike.
export function boardTexture(b, aniso = 8) {
  const W = 1024;
  const H = Math.round(W * (b.h / b.w));
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const accent = b.accent || '#ff2e2e';
  const pad = 56;
  g.fillStyle = '#0e0e0f';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,255,255,0.04)';
  g.lineWidth = 26;
  for (let i = -H; i < W + H; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + H, H); g.stroke(); }
  g.fillStyle = accent;
  g.fillRect(0, 0, 18, H);
  g.strokeStyle = accent;
  g.lineWidth = 8;
  g.strokeRect(4, 4, W - 8, H - 8);
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';

  let y = 34;
  if (b.kicker) {
    g.fillStyle = '#c8ff00';
    const k = fit(g, b.kicker, W - pad * 2, 46, 24);
    y += k * 0.9;
    g.fillText(b.kicker, pad, y);
    y += 8;
  }
  const hasLines = !!(b.lines && b.lines.length);
  const titleMax = hasLines ? 120 : (b.title2 ? 170 : 190);
  g.fillStyle = '#ffffff';
  g.shadowColor = accent;
  g.shadowBlur = 22;
  if (!b.logoOnly) {
  const s1 = fit(g, b.title, W - pad * 2, titleMax, 40);
  y += s1 * 0.86;
  g.fillText(b.title, pad, y);
  }
  if (b.title2 && !b.logoOnly) {
    g.fillStyle = accent;
    const s2 = fit(g, b.title2, W - pad * 2, titleMax, 40);
    y += s2 * 0.92;
    g.fillText(b.title2, pad, y);
  }
  g.shadowBlur = 0;

  const bottom = H - (b.sub ? 92 : 36);
  if (hasLines) {
    const n = b.lines.length;
    const top = y + 22;
    const rowH = Math.min(86, (bottom - top) / n);
    const fs = Math.floor(rowH * 0.8);
    const leftW = W * 0.36;
    b.lines.forEach(([l, r], i) => {
      const base = top + rowH * i + rowH * 0.78;
      g.fillStyle = 'rgba(255,255,255,0.07)';
      if (i % 2 === 0) g.fillRect(pad - 14, top + rowH * i, W - pad * 2 + 28, rowH);
      g.fillStyle = '#c8ff00';
      const lf = fit(g, l, leftW - 20, fs, 20);
      g.fillText(l, pad, base);
      g.fillStyle = '#ffffff';
      fit(g, r, W - pad * 2 - leftW, fs, 20);
      g.fillText(r, pad + leftW, base);
      void lf;
    });
  }
  if (b.sub) {
    g.fillStyle = accent === '#c8ff00' ? '#ffffff' : accent;
    fit(g, b.sub, W - pad * 2, 56, 24);
    g.fillText(b.sub, pad, H - 36);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (b.logo) {
    const img = new Image();
    img.onload = () => {
      const ar = img.width / img.height;
      if (b.logoOnly) {
        const top = y + 14; const bot = H - (b.sub ? 100 : 40);
        let lh = bot - top; let lw = lh * ar;
        if (lw > W - pad * 2) { lw = W - pad * 2; lh = lw / ar; }
        g.drawImage(img, (W - lw) / 2, top + (bot - top - lh) / 2, lw, lh);
      } else {
        const lh = Math.min(150, H * 0.24); const lw = lh * ar; const m = 14;
        const x = W - pad - lw - m * 2; const yy = H - 92 - lh - m * 2;
        g.fillStyle = '#ffffff';
        g.fillRect(x, yy, lw + m * 2, lh + m * 2);
        g.drawImage(img, x + m, yy + m, lw, lh);
      }
      t.needsUpdate = true;
    };
    img.src = b.logo;
  }
  return t;
}

// Free-standing double sided billboard on two posts.
export function makeBoard(tex, w, h, std) {
  const g = new THREE.Group();
  const lift = 3.2;
  const postMat = std(0x222222);
  const postH = lift + h + 0.5;
  [-1, 1].forEach((s) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, postH, 0.5), postMat);
    p.position.set((w / 2 - 0.9) * s, postH / 2, 0);
    g.add(p);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 1.6), std(0x333333));
    base.position.set((w / 2 - 0.9) * s, 0.3, 0);
    g.add(base);
  });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, h + 0.6, 0.5), std(0x161616));
  frame.position.set(0, lift + h / 2, 0);
  g.add(frame);
  const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  front.position.set(0, lift + h / 2, 0.27);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  back.position.set(0, lift + h / 2, -0.27);
  back.rotation.y = Math.PI;
  g.add(front, back);
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xfff4d6 });
  for (let i = -1; i <= 1; i++) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(w * 0.18, 0.25, 0.25), lampMat);
    lamp.position.set(i * w * 0.3, lift + h + 0.55, 0.45);
    g.add(lamp);
  }
  return g;
}

// Arch across the track with a banner on both sides.
export function makeArch(tex, width, std) {
  const g = new THREE.Group();
  const mat = std(0x1c1c1c);
  const hgt = 15;
  [-1, 1].forEach((s) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.4, hgt, 1.4), mat);
    p.position.set(s * (width / 2), hgt / 2, 0);
    g.add(p);
  });
  const beam = new THREE.Mesh(new THREE.BoxGeometry(width + 1.4, 1.2, 1.6), mat);
  beam.position.set(0, hgt, 0);
  g.add(beam);
  const bw = width - 3;
  const bh = bw * 0.38;
  const bm = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
  const f = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), bm);
  f.position.set(0, hgt - 0.6 - bh / 2, 0.85);
  const k = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), bm);
  k.position.set(0, hgt - 0.6 - bh / 2, -0.85);
  k.rotation.y = Math.PI;
  g.add(f, k);
  return g;
}
