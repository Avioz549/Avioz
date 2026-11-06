"use client";
import { themes, type Theme } from "@/lib/themes";
import { useState } from "react";
import {
  UserRound,
  Globe,
  Download,
  Upload,
  FileSpreadsheet,
  Bell,
  Palette,
  Coins,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Smartphone,
  Info,
  Trash2,
} from "lucide-react";
import { emptyData, csvExport, type FinanceData } from "@/lib/finance";
import { BackupManager, exportBackup } from "./backup-manager";
import { Field, Modal } from "./ui";
export function SettingsScreen({
  data,
  onSave,
  busy,
  onWelcome,
  onAI,
}: {
  data: FinanceData;
  onSave: (d: FinanceData) => Promise<boolean | undefined>;
  busy: boolean;
  onWelcome: () => void;
  onAI: () => void;
}) {
  const he = data.profile.language === "he",
    tr = (en: string, heb: string) => (he ? heb : en),
    [pane, setPane] = useState<
      "profile" | "backup" | "install" | "about" | "theme" | null
    >(null),
    [notice, setNotice] = useState("");
  const Arrow = he ? ChevronLeft : ChevronRight;
  const row = (
    label: string,
    detail: string,
    Icon: typeof UserRound,
    action: () => void,
  ) => (
    <button className="settings-row" key={label} onClick={action}>
      <Icon size={20} />
      <span>{label}</span>
      {detail && <small>{detail}</small>}
      <Arrow size={16} />
    </button>
  );
  return (
    <section className="reference-settings">
      <div className="settings-row-group">
        {row(
          tr("Profile & personal details", "פרופיל ופרטים אישיים"),
          data.profile.name,
          UserRound,
          () => setPane("profile"),
        )}
        {row(tr("Language", "שפה"), he ? "עברית" : "English", Globe, () =>
          setPane("profile"),
        )}
        {row(tr("Currency", "מטבע"), data.profile.currency, Coins, () =>
          setPane("profile"),
        )}
      </div>
      <div className="settings-row-group">
        {row(
          tr("Export JSON backup", "גיבוי נתונים (JSON)"),
          "",
          Download,
          () => {
            exportBackup(data);
            setNotice(
              tr(
                "JSON backup export requested. Keep the file somewhere private.",
                "ייצוא גיבוי JSON הופעל. שמרו את הקובץ במקום פרטי.",
              ),
            );
          },
        )}
        {row(tr("Restore & recovery", "שחזור נתונים"), "", Upload, () =>
          setPane("backup"),
        )}
        {row(
          tr("Export transactions CSV", "ייצוא תנועות (CSV)"),
          "",
          FileSpreadsheet,
          () => {
            const url = URL.createObjectURL(
              new Blob([csvExport(data.transactions)], {
                type: "text/csv;charset=utf-8",
              }),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = "SAVIO-transactions.csv";
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          },
        )}
      </div>
      <div className="settings-row-group">
        {row(tr("Notifications", "התראות"), " ", Bell, async () => {
          try {
            if (!("Notification" in window)) {
              setNotice(
                tr(
                  "Notifications are not supported in this browser.",
                  "הדפדפן אינו תומך בהתראות.",
                ),
              );
              return;
            }
            const permission = await Notification.requestPermission();
            setNotice(
              permission === "granted"
                ? tr(
                    "Foreground reminders enabled. Keep SAVIO open for due-date checks.",
                    "התזכורות הופעלו. השאירו את SAVIO פתוח לבדיקת תאריכי היעד.",
                  )
                : tr(
                    "Notification permission was not granted.",
                    "לא ניתן אישור להתראות.",
                  ),
            );
          } catch {
            setNotice(
              tr(
                "Notifications are unavailable here.",
                "התראות אינן זמינות כאן.",
              ),
            );
          }
        })}
        {row(
          tr("App design", "עיצוב האפליקציה"),
          themes.find((t) => t.id === data.profile.theme)?.[he ? "he" : "en"] ??
            "",
          Palette,
          () => setPane("theme"),
        )}
        {row(
          "SAVIO AI",
          tr("Financial coach", "המאמן הפיננסי שלך"),
          Sparkles,
          onAI,
        )}
      </div>
      <div className="settings-row-group">
        {row(tr("Install on iPhone", "הוספה למסך הבית"), "", Smartphone, () =>
          setPane("install"),
        )}
        {row(tr("About SAVIO", "על SAVIO"), "3.0", Info, () =>
          setPane("about"),
        )}
        {row(tr("User guide", "מדריך שימוש"), "", ShieldCheck, onWelcome)}
      </div>
      <p className="settings-storage-note">
        <ShieldCheck size={15} />
        {tr(
          "Local storage is not permanent or encrypted. Keep private JSON backups.",
          "האחסון המקומי אינו קבוע ואינו מוצפן. שמרו גיבויי JSON פרטיים.",
        )}
      </p>
      <button
        className="danger"
        disabled={busy}
        onClick={async () => {
          if (
            confirm(
              tr(
                "Delete current financial records? Export a backup first. Recovery versions and the original V2 copy remain until browser data is cleared.",
                "למחוק את הרשומות הנוכחיות? ייצאו גיבוי תחילה. היסטוריית השחזור והעותק מגרסה 2 נשארים עד לניקוי נתוני הדפדפן.",
              ),
            )
          ) {
            const next = { ...data, ...emptyData(), profile: data.profile };
            await onSave(next);
          }
        }}
      >
        <Trash2 size={16} />
        {tr("Delete current financial records", "מחיקת הרשומות הנוכחיות")}
      </button>
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      {pane && (
        <Modal
          title={
            pane === "theme"
              ? tr("App design", "עיצוב האפליקציה")
              : pane === "profile"
                ? tr("Your preferences", "ההעדפות שלך")
                : pane === "backup"
                  ? tr("Backup & restore", "גיבוי ושחזור")
                  : pane === "install"
                    ? tr("Install SAVIO", "התקנת SAVIO")
                    : tr("About SAVIO", "על SAVIO")
          }
          onClose={() => setPane(null)}
        >
          {pane === "theme" ? (
            <div
              className="theme-picker"
              role="group"
              aria-label={tr("Choose theme", "בחירת ערכת עיצוב")}
            >
              <p className="muted">
                {tr(
                  "Changes apply immediately and are saved on this device.",
                  "השינויים מוחלים מיד ונשמרים במכשיר הזה.",
                )}
              </p>
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  className="theme-option"
                  disabled={busy}
                  aria-pressed={data.profile.theme === theme.id}
                  onClick={() =>
                    void onSave({
                      ...data,
                      profile: { ...data.profile, theme: theme.id },
                    })
                  }
                >
                  <span
                    className="theme-preview"
                    aria-hidden="true"
                    style={{ background: theme.background }}
                  >
                    <span style={{ background: theme.surface }}>
                      <i style={{ background: theme.accent }} />
                    </span>
                  </span>
                  <span>{he ? theme.he : theme.en}</span>
                  <span aria-hidden="true">
                    {data.profile.theme === theme.id ? "✓" : ""}
                  </span>
                </button>
              ))}
            </div>
          ) : pane === "profile" ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                if (
                  await onSave({
                    ...data,
                    profile: {
                      ...data.profile,
                      name: String(f.get("name")),
                      currency: f.get("currency") as "ILS",
                      language: f.get("language") as "en",
                      theme: f.get("theme") as Theme,
                    },
                  })
                )
                  setPane(null);
              }}
            >
              <Field label={tr("Your name", "השם שלך")}>
                <input
                  name="name"
                  maxLength={100}
                  defaultValue={data.profile.name}
                />
              </Field>
              <Field label={tr("Display currency", "מטבע לתצוגה")}>
                <select name="currency" defaultValue={data.profile.currency}>
                  {["ILS", "USD", "EUR", "GBP"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label={tr("Language", "שפה")}>
                <select name="language" defaultValue={data.profile.language}>
                  <option value="he">עברית</option>
                  <option value="en">English</option>
                </select>
              </Field>
              <Field label={tr("Appearance", "מראה")}>
                <select name="theme" defaultValue={data.profile.theme}>
                  {themes.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {he ? theme.he : theme.en}
                    </option>
                  ))}
                </select>
              </Field>
              <p className="small muted">
                {tr(
                  "Currency changes display units only, not exchange rates.",
                  "המטבע משנה תצוגה בלבד, ללא המרת שערים.",
                )}
              </p>
              <button className="primary full" disabled={busy}>
                {tr("Save preferences", "שמירת העדפות")}
              </button>
            </form>
          ) : pane === "backup" ? (
            <BackupManager data={data} onSave={onSave} />
          ) : pane === "install" ? (
            <p>
              {tr(
                "Open SAVIO in iPhone Safari → Share → Add to Home Screen. Export a backup before changing addresses, browsers or devices.",
                "פתחו את SAVIO ב־Safari ב־iPhone ← שיתוף ← הוספה למסך הבית. ייצאו גיבוי לפני מעבר כתובת, דפדפן או מכשיר.",
              )}
            </p>
          ) : (
            <div className="about-savio">
              <strong>SAVIO</strong>
              <p>הכסף שלך. העתיד שלך.</p>
              <p className="muted">
                {tr(
                  "Version 3.0 · personal, local-first financial planning. No login, bank connection or verified bank balances.",
                  "גרסה 3.0 · תכנון פיננסי אישי ומקומי. ללא התחברות, חיבור לבנק או יתרות בנק מאומתות.",
                )}
              </p>
            </div>
          )}
        </Modal>
      )}
    </section>
  );
}
