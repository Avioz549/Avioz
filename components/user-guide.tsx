"use client";
import { useState } from "react";
import {
  Wallet,
  ArrowLeftRight,
  Clock3,
  Target,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
export function UserGuide({
  he,
  onComplete,
}: {
  he: boolean;
  onComplete: () => void;
}) {
  const [step, setStep] = useState(0),
    tr = (en: string, h: string) => (he ? h : en);
  const screens = [
      {
        icon: Wallet,
        title: tr("Welcome to SAVIO", "ברוכים הבאים ל־SAVIO"),
        body: tr(
          "Your money. Your future. One clear place for your records and plans. No registration or bank connection.",
          "הכסף שלך. העתיד שלך. מקום אחד ברור לכסף, לעבודה ולתכניות שלך. ללא הרשמה או חיבור לבנק.",
        ),
      },
      {
        icon: ArrowLeftRight,
        title: tr("Track your money", "עוקבים אחרי הכסף"),
        body: tr(
          "Use + to record income received and expenses. Choose a category and date. Your balance is calculated from these records, not your bank account.",
          "לחצו על + כדי לתעד הכנסה שהתקבלה או הוצאה. בחרו קטגוריה ותאריך. היתרה מחושבת מהרשומות ואינה יתרת בנק מאומתת.",
        ),
      },
      {
        icon: Clock3,
        title: tr("Track shifts and earnings", "משמרות ושכר מסודרים"),
        body: tr(
          "Add a workplace and set your agreement’s hourly and overtime rates. Start, pause and stop the timer, or enter shifts manually. Plan future shifts in the calendar. All salary figures are gross estimates.",
          "הוסיפו מקום עבודה והגדירו שכר וכללים לפי ההסכם. הפעילו, השהו וסיימו משמרת או הזינו ידנית. תכננו משמרות בלוח. כל סכומי השכר הם אומדני ברוטו.",
        ),
      },
      {
        icon: Target,
        title: tr("Create savings goals", "הופכים חלומות ליעדים"),
        body: tr(
          "Choose a target, date and saving share. Record contributions and withdrawals. Shift projections use actual completed shifts and your selected saving percentage. No money is transferred.",
          "בחרו יעד, תאריך ואחוז חיסכון. תעדו הפקדות ומשיכות. תחזיות לפי משמרות מבוססות על עבודה שתועדה ועל האחוז שבחרתם. האפליקציה אינה מעבירה כסף.",
        ),
      },
      {
        icon: CheckCircle2,
        title: tr("Ready for your future", "מוכנים להתחיל"),
        body: tr(
          "Export a private JSON backup regularly from Settings. Browser storage is not permanent or encrypted. Reopen this guide in Settings whenever you need.",
          "ייצאו גיבוי JSON פרטי באופן קבוע דרך ההגדרות. אחסון הדפדפן אינו קבוע ואינו מוצפן. תמיד אפשר לפתוח שוב את מדריך השימוש בהגדרות.",
        ),
      },
    ],
    screen = screens[step],
    Icon = screen.icon;
  const finish = () => {
    try {
      localStorage.setItem("savio-guide-completed", "1");
      localStorage.setItem("savio-welcome-seen", "1");
    } catch {}
    onComplete();
  };
  return (
    <main className="user-guide" dir={he ? "rtl" : "ltr"}>
      <header>
        <strong>SAVIO</strong>
        <button onClick={finish}>{tr("Skip", "דילוג")}</button>
      </header>
      <div className="guide-content">
        <span className="guide-icon">
          <Icon size={64} />
        </span>
        <span className="eyebrow">{step + 1} / 5</span>
        <h1>{screen.title}</h1>
        <p>{screen.body}</p>
        <div
          className="guide-dots"
          role="progressbar"
          aria-label={tr("Guide progress", "התקדמות המדריך")}
          aria-valuemin={1}
          aria-valuemax={5}
          aria-valuenow={step + 1}
        >
          {screens.map((s, i) => (
            <i key={s.title} className={i === step ? "current" : ""} />
          ))}
        </div>
      </div>
      <footer>
        <button
          className="secondary"
          disabled={!step}
          onClick={() => setStep((s) => s - 1)}
        >
          {he ? <ArrowRight /> : <ArrowLeft />}
          {tr("Back", "הקודם")}
        </button>
        <button
          className="primary"
          onClick={() => (step === 4 ? finish() : setStep((s) => s + 1))}
        >
          {step === 4
            ? tr("Start using SAVIO", "מתחילים להשתמש ב־SAVIO")
            : tr("Next", "הבא")}
          {he ? <ArrowLeft /> : <ArrowRight />}
        </button>
      </footer>
    </main>
  );
}
