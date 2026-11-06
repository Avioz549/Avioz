"use client";
import { useEffect, useState } from "react";
export function AppUpdate({ he, busy }: { he: boolean; busy: boolean }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const hadController = Boolean(navigator.serviceWorker.controller);
    const changed = () => {
      if (hadController) setReady(true);
    };
    navigator.serviceWorker.addEventListener("controllerchange", changed);
    const check = () => {
      if (document.visibilityState === "visible")
        void navigator.serviceWorker
          .getRegistration()
          .then((r) => r?.update())
          .catch(() => {});
    };
    document.addEventListener("visibilitychange", check);
    return () => {
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
        disabled={busy}
        className="secondary"
        onClick={() => location.reload()}
      >
        {he ? "רענון לגרסה החדשה" : "Refresh to update"}
      </button>
    </div>
  ) : null;
}
