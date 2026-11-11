import { Odometer } from './Odometer.jsx';
import { useReducedMotion } from '../lib/use-reduced-motion.js';
import './ProgressRail.css';

/**
 * Elapsed-campaign rail, reduced to one thin line under the slab.
 *
 * One number drives the whole rail: `--pr-p`, the clamped 0..1 ratio. The fill
 * scales by it (`transform: scaleX`) and the dot slot translates by it
 * (`transform: translateX`), both on the same 900ms curve, so the dot stays
 * welded to the leading edge. Transform/opacity only.
 *
 * Reduced motion is honoured twice: the reactive hook adds `pr--still`, and the
 * CSS media query covers the very first paint before that class exists.
 *
 * @param {{ progress: number, isExpired?: boolean }} props
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
      {/* The progressbar below owns the accessible copy; this row is visual. */}
      <div className="pr__meta" aria-hidden="true">
        <span className="pr__meta-label">Đã trôi qua</span>
        <span className="pr__meta-value">
          <span className="pr__pct">
            <Odometer value={percent} digits={2} />
            <span className="pr__pct-sign">%</span>
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
          <div className="pr__fill" aria-hidden="true" />
        </div>

        <div className="pr__head-layer" aria-hidden="true">
          <div className="pr__head-slot">
            <span className="pr__head" />
          </div>
        </div>
      </div>
    </div>
  );
}
