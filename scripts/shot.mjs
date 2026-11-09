/**
 * Screenshot + layout probe through Chrome DevTools Protocol device emulation.
 *
 * Chrome's `--window-size` is clamped on Windows (a 390px window is laid out at
 * 512px), so viewport-accurate shots *must* use Emulation.setDeviceMetricsOverride.
 * This also lets us drive runtime states (expired / paused) without touching src.
 *
 * Usage:
 *   node scripts/shot.mjs --width 390 --height 844 --out .shots/mobile.png --mobile
 *   node scripts/shot.mjs --width 1440 --height 1000 --out .shots/desktop.png --expired
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const next = process.argv[index + 1];
  return next && !next.startsWith('--') ? next : true;
}

/** First browser that actually exists on this machine. */
function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;

  const candidates = [
    'C:/Users/minhn/scoop/shims/chrome.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    `${process.env.LOCALAPPDATA || ''}/Google/Chrome/Application/chrome.exe`,
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ].filter(Boolean);

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error('No Chrome/Edge found. Set CHROME_PATH to the executable.');
  return found;
}

const width = Number(arg('width', 1440));
const height = Number(arg('height', 1000));
const out = resolve(arg('out', '.shots/shot.png'));
const url = arg('url', process.env.SHOT_URL || 'http://localhost:5173/countdown/');
const mobile = Boolean(arg('mobile', false));
const expired = Boolean(arg('expired', false));
const reduced = Boolean(arg('reduced', false));
const toggleReduced = Boolean(arg('toggle-reduced', false));
const settleMs = Number(arg('settle', 2600));
const dpr = Number(arg('dpr', mobile ? 2 : 1));
const chromePath = findChrome();
const port = 9300 + (process.pid % 500);
const profile = `.chrome-shot-${process.pid}`;

const chrome = spawn(
  chromePath,
  [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--window-size=1440,1000',
    url,
  ],
  { stdio: 'ignore' },
);

async function pageTarget() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await res.json();
      const page = targets.find((t) => t.type === 'page' && t.url.includes('/countdown/'));
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await delay(200);
  }
  throw new Error('Chrome DevTools endpoint never became ready');
}

const wsUrl = await pageTarget();
const socket = new WebSocket(wsUrl);
await new Promise((resolveOpen, rejectOpen) => {
  socket.addEventListener('open', resolveOpen, { once: true });
  socket.addEventListener('error', rejectOpen, { once: true });
});

let nextId = 0;
const pending = new Map();
const pageErrors = [];

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.exceptionThrown') {
    pageErrors.push(message.params.exceptionDetails?.exception?.description || 'exception');
  }
  if (message.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(message.params.type)) {
    pageErrors.push(
      `console.${message.params.type}: ${message.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' ')}`,
    );
  }
  if (message.id && pending.has(message.id)) {
    const { resolveRequest, rejectRequest } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) rejectRequest(new Error(JSON.stringify(message.error)));
    else resolveRequest(message.result);
  }
});

function send(method, params = {}) {
  nextId += 1;
  const id = nextId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolveRequest, rejectRequest) => {
    pending.set(id, { resolveRequest, rejectRequest });
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return result.result?.value;
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width,
  height,
  deviceScaleFactor: dpr,
  mobile,
  screenWidth: width,
  screenHeight: height,
});
if (reduced) {
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
}
await send('Page.reload', { ignoreCache: true });
await delay(settleMs);

if (expired) {
  // Push "now" past the deadline, then nudge the hook: it re-reads the clock on
  // `visibilitychange`, so we don't have to wait for the next wall-clock minute
  // (the countdown ticks once a minute now that the seconds unit is gone).
  await evaluate(`(() => {
    const base = Date.now();
    Date.now = () => base + 40 * 86400000;
    document.dispatchEvent(new Event('visibilitychange'));
  })()`);
  await delay(2200);
}

let reducedToggle = null;
if (toggleReduced) {
  // Flip "Reduce motion" *after* the page is live. The WebGL layer must notice the
  // media-query change and rebuild itself as a static frame (a new canvas element)
  // instead of keeping its RAF loop running.
  await evaluate(`(() => {
    window.__nbCanvas = document.querySelector('.nb__canvas');
    return Boolean(window.__nbCanvas);
  })()`);
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await delay(1400);
  reducedToggle = await evaluate(`(() => {
    const canvas = document.querySelector('.nb__canvas');
    return {
      canvasPresent: Boolean(canvas),
      recreated: Boolean(canvas) && canvas !== window.__nbCanvas,
      mediaMatches: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    };
  })()`);
}

const metrics = await evaluate(`(() => {
  const rect = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right), bottom: Math.round(r.bottom) };
  };
  return {
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    dpr: window.devicePixelRatio,
    // Which background renderer actually ran: the three.js canvas or the 2D fallback.
    nebula: (() => {
      const canvas = document.querySelector('.nb__canvas');
      const fallback = document.querySelector('.bgfx__stars');
      const gl = canvas ? canvas.getContext('webgl2') || canvas.getContext('webgl') : null;
      return { canvas: Boolean(canvas), fallback: Boolean(fallback), webgl: Boolean(gl) };
    })(),
    docClientWidth: document.documentElement.clientWidth,
    docScrollWidth: document.documentElement.scrollWidth,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    pageHeight: document.documentElement.scrollHeight,
    stage: rect('.stage'),
    card: rect('.cc'),
    title: rect('.hero__title'),
    dialog: rect('.cel__card'),
    overflowers: [...document.querySelectorAll('body *')]
      .filter((el) => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
      .slice(0, 6)
      .map((el) => el.className || el.tagName),
  };
})()`);

const audit = await evaluate(`(() => {
  const bar = document.querySelector('[role="progressbar"]');
  const dialog = document.querySelector('[role="dialog"]');
  const stage = document.querySelector('.stage');
  return {
    progressbar: bar
      ? {
          now: bar.getAttribute('aria-valuenow'),
          text: bar.getAttribute('aria-valuetext'),
          label: bar.getAttribute('aria-label'),
          datesInsideBar: Boolean(bar.querySelector('.pr__dates')),
        }
      : null,
    dialog: dialog
      ? { labelledby: dialog.getAttribute('aria-labelledby'), focusClass: document.activeElement?.className || '' }
      : null,
    bodyOverflow: document.body.style.overflow,
    stageInert: stage ? stage.hasAttribute('inert') : null,
    liveRegions: [...document.querySelectorAll('[aria-live]')].map((el) => el.getAttribute('aria-live')),
    actionButtons: [...document.querySelectorAll('.actions button')].map((el) => el.textContent.trim()),
  };
})()`);

const shot = await send('Page.captureScreenshot', {
  format: 'png',
  captureBeyondViewport: false,
  fromSurface: true,
});
await mkdir(dirname(out), { recursive: true });
await writeFile(out, Buffer.from(shot.data, 'base64'));

console.log(JSON.stringify({ out, width, height, activeUrl: url, pageErrors, audit, reducedToggle, ...metrics }, null, 2));
socket.close();
chrome.kill();
await delay(250);
await rm(profile, { recursive: true, force: true });
