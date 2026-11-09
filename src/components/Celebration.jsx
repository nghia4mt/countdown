import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../lib/use-reduced-motion.js';
import { burstConfetti } from '../lib/confetti.js';
import { BIRTHDAY_AGE } from '../lib/countdown.js';
import './Celebration.css';

const FLOATING_EMOJI = [
  { glyph: '🎉', left: '7%', top: '15%', delay: '0s', size: '1.5rem' },
  { glyph: '✨', left: '88%', top: '17%', delay: '1.1s', size: '1.1rem' },
  { glyph: '✨', left: '10%', top: '74%', delay: '2s', size: '1.25rem' },
  { glyph: '🎉', left: '89%', top: '72%', delay: '0.7s', size: '1.2rem' },
  { glyph: '✨', left: '50%', top: '6%', delay: '1.6s', size: '0.9rem' },
];

/**
 * Longest exit animation (overlay fade, 260ms) plus a little slack. Used as the
 * `setTimeout` fallback for when `animationend` never fires — most notably under
 * `prefers-reduced-motion`, where every animation is `none`.
 */
const EXIT_FALLBACK_MS = 320;

/** Confetti palette pulled from the design tokens (never hard-coded colours). */
function readConfettiPalette() {
  if (typeof window === 'undefined') return [];
  const styles = window.getComputedStyle(document.documentElement);
  return ['--violet', '--cyan', '--pink', '--amber', '--ink']
    .map((token) => styles.getPropertyValue(token).trim())
    .filter(Boolean);
}

/**
 * Expiry celebration: glass dialog over a blurred backdrop, one confetti volley
 * per open, Escape/backdrop dismiss, focus moved in and restored on close.
 *
 * Mount/unmount is driven by CSS instead of a JS animation library: `open` mounts
 * the overlay, `open` going false flips it into `cel--closing`, and the node is
 * removed once the exit animation ends (with a timer fallback).
 */
export function Celebration({ open, onDismiss }) {
  const reduceMotion = useReducedMotion();
  // `exiting` keeps the overlay mounted while the CSS exit animation plays.
  const [exiting, setExiting] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  const rootRef = useRef(null);
  const dismissRef = useRef(null);
  const canvasRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onDismissRef = useRef(onDismiss);
  const firedRef = useRef(false);
  const exitTimerRef = useRef(0);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  // React's documented "adjust state while rendering" pattern: react to the
  // `open` prop without an effect, so no frame is ever out of date.
  if (wasOpen !== open) {
    setWasOpen(open);
    setExiting(!open);
  }

  const present = open || exiting;
  const closing = present && !open;

  const finishExit = useCallback(() => {
    if (exitTimerRef.current) {
      window.clearTimeout(exitTimerRef.current);
      exitTimerRef.current = 0;
    }
    setExiting(false);
  }, []);

  // Safety net: unmount even if `animationend` is suppressed (reduced motion,
  // a background tab, or a browser that skips zero-length animations).
  useEffect(() => {
    if (!closing) return undefined;

    const timer = window.setTimeout(finishExit, reduceMotion ? 0 : EXIT_FALLBACK_MS);
    exitTimerRef.current = timer;

    return () => {
      window.clearTimeout(timer);
      if (exitTimerRef.current === timer) exitTimerRef.current = 0;
    };
  }, [closing, reduceMotion, finishExit]);

  // Focus, scroll lock and keyboard: Escape dismisses, Tab stays inside.
  // Keyed on `present`, not `open`, so focus is restored only after the exit
  // animation has finished and the overlay actually leaves the DOM.
  useEffect(() => {
    if (!present) return undefined;

    const dialog = rootRef.current;
    const dismissButton = dismissRef.current;
    // `document.body` is what the browser reports when nothing is focused; it
    // cannot take focus back, so treat it (and <html>) as "no opener".
    const active = document.activeElement;
    previousFocusRef.current =
      active instanceof HTMLElement && active !== document.body && active !== document.documentElement
        ? active
        : null;

    // Keep the page behind the dialog from scrolling or being reachable by AT.
    const stage = document.querySelector('.stage');
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    stage?.setAttribute('inert', '');

    dismissButton?.focus();

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onDismissRef.current?.();
        return;
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        dismissButton?.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      if (stage) stage.removeAttribute('inert');
      const previous = previousFocusRef.current;
      if (previous && document.contains(previous)) previous.focus();
      else if (dialog && dialog.contains(document.activeElement)) dismissButton?.blur();
    };
  }, [present]);

  // One volley per open: two angled side bursts + a delayed centre burst, all
  // sharing the overlay's canvas through a single rAF loop.
  useEffect(() => {
    if (!present) {
      firedRef.current = false;
      return undefined;
    }
    if (firedRef.current) return undefined;
    firedRef.current = true;

    // `burstConfetti` also refuses to run under reduced motion; checking here
    // keeps the canvas untouched so no frame is ever painted.
    if (reduceMotion) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const controller = burstConfetti(canvas, {
      particleCount: 160,
      duration: 2500,
      size: 9,
      colors: readConfettiPalette(),
      origins: [
        // Angles point *into* the canvas: -90 is straight up, so the left
        // emitter leans right (-58) and the right emitter leans left (-122).
        { x: -0.02, y: 0.72, angle: -58, spread: 66, velocity: 0.72, count: 45 },
        { x: 1.02, y: 0.72, angle: -122, spread: 66, velocity: 0.72, count: 45 },
        { x: 0.5, y: 0.56, angle: -90, spread: 120, velocity: 0.64, delay: 180, count: 70 },
      ],
    });

    return () => {
      controller.stop();
      // StrictMode remounts the effect in dev, and a later reopen must get its
      // own volley: the flag has to be released with the animation.
      firedRef.current = false;
    };
  }, [present, reduceMotion]);

  function dismiss() {
    onDismissRef.current?.();
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) dismiss();
  }

  function handleAnimationEnd(event) {
    if (event.target !== event.currentTarget) return;
    if (!closing) return;
    finishExit();
  }

  if (!present) return null;

  return (
    <div
      ref={rootRef}
      className={closing ? 'cel cel--closing' : 'cel'}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cel-title"
      aria-describedby="cel-body"
      onClick={handleBackdropClick}
      onAnimationEnd={handleAnimationEnd}
    >
      <canvas ref={canvasRef} className="cel__confetti" aria-hidden="true" />

      <div className="cel__card">
        <div className="cel__floats" aria-hidden="true">
          {FLOATING_EMOJI.map((item) => (
            <span
              className="cel__float"
              key={`${item.glyph}-${item.left}-${item.top}`}
              style={{ left: item.left, top: item.top, animationDelay: item.delay, fontSize: item.size }}
            >
              {item.glyph}
            </span>
          ))}
        </div>

        <span className="cel__orb" aria-hidden="true">
          🎉
        </span>
        <h2 className="cel__title" id="cel-title">
          Sinh nhật vui vẻ!
        </h2>
        <p className="cel__body" id="cel-body">
          Chúc mừng — tròn {BIRTHDAY_AGE} tuổi, khoảnh khắc đã tới.
        </p>
        <button ref={dismissRef} type="button" className="cel__btn" onClick={dismiss}>
          Tuyệt vời
        </button>
      </div>
    </div>
  );
}
