"use client";
import { Download, Smartphone, Trash2, ShieldCheck } from "lucide-react";
import { emptyData, csvExport, type FinanceData } from "@/lib/finance";
import { BackupManager, exportBackup } from "./backup-manager";
import { Field } from "./ui";
export function SettingsScreen({
  data,
  onSave,
  busy,
}: {
  data: FinanceData;
  onSave: (d: FinanceData) => Promise<boolean | undefined>;
  busy: boolean;
}) {
  const he = data.profile.language === "he",
    tr = (en: string, heb: string) => (he ? heb : en);
  return (
    <div className="settings-grid">
      <div>
        <article className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">
                {tr("MAKE IT YOURS", "בדיוק בשבילך")}
              </span>
              <h2>{tr("Your preferences", "ההעדפות שלך")}</h2>
            </div>
            <ShieldCheck className="positive" />
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void onSave({
                ...data,
                profile: {
                  name: String(f.get("name")),
                  currency: f.get("currency") as "ILS",
                  language: f.get("language") as "en",
                  theme: f.get("theme") as "dark",
                },
              });
            }}
          >
            <Field label={tr("Your name", "השם שלך")}>
              <input
                name="name"
                maxLength={100}
                autoComplete="given-name"
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
            <p className="small muted">
              {tr(
                "Display units only. No exchange-rate conversion is performed; keep records in one currency.",
                "שינוי תצוגה בלבד, ללא המרת שערים. שמרו את הרשומות במטבע אחד.",
              )}
            </p>
            <Field label={tr("Language", "שפה")}>
              <select name="language" defaultValue={data.profile.language}>
                <option value="en">English</option>
                <option value="he">עברית</option>
              </select>
            </Field>
            <Field label={tr("Appearance", "מראה")}>
              <select name="theme" defaultValue={data.profile.theme}>
                <option value="dark">{tr("Dark", "כהה")}</option>
                <option value="light">{tr("Light", "בהיר")}</option>
              </select>
            </Field>
            <button className="primary" disabled={busy}>
              {tr("Save preferences", "שמירת העדפות")}
            </button>
          </form>
        </article>
        <article className="panel spaced">
          <Smartphone className="positive" />
          <h2>{tr("SAVIO on your Home Screen", "SAVIO במסך הבית שלך")}</h2>
          <p className="muted">
            {tr(
              "On iPhone, open SAVIO in Safari, tap Share, then Add to Home Screen. Use the same address to keep access to this browser’s records. Export a backup before switching addresses or devices.",
              "ב־iPhone פתחו את SAVIO ב־Safari, לחצו על שיתוף ואז ״הוספה למסך הבית״. השתמשו באותה כתובת כדי לשמור גישה לרשומות הדפדפן הזה. ייצאו גיבוי לפני החלפת כתובת או מכשיר.",
            )}
          </p>
        </article>
      </div>
      <div>
        <BackupManager data={data} onSave={onSave} />
        <article className="panel spaced">
          <h2>{tr("Export & manage records", "ייצוא וניהול נתונים")}</h2>
          <p className="muted">
            {tr(
              "CSV exports all original transaction records. Recurring schedules appear once, not as duplicate historical payments.",
              "ייצוא CSV כולל את כל רשומות התנועות המקוריות. תנועות חוזרות מופיעות פעם אחת, ללא יצירת תשלומי עבר כפולים.",
            )}
          </p>
          <button
            className="secondary"
            onClick={() => {
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
            }}
          >
            <Download size={18} />
            {tr("Export all transactions CSV", "ייצוא כל התנועות ל־CSV")}
          </button>
          <button
            className="danger"
            disabled={busy}
            onClick={async () => {
              if (
                !confirm(
                  tr(
                    "Delete current financial records? Export a JSON backup first. On-device recovery versions and the original migrated V2 copy are kept until you clear site storage.",
                    "למחוק את הנתונים הפיננסיים הנוכחיים? ייצאו גיבוי JSON תחילה. היסטוריית השחזור והעותק המקורי מגרסה 2 נשארים עד לניקוי אחסון האתר.",
                  ),
                )
              )
                return;
              const next = emptyData();
              next.profile = data.profile;
              await onSave(next);
            }}
          >
            <Trash2 size={18} />
            {tr(
              "Delete current financial records",
              "מחיקת הנתונים הפיננסיים הנוכחיים",
            )}
          </button>
          <button className="text-button" onClick={() => exportBackup(data)}>
            {tr(
              "Create a backup before making changes",
              "יצירת גיבוי לפני ביצוע שינויים",
            )}
          </button>
        </article>
      </div>
    </div>
  );
}
