"use client";
import { useState, useRef } from "react";
import { Download, Upload, History, ShieldAlert, Check } from "lucide-react";
import {
  backupDocument,
  parseBackup,
  recoveryHistory,
  type Recovery,
} from "@/lib/storage";
import type { FinanceData } from "@/lib/finance";
import { Modal } from "./ui";
export function exportBackup(data: FinanceData) {
  const file = JSON.stringify(backupDocument(data), null, 2);
  const url = URL.createObjectURL(
    new Blob([file], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `SAVIO-backup-${new Date().toLocaleDateString("en-CA")}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  try {
    localStorage.setItem("savio-last-export", new Date().toISOString());
  } catch {}
}
export function BackupManager({
  data,
  onSave,
  recoveryMode = false,
}: {
  data: FinanceData;
  onSave: (d: FinanceData) => Promise<boolean | undefined>;
  recoveryMode?: boolean;
}) {
  const he = data.profile.language === "he",
    tr = (en: string, heb: string) => (he ? heb : en);
  const input = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState(""),
    [preview, setPreview] = useState<{
      data: FinanceData;
      warnings: string[];
    } | null>(null),
    [accepted, setAccepted] = useState(false),
    [history, setHistory] = useState<Recovery[] | null>(null),
    [busy, setBusy] = useState(false),
    [lastExport, setLastExport] = useState("");
  const counts = (d: FinanceData) =>
    `${d.transactions.length} ${tr("transactions", "תנועות")} · ${d.shifts.length} ${tr("shifts", "משמרות")} · ${d.goals.length} ${tr("goals", "יעדים")} · ${d.reminders.length} ${tr("reminders", "תזכורות")}`;
  return (
    <article className="panel backup-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">
            {tr("KEEP YOUR DATA YOURS", "הנתונים שלך, בשליטתך")}
          </span>
          <h2>{tr("Backup & restore", "גיבוי ושחזור")}</h2>
        </div>
        <ShieldAlert className="positive" />
      </div>
      <p className="muted">
        {tr(
          "Records stay on this device. Browser storage is not permanent or encrypted. Export a private backup regularly and before changing devices, origins or clearing browser data.",
          "הנתונים נשמרים במכשיר הזה. אחסון הדפדפן אינו קבוע ואינו מוצפן. שמרו גיבוי פרטי באופן קבוע ולפני החלפת מכשיר, כתובת אתר או ניקוי נתוני הדפדפן.",
        )}
      </p>
      <div className="backup-actions">
        {!recoveryMode && (
          <button
            className="primary"
            onClick={() => {
              exportBackup(data);
              setLastExport(new Date().toLocaleString(he ? "he-IL" : "en-US"));
              setNotice(
                tr(
                  "Backup export requested. Save the downloaded JSON somewhere private.",
                  "ייצוא הגיבוי הופעל. שמרו את קובץ ה־JSON במקום פרטי.",
                ),
              );
            }}
          >
            <Download size={18} />
            {tr("Export JSON backup", "ייצוא גיבוי JSON")}
          </button>
        )}
        <button className="secondary" onClick={() => input.current?.click()}>
          <Upload size={18} />
          {tr("Restore JSON backup", "שחזור גיבוי JSON")}
        </button>
        <button
          className="secondary"
          onClick={async () => {
            try {
              setHistory(await recoveryHistory());
            } catch (e) {
              setNotice(
                e instanceof Error ? e.message : "Recovery unavailable",
              );
            }
          }}
        >
          <History size={18} />
          {tr("Recovery history", "היסטוריית שחזור")}
        </button>
      </div>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        hidden
        aria-label={tr("Choose backup file", "בחירת קובץ גיבוי")}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          try {
            if (file.size > 10 * 1024 * 1024)
              throw new Error(
                tr("Backup exceeds 10 MB.", "הגיבוי גדול מ־10MB."),
              );
            setPreview(parseBackup(await file.text()));
            setAccepted(false);
            setNotice("");
          } catch {
            setNotice(
              tr(
                "This file is not a valid supported SAVIO backup. Your current records were not changed.",
                "הקובץ אינו גיבוי SAVIO תקין בגרסה נתמכת. הנתונים הנוכחיים לא השתנו.",
              ),
            );
          }
        }}
      />
      {lastExport && (
        <p className="small muted">
          {tr("Last export requested", "ייצוא אחרון שהתבקש")}: {lastExport}
        </p>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {history && (
        <div className="recovery-list">
          <h3>{tr("Recent on-device versions", "גרסאות אחרונות במכשיר")}</h3>
          <p className="small muted">
            {tr(
              "Up to 10 prior saves. These disappear if browser storage is cleared; they are not an external backup.",
              "עד 10 שמירות קודמות. הן נמחקות עם ניקוי אחסון הדפדפן ואינן תחליף לגיבוי חיצוני.",
            )}
          </p>
          {!history.length && (
            <p className="muted">
              {tr("No previous versions yet.", "אין עדיין גרסאות קודמות.")}
            </p>
          )}
          {history.map((r) => (
            <div className="workplace" key={r.key}>
              <div className="grow">
                <strong>
                  {new Date(r.updatedAt).toLocaleString(he ? "he-IL" : "en-US")}
                </strong>
                <p>{counts(r.data)}</p>
              </div>
              <button
                className="secondary"
                onClick={() => {
                  setPreview({ data: r.data, warnings: [] });
                  setAccepted(false);
                }}
              >
                {tr("Review", "בדיקה")}
              </button>
            </div>
          ))}
        </div>
      )}
      {preview && (
        <Modal
          title={tr("Review before restoring", "בדיקה לפני שחזור")}
          onClose={() => setPreview(null)}
        >
          <div className="restore-summary">
            <Check className="positive" />
            <p>{counts(preview.data)}</p>
          </div>
          {preview.warnings.map((w) => (
            <p className="notice" key={w}>
              {w}
            </p>
          ))}
          <p>
            {tr(
              "Restoring replaces the current workspace. The previous version is retained in on-device recovery history. Export a separate backup first if you need to keep both.",
              "השחזור יחליף את סביבת העבודה הנוכחית. הגרסה הקודמת תישמר בהיסטוריית השחזור במכשיר. ייצאו גיבוי נפרד קודם אם ברצונכם לשמור את שתיהן.",
            )}
          </p>
          {!recoveryMode && (
            <button
              className="secondary spaced"
              onClick={() => exportBackup(data)}
            >
              <Download size={16} />
              {tr(
                "Export current records first",
                "ייצוא הנתונים הנוכחיים תחילה",
              )}
            </button>
          )}
          <label className="checkbox">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            {tr(
              "I reviewed this backup and want to replace my current records.",
              "בדקתי את הגיבוי וברצוני להחליף את הנתונים הנוכחיים.",
            )}
          </label>
          <button
            className="primary full"
            disabled={!accepted || busy}
            onClick={async () => {
              setBusy(true);
              if (await onSave(preview.data)) {
                setPreview(null);
                setHistory(null);
                setNotice(
                  tr("Backup restored successfully.", "הגיבוי שוחזר בהצלחה."),
                );
              } else
                setNotice(
                  tr(
                    "Restore failed. Your previous data was preserved. Reload if another tab changed it.",
                    "השחזור נכשל. הנתונים הקודמים נשמרו. רעננו אם בוצע שינוי בלשונית אחרת.",
                  ),
                );
              setBusy(false);
            }}
          >
            {busy
              ? tr("Restoring…", "משחזר…")
              : tr("Restore reviewed backup", "שחזור הגיבוי שנבדק")}
          </button>
          {notice && (
            <p role="alert" className="notice">
              {notice}
            </p>
          )}
        </Modal>
      )}
    </article>
  );
}
