import { useEffect, useState } from 'react';
import NumberFlow from '@number-flow/react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react';
import './CountdownCard.css';

/** Tilt never exceeds this angle, on either axis. */
const MAX_TILT_DEG = 8;
const TILT_SPRING = { stiffness: 170, damping: 20, mass: 0.35 };
const ENTRANCE_EASE = [0.16, 1, 0.3, 1];

/** True on touch / no-hover devices, where pointer tilt would be meaningless. */
function useCoarsePointer() {
  const [coarse, setCoarse] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(hover: none), (pointer: coarse)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;

    const query = window.matchMedia('(hover: none), (pointer: coarse)');
    const handleChange = () => setCoarse(query.matches);

    query.addEventListener('change', handleChange);
    return () => query.removeEventListener('change', handleChange);
  }, []);

  return coarse;
}

/**
 * One glass odometer card: gradient digits, unit watermark, pointer tilt.
 *
 * @param {{ unit: string, label: string, value: number, accent: string,
 *   index?: number, isExpired?: boolean }} props
 */
export function CountdownCard({
  unit,
  label,
  value,
  accent,
  index = 0,
  isExpired = false,
}) {
  const reducedMotion = useReducedMotion();
  const coarsePointer = useCoarsePointer();
  const tiltEnabled = !reducedMotion && !coarsePointer;

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const springX = useSpring(pointerX, TILT_SPRING);
  const springY = useSpring(pointerY, TILT_SPRING);

  const rotateX = useTransform(springY, [-1, 1], [MAX_TILT_DEG, -MAX_TILT_DEG]);
  const rotateY = useTransform(springX, [-1, 1], [-MAX_TILT_DEG, MAX_TILT_DEG]);
  const glintX = useTransform(springX, [-1, 1], ['-26%', '26%']);
  const glintY = useTransform(springY, [-1, 1], ['-20%', '20%']);

  const handlePointerMove = (event) => {
    if (!tiltEnabled || event.pointerType !== 'mouse') return;

    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set(((event.clientX - rect.left) / rect.width) * 2 - 1);
    pointerY.set(((event.clientY - rect.top) / rect.height) * 2 - 1);
  };

  const resetTilt = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  const ariaLabel = isExpired
    ? `${value} ${label.toLowerCase()}, đã đến ngày`
    : `${value} ${label.toLowerCase()}`;

  return (
    <motion.div
      className={`cc${isExpired ? ' cc--expired' : ''}`}
      data-unit={unit}
      data-state={isExpired ? 'expired' : 'running'}
      role="group"
      aria-label={ariaLabel}
      tabIndex={-1}
      style={{
        '--accent': accent,
        rotateX: tiltEnabled ? rotateX : 0,
        rotateY: tiltEnabled ? rotateY : 0,
        transformPerspective: 900,
      }}
      initial={reducedMotion ? false : { opacity: 0, y: 28, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { duration: 0.8, delay: index * 0.08, ease: ENTRANCE_EASE }
      }
      whileHover={
        reducedMotion
          ? undefined
          : { y: -4, transition: { type: 'spring', stiffness: 320, damping: 26 } }
      }
      whileTap={reducedMotion ? undefined : { scale: 0.98 }}
      onPointerMove={handlePointerMove}
      onPointerLeave={resetTilt}
      onPointerCancel={resetTilt}
    >
      <span className="cc__aura" aria-hidden="true" />
      <span className="cc__ghost" aria-hidden="true">
        {unit.slice(0, 1).toUpperCase()}
      </span>
      <span className="cc__edge" aria-hidden="true" />

      <span className="cc__digits" aria-hidden="true">
        <NumberFlow
          className="cc__odometer"
          value={value}
          format={{ minimumIntegerDigits: 2 }}
          trend={-1}
          willChange
        />
        {/* Same number, lighter accent, alpha-masked top → bottom. Two synced
            odometers give a true gradient fill without background-clip: text,
            which browsers skip for transformed shadow descendants. */}
        <NumberFlow
          className="cc__odometer cc__sheen"
          value={value}
          format={{ minimumIntegerDigits: 2 }}
          trend={-1}
          willChange
        />
      </span>

      <span className="cc__label" aria-hidden="true">
        {label}
      </span>

      {tiltEnabled ? (
        <motion.span
          className="cc__glint"
          aria-hidden="true"
          style={{ x: glintX, y: glintY }}
        />
      ) : null}
    </motion.div>
  );
}
