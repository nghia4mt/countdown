import { useEffect, useState } from 'react';
import {
  CAMPAIGN_START_MS,
  computeRemaining,
  progressRatio,
} from '../lib/countdown.js';

/** Smallest delay we ever schedule; guards against busy-looping near boundaries. */
const MIN_DELAY_MS = 16;
/** Slack added when the very last tick lands on the deadline itself. */
const DEADLINE_SLACK_MS = 24;

/**
 * Wall-clock countdown with drift compensation.
 *
 * Every tick re-reads `Date.now()` and re-schedules itself against the next
 * whole-second boundary of the wall clock, so the rendered value follows real
 * time instead of accumulating `setInterval` drift (including throttled or
 * backgrounded tabs). The first value is available immediately on mount and the
 * loop stops once the target is reached.
 *
 * @param {number} targetMs epoch milliseconds of the deadline
 * @returns {{
 *   remaining: { days: number, hours: number, minutes: number, seconds: number },
 *   progress: number,
 *   isExpired: boolean,
 * }}
 */
export function useCountdown(targetMs) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let timerId = 0;
    let stopped = false;

    /** Read the clock, render it, then aim at the next second boundary. */
    const tick = () => {
      if (stopped) return;

      const current = Date.now();
      setNow(current);

      const toTarget = targetMs - current;
      if (!(toTarget > 0)) return; // expired — nothing left to count.

      const delay =
        toTarget < 1000
          ? toTarget + DEADLINE_SLACK_MS
          : 1000 - (current % 1000);

      timerId = window.setTimeout(tick, Math.max(MIN_DELAY_MS, delay));
    };

    /** A hidden tab throttles timers, so resync as soon as it is visible again. */
    const handleVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      window.clearTimeout(timerId);
      tick();
    };

    tick();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stopped = true;
      window.clearTimeout(timerId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [targetMs]);

  const computed = computeRemaining(targetMs, now);
  const remaining = {
    days: computed.days,
    hours: computed.hours,
    minutes: computed.minutes,
    seconds: computed.seconds,
  };

  return {
    remaining,
    progress: progressRatio(CAMPAIGN_START_MS, targetMs, now),
    isExpired: computed.expired,
  };
}
