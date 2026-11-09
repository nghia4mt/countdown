/**
 * Unit tests for the pure countdown domain logic in `src/lib/countdown.js`.
 *
 * Contract: DESIGN_CONTRACT.md §4/§9. Run with `npm test` (script: `node --test`)
 * or directly with `node --test src`. Node 26, `node:test` + `node:assert/strict`
 * only — no DOM, no jsdom, no extra dependencies.
 *
 * Timezone independence is proven two ways:
 *  1. Expected calendar days are derived from UTC getters on the instant shifted
 *     by the campaign's +07:00 offset, so no host-local getter is involved.
 *  2. A dedicated test re-runs the assertions with `process.env.TZ` forced to
 *     UTC / America/Los_Angeles / Pacific/Kiritimati, restoring the host value.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  TARGET_ISO,
  CAMPAIGN_START_ISO,
  BIRTH_ISO,
  TARGET_MS,
  CAMPAIGN_START_MS,
  TARGET_LABEL,
  BIRTH_LABEL,
  TARGET_SLASH_LABEL,
  BIRTHDAY_AGE,
  DAY_MS,
  HOUR_MS,
  MINUTE_MS,
  computeRemaining,
  pad2,
  progressRatio,
  formatRemaining,
  formatDayMonthYear,
} from './countdown.js';

/** The campaign's fixed UTC offset: Asia/Bangkok is UTC+07:00 (no DST). */
const BANGKOK_OFFSET_MS = 7 * HOUR_MS;

/** A stable "now" that is not near any DST or month boundary. */
const NOW_MS = 1_700_000_000_000;

/** Expected `computeRemaining` shape for exactly zero remaining. */
function zeroResult() {
  return { totalMs: 0, days: 0, hours: 0, minutes: 0, expired: true };
}

test('computeRemaining splits 1d 2h 3m and drops the sub-minute remainder', () => {
  const diff = DAY_MS + 2 * HOUR_MS + 3 * MINUTE_MS + 4_000;

  assert.deepEqual(computeRemaining(NOW_MS + diff, NOW_MS), {
    totalMs: 93_784_000,
    days: 1,
    hours: 2,
    minutes: 3,
    expired: false,
  });
});

test('computeRemaining floors 59_999ms to 0 minutes instead of rounding up', () => {
  assert.deepEqual(computeRemaining(NOW_MS + 59_999, NOW_MS), {
    totalMs: 59_999,
    days: 0,
    hours: 0,
    minutes: 0,
    expired: false,
  });
});

test('computeRemaining turns exactly 60_000ms into 1 minute', () => {
  assert.deepEqual(computeRemaining(NOW_MS + MINUTE_MS, NOW_MS), {
    totalMs: 60_000,
    days: 0,
    hours: 0,
    minutes: 1,
    expired: false,
  });
});

test('computeRemaining turns exactly 3_600_000ms into 1 hour', () => {
  assert.deepEqual(computeRemaining(NOW_MS + HOUR_MS, NOW_MS), {
    totalMs: 3_600_000,
    days: 0,
    hours: 1,
    minutes: 0,
    expired: false,
  });
});

test('computeRemaining turns exactly 86_400_000ms into 1 day', () => {
  assert.deepEqual(computeRemaining(NOW_MS + DAY_MS, NOW_MS), {
    totalMs: 86_400_000,
    days: 1,
    hours: 0,
    minutes: 0,
    expired: false,
  });
});

test('computeRemaining never exposes a seconds field', () => {
  const diffs = [0, 1, 999, 1_000, 59_999, 60_000, DAY_MS, 10 * DAY_MS];

  for (const diff of diffs) {
    const result = computeRemaining(NOW_MS + diff, NOW_MS);
    assert.ok(!('seconds' in result), `diff=${diff}: result has no seconds key`);
  }
});

test('computeRemaining reports all zeros and expired at exactly 0 remaining', () => {
  assert.deepEqual(computeRemaining(NOW_MS, NOW_MS), zeroResult());
});

test('computeRemaining clamps a negative diff to zeros and marks it expired', () => {
  const now = NOW_MS;
  const target = now - (5 * DAY_MS + 4 * HOUR_MS + 3 * MINUTE_MS + 2_500);

  assert.deepEqual(computeRemaining(target, now), zeroResult());
});

test('computeRemaining invariants hold for negative, zero, boundary and large diffs', () => {
  const diffs = [
    -2 * DAY_MS - 1_234,
    -1,
    0,
    1,
    999,
    1_000,
    59_999,
    60_000,
    3_599_999,
    3_600_000,
    DAY_MS - 1,
    DAY_MS,
    DAY_MS + HOUR_MS + MINUTE_MS + 1_000,
    10 * DAY_MS + 7 * HOUR_MS + 8 * MINUTE_MS + 9_000,
  ];

  for (const diff of diffs) {
    const r = computeRemaining(NOW_MS + diff, NOW_MS);
    const label = `diff=${diff}`;

    assert.ok(Number.isInteger(r.totalMs), `${label}: totalMs is an integer`);
    assert.ok(r.totalMs >= 0, `${label}: totalMs is never negative`);
    assert.equal(r.totalMs, Math.max(0, diff), `${label}: totalMs clamps at zero`);

    assert.ok(Number.isInteger(r.days) && r.days >= 0, `${label}: days is a non-negative integer`);
    for (const unit of ['hours', 'minutes']) {
      assert.ok(
        Number.isInteger(r[unit]) && r[unit] >= 0 && r[unit] <= 59,
        `${label}: ${unit}=${r[unit]} is an integer within 0..59`,
      );
    }

    assert.equal(r.expired, diff <= 0, `${label}: expired iff the diff is not positive`);

    const decomposed = r.days * DAY_MS + r.hours * HOUR_MS + r.minutes * MINUTE_MS;
    assert.ok(
      r.totalMs - decomposed >= 0 && r.totalMs - decomposed < MINUTE_MS,
      `${label}: split discards only the sub-minute remainder`,
    );
  }
});

test('pad2 zero-pads 0, 5, 7 and 23 to two characters', () => {
  assert.equal(pad2(0), '00');
  assert.equal(pad2(5), '05');
  assert.equal(pad2(7), '07');
  assert.equal(pad2(23), '23');
});

test('pad2 leaves values with more than two digits untruncated (100 -> "100")', () => {
  // `String(100).padStart(2, '0')` yields "100": pad2 is a minimum width, not a
  // hard 2-digit truncation, so out-of-contract inputs keep all their digits.
  assert.equal(pad2(100), '100');
  assert.equal(pad2(1_000), '1000');
});

test('progressRatio returns 0 before the campaign starts', () => {
  assert.equal(progressRatio(CAMPAIGN_START_MS, TARGET_MS, CAMPAIGN_START_MS - 1), 0);
  assert.equal(progressRatio(CAMPAIGN_START_MS, TARGET_MS, CAMPAIGN_START_MS), 0);
});

test('progressRatio returns 1 after the target', () => {
  assert.equal(progressRatio(CAMPAIGN_START_MS, TARGET_MS, TARGET_MS + 1), 1);
  assert.equal(progressRatio(CAMPAIGN_START_MS, TARGET_MS, TARGET_MS + DAY_MS), 1);
});

test('progressRatio returns exactly 0.5 at the campaign midpoint', () => {
  const midpoint = (CAMPAIGN_START_MS + TARGET_MS) / 2;

  assert.ok(Number.isInteger(midpoint), 'midpoint is representable exactly');
  assert.equal(progressRatio(CAMPAIGN_START_MS, TARGET_MS, midpoint), 0.5);
});

test('progressRatio clamps out-of-range fractions at both ends', () => {
  const start = 1_000;
  const target = 3_000;

  assert.equal(progressRatio(start, target, start - DAY_MS), 0);
  assert.equal(progressRatio(start, target, start - 1), 0);
  assert.equal(progressRatio(start, target, start), 0);
  assert.equal(progressRatio(start, target, target), 1);
  assert.equal(progressRatio(start, target, target + 1), 1);
  assert.equal(progressRatio(start, target, target + DAY_MS), 1);

  for (const now of [-DAY_MS, start - 1, start, 1_500, target - 1, target, target + DAY_MS]) {
    const ratio = progressRatio(start, target, now);
    assert.ok(ratio >= 0 && ratio <= 1, `ratio=${ratio} stays within 0..1 for now=${now}`);
  }
});

test('progressRatio handles the start === target degenerate range', () => {
  const instant = 1_700_000_000_000;

  // Zero-length campaign: nothing has elapsed before the instant, and the
  // target counts as reached from the instant onwards.
  assert.equal(progressRatio(instant, instant, instant - 1), 0);
  assert.equal(progressRatio(instant, instant, instant), 1);
  assert.equal(progressRatio(instant, instant, instant + 1), 1);
});

test('progressRatio handles the start > target inverted range', () => {
  const target = 1_700_000_000_000;
  const start = target + DAY_MS;

  // Degenerate inverted range: still clamped to 0 before the target and 1 once
  // the target is reached (the lib never emits a negative or >1 ratio).
  assert.equal(progressRatio(start, target, target - 1), 0);
  assert.equal(progressRatio(start, target, target), 1);
  assert.equal(progressRatio(start, target, start), 1);

  for (const now of [target - DAY_MS, target - 1, target, start, start + DAY_MS]) {
    const ratio = progressRatio(start, target, now);
    assert.ok(ratio >= 0 && ratio <= 1, `inverted range ratio=${ratio} stays within 0..1`);
  }
});

test('formatRemaining renders "12 ngày 04 giờ 05 phút" without seconds', () => {
  assert.equal(
    formatRemaining({ days: 12, hours: 4, minutes: 5 }),
    '12 ngày 04 giờ 05 phút',
  );
});

test('formatRemaining never mentions the seconds unit', () => {
  const diff = DAY_MS + 2 * HOUR_MS + 3 * MINUTE_MS + 4_000;
  const remaining = computeRemaining(NOW_MS + diff, NOW_MS);

  const formatted = formatRemaining(remaining);
  assert.equal(formatted, '1 ngày 02 giờ 03 phút');
  assert.ok(!formatted.includes('giây'), `unexpected seconds unit in "${formatted}"`);
});

test('formatRemaining zero-pads time units while days stay unpadded', () => {
  const diff = DAY_MS + 2 * HOUR_MS + 3 * MINUTE_MS + 4_000;
  const remaining = computeRemaining(NOW_MS + diff, NOW_MS);

  assert.equal(formatRemaining(remaining), '1 ngày 02 giờ 03 phút');
});

test('formatDayMonthYear formats TARGET_MS as "06 · 12 · 2026" in Asia/Bangkok', () => {
  // Host-independent expectation: UTC getters on the instant shifted by +07:00.
  const bangkok = new Date(TARGET_MS + BANGKOK_OFFSET_MS);
  const expected = `${pad2(bangkok.getUTCDate())} · ${pad2(bangkok.getUTCMonth() + 1)} · ${bangkok.getUTCFullYear()}`;

  assert.equal(expected, '06 · 12 · 2026');
  assert.equal(formatDayMonthYear(TARGET_MS), expected);
  assert.equal(formatDayMonthYear(TARGET_MS), '06 · 12 · 2026');
});

test('formatDayMonthYear formats CAMPAIGN_START_MS as "25 · 10 · 2026" in Asia/Bangkok', () => {
  const bangkok = new Date(CAMPAIGN_START_MS + BANGKOK_OFFSET_MS);
  const expected = `${pad2(bangkok.getUTCDate())} · ${pad2(bangkok.getUTCMonth() + 1)} · ${bangkok.getUTCFullYear()}`;

  assert.equal(expected, '25 · 10 · 2026');
  assert.equal(formatDayMonthYear(CAMPAIGN_START_MS), expected);
  assert.equal(formatDayMonthYear(CAMPAIGN_START_MS), '25 · 10 · 2026');
});

test('formatDayMonthYear pins the day boundary to the +07:00 campaign timezone', () => {
  // 1 ms before the Bangkok deadline is still 05.12 in Bangkok (and in UTC too),
  // while 1 ms after it is 06.12 — the +07:00 boundary, not a local-time one.
  assert.equal(formatDayMonthYear(TARGET_MS - 1), '05 · 12 · 2026');
  assert.equal(formatDayMonthYear(TARGET_MS), '06 · 12 · 2026');
  assert.equal(formatDayMonthYear(CAMPAIGN_START_MS - 1), '24 · 10 · 2026');
  assert.equal(formatDayMonthYear(CAMPAIGN_START_MS), '25 · 10 · 2026');
});

test('formatDayMonthYear does not depend on the machine timezone', (t) => {
  const originalTz = process.env.TZ;
  const zones = ['UTC', 'America/Los_Angeles', 'Pacific/Kiritimati'];
  let honoured = 0;

  try {
    for (const tz of zones) {
      process.env.TZ = tz;
      const active = new Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (active !== tz) {
        t.diagnostic(`process.env.TZ=${tz} not honoured (active ${active}); pass skipped`);
        continue;
      }

      honoured += 1;
      assert.equal(formatDayMonthYear(TARGET_MS), '06 · 12 · 2026', `TZ=${tz}`);
      assert.equal(formatDayMonthYear(CAMPAIGN_START_MS), '25 · 10 · 2026', `TZ=${tz}`);
    }
  } finally {
    if (originalTz === undefined) delete process.env.TZ;
    else process.env.TZ = originalTz;
  }

  if (honoured === 0) {
    t.skip('this runtime never applies process.env.TZ overrides');
  }
});

test('TARGET_LABEL matches the target date', () => {
  assert.equal(TARGET_LABEL, '06 · 12 · 2026');
});

test('birthday copy matches the target date', () => {
  assert.equal(BIRTH_LABEL, '06/12/2003');
  assert.equal(TARGET_SLASH_LABEL, '06/12/2026');
  assert.equal(BIRTHDAY_AGE, 23);
  assert.equal(BIRTH_ISO, '2003-12-06T00:00:00+07:00');

  // Formatted in the campaign timezone, so the day stays 06 (UTC would be 05).
  assert.equal(formatDayMonthYear(Date.parse(BIRTH_ISO)), '06 · 12 · 2003');

  const birth = new Date(BIRTH_ISO);
  const target = new Date(TARGET_ISO);
  assert.equal(target.getUTCFullYear() - birth.getUTCFullYear(), BIRTHDAY_AGE);
});

test('TARGET_ISO parses to the UTC instant 2026-12-05T17:00:00Z', () => {
  assert.equal(TARGET_ISO, '2026-12-06T00:00:00+07:00');
  assert.equal(Date.parse(TARGET_ISO), Date.UTC(2026, 11, 5, 17, 0, 0, 0));
  assert.equal(TARGET_MS, Date.UTC(2026, 11, 5, 17, 0, 0, 0));
  assert.equal(new Date(TARGET_MS).toISOString(), '2026-12-05T17:00:00.000Z');
});

test('CAMPAIGN_START_ISO parses to the UTC instant 2026-10-24T17:00:00Z', () => {
  assert.equal(CAMPAIGN_START_ISO, '2026-10-25T00:00:00+07:00');
  assert.equal(Date.parse(CAMPAIGN_START_ISO), Date.UTC(2026, 9, 24, 17, 0, 0, 0));
  assert.equal(CAMPAIGN_START_MS, Date.UTC(2026, 9, 24, 17, 0, 0, 0));
  assert.ok(CAMPAIGN_START_MS < TARGET_MS, 'campaign start precedes the target');
});

test('DAY_MS, HOUR_MS and MINUTE_MS expose the documented unit sizes', () => {
  assert.equal(MINUTE_MS, 60_000);
  assert.equal(HOUR_MS, 3_600_000);
  assert.equal(DAY_MS, 86_400_000);
  assert.equal(DAY_MS, 24 * HOUR_MS);
  assert.equal(HOUR_MS, 60 * MINUTE_MS);
});
