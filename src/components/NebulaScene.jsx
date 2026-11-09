import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../lib/use-reduced-motion.js';
import { StarField } from './StarField.jsx';
import './NebulaScene.css';

const TAU = Math.PI * 2;
/** Pixel-ratio ceiling on wide screens; narrow screens render at 1:1. */
const MAX_DPR = 1.25;
const NARROW_DPR = 1.0;
const NARROW_QUERY = '(max-width: 720px), (pointer: coarse)';
/** Soft 30fps ceiling: half the fill-rate cost, still smooth to the eye. */
const FRAME_INTERVAL = 1000 / 30;
/** Share of the authored point counts kept on narrow screens. */
const NARROW_QUALITY = 0.55;
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** True while the viewport is at or below the narrow-screen breakpoint. */
function isNarrowViewport() {
  return typeof window.matchMedia === 'function' && window.matchMedia(NARROW_QUERY).matches;
}

/** Current pixel-ratio ceiling; re-read on every resize so zoom cannot spike it. */
function maxPixelRatio() {
  return isNarrowViewport() ? NARROW_DPR : MAX_DPR;
}

/** Scale an authored point count by the one-off quality factor, never below `floor`. */
function pointCount(base, quality, floor) {
  return Math.max(floor, Math.round(base * quality));
}

/** Colours are always read from the design tokens in src/index.css. */
const COLOR_TOKENS = ['--ink', '--violet-soft', '--cyan-soft', '--pink-soft', '--amber-soft'];

/**
 * Three depth layers of stars. Distant dust moves the least, close sparks the
 * most, which is what sells the depth when the pointer parallaxes the camera.
 */
const STAR_LAYERS = [
  {
    count: 900,
    size: 1,
    opacity: 0.46,
    near: 120,
    far: 215,
    spreadX: 270,
    spreadY: 180,
    sway: 5,
    swaySpeed: 0.00005,
    phase: 0,
  },
  {
    count: 420,
    size: 0.6,
    opacity: 0.64,
    near: 48,
    far: 120,
    spreadX: 155,
    spreadY: 115,
    sway: 3.2,
    swaySpeed: 0.00008,
    phase: 2.1,
  },
  {
    count: 150,
    size: 0.34,
    opacity: 0.9,
    near: 16,
    far: 48,
    spreadX: 95,
    spreadY: 72,
    sway: 1.6,
    swaySpeed: 0.00012,
    phase: 4.2,
  },
];

/** A handful of bright stars with a four-ray flare, so the field has anchors. */
const FLARE_STARS = {
  count: 18,
  size: 3.4,
  opacity: 0.5,
  near: 55,
  far: 190,
  spreadX: 240,
  spreadY: 160,
  sway: 2.6,
  swaySpeed: 0.00007,
  phase: 1.2,
};

/**
 * Two tilted dust orbits behind the hero. A hairline gradient ring plus sparse
 * dust sells the halo without touching the content: low opacity, additive, and
 * the outer one precesses the slowest.
 */
const RINGS = [
  {
    count: 130,
    radius: 70,
    squash: 0.26,
    z: -155,
    offsetY: 0,
    opacity: 0.5,
    size: 1.3,
    lineOpacity: 0.28,
    tiltX: -0.28,
    tiltZ: 0.16,
    spin: 0.000022,
    phase: 0.5,
    gradient: [1, 2, 3],
    colorIndex: 1,
  },
  {
    count: 90,
    radius: 96,
    squash: 0.13,
    z: -215,
    offsetY: -8,
    opacity: 0.32,
    size: 0.9,
    lineOpacity: 0.14,
    tiltX: -0.55,
    tiltZ: -0.22,
    spin: -0.000014,
    phase: 2.4,
    gradient: [2, 1],
    colorIndex: 2,
  },
];

/** Soft coloured nebulae far behind the stars: the 3D answer to the CSS blobs. */
const CLOUDS = [
  { x: -118, y: 42, z: -252, scale: 250, colorIndex: 1, opacity: 0.11, phase: 0.4 },
  { x: 132, y: -26, z: -282, scale: 300, colorIndex: 2, opacity: 0.09, phase: 2.2 },
  { x: 8, y: 96, z: -300, scale: 230, colorIndex: 3, opacity: 0.075, phase: 4.1 },
];

/** Read the design-token palette once; fall back to plain white if tokens are missing. */
function readPalette(THREE) {
  const styles = window.getComputedStyle(document.documentElement);
  const colors = COLOR_TOKENS.map((token) => styles.getPropertyValue(token).trim())
    .filter(Boolean)
    .map((value) => new THREE.Color(value));

  return colors.length > 0 ? colors : [new THREE.Color(0xffffff)];
}

/**
 * Soft round sprite painted on a canvas — no external image, so the build stays
 * fully offline. Used as the point texture and as the nebula cloud texture.
 */
function createGlowTexture(THREE) {
  const size = 64;
  const sprite = document.createElement('canvas');
  sprite.width = size;
  sprite.height = size;

  const context = sprite.getContext('2d');
  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.32, 'rgba(255, 255, 255, 0.55)');
    gradient.addColorStop(0.68, 'rgba(255, 255, 255, 0.12)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(sprite);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Bright core plus a horizontal and a vertical ray — drawn, never downloaded. */
function createFlareTexture(THREE) {
  const size = 128;
  const half = size / 2;
  const sprite = document.createElement('canvas');
  sprite.width = size;
  sprite.height = size;

  const context = sprite.getContext('2d');
  if (context) {
    const core = context.createRadialGradient(half, half, 0, half, half, half);
    core.addColorStop(0, 'rgba(255, 255, 255, 1)');
    core.addColorStop(0.16, 'rgba(255, 255, 255, 0.5)');
    core.addColorStop(0.46, 'rgba(255, 255, 255, 0.09)');
    core.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = core;
    context.fillRect(0, 0, size, size);

    context.globalCompositeOperation = 'lighter';

    const horizontal = context.createLinearGradient(0, 0, size, 0);
    horizontal.addColorStop(0, 'rgba(255, 255, 255, 0)');
    horizontal.addColorStop(0.5, 'rgba(255, 255, 255, 0.85)');
    horizontal.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = horizontal;
    context.fillRect(0, half - 1.5, size, 3);

    const vertical = context.createLinearGradient(0, 0, 0, size);
    vertical.addColorStop(0, 'rgba(255, 255, 255, 0)');
    vertical.addColorStop(0.5, 'rgba(255, 255, 255, 0.85)');
    vertical.addColorStop(1, 'rgba(255, 255, 255, 0)');
    context.fillStyle = vertical;
    context.fillRect(half - 1.5, 0, 3, size);
  }

  const texture = new THREE.CanvasTexture(sprite);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** One point cloud; returns its GPU objects so cleanup can dispose them. */
function buildPointLayer(THREE, config, texture, palette) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(config.count * 3);
  const colors = new Float32Array(config.count * 3);

  for (let index = 0; index < config.count; index += 1) {
    const offset = index * 3;
    positions[offset] = (Math.random() - 0.5) * config.spreadX;
    positions[offset + 1] = (Math.random() - 0.5) * config.spreadY;
    positions[offset + 2] = -(config.near + Math.random() * (config.far - config.near));

    const color = palette[Math.floor(Math.random() * palette.length)];
    colors[offset] = color.r;
    colors[offset + 1] = color.g;
    colors[offset + 2] = color.b;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: config.size,
    map: texture,
    transparent: true,
    opacity: config.opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;

  return { points, material, geometry, config, baseOpacity: config.opacity };
}

/** One dust orbit: a gradient hairline ellipse plus sparse dust points on it. */
function buildOrbit(THREE, config, texture, palette) {
  const group = new THREE.Group();
  group.position.set(0, config.offsetY, config.z);
  group.rotation.set(config.tiltX, 0, config.tiltZ);

  const pointGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(config.count * 3);
  const colors = new Float32Array(config.count * 3);
  const baseColor = palette[config.colorIndex].clone();

  for (let index = 0; index < config.count; index += 1) {
    const offset = index * 3;
    const angle = (index / config.count) * TAU + Math.random() * 0.06;
    const radius = config.radius * (0.94 + Math.random() * 0.12);

    positions[offset] = Math.cos(angle) * radius;
    positions[offset + 1] = Math.sin(angle) * radius * config.squash;
    positions[offset + 2] = (Math.random() - 0.5) * 6;

    colors[offset] = baseColor.r;
    colors[offset + 1] = baseColor.g;
    colors[offset + 2] = baseColor.b;
  }

  pointGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pointGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const pointMaterial = new THREE.PointsMaterial({
    size: config.size,
    map: texture,
    transparent: true,
    opacity: config.opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(pointGeometry, pointMaterial);
  points.frustumCulled = false;
  group.add(points);

  // Closed gradient hairline: WebGL caps line width at 1px, which is exactly the
  // delicate astrolabe look we want at this scale.
  const segments = 240;
  const linePositions = new Float32Array(segments * 3);
  const lineColors = new Float32Array(segments * 3);
  const stops = config.gradient.map((index) => palette[index]);

  for (let index = 0; index < segments; index += 1) {
    const offset = index * 3;
    const progress = index / segments;
    const angle = progress * TAU;

    linePositions[offset] = Math.cos(angle) * config.radius;
    linePositions[offset + 1] = Math.sin(angle) * config.radius * config.squash;
    linePositions[offset + 2] = 0;

    const scaled = progress * stops.length;
    const from = stops[Math.floor(scaled) % stops.length];
    const to = stops[(Math.floor(scaled) + 1) % stops.length];
    const color = from.clone().lerp(to, scaled - Math.floor(scaled));
    lineColors[offset] = color.r;
    lineColors[offset + 1] = color.g;
    lineColors[offset + 2] = color.b;
  }

  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));

  const lineMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: config.lineOpacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const line = new THREE.LineLoop(lineGeometry, lineMaterial);
  line.frustumCulled = false;
  group.add(line);

  return {
    group,
    points,
    pointMaterial,
    pointGeometry,
    line,
    lineMaterial,
    lineGeometry,
    config,
  };
}

/** Big soft coloured sprites, the farthest visual layer. */
function buildClouds(THREE, configs, texture, palette) {
  return configs.map((config) => {
    const base = palette[config.colorIndex].clone();
    const material = new THREE.SpriteMaterial({
      map: texture,
      color: base,
      transparent: true,
      opacity: config.opacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const sprite = new THREE.Sprite(material);
    sprite.position.set(config.x, config.y, config.z);
    sprite.scale.set(config.scale, config.scale * 0.62, 1);

    return { sprite, material, config, base };
  });
}

/**
 * Owns the renderer, the scene graph, the RAF loop and every listener.
 * Returns null when WebGL is unavailable so the caller can fall back to 2D.
 *
 * @param {object} THREE three.js module namespace (dynamically imported)
 * @param {HTMLCanvasElement} canvas
 * @param {boolean} reduced
 * @returns {null | {
 *   update: (state: { celebrating?: boolean, expired?: boolean }) => void,
 *   pulse: () => void,
 *   dispose: () => void,
 * }}
 */
function createNebula(THREE, canvas, reduced) {
  const parent = canvas.parentElement;
  if (!parent) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance',
    });
  } catch {
    return null;
  }

  renderer.setClearAlpha(0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio()));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 700);
  const glowTexture = createGlowTexture(THREE);
  const flareTexture = createFlareTexture(THREE);
  const palette = readPalette(THREE);

  // One quality decision per mount, taken before any geometry exists: narrow
  // screens get the same scene with fewer points, so the frame cost drops
  // without any layout or per-frame branching.
  const quality = isNarrowViewport() ? NARROW_QUALITY : 0.85;
  const layerConfigs = STAR_LAYERS.map((config) => ({
    ...config,
    count: pointCount(config.count, quality, 80),
  }));
  const flareConfig = {
    ...FLARE_STARS,
    count: pointCount(FLARE_STARS.count, quality, 8),
  };
  const orbitConfigs = RINGS.map((config) => ({
    ...config,
    count: pointCount(config.count, quality, 40),
  }));
  const cloudConfigs = CLOUDS.slice(0, pointCount(CLOUDS.length, quality, 2));

  const layers = layerConfigs.map((config) => buildPointLayer(THREE, config, glowTexture, palette));
  const field = new THREE.Group();
  for (const layer of layers) field.add(layer.points);
  scene.add(field);

  const flares = buildPointLayer(THREE, flareConfig, flareTexture, palette);
  scene.add(flares.points);

  const orbits = orbitConfigs.map((config) => buildOrbit(THREE, config, glowTexture, palette));
  for (const orbit of orbits) scene.add(orbit.group);

  const clouds = buildClouds(THREE, cloudConfigs, glowTexture, palette);
  for (const cloud of clouds) scene.add(cloud.sprite);

  const core = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: palette[1],
      transparent: true,
      opacity: 0.16,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  core.scale.set(260, 170, 1);
  core.position.set(0, 10, -230);
  scene.add(core);

  // Colour anchors: cool while counting down, warm once the date arrives.
  const cool = palette[1].clone();
  const warmTone = palette[4].clone();
  const starBase = new THREE.Color(0xffffff);

  let width = 0;
  let height = 0;
  let frameId = 0;
  let resizeFrameId = 0;
  let running = false;
  let lastTime = 0;
  let lastRender = 0;
  let elapsed = 0;
  let energy = 0;
  let energyTarget = 0;
  let warm = 0;
  let warmTarget = 0;
  let pulse = 0;
  const pointer = { x: 0, y: 0, targetX: 0, targetY: 0 };

  function applySize() {
    const rect = parent.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio()));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function renderFrame(now) {
    const delta = lastTime ? Math.min(64, now - lastTime) : 16;
    lastTime = now;
    elapsed += delta;

    const easing = Math.min(1, delta / 220);
    pointer.x += (pointer.targetX - pointer.x) * easing;
    pointer.y += (pointer.targetY - pointer.y) * easing;
    energy += (energyTarget - energy) * Math.min(1, delta / 700);
    warm += (warmTarget - warm) * Math.min(1, delta / 900);
    pulse = Math.max(0, pulse - delta / 950);

    const boost = 1 + energy * 1.8;
    const beat = 1 + pulse * 0.5;

    camera.position.x = pointer.x * 2.6;
    camera.position.y = pointer.y * 1.9;

    for (const layer of layers) {
      const config = layer.config;
      const drift = elapsed * config.swaySpeed * boost;

      layer.points.position.x = Math.sin(drift + config.phase) * config.sway;
      layer.points.position.y = Math.cos(drift * 0.82 + config.phase) * config.sway * 0.7;
      layer.material.opacity = Math.min(
        1,
        layer.baseOpacity * (0.88 + 0.12 * Math.sin(elapsed * 0.00055 + config.phase)) * (1 + energy * 0.3),
      );
      layer.material.color.copy(starBase).lerp(warmTone, warm);
    }

    const flareConfig = flares.config;
    flares.points.position.x = Math.sin(elapsed * flareConfig.swaySpeed + flareConfig.phase) * flareConfig.sway;
    flares.points.position.y =
      Math.cos(elapsed * flareConfig.swaySpeed * 0.8 + flareConfig.phase) * flareConfig.sway * 0.7;
    flares.material.opacity = flareConfig.opacity * (0.7 + 0.3 * Math.sin(elapsed * 0.0008)) * beat;
    flares.material.color.copy(starBase).lerp(warmTone, warm);

    field.rotation.z = Math.sin(elapsed * 0.000035) * 0.06 + warm * 0.05;

    for (const orbit of orbits) {
      const config = orbit.config;
      orbit.group.rotation.z = config.tiltZ + elapsed * config.spin * boost;
      orbit.group.rotation.x = config.tiltX + Math.sin(elapsed * 0.000045 + config.phase) * 0.05;
      orbit.pointMaterial.opacity =
        config.opacity * (1 + energy * 0.3) * (0.9 + 0.1 * Math.sin(elapsed * 0.0004 + config.phase)) * beat;
      orbit.pointMaterial.color.copy(starBase).lerp(warmTone, warm);
      orbit.lineMaterial.opacity = config.lineOpacity * beat * (1 + energy * 0.25);
      orbit.lineMaterial.color.copy(starBase).lerp(warmTone, warm);
    }

    for (const cloud of clouds) {
      const config = cloud.config;
      cloud.sprite.position.x = config.x + Math.sin(elapsed * 0.000035 + config.phase) * 14;
      cloud.sprite.position.y = config.y + Math.cos(elapsed * 0.000028 + config.phase) * 9;
      cloud.material.opacity =
        config.opacity * (0.85 + 0.15 * Math.sin(elapsed * 0.00022 + config.phase)) * (1 + energy * 0.25);
      cloud.material.color.copy(cloud.base).lerp(warmTone, warm);
    }

    core.material.opacity = 0.16 * beat * (0.85 + 0.15 * Math.sin(elapsed * 0.0003)) * (1 + energy * 0.4);
    core.material.color.copy(cool).lerp(warmTone, warm);

    renderer.render(scene, camera);
  }

  function loop(now) {
    frameId = window.requestAnimationFrame(loop);
    // 30fps ceiling: rAF still ticks at display rate, but the scene only
    // repaints when a frame is due, so the GPU work per second is halved.
    if (now - lastRender < FRAME_INTERVAL - 1) return;
    lastRender = now;
    renderFrame(now);
  }

  function start() {
    if (running || reduced || document.hidden) return;
    running = true;
    lastTime = 0;
    frameId = window.requestAnimationFrame(loop);
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

  function handlePointerMove(event) {
    pointer.targetX = (event.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
    pointer.targetY = (event.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
  }

  function handleResize() {
    if (resizeFrameId) return;
    resizeFrameId = window.requestAnimationFrame(() => {
      resizeFrameId = 0;
      applySize();
      // While the tab is hidden the animated loop stays stopped; a static frame
      // still needs painting so a hidden-tab resize is not left stale.
      if (!running && (!document.hidden || reduced)) renderFrame(performance.now());
    });
  }

  applySize();
  renderFrame(0);

  let observer = null;
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(handleResize);
    observer.observe(parent);
  }
  window.addEventListener('resize', handleResize);

  if (!reduced) {
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    start();
  }

  return {
    update({ celebrating = false, expired = false }) {
      energyTarget = celebrating ? 1 : expired ? 0.4 : 0;
      warmTarget = expired ? 1 : 0;
    },
    pulse() {
      pulse = 1;
    },
    dispose() {
      stop();
      window.cancelAnimationFrame(resizeFrameId);
      observer?.disconnect();
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pointermove', handlePointerMove);

      for (const layer of layers) {
        layer.geometry.dispose();
        layer.material.dispose();
      }
      flares.geometry.dispose();
      flares.material.dispose();
      for (const orbit of orbits) {
        orbit.pointGeometry.dispose();
        orbit.pointMaterial.dispose();
        orbit.lineGeometry.dispose();
        orbit.lineMaterial.dispose();
      }
      for (const cloud of clouds) cloud.material.dispose();
      core.material.dispose();
      glowTexture.dispose();
      flareTexture.dispose();
      scene.clear();
      renderer.dispose();
      // Each mount owns a fresh canvas, so dropping the context immediately is
      // safe and keeps repeated mounts (StrictMode, reduced-motion toggles) from
      // exhausting the browser's WebGL context pool.
      renderer.forceContextLoss?.();
    },
  };
}

/** Current OS-level reduced-motion preference (false when unsupported). */
function readSystemReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(REDUCED_MOTION_QUERY).matches
    : false;
}

/**
 * WebGL nebula behind the whole page: three parallax star layers, flare stars,
 * two dust orbits, coloured nebulae and a core glow, all additive over the CSS
 * aurora. Each countdown tick (once per minute — the UI no longer counts seconds)
 * nudges the scene so the background feels alive. Pauses when the tab is hidden, renders
 * one static frame under reduced motion, and falls back to the 2D `<StarField />` canvas
 * when three.js or WebGL is unavailable.
 *
 * @param {{ celebrating?: boolean, expired?: boolean, tick?: number }} props
 */
export function NebulaScene({ celebrating = false, expired = false, tick }) {
  const containerRef = useRef(null);
  const nebulaRef = useRef(null);
  const stateRef = useRef({ celebrating, expired });
  const prefersReducedMotion = useReducedMotion();
  const [systemReducedMotion, setSystemReducedMotion] = useState(readSystemReducedMotion);
  const [failed, setFailed] = useState(false);

  // motion's useReducedMotion() is a one-time snapshot in v14, so watch the media
  // query ourselves: toggling "Reduce motion" mid-session must rebuild the scene
  // as a static frame instead of leaving the RAF loop running.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;

    const media = window.matchMedia(REDUCED_MOTION_QUERY);
    const handleChange = (event) => setSystemReducedMotion(event.matches);

    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (failed) return undefined;

    const container = containerRef.current;
    if (!container) return undefined;

    const reduced = Boolean(prefersReducedMotion) || systemReducedMotion;

    let disposed = false;
    let nebula = null;

    const canvas = document.createElement('canvas');
    canvas.className = 'nb__canvas';
    canvas.setAttribute('aria-hidden', 'true');
    container.appendChild(canvas);

    import('three')
      .then((THREE) => {
        if (disposed) return;

        nebula = createNebula(THREE, canvas, reduced);
        if (!nebula) {
          setFailed(true);
          return;
        }

        nebulaRef.current = nebula;
        nebula.update(stateRef.current);
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });

    return () => {
      disposed = true;
      if (nebulaRef.current === nebula) nebulaRef.current = null;
      nebula?.dispose();
      nebula = null;
      canvas.remove();
    };
  }, [failed, prefersReducedMotion, systemReducedMotion]);

  // Live state changes never rebuild the scene; they only retune it. The ref
  // mirrors the latest props so the async scene creation can read them without
  // depending on (and therefore restarting on) every prop change.
  useEffect(() => {
    stateRef.current = { celebrating, expired };
    nebulaRef.current?.update({ celebrating, expired });
  }, [celebrating, expired]);

  // One soft heartbeat per countdown second.
  useEffect(() => {
    if (tick === undefined) return;
    nebulaRef.current?.pulse();
  }, [tick]);

  return (
    <div className="nb" ref={containerRef} aria-hidden="true">
      {failed ? <StarField /> : null}
    </div>
  );
}
