"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { clockSnapshot, nextClockDelay } from "./time";
const NO_BOUNDARIES: number[] = [];
export function useAppClock(
  ticking: boolean,
  onCalendarChange: (previousDay: string, nextDay: string) => void,
  boundaries: readonly number[] = NO_BOUNDARIES,
) {
  const [now, setNow] = useState(() => new Date());
  const observed = useRef(clockSnapshot(now));
  const onChange = useRef(onCalendarChange);
  useEffect(() => {
    onChange.current = onCalendarChange;
  }, [onCalendarChange]);
  const refresh = useCallback((force = true) => {
    const next = new Date(),
      snapshot = clockSnapshot(next),
      previous = observed.current;
    const changed =
      previous.day !== snapshot.day ||
      previous.zone !== snapshot.zone ||
      previous.offset !== snapshot.offset;
    observed.current = snapshot;
    if (changed) onChange.current(previous.day, snapshot.day);
    if (force || changed) setNow(next);
  }, []);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      if (document.visibilityState === "hidden") return;
      const instant = Date.now();
      const boundary = boundaries.find((time) => time > instant) ?? Infinity;
      timer = setTimeout(
        () => {
          refresh(ticking || Date.now() >= boundary);
          schedule();
        },
        Math.min(nextClockDelay(new Date(), ticking), boundary - instant + 1),
      );
    };
    const wake = () => {
      if (document.visibilityState !== "hidden") refresh(true);
      schedule();
    };
    window.addEventListener("focus", wake);
    window.addEventListener("pageshow", wake);
    document.addEventListener("visibilitychange", wake);
    schedule();
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", wake);
      window.removeEventListener("pageshow", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [ticking, refresh, boundaries]);
  return { now, refreshClock: refresh };
}
