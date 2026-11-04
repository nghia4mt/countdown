/**
 * Countdown domain logic — pure, dependency free, timezone explicit.
 * Owner: Lead. Keep it pure so `node --test` can verify it without a DOM.
 */

/** The moment the countdown ends (explicit GMT+7 so every device agrees). */
export const TARGET_ISO = '2026-12-06T00:00:00+07:00';
/** The day this countdown page shipped (first commit of the project). */
export const CAMPAIGN_START_ISO = '2026-10-25T00:00:00+07:00';

export const TARGET_MS = Date.parse(TARGET_ISO);
export const CAMPAIGN_START_MS = Date.parse(CAMPAIGN_START_ISO);

export const TARGET_LABEL = '06 · 12 · 2026';

/** The birthday this page celebrates: 06/12/2003 → 06/12/2026. */
export const BIRTH_ISO = '2003-12-06T00:00:00+07:00';
export const BIRTH_LABEL = '06/12/2003';
export const TARGET_SLASH_LABEL = '06/12/2026';
export const BIRTHDAY_AGE = 23;

export const DAY_MS = 86_400_000;
export const HOUR_MS = 3_600_000;
export const MINUTE_MS = 60_000;

/**
 * Split the distance between `nowMs` and `targetMs` into calendar-ish parts.
 * Negative distances clamp to zero and report `expired: true`.
 *
 * @param {number} targetMs timestamp of the deadline
 * @param {number} nowMs timestamp of "now"
 * @returns {{ totalMs: number, days: number, hours: number, minutes: number, seconds: number, expired: boolean }}
 */
export function computeRemaining(targetMs, nowMs) {
  const diff = targetMs - nowMs;
  const totalMs = Math.max(0, diff);

  return {
    totalMs,
    days: Math.floor(totalMs / DAY_MS),
    hours: Math.floor((totalMs % DAY_MS) / HOUR_MS),
    minutes: Math.floor((totalMs % HOUR_MS) / MINUTE_MS),
    seconds: Math.floor((totalMs % MINUTE_MS) / 1000),
    expired: diff <= 0,
  };
}

/** Zero-pad a non-negative integer to two characters. */
export function pad2(value) {
  return String(Math.max(0, Math.floor(value))).padStart(2, '0');
}

/**
 * Elapsed fraction of the campaign, clamped to 0..1.
 * Returns 1 for degenerate ranges once the target has passed.
 */
export function progressRatio(startMs, targetMs, nowMs) {
  const span = targetMs - startMs;
  if (!(span > 0)) return nowMs >= targetMs ? 1 : 0;

  return Math.min(1, Math.max(0, (nowMs - startMs) / span));
}

/** Accessibility / summary sentence, e.g. "31 ngày 22 giờ 35 phút 45 giây". */
export function formatRemaining(remaining) {
  return `${remaining.days} ngày ${pad2(remaining.hours)} giờ ${pad2(remaining.minutes)} phút ${pad2(remaining.seconds)} giây`;
}

/** "06 · 12 · 2026" — formatted in the campaign timezone, not the visitor's. */
export function formatDayMonthYear(ms) {
  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(ms));

  return parts.replace(/\//g, ' · ');
}
