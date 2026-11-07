"use client";
import { useEffect } from "react";
import type { FinanceData } from "./finance";
import { lifeOf, plannerEntries, shiftDate } from "./life";
import { dateKey } from "./payroll";
export function useLifeReminders(data: FinanceData, ready: boolean) {
  useEffect(() => {
    const prefs = lifeOf(data).preferences;
    if (!ready || !(prefs.shiftReminders || prefs.plannerReminders)) return;
    const check = async () => {
      if (
        document.visibilityState === "hidden" ||
        !("Notification" in window) ||
        Notification.permission !== "granted"
      )
        return;
      const now = Date.now(),
        near = (time: number) => time >= now && time - now <= 30 * 60000;
      const alerts = prefs.shiftReminders
        ? data.shifts
            .filter((s) => s.scheduled && near(Date.parse(s.start)))
            .map((s) => ({
              key: `savio-shift:${s.id}:${s.start}`,
              kind: "shift",
            }))
        : [];
      if (prefs.plannerReminders) {
        const today = dateKey(new Date());
        for (const entry of plannerEntries(data, today, shiftDate(today, 1))) {
          if (
            ["task", "event"].includes(entry.type) &&
            !entry.done &&
            entry.time &&
            near(Date.parse(entry.date + "T" + entry.time))
          )
            alerts.push({ key: `savio-plan:${entry.key}`, kind: "planner" });
        }
      }
      for (const alert of alerts) {
        try {
          if (localStorage.getItem(alert.key)) continue;
          const title =
              data.profile.language === "he"
                ? "SAVIO · תזכורת אישית"
                : "SAVIO · Personal reminder",
            options = {
              body:
                data.profile.language === "he"
                  ? "יש תכנון קרוב. פתחו את SAVIO לפרטים."
                  : "A planned activity starts soon. Open SAVIO for details.",
              tag: alert.key,
              icon: "/icons/icon-192.png",
            };
          const registration = await navigator.serviceWorker?.getRegistration();
          if (registration?.showNotification)
            await registration.showNotification(title, options);
          else new Notification(title, options);
          localStorage.setItem(alert.key, "sent");
        } catch {}
      }
    };
    void check();
    const timer = setInterval(() => void check(), 60000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [data, ready]);
}
