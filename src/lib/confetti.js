/**
 * Dependency-free confetti burst on a caller-supplied canvas.
 *
 * The module owns a single 2D context, a single `requestAnimationFrame` loop and
 * a single `resize` listener, so several origins (side bursts + a centre burst)
 * can share one canvas without fighting over `clearRect`. Everything it touches
 * lives on the canvas it is handed — no globals, no DOM lookups, no imports.
 *
 * Units: positions in CSS pixels, time in milliseconds, velocities in px/ms.
 * Only `fillRect` on a 2D context is used, so this works offline and in any
 * browser that ships canvas.
 */

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Design-token fallbacks; callers normally pass the live palette. */
const DEFAULT_COLORS = ['#c4b5fd', '#7dd3fc', '#f9a8d4', '#fcd34d', '#f8fafc'];

/** One upward fan from just under the centre of the canvas. */
const DEFAULT_ORIGINS = [{ x: 0.5, y: 0.52, angle: -90, spread: 110, velocity: 0.62 }];

const DEFAULTS = {
  /** 120–180 reads well at phone and desktop sizes alike. */
  particleCount: 150,
  /** Whole volley self-terminates after ~2.5s even if particles are still flying. */
  duration: 2500,
  /** Downward acceleration, px/ms². */
  gravity: 0.0011,
  /** Fraction of velocity kept per 60fps frame (air drag). */
  drag: 0.999,
  /** Base edge length of a confetti flake, px. */
  size: 9,
  /** Fraction of a particle's life that stays fully opaque before the fade. */
  fadeFrom: 0.6,
  colors: DEFAULT_COLORS,
  origins: DEFAULT_ORIGINS,
};

/** A no-op controller so callers never have to null-check `stop`. */
function createNoop() {
  return { stop() {} };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function readReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches
  );
}

/**
 * Fire one confetti volley onto `canvas`.
 *
 * @param {HTMLCanvasElement} canvas Canvas to draw on; it is sized to its
 *   rendered box times `devicePixelRatio`.
 * @param {object} [options]
 * @param {number} [options.particleCount=150] Total flakes across all origins.
 * @param {number} [options.duration=2500] Hard stop, milliseconds.
 * @param {number} [options.gravity=0.0011] Downward acceleration, px/ms².
 * @param {number} [options.drag=0.999] Velocity retention per 60fps frame.
 * @param {number} [options.size=9] Base flake edge, px.
 * @param {number} [options.fadeFrom=0.6] Fraction of life at full opacity.
 * @param {string[]} [options.colors] CSS colours; falls back to the palette.
 * @param {Array<{x:number,y:number,angle:number,spread:number,velocity:number,delay?:number,count?:number}>} [options.origins]
 *   Normalised launch points (`x`/`y` are 0–1 of the canvas box), launch
 *   `angle` in degrees where -90 is straight up, `spread` in degrees, initial
 *   `velocity` in px/ms, optional `delay` in ms and optional `count`.
 * @returns {{stop: () => void}} Stops the loop and clears the canvas.
 */
export function burstConfetti(canvas, options = {}) {
  if (!canvas || typeof canvas.getContext !== 'function') return createNoop();
  if (typeof window === 'undefined' || typeof requestAnimationFrame !== 'function') return createNoop();
  // Reduced motion: never start a loop at all, so nothing leaks if a caller
  // forgets to stop us.
  if (readReducedMotion()) return createNoop();

  const ctx = canvas.getContext('2d');
  if (!ctx) return createNoop();

  const config = { ...DEFAULTS, ...options };
  const colors =
    Array.isArray(config.colors) && config.colors.length > 0 ? config.colors : DEFAULT_COLORS;
  const origins =
    Array.isArray(config.origins) && config.origins.length > 0 ? config.origins : DEFAULT_ORIGINS;
  const duration = Math.max(300, Number(config.duration) || DEFAULTS.duration);
  const gravity = Number.isFinite(config.gravity) ? config.gravity : DEFAULTS.gravity;
  const drag = Number.isFinite(config.drag) ? config.drag : DEFAULTS.drag;
  const baseSize = Number(config.size) || DEFAULTS.size;
  const fadeFrom = clamp(Number(config.fadeFrom) || DEFAULTS.fadeFrom, 0.05, 0.95);

  let width = 1;
  let height = 1;
  let dpr = 1;
  let particles = [];
  let rafId = 0;
  let startedAt = 0;
  let lastFrame = 0;
  let stopped = false;

  /** Size the backing store to the CSS box × DPR and reset the transform. */
  function measure() {
    dpr = clamp(typeof window.devicePixelRatio === 'number' ? window.devicePixelRatio : 1, 1, 2.5);
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width || canvas.clientWidth || 1));
    height = Math.max(1, Math.round(rect.height || canvas.clientHeight || 1));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
  }

  function makeParticles() {
    const total = clamp(Math.round(Number(config.particleCount) || DEFAULTS.particleCount), 24, 360);
    const perOrigin = Math.max(1, Math.round(total / origins.length));
    const list = [];

    for (const origin of origins) {
      const count = Number.isFinite(origin?.count) ? Math.max(0, Math.round(origin.count)) : perOrigin;
      const angle = Number.isFinite(origin?.angle) ? origin.angle : -90;
      const spread = Number.isFinite(origin?.spread) ? origin.spread : 90;
      const velocity = Number.isFinite(origin?.velocity) ? origin.velocity : 0.62;
      const originX = Number.isFinite(origin?.x) ? origin.x : 0.5;
      const originY = Number.isFinite(origin?.y) ? origin.y : 0.5;
      const delay = Math.max(0, Number(origin?.delay) || 0);

      for (let i = 0; i < count; i += 1) {
        const heading = ((angle + (Math.random() - 0.5) * spread) * Math.PI) / 180;
        const speed = velocity * (0.55 + Math.random() * 0.9);
        list.push({
          x: originX * width,
          y: originY * height,
          vx: Math.cos(heading) * speed,
          vy: Math.sin(heading) * speed,
          size: baseSize * (0.55 + Math.random() * 0.9),
          rot: Math.random() * Math.PI * 2,
          spin: (Math.random() - 0.5) * 0.01,
          color: colors[Math.floor(Math.random() * colors.length)],
          delay,
          age: 0,
        });
      }
    }

    return list;
  }

  /** Tear everything down exactly once. */
  function finish() {
    if (stopped) return;
    stopped = true;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    window.removeEventListener('resize', handleResize);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function handleResize() {
    if (stopped) return;
    measure();
  }

  function drawFrame(now) {
    if (stopped) return;
    rafId = requestAnimationFrame(drawFrame);

    const dt = clamp(now - lastFrame, 0, 64);
    lastFrame = now;
    const elapsed = now - startedAt;
    const dragFactor = Math.pow(drag, dt / 16.667);

    ctx.clearRect(0, 0, width, height);

    let alive = 0;

    for (const p of particles) {
      if (elapsed < p.delay) {
        alive += 1;
        continue;
      }

      p.age += dt;
      p.vy += gravity * dt;
      p.vx *= dragFactor;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;

      const life = Math.max(1, duration - p.delay);
      const fadeStart = life * fadeFrom;
      const alpha =
        p.age <= fadeStart ? 1 : Math.max(0, 1 - (p.age - fadeStart) / Math.max(1, life - fadeStart));

      if (alpha > 0.01 && p.y < height + 80 && p.x > -80 && p.x < width + 80) alive += 1;
      if (alpha <= 0.01) continue;

      // Flutter: squash the flake on one axis while it spins, like paper.
      const squash = Math.max(0.25, Math.abs(Math.cos(p.rot * 1.6)));

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillRect(-p.size / 2, (-p.size * squash) / 2, p.size, p.size * squash);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;

    if (elapsed >= duration || alive === 0) finish();
  }

  measure();
  particles = makeParticles();
  if (particles.length === 0) {
    finish();
    return { stop: finish };
  }

  startedAt = performance.now();
  lastFrame = startedAt;
  window.addEventListener('resize', handleResize);
  rafId = requestAnimationFrame(drawFrame);

  return { stop: finish };
}
