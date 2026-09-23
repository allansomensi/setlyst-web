"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * A seconds countdown for "resend the code" buttons. `start(n)` begins
 * counting down from `n`; `remaining` is 0 when nothing is pending.
 * Driven by a deadline (not by counting ticks), so a throttled
 * background tab still shows the right value when it comes back.
 */
export function useCountdown(): [number, (seconds: number) => void] {
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (deadline === null) return;
    const id = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= deadline) {
        setDeadline(null);
        window.clearInterval(id);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [deadline]);

  const start = useCallback((seconds: number) => {
    const current = Date.now();
    setNow(current);
    setDeadline(seconds > 0 ? current + Math.ceil(seconds) * 1000 : null);
  }, []);

  const remaining =
    deadline === null ? 0 : Math.max(0, Math.ceil((deadline - now) / 1000));
  return [remaining, start];
}
