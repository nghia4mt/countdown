import { useEffect, useRef } from 'react';
import { useReducedMotion } from '../lib/use-reduced-motion.js';

const TAU = Math.PI * 2;
const TARGET_STARS = 110;
const REFERENCE_AREA = 1440 * 900;
const MAX_PARALLAX = 8;
const MAX_DPR = 2;
const STAR_COLOR_TOKENS = ['--ink', '--ink', '--ink', '--cyan-soft', '--violet-soft', '--pink-soft'];

/** Keep roughly 110 stars at 1440x900, fewer on small screens, a few more on huge ones. */
function starCount(width, height) {
  const scale = Math.min(1.45, Math.max(0.55, (width * height) / REFERENCE_AREA));
  return Math.round(TARGET_STARS * scale);
}

function readStarPalette() {
  const styles = window.getComputedStyle(document.documentElement);
  const palette = STAR_COLOR_TOKENS.map((token) => styles.getPropertyValue(token).trim()).filter(Boolean);
  return palette.length > 0 ? palette : ['currentColor'];
}

function createStars(count) {
  const palette = readStarPalette();

  return Array.from({ length: count }, () => ({
    x: Math.random(),
    y: Math.random(),
    radius: 0.35 + Math.random() ** 2 * 1.4,
    alpha: 0.24 + Math.random() * 0.62,
    phase: Math.random() * TAU,
    twinkle: 0.00035 + Math.random() * 0.0005,
    driftX: (Math.random() - 0.5) * 0.0000042,
    driftY: (Math.random() - 0.5) * 0.0000036,
    depth: 0.25 + Math.random() * 0.75,
    color: palette[Math.floor(Math.random() * palette.length)],
  }));
}

/**
 * Owns the canvas, its sizing, its RAF loop and every listener.
 * Returns a single cleanup that fully releases them.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {boolean} reduced
 * @returns {() => void}
 */
function createStarfield(canvas, reduced) {
  const parent = canvas.parentElement;
  const context = canvas.getContext('2d');

  if (!parent || !context) return () => {};

  let stars = [];
  let width = 0;
  let height = 0;
  let frameId = 0;
  let resizeFrameId = 0;
  let running = false;
  let lastTime = 0;
  const parallax = { x: 0, y: 0, targetX: 0, targetY: 0 };

  function applySize() {
    const rect = parent.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const nextCount = starCount(width, height);
    if (stars.length !== nextCount) stars = createStars(nextCount);
  }

  function paint(time) {
    context.clearRect(0, 0, width, height);

    const offsetX = reduced ? 0 : parallax.x;
    const offsetY = reduced ? 0 : parallax.y;

    for (const star of stars) {
      const twinkle = reduced ? 0.8 : 0.55 + 0.45 * Math.sin(time * star.twinkle + star.phase);
      const alpha = Math.min(1, star.alpha * twinkle);
      const x = star.x * width + offsetX * star.depth;
      const y = star.y * height + offsetY * star.depth;

      context.globalAlpha = alpha;
      context.fillStyle = star.color;
      context.beginPath();
      context.arc(x, y, star.radius, 0, TAU);
      context.fill();

      // Bright stars get a faint halo so the field feels layered, not flat.
      if (star.radius > 1.25) {
        context.globalAlpha = alpha * 0.16;
        context.beginPath();
        context.arc(x, y, star.radius * 3.1, 0, TAU);
        context.fill();
      }
    }

    context.globalAlpha = 1;
  }

  function step(now) {
    if (!lastTime) lastTime = now;
    const delta = Math.min(64, now - lastTime);
    lastTime = now;

    const damping = Math.min(1, delta / 220);
    parallax.x += (parallax.targetX - parallax.x) * damping;
    parallax.y += (parallax.targetY - parallax.y) * damping;

    for (const star of stars) {
      star.x += star.driftX * delta;
      star.y += star.driftY * delta;
      if (star.x < -0.02) star.x += 1.04;
      else if (star.x > 1.02) star.x -= 1.04;
      if (star.y < -0.02) star.y += 1.04;
      else if (star.y > 1.02) star.y -= 1.04;
    }

    paint(now);
    frameId = window.requestAnimationFrame(step);
  }

  function start() {
    if (running || reduced || document.hidden) return;
    running = true;
    lastTime = 0;
    frameId = window.requestAnimationFrame(step);
  }

  function stop() {
    running = false;
    window.cancelAnimationFrame(frameId);
    frameId = 0;
  }

  function handleVisibility() {
    if (document.hidden) stop();
    else start();
  }

  function handleResize() {
    if (resizeFrameId) return;
    resizeFrameId = window.requestAnimationFrame(() => {
      resizeFrameId = 0;
      applySize();
      if (!running) paint(reduced ? 0 : lastTime);
    });
  }

  function handlePointerMove(event) {
    const rect = parent.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    parallax.targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2 * MAX_PARALLAX;
    parallax.targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2 * MAX_PARALLAX;
  }

  applySize();
  paint(0);
  window.addEventListener('resize', handleResize);

  let observer = null;
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(handleResize);
    observer.observe(parent);
  }

  if (!reduced) {
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    start();
  }

  return () => {
    stop();
    window.cancelAnimationFrame(resizeFrameId);
    observer?.disconnect();
    window.removeEventListener('resize', handleResize);
    document.removeEventListener('visibilitychange', handleVisibility);
    window.removeEventListener('pointermove', handlePointerMove);
  };
}

/**
 * Canvas starfield rendered inside BackgroundFX.
 * Static single frame under `prefers-reduced-motion: reduce`; otherwise a cheap
 * RAF loop that stops completely while the tab is hidden.
 */
export function StarField() {
  const canvasRef = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    // useReducedMotion() is the source of truth; matchMedia covers first paint
    // and environments where the Motion hook has no value yet.
    const media =
      typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    const reduced = Boolean(prefersReducedMotion) || Boolean(media?.matches);

    return createStarfield(canvas, reduced);
  }, [prefersReducedMotion]);

  return <canvas ref={canvasRef} className="bgfx__stars" aria-hidden="true" />;
}
