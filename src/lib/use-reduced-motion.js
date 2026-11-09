import { useEffect, useState } from 'react';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Read the OS preference; false during SSR or where matchMedia is missing. */
function readReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Reactive `prefers-reduced-motion` flag.
 *
 * Unlike the library hook it replaces (which took a one-time snapshot at mount),
 * this hook subscribes to the media query and re-renders when the OS setting flips,
 * so toggling "Reduce motion" mid-session takes effect without a reload.
 *
 * @returns {boolean} true while the user asked the system for reduced motion
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(readReducedMotion);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;

    const media = window.matchMedia(REDUCED_MOTION_QUERY);
    const handleChange = () => setReduced(media.matches);

    media.addEventListener('change', handleChange);
    // Re-read after subscribing so a preference flipped between render and
    // mount is not missed. Same value = React bails out, no extra render.
    handleChange();

    return () => media.removeEventListener('change', handleChange);
  }, []);

  return reduced;
}
