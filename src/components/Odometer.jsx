import './Odometer.css';

/** The ten faces of every roller column, top to bottom. */
const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * Left-pad `value` with zeros to at least `digits` characters.
 * A value wider than `digits` keeps its real width, so 100 stays "100"
 * instead of being clipped to the last two digits.
 *
 * @param {number} value
 * @param {number} digits minimum column count
 * @returns {string}
 */
function formatDigits(value, digits) {
  const rounded = Math.round(Number(value));
  const safe = Number.isFinite(rounded) ? Math.max(0, rounded) : 0;
  const text = String(safe);
  const requested = Math.trunc(Number(digits)) || 0;
  return text.padStart(Math.max(1, requested, text.length), '0');
}

/**
 * Odometer-style digits: each character is a fixed-width column holding the ten
 * faces stacked vertically; the strip is translated up by its digit's height and
 * a CSS transition does the rolling. Transform only — no layout animation.
 *
 * Purely decorative: the readable value lives in the parent card/rail
 * `aria-label`, so the whole thing is hidden from assistive technology.
 *
 * @param {{ value: number, digits?: number }} props
 */
export function Odometer({ value, digits = 2 }) {
  const text = formatDigits(value, digits);
  const columns = Array.from(text);

  return (
    <span className="odo" aria-hidden="true">
      {columns.map((digit, index) => (
        // Key from the right edge so a growing column count (99 -> 100) keeps
        // the existing columns mounted instead of re-keying every roller.
        <span className="odo__col" key={columns.length - index}>
          <span className="odo__strip" style={{ transform: `translateY(calc(-1em * ${digit}))` }}>
            {DIGITS.map((face) => (
              <span className="odo__digit" key={face}>
                {face}
              </span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}
