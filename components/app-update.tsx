"use client";
import { useEffect, useRef, useState } from "react";
export function AppUpdate({ he, busy }: { he: boolean; busy: boolean }) {
  const [ready, setReady] = useState(false),
    [activating, setActivating] = useState(false),
    registration = useRef<ServiceWorkerRegistration | null>(null),
    requested = useRef(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let active = true;
    const cleanups: (() => void)[] = [];
    const watched = new Set<ServiceWorkerRegistration>();
    const watch = (r: ServiceWorkerRegistration) => {
      registration.current = r;
      if (r.waiting && navigator.serviceWorker.controller) setReady(true);
      if (watched.has(r)) return;
      watched.add(r);
      const found = () => {
        const worker = r.installing;
        const stateChanged = () => {
          if (
            active &&
            worker?.state === "installed" &&
            navigator.serviceWorker.controller
          )
            setReady(true);
        };
        worker?.addEventListener("statechange", stateChanged);
        if (worker)
          cleanups.push(() =>
            worker.removeEventListener("statechange", stateChanged),
          );
      };
      r.addEventListener("updatefound", found);
      cleanups.push(() => r.removeEventListener("updatefound", found));
    };
    void navigator.serviceWorker.getRegistration().then((r) => {
      if (r && active) watch(r);
    });
    const changed = () => {
      if (requested.current) location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", changed);
    const check = () => {
      if (document.visibilityState === "visible")
        void navigator.serviceWorker
          .getRegistration()
          .then((r) => {
            if (r) {
              watch(r);
              return r.update();
            }
          })
          .catch(() => {});
    };
    document.addEventListener("visibilitychange", check);
    return () => {
      active = false;
      cleanups.forEach((cleanup) => cleanup());
      navigator.serviceWorker.removeEventListener("controllerchange", changed);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  return ready ? (
    <div className="notice no-print" role="status">
      <span>
        {he
          ? "גרסה חדשה מוכנה. שמרו טפסים פתוחים לפני הרענון."
          : "A new version is ready. Save open forms before refreshing."}
      </span>
      <button
        className="secondary"
        disabled={busy || activating}
        onClick={() => {
          if (document.querySelector("dialog[open]")) return;
          const waiting = registration.current?.waiting;
          if (waiting) {
            requested.current = true;
            setActivating(true);
            waiting.postMessage({ type: "ACTIVATE_SAVIO_UPDATE" });
          } else location.reload();
        }}
      >
        {he ? "רענון לגרסה החדשה" : "Refresh to update"}
      </button>
    </div>
  ) : null;
}
