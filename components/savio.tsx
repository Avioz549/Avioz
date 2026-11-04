"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Clock3,
  Target,
  ChartPie,
  CalendarDays,
  Sparkles,
  Settings,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowRight,
  Download,
  Play,
  Square,
  Trash2,
  Pencil,
  Globe,
  Sun,
  Moon,
  ShieldCheck,
  Menu,
  Check,
  TrendingUp,
} from "lucide-react";
import {
  emptyData,
  dataSchema,
  shiftPay,
  monthTransactions,
  totals,
  goalSaved,
  savingsPlan,
  csvExport,
  transactionSchema,
  workplaceSchema,
  goalSchema,
  shiftSchema,
  type FinanceData,
  type Transaction,
  type Goal,
  type Shift,
  type Workplace,
} from "@/lib/finance";
import { words } from "@/lib/i18n";
import { elapsedLabel, localMonth } from "@/lib/time";
import { useReminders } from "@/lib/use-reminders";
import { categoryLabel } from "@/lib/categories";
import { SpendingAnalytics } from "./spending-analytics";
import { FinancialCalendar } from "./financial-calendar";
import { SettingsScreen } from "./settings-screen";
import { BackupManager, exportBackup } from "./backup-manager";
import { PurchaseCalculator } from "./purchase-calculator";
import {
  loadWorkspace,
  saveWorkspace,
  rawWorkspace,
  storedRevision,
} from "@/lib/storage";
import { aiPayload } from "@/lib/ai";
import { Modal, Field, Empty } from "./ui";
type Tab =
  | "overview"
  | "transactions"
  | "shifts"
  | "goals"
  | "budgets"
  | "calendar"
  | "ai"
  | "settings"
  | "more"
  | "challenges";
type Editor =
  | { kind: "transaction"; value?: Transaction }
  | { kind: "goal"; value?: Goal }
  | { kind: "workplace"; value?: Workplace }
  | { kind: "shift"; value?: Shift }
  | { kind: "contribution"; value: Goal }
  | null;
const baseCategories = [
  "Food & dining",
  "Groceries",
  "Transport",
  "Shopping",
  "Housing",
  "Health",
  "Entertainment",
  "Salary",
  "Freelance",
  "Other",
];
const today = () => new Date().toLocaleDateString("en-CA");
const id = () => crypto.randomUUID();
function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
export function Savio() {
  const revision = useRef(0);
  const saving = useRef(false);
  const [data, setData] = useState<FinanceData>(emptyData),
    [ready, setReady] = useState(false),
    [tab, updateTab] = useState<Tab>("overview"),
    [editor, updateEditor] = useState<Editor>(null),
    [month, setMonth] = useState(today().slice(0, 7)),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(new Date()),
    [consent, setConsent] = useState(false),
    [aiAvailable, setAiAvailable] = useState(false),
    [chat, setChat] = useState<{ role: string; text: string }[]>([]),
    [question, setQuestion] = useState(""),
    [mode, setMode] = useState<"conservative" | "balanced" | "accelerated">(
      "balanced",
    ),
    [backupDue, setBackupDue] = useState(false);
  useReminders(
    data.transactions,
    data.reminders,
    "local-v3",
    ready,
    data.profile.language,
  );
  function setTab(next: Tab) {
    setMessage("");
    window.scrollTo({ top: 0, behavior: "instant" });
    updateTab(next);
    const url = new URL(location.href);
    url.searchParams.set("tab", next);
    history.replaceState(null, "", url);
  }
  function setEditor(next: Editor) {
    setMessage("");
    updateEditor(next);
  }
  const categories = [
    ...new Set([
      ...baseCategories,
      ...data.transactions.map((t) => t.category),
      ...Object.keys(data.budgets).map((k) => k.slice(k.indexOf(":") + 1)),
    ]),
  ];
  const t = words[data.profile.language],
    he = data.profile.language === "he";
  const txs = monthTransactions(data.transactions, month),
    sum = totals(txs);
  const money = (n: number) =>
    new Intl.NumberFormat(he ? "he-IL" : "en-IL", {
      style: "currency",
      currency: data.profile.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(n);
  useEffect(() => {
    let active = true;
    async function init() {
      const initialTab = new URLSearchParams(location.search).get("tab");
      if (
        initialTab &&
        [
          "overview",
          "transactions",
          "shifts",
          "goals",
          "budgets",
          "calendar",
          "ai",
          "settings",
          "more",
          "challenges",
        ].includes(initialTab)
      )
        updateTab(initialTab as Tab);
      try {
        const { snapshot, migrated } = await loadWorkspace();
        if (!active) return;
        revision.current = snapshot.revision;
        setData(snapshot.data);
        setReady(true);
        if (migrated)
          setMessage(
            "Your existing local records were migrated safely. The original copy was kept.",
          );
        const last = localStorage.getItem("savio-last-export");
        setBackupDue(!last || Date.now() - Date.parse(last) > 7 * 86400000);
        if (navigator.storage?.persist)
          void navigator.storage.persist().catch(() => false);
      } catch (error) {
        revision.current = await storedRevision().catch(() => 0);
        if (active)
          setMessage(
            error instanceof Error
              ? error.message
              : "Could not open your records. Nothing was erased.",
          );
      }
    }
    void init();
    void fetch("/api/ai")
      .then((r) => r.json())
      .then((r) => {
        if (active) setAiAvailable(Boolean(r.available));
      })
      .catch(() => {});
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!data.shifts.some((s) => !s.end)) return;
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [data.shifts]);
  useEffect(() => {
    document.documentElement.lang = data.profile.language;
    document.documentElement.dir = he ? "rtl" : "ltr";
    document.documentElement.dataset.theme = data.profile.theme;
  }, [data.profile.language, data.profile.theme, he]);
  async function commit(next: FinanceData) {
    if (saving.current || !ready) return false;
    const parsed = dataSchema.safeParse(next);
    if (!parsed.success) {
      setMessage(parsed.error.issues[0].message);
      return false;
    }
    saving.current = true;
    setBusy(true);
    try {
      const snapshot = await saveWorkspace(parsed.data, revision.current);
      revision.current = snapshot.revision;
      setData(parsed.data);
      return true;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Save failed");
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  function changeMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const monthLabel = new Date(month + "-15T12:00:00").toLocaleDateString(
    he ? "he-IL" : "en-US",
    { month: "long", year: "numeric" },
  );
  const chart = Array.from(
    {
      length: new Date(
        Number(month.slice(0, 4)),
        Number(month.slice(5)),
        0,
      ).getDate(),
    },
    (_, i) => {
      const day = String(i + 1).padStart(2, "0");
      const daily = totals(txs.filter((x) => x.date.endsWith("-" + day)));
      return { day: i + 1, income: daily.income, expenses: daily.expenses };
    },
  );
  const pay = data.shifts
    .filter((s) => localMonth(s.start) === month)
    .reduce(
      (n, s) =>
        n +
        shiftPay(
          s,
          data.workplaces.find((w) => w.id === s.workplaceId)!,
          now,
        ).gross,
      0,
    );
  const saved = data.goals.reduce((n, g) => n + goalSaved(g), 0),
    target = data.goals.reduce((n, g) => n + g.target, 0);
  const activeShift = data.shifts.find((s) => !s.end);
  async function remove(
    kind: "transactions" | "goals" | "shifts" | "workplaces",
    key: string,
  ) {
    if (!confirm(he ? "למחוק את הרשומה?" : "Delete this record?")) return;
    if (
      kind === "workplaces" &&
      data.shifts.some((s) => s.workplaceId === key)
    ) {
      setMessage("Remove associated shifts before deleting a workplace.");
      return;
    }
    await commit({ ...data, [kind]: data[kind].filter((x) => x.id !== key) });
  }
  async function startShift(workplaceId: string) {
    if (activeShift) return;
    await commit({
      ...data,
      shifts: [
        ...data.shifts,
        {
          id: id(),
          workplaceId,
          start: new Date().toISOString(),
          end: null,
          breakMinutes: 0,
          paidBreak: false,
          premium: false,
        },
      ],
    });
  }
  async function stopShift() {
    if (!activeShift) return;
    await commit({
      ...data,
      shifts: data.shifts.map((s) =>
        s.id === activeShift.id ? { ...s, end: new Date().toISOString() } : s,
      ),
    });
  }
  async function submitEditor(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editor) return;
    const f = new FormData(e.currentTarget),
      v = (key: string) => String(f.get(key) || ""),
      n = (key: string) => Number(f.get(key)),
      checked = (key: string) => f.get(key) === "on";
    const next = { ...data };
    try {
      if (editor.kind === "transaction") {
        const value = transactionSchema.parse({
          id: editor.value?.id || id(),
          title: v("title"),
          amount: n("amount"),
          kind: v("kind"),
          category: v("category"),
          date: v("date"),
          recurring: checked("recurring"),
        });
        next.transactions = editor.value
          ? data.transactions.map((x) => (x.id === value.id ? value : x))
          : [...data.transactions, value];
      }
      if (editor.kind === "workplace") {
        const value = workplaceSchema.parse({
          id: editor.value?.id || id(),
          name: v("name"),
          wage: n("wage"),
          regularHours: n("regularHours"),
          overtimeHours: n("overtimeHours"),
          overtimeRate: n("overtimeRate"),
          extraRate: n("extraRate"),
          premiumRate: n("premiumRate"),
        });
        next.workplaces = editor.value
          ? data.workplaces.map((x) => (x.id === value.id ? value : x))
          : [...data.workplaces, value];
      }
      if (editor.kind === "shift") {
        const value = shiftSchema.parse({
          id: editor.value?.id || id(),
          workplaceId: v("workplaceId"),
          start: new Date(v("start")).toISOString(),
          end: new Date(v("end")).toISOString(),
          breakMinutes: n("breakMinutes"),
          paidBreak: checked("paidBreak"),
          premium: checked("premium"),
        });
        next.shifts = editor.value
          ? data.shifts.map((x) => (x.id === value.id ? value : x))
          : [...data.shifts, value];
      }
      if (editor.kind === "goal") {
        const value = goalSchema.parse({
          id: editor.value?.id || id(),
          name: v("name"),
          target: n("target"),
          existing: n("existing"),
          monthly: n("monthly"),
          date: v("date") || null,
          contributions: editor.value?.contributions || [],
        });
        next.goals = editor.value
          ? data.goals.map((x) => (x.id === value.id ? value : x))
          : [...data.goals, value];
      }
      if (editor.kind === "contribution") {
        const amount = n("amount");
        if (amount <= 0 || !Number.isFinite(amount))
          throw new Error("Enter a positive amount");
        next.goals = data.goals.map((g) =>
          g.id === editor.value.id
            ? {
                ...g,
                contributions: [
                  ...g.contributions,
                  { id: id(), amount, date: v("date") },
                ],
              }
            : g,
        );
      }
      if (await commit(next)) {
        setEditor(null);
        setMessage(he ? "נשמר בהצלחה" : "Saved successfully");
      }
    } catch (err) {
      setBusy(false);
      setMessage(err instanceof Error ? err.message : "Check your entries");
    }
  }
  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || busy) return;
    const text = question;
    setChat((c) => [...c, { role: "You", text }]);
    setQuestion("");
    setBusy(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(aiPayload(text, data, month, consent)),
      });
      const result = await res.json();
      setChat((c) => [
        ...c,
        { role: "SAVIO", text: result.reply || result.error },
      ]);
    } catch {
      setMessage("Unable to reach AI. Please use the local insights.");
    } finally {
      setBusy(false);
      setConsent(false);
    }
  }
  const nav = [
    { key: "overview", icon: LayoutDashboard },
    { key: "transactions", icon: ArrowLeftRight },
    { key: "shifts", icon: Clock3 },
    { key: "goals", icon: Target },
    { key: "budgets", icon: ChartPie },
    { key: "calendar", icon: CalendarDays },
    { key: "ai", icon: Sparkles },
    { key: "challenges", icon: TrendingUp },
    { key: "settings", icon: Settings },
  ] as const;
  const label = (key: Tab) =>
    key === "more"
      ? he
        ? "עוד"
        : "More"
      : key === "challenges"
        ? he
          ? "אתגרים"
          : "Challenges"
        : key === "overview"
          ? he
            ? "בית"
            : "Home"
          : key === "shifts"
            ? he
              ? "עבודה"
              : "Work"
            : key === "goals"
              ? he
                ? "חיסכון"
                : "Savings"
              : t[key];
  const primaryNav = [
    { key: "overview", icon: LayoutDashboard },
    { key: "transactions", icon: ArrowLeftRight },
    { key: "shifts", icon: Clock3 },
    { key: "goals", icon: Target },
    { key: "more", icon: Menu },
  ] as const;
  const transactionList = (items: Transaction[]) =>
    items.length ? (
      <div className="transaction-list">
        {items.map((x) => (
          <div className="transaction-row" key={x.id}>
            <span
              className={
                "transaction-icon " + (x.kind === "income" ? "positive" : "")
              }
            >
              {x.kind === "income" ? (
                <ArrowDownRight size={19} />
              ) : (
                <ArrowUpRight size={19} />
              )}
            </span>
            <div className="grow">
              <strong>{x.title}</strong>
              <small>
                {categoryLabel(x.category, he)} {x.recurring ? "· ↻" : ""}
              </small>
            </div>
            <div className="transaction-amount">
              <strong className={x.kind === "income" ? "positive" : ""}>
                {x.kind === "income" ? "+" : "−"}
                {money(x.amount)}
              </strong>
              <small>
                {new Date(x.date + "T12:00:00").toLocaleDateString(
                  he ? "he-IL" : "en-US",
                  { month: "short", day: "numeric" },
                )}
              </small>
            </div>
            {tab === "transactions" && (
              <div className="row-actions">
                <button
                  aria-label={t.edit}
                  onClick={() =>
                    setEditor({
                      kind: "transaction",
                      value: data.transactions.find((z) => z.id === x.id),
                    })
                  }
                >
                  <Pencil size={15} />
                </button>
                <button
                  aria-label={t.delete}
                  onClick={() => remove("transactions", x.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    ) : (
      <Empty title={t.welcome} description={t.empty} />
    );
  const goalCards = (limit?: number) =>
    (limit ? data.goals.slice(0, limit) : data.goals).map((g, i) => {
      const progress = Math.min(100, (goalSaved(g) / g.target) * 100),
        plan = savingsPlan(
          g,
          sum.balance *
            (g.monthly /
              Math.max(
                1,
                data.goals.reduce((n, x) => n + x.monthly, 0),
              )),
          mode,
        );
      return (
        <article key={g.id} className="goal-card">
          <div className="flex-between">
            <span className={"goal-icon goal-" + (i % 3)}>
              <Target size={21} />
            </span>
            <span className="pill">{Math.round(progress)}%</span>
          </div>
          <h3>{g.name}</h3>
          <div className="goal-values">
            <strong>{money(goalSaved(g))}</strong>
            <span> / {money(g.target)}</span>
          </div>
          <div className="progress">
            <i style={{ width: progress + "%" }} />
          </div>
          <div className="flex-between muted small">
            <span>
              {g.date
                ? new Date(g.date + "T12:00:00").toLocaleDateString(
                    he ? "he-IL" : "en-US",
                    { month: "short", year: "numeric" },
                  )
                : he
                  ? "ללא תאריך יעד"
                  : "No target date"}
            </span>
            <span>
              {money(g.monthly)} / {he ? "חודש" : "mo"}
            </span>
          </div>
          {tab === "goals" && (
            <>
              <p className="small muted">
                {he ? "תכנית מותאמת לתזרים" : "Plan based on cash flow"}:{" "}
                {money(plan.monthly)} / {he ? "חודש" : "mo"} ·{" "}
                {plan.completion ||
                  (he ? "אין אומדן סיום" : "No completion estimate")}
              </p>
              <p className="small muted">
                {he
                  ? "נדרש מדי חודש לתאריך היעד"
                  : "Required monthly to meet your date"}
                :{" "}
                {plan.requiredMonthly === null
                  ? "—"
                  : money(plan.requiredMonthly)}{" "}
                ·{" "}
                {plan.onTrack
                  ? he
                    ? "בקצב המתאים"
                    : "On track"
                  : he
                    ? "נדרשת התאמת התכנית"
                    : "Adjust your plan"}
              </p>
              <div className="button-row">
                <button
                  className="secondary"
                  onClick={() => setEditor({ kind: "contribution", value: g })}
                >
                  <Plus size={14} />
                  {he ? "הפקדה" : "Contribute"}
                </button>
                <button
                  className="icon-button"
                  aria-label={t.edit}
                  onClick={() => setEditor({ kind: "goal", value: g })}
                >
                  <Pencil size={15} />
                </button>
                <button
                  className="icon-button"
                  aria-label={t.delete}
                  onClick={() => remove("goals", g.id)}
                >
                  <Trash2 size={15} />
                </button>
              </div>
              {g.contributions.map((c) => (
                <div className="flex-between small" key={c.id}>
                  <span>
                    {c.date} · {money(c.amount)}
                  </span>
                  <button
                    className="icon-button"
                    aria-label="Delete contribution"
                    onClick={() =>
                      commit({
                        ...data,
                        goals: data.goals.map((x) =>
                          x.id === g.id
                            ? {
                                ...x,
                                contributions: x.contributions.filter(
                                  (z) => z.id !== c.id,
                                ),
                              }
                            : x,
                        ),
                      })
                    }
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </>
          )}
        </article>
      );
    });
  if (!ready)
    return (
      <main className="loading">
        <span className="brand">
          SAVIO<span>●</span>
        </span>
        <p>Preparing your private workspace…</p>
        {message && (
          <>
            <p role="alert">{message}</p>
            <button className="secondary" onClick={() => location.reload()}>
              Retry loading
            </button>
            <button
              className="text-button"
              onClick={async () =>
                download(
                  "savio-browser-backup.json",
                  JSON.stringify(
                    {
                      legacy: localStorage.getItem("savio-local-v1"),
                      workspace: await rawWorkspace().catch(() => null),
                    },
                    null,
                    2,
                  ),
                  "application/json",
                )
              }
            >
              Export browser backup
            </button>
          </>
        )}
        {message && (
          <BackupManager
            data={emptyData()}
            recoveryMode
            onSave={async (next) => {
              try {
                const snap = await saveWorkspace(next, revision.current);
                revision.current = snap.revision;
                setData(snap.data);
                setReady(true);
                setMessage("Backup restored.");
                return true;
              } catch (e) {
                setMessage(e instanceof Error ? e.message : "Restore failed");
                return false;
              }
            }}
          />
        )}
      </main>
    );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {he ? "דילוג לתוכן" : "Skip to content"}
      </a>
      <aside
        className="sidebar"
        aria-label={he ? "ניווט ראשי" : "Primary navigation"}
      >
        <Link className="brand" href="/">
          SAVIO<span>●</span>
        </Link>
        <p className="brand-tagline">הכסף שלך. העתיד שלך.</p>
        <div className="workspace-label">
          {he ? "המרחב האישי שלך" : "YOUR PERSONAL SPACE"}
        </div>
        <nav>
          {nav.map(({ key, icon: Icon }) => (
            <button
              className={"nav-item " + (tab === key ? "active" : "")}
              aria-current={tab === key ? "page" : undefined}
              onClick={() => setTab(key)}
              key={key}
            >
              <Icon size={21} />
              <span>{label(key)}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="side-note">
            <ShieldCheck size={22} />
            <strong>
              {he ? "מקומי. אישי. שלך." : "Local. Personal. Yours."}
            </strong>
            <p>
              {he
                ? "גיבוי קטן היום, שקט נפשי מחר."
                : "A small backup today. Peace of mind tomorrow."}
            </p>
            <button
              className="text-button"
              onClick={() => {
                exportBackup(data);
                setBackupDue(false);
              }}
            >
              <Download size={16} />
              {he ? "גיבוי הנתונים" : "Back up records"}
            </button>
          </div>
          <div className="profile">
            <span className="avatar">
              {(data.profile.name || "S").slice(0, 1).toUpperCase()}
            </span>
            <div className="grow">
              <strong>
                {data.profile.name || (he ? "המרחב שלך" : "Your workspace")}
              </strong>
              <small>{he ? "נשמר במכשיר הזה" : "Saved on this device"}</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-wrap">
        <header className="topbar">
          <span className="mobile-brand">
            SAVIO<span>●</span>
          </span>
          <div className="breadcrumb">
            {he ? "המרחב שלך" : "My workspace"}
            <span>/</span>
            <strong>{label(tab)}</strong>
          </div>
          <div className="top-actions">
            <span className="security">
              <ShieldCheck size={14} />
              {he ? "נשמר במכשיר הזה" : "On-device storage"}
            </span>
            <button
              className="icon-button"
              aria-label="Change language"
              onClick={() =>
                commit({
                  ...data,
                  profile: { ...data.profile, language: he ? "en" : "he" },
                })
              }
            >
              <Globe size={18} />
              <span className="small">{he ? "EN" : "עב"}</span>
            </button>
            <button
              className="icon-button"
              aria-label="Toggle theme"
              onClick={() =>
                commit({
                  ...data,
                  profile: {
                    ...data.profile,
                    theme: data.profile.theme === "dark" ? "light" : "dark",
                  },
                })
              }
            >
              {data.profile.theme === "dark" ? (
                <Sun size={18} />
              ) : (
                <Moon size={18} />
              )}
            </button>
          </div>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                <span /> {t.greeting}
              </p>
              <h1>
                {tab === "overview"
                  ? he
                    ? `שלום${data.profile.name ? ", " + data.profile.name : ""}`
                    : `Hello${data.profile.name ? ", " + data.profile.name : ""}`
                  : label(tab)}
                <span className="heading-dot">.</span>
              </h1>
              <p className="muted">
                {tab === "overview" ? t.subtitle : "הכסף שלך. העתיד שלך."}
              </p>
            </div>
            <div className="heading-actions">
              <div className="month-picker">
                <button
                  aria-label="Previous month"
                  onClick={() => changeMonth(-1)}
                >
                  <ChevronLeft size={16} />
                </button>
                <span>{monthLabel}</span>
                <button aria-label="Next month" onClick={() => changeMonth(1)}>
                  <ChevronRight size={16} />
                </button>
              </div>
              <button
                className="primary"
                onClick={() => setEditor({ kind: "transaction" })}
              >
                <Plus size={17} />
                {t.add}
              </button>
            </div>
          </div>
          {backupDue &&
            Boolean(
              data.transactions.length ||
              data.shifts.length ||
              data.goals.length ||
              data.reminders.length ||
              Object.keys(data.budgets).length,
            ) && (
              <div className="backup-reminder">
                <ShieldCheck size={20} />
                <div className="grow">
                  <strong>
                    {he
                      ? "הנתונים שלך ראויים לגיבוי"
                      : "Your records deserve a backup"}
                  </strong>
                  <span>
                    {he
                      ? "אחסון הדפדפן אינו קבוע ואינו מוצפן. שמרו עותק פרטי."
                      : "Browser storage is not permanent or encrypted. Keep a private copy."}
                  </span>
                </div>
                <button
                  className="secondary"
                  onClick={() => {
                    exportBackup(data);
                    setBackupDue(false);
                  }}
                >
                  <Download size={16} />
                  {he ? "גיבוי עכשיו" : "Back up now"}
                </button>
              </div>
            )}
          {message && (
            <div role="status" className="notice">
              <span>{message}</span>
              <button aria-label="Dismiss" onClick={() => setMessage("")}>
                ×
              </button>
            </div>
          )}
          {tab === "overview" && (
            <>
              <section className="balance-hero">
                <div className="hero-copy">
                  <span className="eyebrow">
                    {he
                      ? "מקום לבהירות כלכלית"
                      : "A LITTLE MORE FINANCIAL CLARITY"}
                  </span>
                  <p>{t.balance}</p>
                  <strong className="hero-balance" dir="ltr">
                    {money(sum.balance)}
                  </strong>
                  <span className="small">
                    {he
                      ? "הכנסות פחות הוצאות שנרשמו · לא יתרת בנק"
                      : "Recorded income less expenses · not a bank balance"}
                  </span>
                  <div className="hero-metrics">
                    <div>
                      <ArrowDownRight size={18} />
                      <span>{t.income}</span>
                      <b>{money(sum.income)}</b>
                    </div>
                    <div>
                      <ArrowUpRight size={18} />
                      <span>{t.expenses}</span>
                      <b>{money(sum.expenses)}</b>
                    </div>
                  </div>
                </div>
                <div className="hero-aside">
                  <span className="hero-mark">S</span>
                  <span>
                    {he ? "הכסף שלך. העתיד שלך." : "Your money. Your future."}
                  </span>
                </div>
              </section>
              <section
                className="quick-actions"
                aria-label={he ? "פעולות מהירות" : "Quick actions"}
              >
                <button onClick={() => setEditor({ kind: "transaction" })}>
                  <span>
                    <Plus />
                  </span>
                  {t.add}
                </button>
                <button onClick={() => setTab("shifts")}>
                  <span>
                    <Clock3 />
                  </span>
                  {he ? "התחלת משמרת" : "Start a shift"}
                </button>
                <button onClick={() => setEditor({ kind: "goal" })}>
                  <span>
                    <Target />
                  </span>
                  {t.newGoal}
                </button>
                <button onClick={() => setTab("calendar")}>
                  <span>
                    <CalendarDays />
                  </span>
                  {he ? "לוח השנה שלי" : "My calendar"}
                </button>
              </section>
              <section className="stats-grid">
                {[
                  {
                    label: t.expected,
                    value: pay,
                    icon: Clock3,
                    color: "green",
                    note: t.gross,
                  },
                  {
                    label: t.savings,
                    value: saved,
                    icon: Target,
                    color: "purple",
                    note: target
                      ? `${Math.round((saved / target) * 100)}% ${he ? "מהיעדים שלך" : "of your combined goals"}`
                      : he
                        ? "כל הפקדה היא צעד קדימה"
                        : "Every contribution is a step forward",
                  },
                ].map(({ label, value, icon: Icon, color, note }) => (
                  <article className="stat-card" key={label}>
                    <div className="flex-between">
                      <span>{label}</span>
                      <span className={"stat-icon " + color}>
                        <Icon size={18} />
                      </span>
                    </div>
                    <div className="stat-value">{money(value)}</div>
                    <p>
                      <span className={"tiny-dot " + color} />
                      {note}
                    </p>
                  </article>
                ))}
              </section>
              <section className="overview-grid">
                <article className="panel cashflow">
                  <div className="panel-heading">
                    <div>
                      <h2>{t.flow}</h2>
                      <p>{t.flowSub}</p>
                    </div>
                    <div className="legend">
                      <span>
                        <i />
                        {t.incomeType}
                      </span>
                      <span>
                        <i />
                        {t.expense}
                      </span>
                    </div>
                  </div>
                  <div className="chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={chart}
                        margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="income-fill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#6de4ac"
                              stopOpacity={0.23}
                            />
                            <stop
                              offset="100%"
                              stopColor="#6de4ac"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="expense-fill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="#8c9de7"
                              stopOpacity={0.12}
                            />
                            <stop
                              offset="100%"
                              stopColor="#8c9de7"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          stroke="var(--line)"
                          vertical={false}
                          strokeDasharray="3 5"
                        />
                        <XAxis
                          dataKey="day"
                          tickLine={false}
                          axisLine={false}
                          minTickGap={35}
                          tick={{ fill: "#849087", fontSize: 11 }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#849087", fontSize: 11 }}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "var(--panel)",
                            border: "1px solid var(--line)",
                            borderRadius: 12,
                            color: "var(--text)",
                          }}
                          formatter={(value) => money(Number(value))}
                        />
                        <Area
                          isAnimationActive={false}
                          type="monotone"
                          dataKey="income"
                          name={t.incomeType}
                          stroke="#6de4ac"
                          strokeWidth={2.5}
                          fill="url(#income-fill)"
                        />
                        <Area
                          isAnimationActive={false}
                          type="monotone"
                          dataKey="expenses"
                          name={t.expense}
                          stroke="#8c9de7"
                          strokeWidth={2}
                          fill="url(#expense-fill)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                    {!txs.length && (
                      <span className="chart-empty">
                        {he
                          ? "הוסיפו תנועות כדי לראות את המגמות"
                          : "Add transactions to reveal your trends"}
                      </span>
                    )}
                  </div>
                  <div className="chart-footer">
                    <TrendingUp size={16} />
                    <span>
                      {sum.income
                        ? `${Math.round((sum.balance / sum.income) * 100)}% ${he ? "מההכנסה נשארת לאחר הוצאות" : "of your income remains after expenses"}`
                        : he
                          ? "התמונה מתבהרת עם כל תנועה"
                          : "Clarity grows with every transaction."}
                    </span>
                  </div>
                </article>
                <article className="panel salary-panel">
                  <div className="flex-between">
                    <span className="stat-icon green">
                      <Clock3 size={21} />
                    </span>
                    <span className="pill">
                      {he ? "עבודה ושכר" : "WORK & SALARY"}
                    </span>
                  </div>
                  <p className="muted">{t.expected}</p>
                  <h2 className="salary-number">{money(pay)}</h2>
                  <p className="small muted">{t.gross}</p>
                  <div className="salary-divider" />
                  <div className="flex-between small">
                    <span className="muted">
                      {he ? "משמרות החודש" : "Shifts this month"}
                    </span>
                    <strong>
                      {
                        data.shifts.filter((s) => localMonth(s.start) === month)
                          .length
                      }
                    </strong>
                  </div>
                  <div className="flex-between small">
                    <span className="muted">
                      {he ? "מקומות עבודה" : "Workplaces"}
                    </span>
                    <strong>{data.workplaces.length}</strong>
                  </div>
                  <button
                    className="secondary full"
                    onClick={() => setTab("shifts")}
                  >
                    {activeShift ? (
                      <>
                        <span className="live-dot" />
                        Shift in progress
                      </>
                    ) : (
                      <>
                        <Clock3 size={16} />
                        {he ? "ניהול המשמרות שלך" : "Manage your shifts"}
                      </>
                    )}
                    <ArrowRight size={16} />
                  </button>
                </article>
              </section>
              <section className="bottom-grid">
                <article className="panel">
                  <div className="panel-heading">
                    <h2>{t.recent}</h2>
                    <button
                      className="text-button"
                      onClick={() => setTab("transactions")}
                    >
                      {t.viewAll}
                      <ArrowRight size={14} />
                    </button>
                  </div>
                  {transactionList(
                    [...txs]
                      .reverse()
                      .sort((a, b) => b.date.localeCompare(a.date))
                      .slice(0, 4),
                  )}
                </article>
                <article className="panel goals-preview">
                  <div className="panel-heading">
                    <div>
                      <h2>{t.goalTitle}</h2>
                      <p>{t.goalSub}</p>
                    </div>
                    <button
                      className="icon-button"
                      aria-label={t.newGoal}
                      onClick={() => setEditor({ kind: "goal" })}
                    >
                      <Plus size={19} />
                    </button>
                  </div>
                  {data.goals.length ? (
                    <div className="goal-preview-grid">{goalCards(2)}</div>
                  ) : (
                    <button
                      className="new-goal-card"
                      onClick={() => setEditor({ kind: "goal" })}
                    >
                      <span className="new-goal-icon">
                        <Target size={27} />
                      </span>
                      <strong>
                        {he ? "למה אתם חוסכים?" : "What are you saving for?"}
                      </strong>
                      <span>
                        {he
                          ? "טיול גדול, בית ראשון, או פשוט שקט נפשי."
                          : "A big adventure, a first home, or a little peace of mind."}
                      </span>
                      <span className="positive">
                        {t.newGoal} <Plus size={14} />
                      </span>
                    </button>
                  )}
                </article>
              </section>
              <section className="insight-strip">
                <span className="insight-icon">
                  <Sparkles size={24} />
                </span>
                <div className="grow">
                  <span className="eyebrow">SAVIO INSIGHT</span>
                  <h3>
                    {sum.income > 0
                      ? sum.balance > 0
                        ? he
                          ? "יש לך מקום לצמוח."
                          : "You have room to grow."
                        : he
                          ? "זמן לבחון את ההוצאות."
                          : "A good moment to review your spending."
                      : he
                        ? "הצעד הראשון הוא להבין."
                        : "The first step is understanding."}
                  </h3>
                  <p>
                    {sum.income > 0
                      ? `${money(Math.max(0, sum.balance) * 0.2)} ${he ? "הם 20% מהיתרה המחושבת שלך — נקודת התחלה שמרנית לחיסכון." : "is 20% of your recorded surplus — a conservative starting point for savings."}`
                      : he
                        ? "תעדו את ההכנסות וההוצאות כדי לקבל תובנות שמבוססות עליכם."
                        : "Record your income and expenses to get insights grounded in your own numbers."}
                  </p>
                </div>
                <button className="text-button" onClick={() => setTab("ai")}>
                  {he ? "בואו נדבר" : "Let’s talk"}
                  <ArrowUpRight size={17} />
                </button>
              </section>
            </>
          )}
          {tab === "transactions" && (
            <article className="panel">
              <div className="panel-heading">
                <div className="search-box">
                  <Search size={17} />
                  <input
                    aria-label={t.search}
                    placeholder={t.search}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="button-row">
                  <select
                    aria-label="Filter type"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  >
                    <option value="all">
                      {he ? "כל התנועות" : "All transactions"}
                    </option>
                    <option value="income">{t.incomeType}</option>
                    <option value="expense">{t.expense}</option>
                    {categories.map((c) => (
                      <option value={c} key={c}>
                        {categoryLabel(c, he)}
                      </option>
                    ))}
                  </select>
                  <button
                    className="secondary"
                    onClick={() =>
                      download(
                        `savio-${month}.csv`,
                        csvExport(txs),
                        "text/csv;charset=utf-8",
                      )
                    }
                  >
                    <Download size={16} />
                    CSV
                  </button>
                </div>
              </div>
              {transactionList(
                [...txs]
                  .reverse()
                  .filter(
                    (x) =>
                      (filter === "all" ||
                        x.kind === filter ||
                        x.category === filter) &&
                      (x.title + " " + x.category)
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                  )
                  .sort((a, b) => b.date.localeCompare(a.date)),
              )}
              <p className="small muted">
                {he
                  ? "עריכת תנועה חוזרת משנה את סדרת התנועות החל מתאריך המקור."
                  : "Editing a recurring entry changes its series from the original date."}
              </p>
              <SpendingAnalytics
                transactions={data.transactions}
                month={month}
                he={he}
                money={money}
              />
            </article>
          )}
          {tab === "shifts" && (
            <>
              <div className="section-toolbar">
                <div>
                  <h2>{money(pay)}</h2>
                  <span className="small muted">{t.gross}</span>
                </div>
                <div className="button-row">
                  <button
                    className="secondary"
                    onClick={() => setEditor({ kind: "workplace" })}
                  >
                    <Plus size={16} />
                    {t.workplace}
                  </button>
                  <button
                    className="primary"
                    disabled={!data.workplaces.length}
                    onClick={() => setEditor({ kind: "shift" })}
                  >
                    <Plus size={16} />
                    {t.newShift}
                  </button>
                </div>
              </div>
              <div className="panel">
                <h2>{he ? "טיימר משמרת" : "Shift timer"}</h2>
                {activeShift ? (
                  <div className="timer">
                    <span className="live-dot" />
                    <strong>
                      {
                        data.workplaces.find(
                          (w) => w.id === activeShift.workplaceId,
                        )?.name
                      }
                    </strong>
                    <span>{elapsedLabel(activeShift.start, now)}</span>
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={stopShift}
                    >
                      <Square size={16} />
                      {he ? "סיום משמרת" : "Stop shift"}
                    </button>
                  </div>
                ) : (
                  <div className="workplaces">
                    {data.workplaces.map((w) => (
                      <div className="workplace" key={w.id}>
                        <div className="grow">
                          <strong>{w.name}</strong>
                          <p>
                            {money(w.wage)} / {he ? "שעה" : "hour"}
                          </p>
                        </div>
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() => startShift(w.id)}
                        >
                          <Play size={15} />
                          {he ? "התחלה" : "Start"}
                        </button>
                        <button
                          className="icon-button"
                          aria-label={t.edit}
                          onClick={() =>
                            setEditor({ kind: "workplace", value: w })
                          }
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={t.delete}
                          onClick={() => remove("workplaces", w.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {!data.workplaces.length && (
                  <Empty
                    title={he ? "איפה אתם עובדים?" : "Where do you work?"}
                    description={
                      he
                        ? "הוסיפו מקום עבודה ושכר שעתי כדי להתחיל."
                        : "Add a workplace and hourly wage to start tracking."
                    }
                  />
                )}
              </div>
              <article className="panel spaced">
                <h2>{he ? "דוח שעות חודשי" : "Monthly timesheet"}</h2>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        {(he
                          ? [
                              "מקום עבודה",
                              "התחלה",
                              "סיום",
                              "שעות בתשלום",
                              "אומדן ברוטו",
                              "",
                            ]
                          : [
                              "Workplace",
                              "Start",
                              "End",
                              "Paid hours",
                              "Gross estimate",
                              "",
                            ]
                        ).map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.shifts
                        .filter((s) => localMonth(s.start) === month)
                        .map((s) => {
                          const w = data.workplaces.find(
                              (w) => w.id === s.workplaceId,
                            )!,
                            p = shiftPay(s, w, now);
                          return (
                            <tr key={s.id}>
                              <td>
                                {w.name}
                                {s.premium
                                  ? he
                                    ? " · תוספת שכר"
                                    : " · Premium"
                                  : ""}
                                {s.legacyGross !== undefined && (
                                  <small className="muted">
                                    {" "}
                                    · {he ? "אומדן מיובא" : "Imported estimate"}
                                  </small>
                                )}
                              </td>
                              <td>{new Date(s.start).toLocaleString()}</td>
                              <td>
                                {s.end
                                  ? new Date(s.end).toLocaleString()
                                  : he
                                    ? "בפעילות"
                                    : "Running"}
                              </td>
                              <td>{p.hours.toFixed(2)}</td>
                              <td>{money(p.gross)}</td>
                              <td>
                                <button
                                  className="icon-button"
                                  aria-label={t.edit}
                                  onClick={() =>
                                    setEditor({ kind: "shift", value: s })
                                  }
                                >
                                  <Pencil size={15} />
                                </button>
                                <button
                                  className="icon-button"
                                  aria-label={t.delete}
                                  onClick={() => remove("shifts", s.id)}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                <p className="small muted">
                  {he
                    ? "כללי השכר ניתנים להגדרה לכל מקום עבודה. תוספת סופ״ש וחג מופעלת ידנית למשמרת ומכפילה את אומדן השכר כולל שעות נוספות. אין כאן חישוב נטו או ייעוץ משפטי."
                    : "Configure payroll rules per workplace. Weekend/holiday premium is selected per shift and multiplies the gross estimate including overtime. No net salary or tax calculation is implied."}
                </p>
              </article>
            </>
          )}
          {tab === "goals" && (
            <>
              <div className="section-toolbar">
                <p className="muted">
                  {he
                    ? "הפקדות מתועדות אינן יתרת בנק."
                    : "Recorded contributions are not bank balances."}
                </p>
                <div className="button-row">
                  <select
                    aria-label="Savings plan"
                    value={mode}
                    onChange={(e) => setMode(e.target.value as typeof mode)}
                  >
                    <option value="conservative">
                      {he
                        ? "שמרנית · 20% מהיתרה"
                        : "Conservative · 20% surplus"}
                    </option>
                    <option value="balanced">
                      {he ? "מאוזנת · 35% מהיתרה" : "Balanced · 35% surplus"}
                    </option>
                    <option value="accelerated">
                      {he ? "מואצת · 50% מהיתרה" : "Accelerated · 50% surplus"}
                    </option>
                  </select>
                  <button
                    className="primary"
                    onClick={() => setEditor({ kind: "goal" })}
                  >
                    <Plus size={16} />
                    {t.newGoal}
                  </button>
                </div>
              </div>
              <div className="goals-grid">{goalCards()}</div>
              {!data.goals.length && (
                <div className="panel">
                  <Empty title={t.goalTitle} description={t.goalSub} />
                </div>
              )}
              <div className="panel spaced">
                <h2>{he ? "אתגר חיסכון" : "Savings challenge"}</h2>
                <p className="muted">
                  {he
                    ? "בצעו שלוש הפקדות ליעדים שלכם כדי לבנות הרגל."
                    : "Make three contributions toward your goals to build a habit."}
                </p>
                <div className="progress">
                  <i
                    style={{
                      width:
                        Math.min(
                          100,
                          (data.goals.reduce(
                            (n, g) => n + g.contributions.length,
                            0,
                          ) /
                            3) *
                            100,
                        ) + "%",
                    }}
                  />
                </div>
                <p className="positive">
                  {data.goals.reduce((n, g) => n + g.contributions.length, 0) >=
                  3
                    ? "✓ Habit builder achievement unlocked"
                    : `${data.goals.reduce((n, g) => n + g.contributions.length, 0)} / 3 contributions`}
                </p>
              </div>
            </>
          )}
          {tab === "goals" && (
            <div className="spaced">
              <PurchaseCalculator workplaces={data.workplaces} he={he} />
            </div>
          )}
          {tab === "budgets" && (
            <div className="budgets-grid">
              {categories.map((category) => {
                const spent = txs
                    .filter(
                      (t) => t.kind === "expense" && t.category === category,
                    )
                    .reduce((n, t) => n + t.amount, 0),
                  budget =
                    data.budgets[month + ":" + category] ??
                    data.budgets["default:" + category] ??
                    0;
                const [y, m] = month.split("-").map(Number),
                  previous = new Date(y, m - 2, 15),
                  prevKey = `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, "0")}`,
                  prev = monthTransactions(data.transactions, prevKey)
                    .filter(
                      (t) => t.kind === "expense" && t.category === category,
                    )
                    .reduce((n, t) => n + t.amount, 0);
                return (
                  <article className="panel" key={category}>
                    <h3>{categoryLabel(category, he)}</h3>
                    <div className="goal-values">
                      <strong>{money(spent)}</strong>
                      <span> / {money(budget)}</span>
                    </div>
                    <div
                      className={
                        "progress " + (spent > budget ? "over-budget" : "")
                      }
                    >
                      <i
                        style={{
                          width:
                            (budget
                              ? Math.min(100, (spent / budget) * 100)
                              : 0) + "%",
                        }}
                      />
                    </div>
                    <p className="small muted">
                      {he ? "חודש קודם" : "Previous month"}: {money(prev)} ·{" "}
                      {prev
                        ? `${Math.round(((spent - prev) / prev) * 100)}%`
                        : "—"}
                    </p>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const amount = Number(
                          new FormData(e.currentTarget).get("budget"),
                        );
                        await commit({
                          ...data,
                          budgets: {
                            ...data.budgets,
                            [month + ":" + category]: amount,
                          },
                        });
                      }}
                    >
                      <Field label={t.budget}>
                        <div className="input-action">
                          <input
                            name="budget"
                            aria-label={category + " budget"}
                            type="number"
                            min="0"
                            max="1000000000"
                            step="0.01"
                            defaultValue={budget}
                            key={month}
                            required
                          />
                          <button
                            className="icon-button"
                            disabled={busy}
                            aria-label={t.save}
                          >
                            <Check size={18} />
                          </button>
                        </div>
                      </Field>
                    </form>
                  </article>
                );
              })}
            </div>
          )}
          {tab === "calendar" && (
            <FinancialCalendar
              data={data}
              month={month}
              money={money}
              onSave={commit}
              busy={busy}
            />
          )}
          {tab === "ai" && (
            <div className="ai-layout">
              <article className="panel chat-panel">
                <div className="ai-intro">
                  <span className="ai-orb">
                    <Sparkles size={30} />
                  </span>
                  <span className="eyebrow">YOUR FINANCIAL COACH</span>
                  <h2>
                    {he
                      ? "מרחב לשאלות גדולות."
                      : "Big questions. Clearer possibilities."}
                  </h2>
                  <p>
                    {aiAvailable
                      ? he
                        ? "אימון פיננסי המבוסס על השאלות שלך. נתונים אישיים נשלחים רק בהסכמתך לכל בקשה."
                        : "Financial coaching grounded in your questions. Personal records are shared only with your permission for each request."
                      : t.noAI}
                  </p>
                </div>
                <div className="chat-messages" aria-live="polite">
                  {chat.map((c, i) => (
                    <div
                      className={
                        "chat-message " + (c.role === "You" ? "from-user" : "")
                      }
                      key={i}
                    >
                      <strong>{c.role}</strong>
                      <p>{c.text}</p>
                    </div>
                  ))}
                </div>
                <form onSubmit={ask}>
                  <Field label={he ? "מה תרצו לבדוק?" : "What’s on your mind?"}>
                    <textarea
                      required
                      maxLength={2000}
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder={
                        he
                          ? "איך אוכל לחסוך יותר?"
                          : "How could I make more room for saving?"
                      }
                    />
                  </Field>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    {t.consent}
                  </label>
                  <button className="primary" disabled={busy || !aiAvailable}>
                    <Sparkles size={16} />
                    {busy ? "Thinking…" : t.send}
                  </button>
                </form>
              </article>
              <div>
                <article className="panel">
                  <Sparkles className="positive" />
                  <h3>{he ? "תובנות מקומיות" : "Local insights"}</h3>
                  <p className="muted">
                    {he ? "יתרה מחושבת" : "Recorded surplus"}:{" "}
                    {money(sum.balance)}
                  </p>
                  <p>
                    {he
                      ? "אפשרות חיסכון שמרנית"
                      : "Conservative savings capacity"}
                    :{" "}
                    <strong className="positive">
                      {money(Math.max(0, sum.balance) * 0.2)}
                    </strong>{" "}
                    / mo
                  </p>
                  <p className="small muted">
                    {he
                      ? "מחושב מקומית מנתוני החודש שנבחר."
                      : "Calculated locally from your selected month. No records leave the device for this insight."}
                  </p>
                </article>
                <div className="spaced">
                  <PurchaseCalculator workplaces={data.workplaces} he={he} />
                </div>
              </div>
            </div>
          )}
          {tab === "more" && (
            <section className="more-grid">
              {nav
                .filter((n) =>
                  [
                    "budgets",
                    "calendar",
                    "ai",
                    "challenges",
                    "settings",
                  ].includes(n.key),
                )
                .map(({ key, icon: Icon }) => (
                  <button
                    className="more-card"
                    onClick={() => setTab(key)}
                    key={key}
                  >
                    <span className="more-icon">
                      <Icon size={26} />
                    </span>
                    <div>
                      <h2>{label(key)}</h2>
                      <p>
                        {key === "budgets"
                          ? he
                            ? "מסגרת שמתאימה לחיים שלך"
                            : "Make room for what matters"
                          : key === "calendar"
                            ? he
                              ? "כל התשלומים והתזכורות במקום אחד"
                              : "Payments and reminders, together"
                            : key === "ai"
                              ? he
                                ? "מחשבות טובות על הכסף שלך"
                                : "A thoughtful financial conversation"
                              : key === "challenges"
                                ? he
                                  ? "הרגלים קטנים. שינוי גדול."
                                  : "Small habits. Meaningful progress."
                                : he
                                  ? "העדפות, גיבוי ושחזור"
                                  : "Preferences, backups and recovery"}
                      </p>
                    </div>
                    <ArrowRight size={19} />
                  </button>
                ))}
            </section>
          )}
          {tab === "challenges" && (
            <section className="challenge-grid">
              {[
                {
                  title: he ? "הצעד הראשון" : "The first step",
                  count: data.transactions.length,
                  target: 1,
                  text: he
                    ? "רשמו תנועה ראשונה והתחילו לראות את התמונה."
                    : "Record your first transaction and start finding clarity.",
                },
                {
                  title: he ? "בונים הרגל חיסכון" : "A saving habit",
                  count: data.goals.reduce(
                    (n, g) => n + g.contributions.length,
                    0,
                  ),
                  target: 3,
                  text: he
                    ? "בצעו שלוש הפקדות מתועדות ליעדים שלכם."
                    : "Record three contributions toward your savings goals.",
                },
                {
                  title: he ? "שבוע של מודעות" : "A week of awareness",
                  count: new Set(data.transactions.map((t) => t.date)).size,
                  target: 7,
                  text: he
                    ? "תעדו תנועות בשבעה ימים שונים."
                    : "Record transactions on seven different days.",
                },
              ].map((c) => (
                <article className="panel challenge-card" key={c.title}>
                  <span className="goal-icon">
                    <Target size={24} />
                  </span>
                  <span className="pill">
                    {c.count >= c.target
                      ? he
                        ? "הושלם ✓"
                        : "Achieved ✓"
                      : he
                        ? "בתהליך"
                        : "In progress"}
                  </span>
                  <h2>{c.title}</h2>
                  <p className="muted">{c.text}</p>
                  <div className="progress">
                    <i
                      style={{
                        width: Math.min(100, (c.count / c.target) * 100) + "%",
                      }}
                    />
                  </div>
                  <strong>
                    {Math.min(c.count, c.target)} / {c.target}
                  </strong>
                </article>
              ))}
            </section>
          )}
          {tab === "settings" && (
            <SettingsScreen data={data} onSave={commit} busy={busy} />
          )}
          <footer>
            <span className="footer-brand">
              SAVIO<span>●</span>
            </span>
            <span>
              {he
                ? "בונים עתיד טוב יותר. צעד אחר צעד."
                : "Building a better future. One step at a time."}
            </span>
            <span>
              <span className="tiny-dot green" />
              {he ? "סביבת עבודה מקומית" : "Local-first workspace"}
            </span>
          </footer>
        </main>
      </div>
      <nav
        className="bottom-nav"
        aria-label={he ? "ניווט ראשי" : "Primary navigation"}
      >
        {primaryNav.map(({ key, icon: Icon }) => {
          const selected =
            tab === key ||
            (key === "more" &&
              ["budgets", "calendar", "ai", "challenges", "settings"].includes(
                tab,
              ));
          return (
            <button
              aria-current={selected ? "page" : undefined}
              className={selected ? "selected" : ""}
              onClick={() => setTab(key)}
              key={key}
            >
              <Icon size={23} />
              <span>{label(key)}</span>
            </button>
          );
        })}
      </nav>
      {editor && (
        <Modal
          title={
            editor.kind === "transaction"
              ? t.add
              : editor.kind === "goal"
                ? t.newGoal
                : editor.kind === "workplace"
                  ? t.workplace
                  : editor.kind === "contribution"
                    ? he
                      ? "רישום הפקדה"
                      : "Record a contribution"
                    : t.newShift
          }
          onClose={() => setEditor(null)}
        >
          <form onSubmit={submitEditor}>
            {message && (
              <p role="alert" className="notice">
                {message}
              </p>
            )}
            {editor.kind === "transaction" && (
              <>
                <Field label={t.title}>
                  <input
                    autoFocus
                    name="title"
                    maxLength={120}
                    defaultValue={editor.value?.title}
                    required
                  />
                </Field>
                <div className="form-grid">
                  <Field label={t.amount}>
                    <input
                      name="amount"
                      type="number"
                      min="0.01"
                      max="1000000000"
                      step="0.01"
                      defaultValue={editor.value?.amount}
                      required
                    />
                  </Field>
                  <Field label={t.type}>
                    <select
                      name="kind"
                      defaultValue={editor.value?.kind || "expense"}
                    >
                      <option value="expense">{t.expense}</option>
                      <option value="income">{t.incomeType}</option>
                    </select>
                  </Field>
                </div>
                <Field label={t.category}>
                  <select name="category" defaultValue={editor.value?.category}>
                    {categories.map((c) => (
                      <option value={c} key={c}>
                        {categoryLabel(c, he)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t.date}>
                  <input
                    name="date"
                    type="date"
                    defaultValue={editor.value?.date || today()}
                    required
                  />
                </Field>
                <label className="checkbox">
                  <input
                    name="recurring"
                    type="checkbox"
                    defaultChecked={editor.value?.recurring}
                  />
                  {t.recurring}
                </label>
              </>
            )}
            {editor.kind === "goal" && (
              <>
                <Field label={t.name}>
                  <input
                    name="name"
                    maxLength={100}
                    defaultValue={editor.value?.name}
                    required
                  />
                </Field>
                <div className="form-grid">
                  <Field label={he ? "סכום יעד" : "Target amount"}>
                    <input
                      name="target"
                      type="number"
                      min="0.01"
                      max="1000000000"
                      step="0.01"
                      defaultValue={editor.value?.target}
                      required
                    />
                  </Field>
                  <Field label={he ? "חיסכון קיים" : "Existing savings"}>
                    <input
                      name="existing"
                      type="number"
                      min="0"
                      max="1000000000"
                      step="0.01"
                      defaultValue={editor.value?.existing || 0}
                      required
                    />
                  </Field>
                </div>
                <Field
                  label={
                    he ? "הפקדה חודשית מתוכננת" : "Planned monthly contribution"
                  }
                >
                  <input
                    name="monthly"
                    type="number"
                    min="0"
                    max="1000000000"
                    step="0.01"
                    defaultValue={editor.value?.monthly || 0}
                    required
                  />
                </Field>
                <Field label={he ? "תאריך יעד" : "Target date"}>
                  <input
                    name="date"
                    type="date"
                    defaultValue={editor.value?.date || undefined}
                  />
                </Field>
              </>
            )}
            {editor.kind === "contribution" && (
              <>
                <p className="muted">
                  {editor.value.name} ·{" "}
                  {he
                    ? "רישום הפקדה בלבד. הפעולה אינה מעבירה כסף."
                    : "This records a contribution; it does not transfer money."}
                </p>
                <Field label={t.amount}>
                  <input
                    name="amount"
                    type="number"
                    min="0.01"
                    max="1000000000"
                    step="0.01"
                    required
                  />
                </Field>
                <Field label={t.date}>
                  <input
                    name="date"
                    type="date"
                    defaultValue={today()}
                    required
                  />
                </Field>
              </>
            )}
            {editor.kind === "workplace" && (
              <>
                <Field label={t.name}>
                  <input
                    name="name"
                    defaultValue={editor.value?.name}
                    required
                    maxLength={100}
                  />
                </Field>
                <Field label={he ? "שכר שעתי ברוטו" : "Hourly wage (gross)"}>
                  <input
                    name="wage"
                    type="number"
                    min="0.01"
                    max="100000"
                    step="0.01"
                    defaultValue={editor.value?.wage}
                    required
                  />
                </Field>
                <p className="small muted">
                  {he
                    ? "הגדירו את הכללים לפי הסכם העבודה שלכם. ערכי ברירת המחדל הם דוגמאות, ולא כלל שכר ישראלי אחיד."
                    : "Set the rules from your employment agreement. These defaults are examples, not a universal Israeli payroll rule."}
                </p>
                <div className="form-grid">
                  {(
                    [
                      {
                        key: "regularHours",
                        label: he
                          ? "שעות רגילות למשמרת"
                          : "Regular hours per shift",
                        value: 8,
                        max: 24,
                      },
                      {
                        key: "overtimeHours",
                        label: he
                          ? "שעות במדרגת שעות נוספות ראשונה"
                          : "First overtime tier hours",
                        value: 2,
                        max: 24,
                      },
                      {
                        key: "overtimeRate",
                        label: he
                          ? "מכפיל מדרגה ראשונה"
                          : "First tier multiplier",
                        value: 1.25,
                        max: 5,
                      },
                      {
                        key: "extraRate",
                        label: he
                          ? "מכפיל לשעות הנותרות"
                          : "Remaining hours multiplier",
                        value: 1.5,
                        max: 5,
                      },
                      {
                        key: "premiumRate",
                        label: he
                          ? "מכפיל סוף שבוע / חג"
                          : "Weekend / holiday multiplier",
                        value: 1.5,
                        max: 5,
                      },
                    ] as const
                  ).map((f) => (
                    <Field label={f.label} key={f.key}>
                      <input
                        name={f.key}
                        type="number"
                        min={f.key.includes("Hours") ? 0 : 1}
                        max={f.max}
                        step="0.01"
                        defaultValue={editor.value?.[f.key] ?? f.value}
                        required
                      />
                    </Field>
                  ))}
                </div>
              </>
            )}
            {editor.kind === "shift" && (
              <>
                {editor.value?.legacyGross !== undefined && (
                  <p className="notice">
                    {he
                      ? "משמרת זו שומרת אומדן היסטורי מיובא. שמירת עריכה תחשב אותו מחדש לפי הכללים הנוכחיים; בדקו את תוספות השכר."
                      : "This imported shift keeps its historical gross estimate. Saving edits recalculates it using current rules; review the premium setting."}
                  </p>
                )}
                <Field label={he ? "מקום עבודה" : "Workplace"}>
                  <select
                    name="workplaceId"
                    defaultValue={editor.value?.workplaceId}
                  >
                    {data.workplaces.map((w) => (
                      <option value={w.id} key={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={he ? "התחלה (זמן מקומי)" : "Start (local time)"}>
                  <input
                    name="start"
                    type="datetime-local"
                    defaultValue={
                      editor.value
                        ? localDateTime(editor.value.start)
                        : undefined
                    }
                    required
                  />
                </Field>
                <Field
                  label={
                    he
                      ? "סיום (בחרו את היום הבא למשמרת לילה)"
                      : "End (use next date for overnight shifts)"
                  }
                >
                  <input
                    name="end"
                    type="datetime-local"
                    defaultValue={
                      editor.value?.end
                        ? localDateTime(editor.value.end)
                        : undefined
                    }
                    required
                  />
                </Field>
                <Field label={he ? "דקות הפסקה" : "Break minutes"}>
                  <input
                    name="breakMinutes"
                    type="number"
                    min="0"
                    max="1440"
                    step="1"
                    defaultValue={editor.value?.breakMinutes || 0}
                    required
                  />
                </Field>
                <label className="checkbox">
                  <input
                    name="paidBreak"
                    type="checkbox"
                    defaultChecked={editor.value?.paidBreak}
                  />
                  {he ? "הפסקה בתשלום" : "Paid break"}
                </label>
                <label className="checkbox">
                  <input
                    name="premium"
                    type="checkbox"
                    defaultChecked={editor.value?.premium}
                  />
                  {he
                    ? "החלת תוספת סוף שבוע / חג של מקום העבודה"
                    : "Apply workplace weekend / holiday premium"}
                </label>
              </>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setEditor(null)}
              >
                {t.cancel}
              </button>
              <button className="primary" disabled={busy}>
                {busy ? (he ? "שומר…" : "Saving…") : t.save}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
function localDateTime(iso: string) {
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
