"use client";
import {
  ArrowLeft,
  ArrowRight,
  ChartNoAxesCombined,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";
export function WelcomeScreen({
  he,
  onStart,
  onLanguage,
}: {
  he: boolean;
  onStart: () => void;
  onLanguage: () => void;
}) {
  return (
    <main className="welcome-screen" dir={he ? "rtl" : "ltr"}>
      <div className="welcome-top">
        <span>SAVIO</span>
        <button onClick={onLanguage}>{he ? "English" : "עברית"}</button>
      </div>
      <div className="welcome-art" aria-hidden="true">
        <div className="welcome-beam" />
        <span className="welcome-monogram">S</span>
        <h1>SAVIO</h1>
        <p>הכסף שלך. העתיד שלך.</p>
        <svg viewBox="0 0 390 170" preserveAspectRatio="none">
          <defs>
            <linearGradient id="welcome-line">
              <stop stopColor="#003d21" />
              <stop offset=".6" stopColor="#27e781" />
              <stop offset="1" stopColor="#b8ffd9" />
            </linearGradient>
            <filter id="welcome-glow">
              <feGaussianBlur stdDeviation="5" />
            </filter>
          </defs>
          <path
            d="M0 150 38 147 76 132 110 122 149 124 186 135 218 127 252 125 281 109 312 114 347 93 390 47"
            fill="none"
            stroke="url(#welcome-line)"
            strokeWidth="8"
            filter="url(#welcome-glow)"
          />
          <path
            d="M0 150 38 147 76 132 110 122 149 124 186 135 218 127 252 125 281 109 312 114 347 93 390 47"
            fill="none"
            stroke="url(#welcome-line)"
            strokeWidth="2"
          />
        </svg>
      </div>
      <div className="welcome-features">
        {[
          {
            icon: ChartNoAxesCombined,
            he: "שליטה חכמה בכסף",
            en: "A clearer view of your money",
          },
          {
            icon: CalendarDays,
            he: "תכנון כלכלי מסודר",
            en: "A financial plan that fits your life",
          },
          {
            icon: ShieldCheck,
            he: "הנתונים נשארים במכשיר שלך",
            en: "Your records stay on your device",
          },
        ].map(({ icon: Icon, ...copy }) => (
          <div key={copy.en}>
            <Icon size={23} />
            <span>{he ? copy.he : copy.en}</span>
          </div>
        ))}
      </div>
      <div className="welcome-bottom">
        <button className="primary" onClick={onStart}>
          {he ? "בואו נתחיל לחסוך" : "Let’s start saving"}
          {he ? <ArrowLeft size={20} /> : <ArrowRight size={20} />}
        </button>
        <p>
          {he
            ? "בלי הרשמה. בלי חיבור לחשבון הבנק."
            : "No registration. No bank connection."}
        </p>
      </div>
    </main>
  );
}
