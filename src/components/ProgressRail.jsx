import { Odometer } from './Odometer.jsx';
import { useReducedMotion } from '../lib/use-reduced-motion.js';
import { CAMPAIGN_START_MS, TARGET_MS, formatDayMonthYear } from '../lib/countdown.js';
import './ProgressRail.css';

const START_LABEL = formatDayMonthYear(CAMPAIGN_START_MS);
const END_LABEL = formatDayMonthYear(TARGET_MS);
const RAIL_TICKS = [25, 50, 75];

/**
 * Elapsed-campaign rail: instrument-grade, not a bootstrap progress bar.
 *
 * One number drives the whole rail: `--pr-p`, the clamped 0..1 ratio. The fill
 * scales by it (`transform: scaleX`) and the head slot translates by it
 * (`transform: translateX`), both with the same 900ms transition, so the dot
 * stays welded to the leading edge for every frame of the move — not just at
 * rest. Nothing but transform/opacity is animated, and no animation library is
 * involved.
 *
 * Reduced motion is honoured twice: the reactive hook adds `pr--still`, and the
 * CSS media query covers the very first paint before that class exists.
 */
export function ProgressRail({ progress, isExpired }) {
  const reduceMotion = useReducedMotion();
  const ratio = Number.isFinite(progress) ? progress : 0;
  const target = isExpired ? 1 : Math.min(1, Math.max(0, ratio));
  const percent = Math.round(target * 100);

  return (
    <div
      className={`pr${isExpired ? ' pr--expired' : ''}${reduceMotion ? ' pr--still' : ''}`}
      style={{ '--pr-p': target.toFixed(4) }}
    >
      <div className="pr__meta">
        <span className="pr__meta-label">Đã trôi qua</span>
        <span className="pr__meta-value">
          {/* Decorative rollers: the readable value is `aria-valuetext` on the
              progressbar below, so the odometer is aria-hidden by design. */}
          <span className="pr__pct">
            <Odometer value={percent} digits={2} />
            <span className="pr__pct-sign" aria-hidden="true">
              %
            </span>
          </span>
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
          <div className="pr__fill" aria-hidden="true">
            <span className="pr__shimmer" />
          </div>

          {RAIL_TICKS.map((tick) => (
            <span className="pr__tick" key={tick} aria-hidden="true" style={{ left: `${tick}%` }} />
          ))}
        </div>

        <div className="pr__head-layer" aria-hidden="true">
          <div className="pr__head-slot">
            <span className="pr__head" />
          </div>
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
    </div>
  );
}
