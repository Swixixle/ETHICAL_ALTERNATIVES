/**
 * Global delegated click → random disintegration effect + short synthetic sound.
 * Uses canvas overlays (no html2canvas); appearance from computed styles + text.
 */

const CELL = 4;
const Z = 9999;

let initialized = false;

function getAudioContextCtor() {
  if (typeof window === 'undefined') return null;
  return window.AudioContext || window.webkitAudioContext || null;
}

function playDisintegrationSound() {
  try {
    const Ctor = getAudioContextCtor();
    if (!Ctor) return;
    const ctx = new Ctor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.connect(gain);
    gain.connect(ctx.destination);
    const base = 180 + Math.random() * 520;
    osc.frequency.setValueAtTime(base, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(base * 0.4, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    /* ignore */
  }
}

/** @param {HTMLElement} el */
function renderElementSnapshot(el) {
  const w = Math.max(1, Math.round(el.offsetWidth));
  const h = Math.max(1, Math.round(el.offsetHeight));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { canvas, w, h };
  const cs = getComputedStyle(el);
  const bg = cs.backgroundColor || 'rgba(60,60,60,0.9)';
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  const bw = parseFloat(cs.borderTopWidth) || 0;
  if (bw > 0) {
    ctx.strokeStyle = cs.borderColor || '#888';
    ctx.lineWidth = bw;
    ctx.strokeRect(bw / 2, bw / 2, w - bw, h - bw);
  }
  const text = (el.textContent || '').trim();
  if (text) {
    ctx.fillStyle = cs.color || '#fff';
    const fontSize = cs.fontSize || '14px';
    const fontFamily = cs.fontFamily || 'sans-serif';
    const fontWeight = cs.fontWeight || '400';
    ctx.font = `${fontWeight} ${fontSize} ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lines = text.split(/\n/).slice(0, 6);
    const lh = Math.min(h / (lines.length + 1), parseFloat(fontSize) * 1.2 || 16);
    const startY = h / 2 - ((lines.length - 1) * lh) / 2;
    lines.forEach((line, i) => {
      ctx.fillText(line, w / 2, startY + i * lh);
    });
  }
  return { canvas, w, h };
}

/**
 * @param {HTMLCanvasElement} source
 * @param {number} w
 * @param {number} h
 */
function buildParticlesFromCanvas(source, w, h) {
  const ctx = source.getContext('2d');
  if (!ctx) return [];
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  const particles = [];
  for (let y = 0; y < h; y += CELL) {
    for (let x = 0; x < w; x += CELL) {
      const px = Math.min(w - 1, x + Math.floor(CELL / 2));
      const py = Math.min(h - 1, y + Math.floor(CELL / 2));
      const i = (py * w + px) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3] / 255;
      particles.push({
        x: x + CELL / 2,
        y: y + CELL / 2,
        vx: 0,
        vy: 0,
        color: `rgba(${r},${g},${b},${a})`,
        size: CELL,
      });
    }
  }
  return particles;
}

/** @param {HTMLElement} el */
function createOverlay(el) {
  const rect = el.getBoundingClientRect();
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const overlay = document.createElement('canvas');
  overlay.setAttribute('data-disintegration-overlay', '');
  overlay.style.cssText = [
    'position:fixed',
    `left:${rect.left}px`,
    `top:${rect.top}px`,
    `width:${rect.width}px`,
    `height:${rect.height}px`,
    `z-index:${Z}`,
    'pointer-events:none',
  ].join(';');
  const w = Math.max(1, Math.round(el.offsetWidth));
  const h = Math.max(1, Math.round(el.offsetHeight));
  overlay.width = w * dpr;
  overlay.height = h * dpr;
  const ctx = overlay.getContext('2d');
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  document.body.appendChild(overlay);
  return { overlay, ctx, rect, w, h, dpr };
}

/** @param {HTMLElement} el */
function hideSource(el) {
  const prev = {
    opacity: el.style.opacity,
    visibility: el.style.visibility,
    pointerEvents: el.style.pointerEvents,
  };
  el.style.opacity = '0';
  el.style.visibility = 'hidden';
  el.style.pointerEvents = 'none';
  return () => {
    el.style.opacity = prev.opacity;
    el.style.visibility = prev.visibility;
    el.style.pointerEvents = prev.pointerEvents;
  };
}

/**
 * @param {ReturnType<typeof createOverlay>} pack
 * @param {ReturnType<typeof renderElementSnapshot>} snap
 * @param {() => void} restoreEl
 */
function runGravity(pack, snap, restoreEl) {
  const { ctx, w, h, overlay } = pack;
  if (!ctx) return;
  const particles = buildParticlesFromCanvas(snap.canvas, w, h);
  const g = 0.35;
  let frame = 0;
  function tick() {
    frame++;
    ctx.clearRect(0, 0, w, h);
    let alive = false;
    for (const p of particles) {
      p.vy += g;
      p.y += p.vy;
      p.x += p.vx;
      if (p.y < h + 80) alive = true;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    if (alive && frame < 180) requestAnimationFrame(tick);
    else {
      overlay.remove();
      restoreEl();
    }
  }
  requestAnimationFrame(tick);
}

function runExplode(pack, snap, restoreEl) {
  const { ctx, w, h, overlay } = pack;
  if (!ctx) return;
  const particles = buildParticlesFromCanvas(snap.canvas, w, h);
  const cx = w / 2;
  const cy = h / 2;
  for (const p of particles) {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    const speed = 3 + Math.random() * 4;
    p.vx = (dx / len) * speed;
    p.vy = (dy / len) * speed;
  }
  let frame = 0;
  function tick() {
    frame++;
    ctx.clearRect(0, 0, w, h);
    let alive = false;
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.99;
      p.vy *= 0.99;
      if (p.x > -40 && p.x < w + 40 && p.y > -40 && p.y < h + 40) alive = true;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    if (alive && frame < 120) requestAnimationFrame(tick);
    else {
      overlay.remove();
      restoreEl();
    }
  }
  requestAnimationFrame(tick);
}

function runVortex(pack, snap, restoreEl) {
  const { ctx, w, h, overlay } = pack;
  if (!ctx) return;
  const particles = buildParticlesFromCanvas(snap.canvas, w, h);
  const cx = w / 2;
  const cy = h / 2;
  let frame = 0;
  function tick() {
    frame++;
    ctx.clearRect(0, 0, w, h);
    let alive = false;
    for (const p of particles) {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > 2) alive = true;
      const ang = Math.atan2(dy, dx) + 0.18;
      const pull = 0.12;
      p.x += Math.cos(ang) * (-pull * dist * 0.08) + Math.cos(ang + Math.PI / 2) * 2;
      p.y += Math.sin(ang) * (-pull * dist * 0.08) + Math.sin(ang + Math.PI / 2) * 2;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    if (alive && frame < 150) requestAnimationFrame(tick);
    else {
      overlay.remove();
      restoreEl();
    }
  }
  requestAnimationFrame(tick);
}

function runFloat(pack, snap, restoreEl) {
  const { ctx, w, h, overlay } = pack;
  if (!ctx) return;
  const particles = buildParticlesFromCanvas(snap.canvas, w, h);
  for (const p of particles) {
    p.vy = -0.6 - Math.random() * 1.2;
    p.vx = (Math.random() - 0.5) * 0.8;
  }
  let frame = 0;
  function tick() {
    frame++;
    ctx.clearRect(0, 0, w, h);
    let alive = false;
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy -= 0.02;
      if (p.y > -40) alive = true;
      ctx.globalAlpha = Math.max(0, 1 + p.y / (h + 60));
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.globalAlpha = 1;
    }
    if (alive && frame < 160) requestAnimationFrame(tick);
    else {
      overlay.remove();
      restoreEl();
    }
  }
  requestAnimationFrame(tick);
}

function runShatter(pack, snap, restoreEl) {
  const { ctx, w, h, overlay } = pack;
  if (!ctx) return;
  const source = snap.canvas.getContext('2d');
  if (!source) return;
  const cols = 4;
  const rows = 4;
  const chunkW = w / cols;
  const chunkH = h / rows;
  const chunks = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const sx = col * chunkW;
      const sy = row * chunkH;
      const c = document.createElement('canvas');
      c.width = chunkW;
      c.height = chunkH;
      const cctx = c.getContext('2d');
      if (!cctx) continue;
      cctx.drawImage(snap.canvas, sx, sy, chunkW, chunkH, 0, 0, chunkW, chunkH);
      const cx = sx + chunkW / 2;
      const cy = sy + chunkH / 2;
      const ang = Math.atan2(cy - h / 2, cx - w / 2);
      const speed = 2 + Math.random() * 3;
      chunks.push({
        canvas: c,
        x: sx,
        y: sy,
        vx: Math.cos(ang) * speed + (Math.random() - 0.5),
        vy: Math.sin(ang) * speed + (Math.random() - 0.5) * 0.5,
        rot: 0,
        vr: (Math.random() - 0.5) * 0.15,
      });
    }
  }
  let frame = 0;
  function tick() {
    frame++;
    ctx.clearRect(0, 0, w, h);
    for (const ch of chunks) {
      ch.x += ch.vx;
      ch.y += ch.vy;
      ch.vy += 0.08;
      ch.rot += ch.vr;
      ctx.save();
      ctx.translate(ch.x + chunkW / 2, ch.y + chunkH / 2);
      ctx.rotate(ch.rot);
      ctx.drawImage(ch.canvas, -chunkW / 2, -chunkH / 2);
      ctx.restore();
    }
    if (frame < 100) requestAnimationFrame(tick);
    else {
      overlay.remove();
      restoreEl();
    }
  }
  requestAnimationFrame(tick);
}

function runGlitch(pack, snap, restoreEl) {
  const { overlay, rect, w, h } = pack;
  overlay.remove();
  const stage = document.createElement('div');
  stage.style.cssText = [
    'position:fixed',
    `left:${rect.left}px`,
    `top:${rect.top}px`,
    `width:${rect.width}px`,
    `height:${rect.height}px`,
    `z-index:${Z + 1}`,
    'pointer-events:none',
    'overflow:hidden',
  ].join(';');
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const sctx = c.getContext('2d');
  if (sctx) sctx.drawImage(snap.canvas, 0, 0);
  c.style.width = '100%';
  c.style.height = '100%';
  c.style.display = 'block';
  stage.appendChild(c);
  document.body.appendChild(stage);
  let pulse = 0;
  function step() {
    pulse++;
    if (pulse <= 3) {
      c.style.filter =
        'drop-shadow(4px 0 0 rgba(255,0,0,0.95)) drop-shadow(-4px 0 0 rgba(0,255,255,0.9))';
      c.style.transform = `translate(${pulse % 2 ? 4 : -4}px, ${pulse === 2 ? 2 : -2}px)`;
      c.style.opacity = '0.92';
      window.setTimeout(() => {
        c.style.filter = 'none';
        c.style.transform = 'none';
        c.style.opacity = '0';
        window.setTimeout(step, 70);
      }, 85);
    } else {
      stage.remove();
      restoreEl();
    }
  }
  step();
}

function runMelt(pack, snap, restoreEl) {
  const { ctx, w, h, overlay } = pack;
  if (!ctx) return;
  const particles = buildParticlesFromCanvas(snap.canvas, w, h);
  for (const p of particles) {
    p.vy = 0.2 + Math.random() * 0.5;
    p.vx = (Math.random() - 0.5) * 0.15;
    p.melted = false;
  }
  let frame = 0;
  function tick() {
    frame++;
    ctx.clearRect(0, 0, w, h);
    let alive = false;
    for (const p of particles) {
      if (!p.melted) {
        p.vy += 0.12;
        p.y += p.vy;
        p.x += p.vx;
        if (p.y >= h - p.size / 2) {
          p.y = h - p.size / 2 - Math.random() * 2;
          p.melted = true;
          p.vy = 0;
          p.vx = (Math.random() - 0.5) * 0.4;
        }
        alive = true;
      } else {
        p.x += p.vx;
        p.vx *= 0.92;
        alive = true;
      }
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size * (p.melted ? 0.6 : 1));
    }
    if (alive && frame < 200) requestAnimationFrame(tick);
    else {
      overlay.remove();
      restoreEl();
    }
  }
  requestAnimationFrame(tick);
}

function runStatic(pack, snap, restoreEl) {
  const { ctx, w, h, overlay } = pack;
  if (!ctx) return;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  let frame = 0;
  function tick() {
    frame++;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random() > 0.5 ? 255 : 0;
      const g = Math.random() * 80;
      d[i] = v;
      d[i + 1] = g;
      d[i + 2] = v ? 200 : 40;
      d[i + 3] = 220;
    }
    ctx.putImageData(img, 0, 0);
    if (frame < 10) requestAnimationFrame(tick);
    else {
      overlay.remove();
      restoreEl();
    }
  }
  requestAnimationFrame(tick);
}

const EFFECTS = [
  runGravity,
  runExplode,
  runVortex,
  runFloat,
  runShatter,
  runGlitch,
  runMelt,
  runStatic,
];

const animating = new WeakSet();

/** @param {HTMLElement} el */
function runRandomEffect(el) {
  if (animating.has(el)) return;
  animating.add(el);
  const snap = renderElementSnapshot(el);
  const pack = createOverlay(el);
  const restoreEl = hideSource(el);
  const fn = EFFECTS[Math.floor(Math.random() * EFFECTS.length)];
  const done = () => {
    animating.delete(el);
  };
  try {
    fn(pack, snap, () => {
      restoreEl();
      done();
    });
  } catch {
    pack.overlay.remove();
    restoreEl();
    done();
  }
}

function onBodyClick(e) {
  const t = e.target;
  if (!(t instanceof Element)) return;
  const el = t.closest('button') || t.closest('[data-disintegrate]');
  if (!el || !(el instanceof HTMLElement)) return;
  if (el.hasAttribute('data-no-disintegrate')) return;
  playDisintegrationSound();
  runRandomEffect(el);
}

export function initDisintegration() {
  if (initialized) return;
  initialized = true;
  document.body.addEventListener('click', onBodyClick, false);
}
