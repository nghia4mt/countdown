import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import confetti from 'canvas-confetti';
import { BIRTHDAY_AGE } from '../lib/countdown.js';
import './Celebration.css';

const FLOATING_EMOJI = [
  { glyph: '🎉', left: '7%', top: '15%', delay: '0s', size: '1.5rem' },
  { glyph: '✨', left: '88%', top: '17%', delay: '1.1s', size: '1.1rem' },
  { glyph: '✨', left: '10%', top: '74%', delay: '2s', size: '1.25rem' },
  { glyph: '🎉', left: '89%', top: '72%', delay: '0.7s', size: '1.2rem' },
  { glyph: '✨', left: '50%', top: '6%', delay: '1.6s', size: '0.9rem' },
];

/** Read the overlay depth token so confetti always lands above the dialog. */
function readOverlayZIndex() {
  const raw = window.getComputedStyle(document.documentElement).getPropertyValue('--z-overlay').trim();
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? 120 : parsed + 10;
}

/** Hook first, media query as the guard for the very first paint. */
function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

/** Confetti palette pulled from the design tokens (never hard-coded colours). */
function readConfettiPalette() {
  const styles = window.getComputedStyle(document.documentElement);
  return ['--violet', '--cyan', '--pink', '--amber', '--ink']
    .map((token) => styles.getPropertyValue(token).trim())
    .filter(Boolean);
}

/** Cancel any in-flight confetti without requiring the library's reset helper. */
function stopConfetti() {
  if (typeof confetti.reset === 'function') confetti.reset();
}

/**
 * Expiry celebration: glass dialog over a blurred backdrop, one confetti volley
 * per open, Escape/backdrop dismiss, focus moved in and restored on close.
 */
export function Celebration({ open, onDismiss }) {
  const reducedMotion = useReducedMotion();
  const reduceMotion = Boolean(reducedMotion) || prefersReducedMotion();
  const dismissRef = useRef(null);
  const previousFocusRef = useRef(null);
  const onDismissRef = useRef(onDismiss);
  const firedRef = useRef(false);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  // Focus, scroll lock and keyboard: Escape dismisses, Tab stays inside.
  useEffect(() => {
    if (!open) return undefined;

    const dismissButton = dismissRef.current;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;

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
      else dismissButton?.blur();
    };
  }, [open]);

  // One volley per open: two angled side bursts + a centre burst.
  useEffect(() => {
    if (!open) {
      if (firedRef.current) stopConfetti();
      firedRef.current = false;
      return undefined;
    }
    if (firedRef.current) return undefined;
    firedRef.current = true;

    if (reduceMotion) return undefined;

    const colors = readConfettiPalette();
    const base = {
      disableForReducedMotion: true,
      zIndex: readOverlayZIndex(),
      scalar: 0.9,
      ticks: 240,
      ...(colors.length > 0 ? { colors } : {}),
    };

    confetti({ ...base, particleCount: 70, angle: 58, spread: 66, startVelocity: 46, origin: { x: -0.02, y: 0.72 } });
    confetti({ ...base, particleCount: 70, angle: 122, spread: 66, startVelocity: 46, origin: { x: 1.02, y: 0.72 } });

    const centerTimer = window.setTimeout(() => {
      confetti({ ...base, particleCount: 130, spread: 100, startVelocity: 52, origin: { x: 0.5, y: 0.56 } });
    }, 180);

    return () => window.clearTimeout(centerTimer);
  }, [open, reduceMotion]);

  // Drop the confetti canvas when the component itself goes away.
  useEffect(() => () => stopConfetti(), []);

  function dismiss() {
    onDismissRef.current?.();
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) dismiss();
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="celebration"
          className="cel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cel-title"
          aria-describedby="cel-body"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.16, 1, 0.3, 1] }}
          onClick={handleBackdropClick}
        >
          <motion.div
            className="cel__card"
            initial={reduceMotion ? false : { opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 240, damping: 26, mass: 0.9 }}
          >
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
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
