import { useEffect } from 'react';
import NumberFlow from '@number-flow/react';
import { motion, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { CAMPAIGN_START_MS, TARGET_MS, formatDayMonthYear } from '../lib/countdown.js';
import './ProgressRail.css';

const START_LABEL = formatDayMonthYear(CAMPAIGN_START_MS);
const END_LABEL = formatDayMonthYear(TARGET_MS);
const RAIL_TICKS = [25, 50, 75];
const RAIL_SPRING = { stiffness: 68, damping: 20, mass: 0.9 };
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Hook first, media query as the guard for the very first paint. */
function prefersReducedMotion() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(REDUCED_MOTION_QUERY).matches
    : false;
}

/**
 * Elapsed-campaign rail: instrument-grade, not a bootstrap progress bar.
 * The fill is driven by `transform: scaleX()` only, so it never triggers layout.
 */
export function ProgressRail({ progress, isExpired }) {
  const reducedMotion = useReducedMotion();
  const reduceMotion = Boolean(reducedMotion) || prefersReducedMotion();
  const ratio = Number.isFinite(progress) ? progress : 0;
  const target = isExpired ? 1 : Math.min(1, Math.max(0, ratio));
  const percent = Math.round(target * 100);

  const spring = useSpring(0, RAIL_SPRING);
  const scaleX = useTransform(spring, (value) => Math.min(1, Math.max(0, value)));
  const headX = useTransform(scaleX, (value) => `${value * 100}%`);

  useEffect(() => {
    if (reduceMotion) spring.jump(target);
    else spring.set(target);
  }, [spring, reduceMotion, target]);

  return (
    <motion.div
      className={`pr${isExpired ? ' pr--expired' : ''}`}
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        reduceMotion ? { duration: 0 } : { duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }
      }
    >
      <div className="pr__meta">
        <span className="pr__meta-label">Đã trôi qua</span>
        <span className="pr__meta-value">
          <NumberFlow className="pr__pct" value={percent} suffix="%" />
        </span>
      </div>

      <div
        className="pr__track"
        role="progressbar"
        aria-label="Tiến độ chiến dịch"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`đã trôi qua ${percent}%`}
      >
        <div className="pr__rail">
          <motion.div className="pr__fill" style={{ scaleX }} aria-hidden="true">
            <span className="pr__shimmer" />
          </motion.div>

          {RAIL_TICKS.map((tick) => (
            <span className="pr__tick" key={tick} aria-hidden="true" style={{ left: `${tick}%` }} />
          ))}
        </div>

        <div className="pr__head-layer" aria-hidden="true">
          <motion.div className="pr__head-slot" style={{ x: headX }}>
            <span className="pr__head" />
          </motion.div>
        </div>
      </div>

      <div className="pr__dates">
        <span className="pr__date">
          <span className="pr__date-label">Bắt đầu</span>
          <span className="pr__date-value">{START_LABEL}</span>
        </span>
        <span className="pr__date pr__date--end">
          <span className="pr__date-label">Đích đến</span>
          <span className="pr__date-value">{END_LABEL}</span>
        </span>
      </div>
    </motion.div>
  );
}
