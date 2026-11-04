"use client";
import { useEffect } from "react";
import { monthTransactions, type Transaction } from "./finance";
// Foreground reminders only. No financial amounts or descriptions enter notifications.
export function useReminders(
  transactions: Transaction[],
  reminders: { date: string; done: boolean }[],
  workspaceId: string,
  ready: boolean,
  language: "en" | "he" = "en",
) {
  useEffect(() => {
    if (!ready) return;
    const check = async () => {
      if (!("Notification" in window) || Notification.permission !== "granted")
        return;
      const today = new Date().toLocaleDateString("en-CA");
      const due = monthTransactions(transactions, today.slice(0, 7)).filter(
        (t) => t.kind === "expense" && t.date === today,
      );
      const reminderCount = reminders.filter(
        (r) => !r.done && r.date === today,
      ).length;
      if (!due.length && !reminderCount) return;
      const key = `savio-reminder:${workspaceId}:${today}`;
      try {
        if (localStorage.getItem(key)) return;
        const title =
          language === "he"
            ? "SAVIO · תזכורת אישית"
            : "SAVIO · Payment reminder";
        const options = {
          body:
            language === "he"
              ? `היום יש ${due.length} תשלומים מתועדים ו־${reminderCount} תזכורות. פתחו את לוח השנה הכלכלי.`
              : `You have ${due.length} recorded payment(s) and ${reminderCount} reminder(s) today. Review your financial calendar.`,
          tag: "savio-due-payments",
          icon: "/icons/icon-192.png",
        };
        const registration =
          "serviceWorker" in navigator
            ? await navigator.serviceWorker.getRegistration()
            : undefined;
        if (registration?.showNotification)
          await registration.showNotification(title, options);
        else new Notification(title, options);
        localStorage.setItem(key, "sent");
      } catch {
        /* Notification support and storage availability vary by browser. */
      }
    };
    void check();
    const timer = setInterval(() => void check(), 60000);
    return () => clearInterval(timer);
  }, [transactions, reminders, workspaceId, ready, language]);
}
