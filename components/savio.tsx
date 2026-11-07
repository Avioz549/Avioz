"use client";
import dynamic from "next/dynamic";
import { SectionTabs, SectionPanel } from "./section-tabs";
import { LifeHome, SmartDayScreen } from "./life/home";
import { CashFlowPanel, SubscriptionsScreen } from "./life/money";
import { WorkPro } from "./life/work";
import { PersonalGoalsScreen } from "./life/goals";
import { LifeEditor } from "./life/editor";
import type { LifeDraft } from "./life/types";
import { lifeOf } from "@/lib/life";
import { useLifeReminders } from "@/lib/use-life-reminders";
const PlannerScreen = dynamic(
  () => import("./life/planner").then((m) => m.PlannerScreen),
  { loading: () => <p role="status">טוען תכנון…</p> },
);
const AnalyticsScreen = dynamic(
  () => import("./life/analytics").then((m) => m.AnalyticsScreen),
  { loading: () => <p role="status">טוען תובנות…</p> },
);
const RecapScreen = dynamic(
  () => import("./life/analytics").then((m) => m.RecapScreen),
  { loading: () => <p role="status">טוען סיכום…</p> },
);
import { monthlyPayroll } from "@/lib/payroll";
import { localAnswer, goalShifts } from "@/lib/insights";
import {
  SalaryOverview,
  ShiftCalendar,
  ReportsScreen,
  CategoryManager,
} from "./production-suite";
import { PayrollFields, ShiftExtras } from "./payroll-fields";
import { ConfirmRecurring } from "./confirm-recurring";
import { AppUpdate } from "./app-update";
import { UserGuide } from "./user-guide";
import { useAppClock } from "@/lib/use-app-clock";
import { overlappingCompletedShifts } from "@/lib/shift-overlap";
import { resolveTheme } from "@/lib/themes";
import Link from "next/link";
import {
  Fragment,
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  Clock3,
  Target,
  ChartPie,
  CalendarDays,
  Sparkles,
  Settings,
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowRight,
  Download,
  Trash2,
  Pencil,
  ShieldCheck,
  Menu,
  TrendingUp,
  MoreHorizontal,
} from "lucide-react";
import {
  emptyData,
  dataSchema,
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
import { useReminders } from "@/lib/use-reminders";
import { categoryLabel } from "@/lib/categories";
import { SpendingAnalytics } from "./spending-analytics";
import { FinancialCalendar } from "./financial-calendar";
import { WelcomeScreen } from "./welcome-screen";
import { ReferenceDashboard } from "./reference-dashboard";
import { ReferenceWork } from "./reference-work";
import { BudgetScreen } from "./budget-screen";
import { GoalArtwork, CategoryGlyph } from "./reference-icons";
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
  | "challenges"
  | "welcome"
  | "reports"
  | "guide"
  | "planner"
  | "smart"
  | "subscriptions"
  | "insights"
  | "recap";
type Editor =
  | { kind: "transaction"; value?: Transaction }
  | { kind: "goal"; value?: Goal }
  | { kind: "workplace"; value?: Workplace }
  | { kind: "shift"; value?: Shift; date?: string }
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
    [categoryFilter, setCategoryFilter] = useState("all"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [consent, setConsent] = useState(false),
    [aiAvailable, setAiAvailable] = useState(false),
    [chat, setChat] = useState<{ role: string; text: string }[]>([]),
    [question, setQuestion] = useState(""),
    [mode, setMode] = useState<"conservative" | "balanced" | "accelerated">(
      "balanced",
    ),
    [backupDue, setBackupDue] = useState(false),
    [lifeDraft, setLifeDraft] = useState<LifeDraft | null>(null),
    [workView, setWorkView] = useState<
      "today" | "planning" | "salary" | "settings"
    >("today"),
    [workCalendarView, setWorkCalendarView] = useState<"month" | "week">(
      "month",
    ),
    [moneyView, setMoneyView] = useState<
      "transactions" | "forecast" | "analysis"
    >("transactions"),
    [goalView, setGoalView] = useState<"savings" | "personal" | "tools">(
      "savings",
    );
  const calendarChanged = useCallback(
    (previousDay: string, nextDay: string) => {
      const previousMonth = previousDay.slice(0, 7),
        nextMonth = nextDay.slice(0, 7);
      if (previousMonth !== nextMonth)
        setMonth((selected) =>
          selected === previousMonth ? nextMonth : selected,
        );
    },
    [],
  );
  const scheduleBoundaries = useMemo(
    () =>
      data.shifts
        .filter((s) => s.scheduled)
        .flatMap((s) => [Date.parse(s.start), Date.parse(s.end!)])
        .sort((a, b) => a - b),
    [data.shifts],
  );
  const { now, refreshClock } = useAppClock(
    data.shifts.some((s) => !s.end && (!s.pauseStartedAt || s.paidBreak)),
    calendarChanged,
    scheduleBoundaries,
  );
  useLifeReminders(data, ready);
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
      ...(data.customCategories ?? []),
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
          "reports",
          "budgets",
          "calendar",
          "ai",
          "settings",
          "more",
          "challenges",
          "welcome",
          "guide",
          "planner",
          "smart",
          "subscriptions",
          "insights",
          "recap",
        ].includes(initialTab)
      )
        updateTab(initialTab as Tab);
      try {
        const { snapshot, migrated } = await loadWorkspace();
        if (!active) return;
        revision.current = snapshot.revision;
        setData(snapshot.data);
        setReady(true);
        if (!initialTab) updateTab(lifeOf(snapshot.data).preferences.home);
        if (
          !initialTab &&
          !localStorage.getItem("savio-welcome-seen") &&
          !snapshot.data.transactions.length &&
          !snapshot.data.workplaces.length &&
          !snapshot.data.goals.length &&
          !snapshot.data.reminders.length &&
          !lifeOf(snapshot.data).tasks.length &&
          !lifeOf(snapshot.data).events.length &&
          !lifeOf(snapshot.data).personalGoals.length &&
          !lifeOf(snapshot.data).subscriptions.length
        )
          updateTab("welcome");
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
    document.documentElement.lang = data.profile.language;
    document.documentElement.dir = he ? "rtl" : "ltr";
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = resolveTheme(data.profile.theme, media.matches);
      document.documentElement.dataset.theme = resolved;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute(
          "content",
          resolved === "ocean"
            ? "#061426"
            : resolved === "light"
              ? "#f2f5f2"
              : resolved === "midnight"
                ? "#070e20"
                : resolved === "purple"
                  ? "#10091b"
                  : "#010403",
        );
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [data.profile.language, data.profile.theme, he]);
  async function commit(next: FinanceData) {
    if (saving.current || !ready) return false;
    const parsed = dataSchema.safeParse(next);
    if (!parsed.success) {
      setMessage(
        he
          ? "לא ניתן לשמור: בדקו סכומים, זמני משמרת, יתרת חיסכון והפניות לרשומות."
          : parsed.error.issues[0].message,
      );
      return false;
    }
    saving.current = true;
    setBusy(true);
    try {
      const snapshot = await saveWorkspace(parsed.data, revision.current);
      revision.current = snapshot.revision;
      setData(parsed.data);
      refreshClock();
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
  const payroll = monthlyPayroll(data, month, now);
  const pay = payroll.gross;
  const activeShift = data.shifts.find((s) => !s.end && !s.scheduled);
  async function remove(
    kind: "transactions" | "goals" | "shifts" | "workplaces",
    key: string,
  ) {
    if (!confirm(he ? "למחוק את הרשומה?" : "Delete this record?")) return;
    if (
      kind === "workplaces" &&
      (data.shifts.some((s) => s.workplaceId === key) ||
        lifeOf(data).payslips.some((p) => p.workplaceId === key))
    ) {
      setMessage("Remove associated shifts before deleting a workplace.");
      return;
    }
    await commit({
      ...data,
      [kind]: data[kind].filter((x) => x.id !== key),
      ...(kind === "goals" && data.life
        ? {
            life: {
              ...data.life,
              tasks: data.life.tasks.map((t) =>
                t.savingsGoalId === key ? { ...t, savingsGoalId: null } : t,
              ),
            },
          }
        : {}),
      ...(kind === "shifts"
        ? {
            transactions: data.transactions.map((t) =>
              t.linkedShiftId === key ? { ...t, linkedShiftId: undefined } : t,
            ),
          }
        : {}),
    });
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
  function confirmOverlap(candidate: Shift) {
    const overlapping = overlappingCompletedShifts(candidate, data.shifts);
    if (!overlapping.length) return true;
    const dates = overlapping
      .map(
        (s) =>
          `${new Date(s.start).toLocaleString(he ? "he-IL" : "en-US")} – ${new Date(s.end!).toLocaleString(he ? "he-IL" : "en-US")}`,
      )
      .join("\n");
    return window.confirm(
      he
        ? `אזהרה: המשמרת חופפת ל־${overlapping.length} משמרות שהסתיימו באותו מקום עבודה. השמירה עלולה לספור שעות ושכר פעמיים.\n${dates}\nלאשר חריגה ולשמור בכל זאת?`
        : `Warning: this shift overlaps ${overlapping.length} completed shift(s) at the same workplace. Saving may count hours and pay twice.\n${dates}\nConfirm this exception and save anyway?`,
    );
  }
  async function stopShift() {
    if (!activeShift || saving.current) return;
    const timestamp = new Date().toISOString();
    const completed: Shift = {
      ...activeShift,
      end: timestamp,
      breakMinutes:
        activeShift.breakMinutes +
        (activeShift.pauseStartedAt
          ? Math.max(
              0,
              (Date.parse(timestamp) - Date.parse(activeShift.pauseStartedAt)) /
                60000,
            )
          : 0),
      pauseStartedAt: undefined,
    };
    if (!confirmOverlap(completed)) return;
    await commit({
      ...data,
      shifts: data.shifts.map((s) => (s.id === completed.id ? completed : s)),
    });
  }
  async function togglePause() {
    if (!activeShift) return;
    refreshClock();
    await commit({
      ...data,
      shifts: data.shifts.map((s) =>
        s.id === activeShift.id
          ? s.pauseStartedAt
            ? {
                ...s,
                breakMinutes:
                  s.breakMinutes +
                  Math.max(
                    0,
                    (Date.now() - Date.parse(s.pauseStartedAt)) / 60000,
                  ),
                pauseStartedAt: undefined,
              }
            : { ...s, pauseStartedAt: new Date().toISOString() }
          : s,
      ),
    });
  }
  async function submitEditor(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editor || saving.current) return;
    const f = new FormData(e.currentTarget),
      v = (key: string) => String(f.get(key) || ""),
      n = (key: string) => Number(f.get(key)),
      checked = (key: string) => f.get(key) === "on";
    const next = { ...data };
    try {
      if (editor.kind === "transaction") {
        const value = transactionSchema.parse({
          ...editor.value,
          id: editor.value?.id || id(),
          title: v("title"),
          amount: n("amount"),
          kind: v("kind"),
          category: v("category"),
          date: v("date"),
          recurring: checked("recurring"),
          linkedShiftId: v("linkedShiftId") || undefined,
          recurrenceId: editor.value?.recurrenceId,
          ...(editor.value?.recurrenceId
            ? {
                recurrenceMonth:
                  editor.value.recurrenceMonth ?? editor.value.date.slice(0, 7),
              }
            : {}),
          ...(editor.value?.subscriptionId
            ? {
                subscriptionOccurrence:
                  editor.value.subscriptionOccurrence ?? editor.value.date,
              }
            : {}),
        });
        next.transactions = editor.value
          ? data.transactions.map((x) => (x.id === value.id ? value : x))
          : [...data.transactions, value];
      }
      if (editor.kind === "workplace") {
        if (
          !checked("enablePolicy") &&
          editor.value?.policy &&
          Object.keys(editor.value.policy).some(
            (key) =>
              !Object.hasOwn(workplaceSchema.shape.policy.unwrap().shape, key),
          )
        )
          throw new Error(
            he
              ? "לא ניתן להסיר הגדרות שכר עם שדות לא מוכרים. הנתונים לא שונו."
              : "Cannot remove payroll settings containing unknown fields. No records were changed.",
          );
        const value = workplaceSchema.parse({
          ...editor.value,
          id: editor.value?.id || id(),
          name: v("name"),
          wage: n("wage"),
          regularHours: n("regularHours"),
          overtimeHours: n("overtimeHours"),
          overtimeRate: n("overtimeRate"),
          extraRate: n("extraRate"),
          premiumRate: n("premiumRate"),
          policy: checked("enablePolicy")
            ? {
                ...editor.value?.policy,
                weeklyHours: n("weeklyHours"),
                weeklyRate: n("weeklyRate"),
                weekStart: n("weekStart"),
                holidayRate: n("holidayRate"),
                nightRate: n("nightRate"),
                nightStart: n("nightStart"),
                nightEnd: n("nightEnd"),
                combination: v("combination"),
                saturday: checked("saturday"),
                dailyAcrossShifts: checked("dailyAcrossShifts"),
              }
            : undefined,
        });
        next.workplaces = editor.value
          ? data.workplaces.map((x) => (x.id === value.id ? value : x))
          : [...data.workplaces, value];
      }
      if (editor.kind === "shift") {
        if (
          v("end") &&
          new Date(v("end")).getTime() > new Date().getTime() &&
          !checked("scheduled")
        )
          throw new Error(
            he
              ? "משמרת עתידית יש לסמן כמתוכננת."
              : "Mark future shifts as scheduled.",
          );
        const value = shiftSchema.parse({
          ...editor.value,
          id: editor.value?.id || id(),
          workplaceId: v("workplaceId"),
          start: new Date(v("start")).toISOString(),
          end: v("end") ? new Date(v("end")).toISOString() : null,
          breakMinutes: n("breakMinutes"),
          paidBreak: checked("paidBreak"),
          premium: checked("premium"),
          tips: n("tips"),
          travel: n("travel"),
          notes: v("notes"),
          holiday: checked("holiday"),
          scheduled: checked("scheduled"),
          pauseStartedAt: !v("end") ? editor.value?.pauseStartedAt : undefined,
          legacyGross: undefined,
        });
        if (!confirmOverlap(value)) return;
        next.shifts = editor.value
          ? data.shifts.map((x) => (x.id === value.id ? value : x))
          : [...data.shifts, value];
      }
      if (editor.kind === "goal") {
        const value = goalSchema.parse({
          ...editor.value,
          id: editor.value?.id || id(),
          name: v("name"),
          target: n("target"),
          existing: n("existing"),
          monthly: n("monthly"),
          date: v("date") || null,
          contributions: editor.value?.contributions || [],
          savingShare: n("savingShare"),
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
                  {
                    id: id(),
                    amount,
                    date: v("date"),
                    kind: v("contributionKind") as "deposit" | "withdrawal",
                  },
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
    if (!aiAvailable) {
      setChat((c) => [
        ...c,
        { role: "You", text },
        { role: "SAVIO", text: localAnswer(text, data, month, now) },
      ]);
      setQuestion("");
      return;
    }
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
      if (!res.ok || !result.reply) {
        setChat((c) => [
          ...c,
          { role: "SAVIO", text: localAnswer(text, data, month, now) },
        ]);
        return;
      }
      setChat((c) => [
        ...c,
        { role: "SAVIO", text: result.reply || result.error },
      ]);
    } catch {
      setChat((c) => [
        ...c,
        { role: "SAVIO", text: localAnswer(text, data, month, now) },
      ]);
    } finally {
      setBusy(false);
      setConsent(false);
    }
  }
  const nav = [
    { key: "overview", icon: LayoutDashboard },
    { key: "shifts", icon: Clock3 },
    { key: "transactions", icon: ArrowLeftRight },
    { key: "planner", icon: CalendarDays },
    { key: "smart", icon: Sparkles },
    { key: "goals", icon: Target },
    { key: "challenges", icon: TrendingUp },
    { key: "budgets", icon: ChartPie },
    { key: "subscriptions", icon: ArrowLeftRight },
    { key: "calendar", icon: CalendarDays },
    { key: "insights", icon: TrendingUp },
    { key: "reports", icon: Download },
    { key: "recap", icon: ChartPie },
    { key: "ai", icon: Sparkles },
    { key: "settings", icon: Settings },
  ] as const;
  const tabLabels: Record<Tab, string> = {
    overview: he ? "בית" : "Home",
    shifts: he ? "עבודה" : "Work",
    transactions: he ? "כסף" : "Money",
    planner: he ? "יומן" : "Planner",
    more: he ? "עוד" : "More",
    goals: he ? "יעדים" : "Goals",
    budgets: he ? "תקציבים" : "Budgets",
    calendar: he ? "תשלומים ותזכורות" : "Payments & reminders",
    reports: he ? "דוחות" : "Reports",
    ai: "SAVIO AI",
    settings: he ? "הגדרות" : "Settings",
    challenges: he ? "אתגרים" : "Challenges",
    welcome: he ? "ברוכים הבאים" : "Welcome",
    guide: he ? "מדריך שימוש" : "User guide",
    smart: he ? "היום החכם" : "Smart Day",
    subscriptions: he ? "מנויים ותשלומים" : "Subscriptions",
    insights: he ? "תובנות" : "Insights",
    recap: he ? "סיכום חודשי" : "Monthly recap",
  };
  const label = (key: Tab) => tabLabels[key];
  const primaryNav = [
    { key: "overview", icon: LayoutDashboard },
    { key: "shifts", icon: Clock3 },
    { key: "transactions", icon: ArrowLeftRight },
    { key: "planner", icon: CalendarDays },
    { key: "more", icon: Menu },
  ] as const;
  const lifeProps = {
    data,
    month,
    now,
    busy,
    onSave: commit,
    onEdit: setLifeDraft,
    onNavigate: (next: string) => setTab(next as Tab),
    onShift: (value: Shift) => setEditor({ kind: "shift", value }),
  };
  const quickAction = (key: string) => {
    if (key === "transaction") setEditor({ kind: "transaction" });
    else if (key === "shift") setEditor({ kind: "shift" });
    else if (key === "task" || key === "event") setLifeDraft({ kind: key });
    else setLifeDraft({ kind: "personal-goal" });
  };
  async function recordOccurrence(source: Transaction) {
    const sourceRecord = { ...source };
    delete sourceRecord.projected;
    const record = transactionSchema.parse({
      ...sourceRecord,
      id: id(),
      recurring: false,
      recurrenceId: source.id,
      recurrenceMonth: source.date.slice(0, 7),
    });
    await commit({ ...data, transactions: [...data.transactions, record] });
  }
  const transactionList = (items: Transaction[]) =>
    items.length ? (
      <div className="transaction-list">
        {items.map((x, index) => (
          <Fragment key={x.id}>
            {tab === "transactions" &&
              (index === 0 || items[index - 1].date !== x.date) && (
                <h2 className="transaction-day-heading">
                  {new Date(x.date + "T12:00:00").toLocaleDateString(
                    he ? "he-IL" : "en-US",
                    { day: "numeric", month: "long" },
                  )}
                </h2>
              )}
            <div className="transaction-row" key={x.id}>
              <span
                className={
                  "transaction-icon " + (x.kind === "income" ? "positive" : "")
                }
              >
                <CategoryGlyph
                  category={x.category}
                  income={x.kind === "income"}
                />
              </span>
              <div className="grow">
                <strong>{x.title}</strong>
                <small>
                  {categoryLabel(x.category, he)} {x.recurring ? "· ↻" : ""}
                  {x.projected &&
                    (he ? " · צפויה, טרם אושרה" : " · Expected, not recorded")}
                </small>
                {x.projected && (
                  <ConfirmRecurring
                    transaction={x}
                    onConfirm={recordOccurrence}
                    busy={busy}
                    he={he}
                  />
                )}
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
                <details className="row-menu">
                  <summary
                    aria-label={
                      (he ? "פעולות עבור " : "Actions for ") + x.title
                    }
                  >
                    <MoreHorizontal size={20} />
                  </summary>
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
                </details>
              )}
            </div>
          </Fragment>
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
        <article key={g.id} className="goal-card reference-goal">
          <div className="goal-art">
            <GoalArtwork name={g.name} />
          </div>
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
            <details className="goal-management">
              <summary>
                {he ? "ניהול היעד והפקדות" : "Manage goal & contributions"}
              </summary>
              {progress >= 100 && !g.completionHistory?.length && (
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => {
                    if (
                      confirm(
                        he
                          ? "לתעד שהיעד הושלם כעת? פעולה זו מתעדת מועד השלמה בלבד ואינה מעבירה כסף."
                          : "Record this goal as completed now? This logs the completion date and does not transfer money.",
                      )
                    )
                      void commit({
                        ...data,
                        goals: data.goals.map((x) =>
                          x.id === g.id
                            ? {
                                ...x,
                                completionHistory: [new Date().toISOString()],
                              }
                            : x,
                        ),
                      });
                  }}
                >
                  {he ? "תיעוד השלמת היעד" : "Record goal completion"}
                </button>
              )}
              {g.completionHistory?.map((stamp) => (
                <p className="small positive" key={stamp}>
                  {he ? "השלמה שתועדה" : "Recorded completion"} ·{" "}
                  {new Date(stamp).toLocaleDateString(he ? "he-IL" : "en-US")}
                </p>
              ))}
              <details className="goal-plan-details">
                <summary>
                  {he ? "תכנית והפקדות" : "Plan & contributions"}
                </summary>
                <p className="small muted">
                  {goalShifts(data, g, now, payroll.byShift) === null
                    ? he
                      ? "הגדירו אחוז חיסכון ותעדו משמרות שהסתיימו לקבלת תחזית לפי משמרות."
                      : "Set a saving share and record completed shifts for a shift-based projection."
                    : he
                      ? `נותרו כ־${goalShifts(data, g, now, payroll.byShift)} משמרות ממוצעות בחיסכון של ${g.savingShare}% מהברוטו המשוער.`
                      : `About ${goalShifts(data, g, now, payroll.byShift)} average shifts at ${g.savingShare}% of estimated gross.`}
                </p>

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
                    onClick={() =>
                      setEditor({ kind: "contribution", value: g })
                    }
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
                      {c.date} · {c.kind === "withdrawal" ? "−" : "+"}
                      {money(c.amount)}
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
              </details>
            </details>
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
  if (tab === "guide")
    return <UserGuide he={he} onComplete={() => setTab("overview")} />;
  if (tab === "welcome")
    return (
      <WelcomeScreen
        he={he}
        onLanguage={() =>
          commit({
            ...data,
            profile: { ...data.profile, language: he ? "en" : "he" },
          })
        }
        onStart={() => setTab("guide")}
      />
    );
  return (
    <div className={"app-shell approved-app savio-v4 screen-" + tab}>
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
        <nav>
          {nav.map(({ key, icon: Icon }) => (
            <Fragment key={key}>
              {[
                "overview",
                "smart",
                "budgets",
                "insights",
                "settings",
              ].includes(key) && (
                <p className="sidebar-nav-heading">
                  {
                    (
                      {
                        overview: he ? "היום שלי" : "Everyday",
                        smart: he ? "תכנון ויעדים" : "Planning & goals",
                        budgets: he ? "ניהול הכסף" : "Money management",
                        insights: he ? "תובנות ודוחות" : "Insights & reports",
                        settings: he ? "העדפות" : "Preferences",
                      } as Record<string, string>
                    )[key]
                  }
                </p>
              )}
              <button
                className={"nav-item " + (tab === key ? "active" : "")}
                aria-current={tab === key ? "page" : undefined}
                onClick={() => setTab(key)}
              >
                <Icon size={20} />
                <span>{label(key)}</span>
              </button>
            </Fragment>
          ))}
        </nav>
        <div className="sidebar-bottom">
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
          <div className="reference-mobile-bar">
            <strong className="reference-wordmark">SAVIO</strong>
            <span className="header-local">
              <ShieldCheck size={15} />
              {he ? "המרחב האישי שלך" : "Your personal space"}
            </span>
          </div>
          <div className="breadcrumb">
            SAVIO <span>/</span>
            <strong>{label(tab)}</strong>
          </div>
          <span className="header-local desktop-local">
            <ShieldCheck size={15} />
            {he ? "נשמר במכשיר הזה" : "Stored on this device"}
          </span>
        </header>
        <main id="main-content" className="main-content" tabIndex={-1}>
          {tab !== "overview" && (
            <div className="page-heading">
              <div>
                <h1>{label(tab)}</h1>
              </div>
              <div className="heading-actions">
                {[
                  "shifts",
                  "transactions",
                  "budgets",
                  "reports",
                  "insights",
                  "recap",
                ].includes(tab) && (
                  <div className="month-picker">
                    <button
                      aria-label={he ? "החודש הקודם" : "Previous month"}
                      onClick={() => changeMonth(-1)}
                    >
                      {he ? (
                        <ChevronRight size={16} />
                      ) : (
                        <ChevronLeft size={16} />
                      )}
                    </button>
                    <span>{monthLabel}</span>
                    <button
                      aria-label={he ? "החודש הבא" : "Next month"}
                      onClick={() => changeMonth(1)}
                    >
                      {he ? (
                        <ChevronLeft size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </button>
                  </div>
                )}
                {tab === "transactions" && moneyView === "transactions" && (
                  <button
                    className="primary"
                    onClick={() => setEditor({ kind: "transaction" })}
                  >
                    <Plus size={17} />
                    {t.add}
                  </button>
                )}
              </div>
            </div>
          )}
          <AppUpdate
            he={he}
            busy={busy || Boolean(editor) || Boolean(lifeDraft)}
          />
          {message && (
            <div role="status" className="notice">
              <span>{message}</span>
              <button aria-label="Dismiss" onClick={() => setMessage("")}>
                ×
              </button>
            </div>
          )}
          {tab === "overview" && (
            <LifeHome
              {...lifeProps}
              onQuick={quickAction}
              periodControl={
                <div className="month-picker">
                  <button
                    aria-label={he ? "החודש הקודם" : "Previous month"}
                    onClick={() => changeMonth(-1)}
                  >
                    {he ? (
                      <ChevronRight size={16} />
                    ) : (
                      <ChevronLeft size={16} />
                    )}
                  </button>
                  <span>{monthLabel}</span>
                  <button
                    aria-label={he ? "החודש הבא" : "Next month"}
                    onClick={() => changeMonth(1)}
                  >
                    {he ? (
                      <ChevronLeft size={16} />
                    ) : (
                      <ChevronRight size={16} />
                    )}
                  </button>
                </div>
              }
              finance={
                <ReferenceDashboard
                  data={data}
                  month={month}
                  money={money}
                  pay={pay}
                  onAdd={() => setEditor({ kind: "transaction" })}
                  onWork={() => setTab("shifts")}
                  onSavings={() => setTab("goals")}
                  recent={null}
                />
              }
              recent={transactionList(
                [...txs]
                  .filter((t) => !t.projected)
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .slice(0, 4),
              )}
            />
          )}
          {tab === "planner" && <PlannerScreen {...lifeProps} />}
          {tab === "smart" && <SmartDayScreen {...lifeProps} />}
          {tab === "subscriptions" && <SubscriptionsScreen {...lifeProps} />}
          {tab === "insights" && <AnalyticsScreen {...lifeProps} />}
          {tab === "recap" && <RecapScreen {...lifeProps} />}
          {tab === "transactions" && (
            <SectionTabs
              id="money"
              label={he ? "מסכי כסף" : "Money sections"}
              value={moneyView}
              onChange={setMoneyView}
              items={[
                { key: "transactions", label: he ? "תנועות" : "Transactions" },
                { key: "forecast", label: he ? "תחזית" : "Forecast" },
                { key: "analysis", label: he ? "ניתוח" : "Analysis" },
              ]}
            />
          )}
          {tab === "transactions" && (
            <SectionPanel id="money" value="forecast" active={moneyView}>
              <CashFlowPanel {...lifeProps} />
            </SectionPanel>
          )}
          {tab === "transactions" && (
            <SectionPanel id="money" value="transactions" active={moneyView}>
              {moneyView === "transactions" && (
                <article className="panel">
                  <div
                    className="transaction-segments"
                    role="group"
                    aria-label={he ? "סינון תנועות" : "Transaction type"}
                  >
                    {[
                      { value: "all", label: he ? "הכל" : "All" },
                      { value: "income", label: t.incomeType },
                      { value: "expense", label: t.expense },
                    ].map((option) => (
                      <button
                        aria-pressed={filter === option.value}
                        onClick={() => setFilter(option.value)}
                        key={option.value}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
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
                        aria-label={he ? "סינון קטגוריה" : "Filter category"}
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                      >
                        <option value="all">
                          {he ? "כל הקטגוריות" : "All categories"}
                        </option>

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
                          (filter === "all" || x.kind === filter) &&
                          (categoryFilter === "all" ||
                            x.category === categoryFilter) &&
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
                </article>
              )}
            </SectionPanel>
          )}
          {tab === "transactions" && (
            <SectionPanel id="money" value="analysis" active={moneyView}>
              <article className="panel">
                <h2>{he ? "ניתוח הוצאות" : "Spending analysis"}</h2>
                <SpendingAnalytics
                  transactions={data.transactions}
                  month={month}
                  he={he}
                  money={money}
                />
              </article>
              <CategoryManager data={data} onSave={commit} busy={busy} />
            </SectionPanel>
          )}
          {tab === "shifts" && (
            <SectionTabs
              id="work"
              label={he ? "מסכי עבודה" : "Work sections"}
              value={workView}
              onChange={setWorkView}
              items={[
                { key: "today", label: he ? "היום" : "Today" },
                { key: "planning", label: he ? "תכנון" : "Planning" },
                { key: "salary", label: he ? "שכר" : "Salary" },
                { key: "settings", label: he ? "מקומות עבודה" : "Workplaces" },
              ]}
            />
          )}
          {tab === "shifts" && (
            <>
              <SectionPanel id="work" value="today" active={workView}>
                <ReferenceWork
                  data={data}
                  month={month}
                  now={now}
                  busy={busy}
                  onStart={startShift}
                  onStop={stopShift}
                  onPause={togglePause}
                  onManual={() => setEditor({ kind: "shift" })}
                />
                {!data.workplaces.length && (
                  <button
                    className="secondary full"
                    onClick={() => setEditor({ kind: "workplace" })}
                  >
                    <Plus size={16} />
                    {t.workplace}
                  </button>
                )}
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
                          .filter((s) =>
                            payroll.segments.some(
                              (p) =>
                                p.shiftId === s.id && p.date.startsWith(month),
                            ),
                          )
                          .map((s) => {
                            const w = data.workplaces.find(
                                (w) => w.id === s.workplaceId,
                              )!,
                              p = payroll.byShift[s.id];
                            return (
                              <tr key={s.id}>
                                <td>
                                  {w.name}
                                  {s.scheduled && (
                                    <small>
                                      {" "}
                                      · {he ? "מתוכננת" : "Scheduled"}
                                    </small>
                                  )}
                                  {s.notes && (
                                    <small className="muted">
                                      {" "}
                                      · {s.notes}
                                    </small>
                                  )}
                                  {s.premium
                                    ? he
                                      ? " · תוספת שכר"
                                      : " · Premium"
                                    : ""}
                                  {s.legacyGross !== undefined && (
                                    <small className="muted">
                                      {" "}
                                      ·{" "}
                                      {he ? "אומדן מיובא" : "Imported estimate"}
                                    </small>
                                  )}
                                </td>
                                <td>
                                  <bdi>
                                    {new Date(s.start).toLocaleString(
                                      he ? "he-IL" : "en-GB",
                                      {
                                        dateStyle: "short",
                                        timeStyle: "short",
                                        hour12: false,
                                      },
                                    )}
                                  </bdi>
                                </td>
                                <td>
                                  <bdi>
                                    {s.end
                                      ? new Date(s.end).toLocaleString(
                                          he ? "he-IL" : "en-GB",
                                          {
                                            dateStyle: "short",
                                            timeStyle: "short",
                                            hour12: false,
                                          },
                                        )
                                      : he
                                        ? "בפעילות"
                                        : "Running"}
                                  </bdi>
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
                      ? "כללי השכר לפי ההסכם של כל מקום עבודה. ניתן להגדיר שבת אוטומטית, חג, לילה ושילוב תוספות בהגדרות המתקדמות. החישוב הוא ברוטו משוער ולא נטו."
                      : "Configure daily, weekly, night, Saturday and holiday policies per workplace. Estimates are gross before deductions, never guaranteed net pay."}
                  </p>
                </article>
              </SectionPanel>
              <SectionPanel id="work" value="salary" active={workView}>
                <SalaryOverview data={data} month={month} now={now} />
                <WorkPro
                  {...lifeProps}
                  view="salary"
                  onNewShift={(date) => setEditor({ kind: "shift", date })}
                />
              </SectionPanel>
              <SectionPanel id="work" value="planning" active={workView}>
                <SectionTabs
                  id="work-calendar"
                  label={he ? "תצוגת תכנון עבודה" : "Work planning view"}
                  value={workCalendarView}
                  onChange={setWorkCalendarView}
                  items={[
                    { key: "month", label: he ? "חודש" : "Month" },
                    { key: "week", label: he ? "שבוע" : "Week" },
                  ]}
                />
                <SectionPanel
                  id="work-calendar"
                  value="month"
                  active={workCalendarView}
                >
                  <ShiftCalendar
                    data={data}
                    month={month}
                    now={now}
                    onMonth={changeMonth}
                    onAdd={(date) => setEditor({ kind: "shift", date })}
                    onEdit={(value) => setEditor({ kind: "shift", value })}
                  />
                </SectionPanel>
                <SectionPanel
                  id="work-calendar"
                  value="week"
                  active={workCalendarView}
                >
                  <WorkPro
                    {...lifeProps}
                    view="planning"
                    onNewShift={(date) => setEditor({ kind: "shift", date })}
                  />
                </SectionPanel>
              </SectionPanel>
              <SectionPanel id="work" value="settings" active={workView}>
                <div className="section-toolbar">
                  <h2>{he ? "מקומות עבודה ושכר" : "Workplaces & pay"}</h2>
                  <button
                    className="primary"
                    onClick={() => setEditor({ kind: "workplace" })}
                  >
                    <Plus size={16} />
                    {t.workplace}
                  </button>
                </div>
                <details className="workplace-manager" open>
                  <summary>
                    {he
                      ? "מקומות עבודה והגדרות שכר"
                      : "Workplaces & payroll settings"}
                  </summary>
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
                          className="icon-button"
                          aria-label={t.edit}
                          onClick={() =>
                            setEditor({ kind: "workplace", value: w })
                          }
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={t.delete}
                          onClick={() => remove("workplaces", w.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {!data.workplaces.length && (
                      <p className="muted small">
                        {he
                          ? "הוסיפו מקום עבודה כדי להגדיר כללי שכר."
                          : "Add a workplace to set your payroll rules."}
                      </p>
                    )}
                  </div>
                </details>
                <WorkPro
                  {...lifeProps}
                  view="settings"
                  onNewShift={(date) => setEditor({ kind: "shift", date })}
                />
              </SectionPanel>
            </>
          )}
          {tab === "goals" && (
            <SectionTabs
              id="goals"
              label={he ? "מסכי יעדים" : "Goal sections"}
              value={goalView}
              onChange={setGoalView}
              items={[
                { key: "savings", label: he ? "חיסכון" : "Savings" },
                {
                  key: "personal",
                  label: he ? "יעדים אישיים" : "Personal goals",
                },
                { key: "tools", label: he ? "כלים" : "Tools" },
              ]}
            />
          )}
          {tab === "goals" && (
            <SectionPanel id="goals" value="savings" active={goalView}>
              {goalView === "savings" && (
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
                          {he
                            ? "מאוזנת · 35% מהיתרה"
                            : "Balanced · 35% surplus"}
                        </option>
                        <option value="accelerated">
                          {he
                            ? "מואצת · 50% מהיתרה"
                            : "Accelerated · 50% surplus"}
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
                </>
              )}
            </SectionPanel>
          )}
          {tab === "goals" && (
            <SectionPanel id="goals" value="personal" active={goalView}>
              <PersonalGoalsScreen {...lifeProps} />
            </SectionPanel>
          )}
          {tab === "goals" && (
            <SectionPanel id="goals" value="tools" active={goalView}>
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
                            (n, g) =>
                              n +
                              g.contributions.filter(
                                (c) => c.kind !== "withdrawal",
                              ).length,
                            0,
                          ) /
                            3) *
                            100,
                        ) + "%",
                    }}
                  />
                </div>
                <p className="positive">
                  {data.goals.reduce(
                    (n, g) =>
                      n +
                      g.contributions.filter((c) => c.kind !== "withdrawal")
                        .length,
                    0,
                  ) >= 3
                    ? he
                      ? "✓ הישג חדש: הרגל חיסכון"
                      : "✓ Habit builder achievement unlocked"
                    : `${data.goals.reduce((n, g) => n + g.contributions.filter((c) => c.kind !== "withdrawal").length, 0)} / 3 ${he ? "הפקדות" : "contributions"}`}
                </p>
              </div>
              <div className="spaced">
                <PurchaseCalculator workplaces={data.workplaces} he={he} />
              </div>
            </SectionPanel>
          )}
          {tab === "reports" && (
            <ReportsScreen data={data} month={month} now={now} />
          )}
          {tab === "budgets" && (
            <BudgetScreen
              data={data}
              month={month}
              categories={categories}
              money={money}
              onSave={commit}
              busy={busy}
            />
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
                      ? "הדרך הנכונה לכסף שלך"
                      : "A better path for your money"}
                  </h2>
                  <p>
                    {aiAvailable
                      ? he
                        ? "אימון פיננסי המבוסס על השאלות שלך. נתונים אישיים נשלחים רק בהסכמתך לכל בקשה."
                        : "Financial coaching grounded in your questions. Personal records are shared only with your permission for each request."
                      : t.noAI}
                  </p>
                </div>
                {!chat.length && (
                  <div className="ai-suggestions">
                    {[
                      he
                        ? "איך לחסוך יותר החודש?"
                        : "How can I save more this month?",
                      he
                        ? "איך מתכננים תקציב חודשי?"
                        : "How do I plan a monthly budget?",
                      he
                        ? "כמה שעות עבודה עולה הקנייה הבאה?"
                        : "How much work does my next purchase cost?",
                      he
                        ? "איך מתחילים לבנות הרגלי חיסכון?"
                        : "How do I build a savings habit?",
                    ].map((text) => (
                      <button onClick={() => setQuestion(text)} key={text}>
                        <Sparkles size={17} />
                        {text}
                        <ArrowRight size={15} />
                      </button>
                    ))}
                  </div>
                )}
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
                  <button className="primary" disabled={busy}>
                    <Sparkles size={16} />
                    {busy ? "Thinking…" : t.send}
                  </button>
                </form>
              </article>
              <details className="ai-local-tools">
                <summary>
                  {he ? "תובנות וכלים מקומיים" : "Local insights & tools"}
                </summary>
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
              </details>
            </div>
          )}
          {tab === "more" && (
            <section className="more-sections">
              {[
                {
                  title: he ? "היום והיעדים שלי" : "My day & goals",
                  keys: ["smart", "goals", "challenges"],
                },
                {
                  title: he ? "ניהול הכסף" : "Money management",
                  keys: ["budgets", "subscriptions", "calendar"],
                },
                {
                  title: he ? "תובנות ודוחות" : "Insights & reports",
                  keys: ["insights", "reports", "recap", "ai"],
                },
                {
                  title: he ? "העדפות ונתונים" : "Preferences & data",
                  keys: ["settings"],
                },
              ].map((group) => (
                <section className="navigation-group" key={group.title}>
                  <h2>{group.title}</h2>
                  <div className="navigation-rows">
                    {group.keys.map((key) => {
                      const item = nav.find((n) => n.key === key)!;
                      const Icon = item.icon;
                      return (
                        <button key={key} onClick={() => setTab(item.key)}>
                          <span className="menu-icon">
                            <Icon size={20} />
                          </span>
                          <span>{label(item.key)}</span>
                          {he ? (
                            <ChevronLeft size={18} />
                          ) : (
                            <ChevronRight size={18} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
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
                    (n, g) =>
                      n +
                      g.contributions.filter((c) => c.kind !== "withdrawal")
                        .length,
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
            <SettingsScreen
              data={data}
              onSave={commit}
              busy={busy}
              onWelcome={() => setTab("guide")}
              onAI={() => setTab("ai")}
            />
          )}
          {tab === "overview" &&
            backupDue &&
            Boolean(
              data.transactions.length ||
              data.shifts.length ||
              data.goals.length ||
              data.reminders.length ||
              Object.keys(data.budgets).length ||
              lifeOf(data).tasks.length ||
              lifeOf(data).events.length ||
              lifeOf(data).personalGoals.length ||
              lifeOf(data).subscriptions.length ||
              lifeOf(data).payslips.length,
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
            (key === "more" && !primaryNav.some((item) => item.key === tab));
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
      {lifeDraft && (
        <LifeEditor
          data={data}
          busy={busy}
          onSave={commit}
          draft={lifeDraft}
          onClose={() => setLifeDraft(null)}
        />
      )}
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
                  <input
                    name="category"
                    list="transaction-categories"
                    maxLength={60}
                    defaultValue={editor.value?.category || categories[0]}
                    required
                  />
                  <datalist id="transaction-categories">
                    {categories.map((c) => (
                      <option value={c} key={c}>
                        {categoryLabel(c, he)}
                      </option>
                    ))}
                  </datalist>
                </Field>
                <Field label={t.date}>
                  <input
                    name="date"
                    type="date"
                    defaultValue={editor.value?.date || today()}
                    required
                  />
                </Field>
                <Field
                  label={
                    he
                      ? "קישור למשמרת (להכנסה בלבד, ללא הוספת האומדן ליתרה)"
                      : "Link a shift (income only; estimate is never added to balance)"
                  }
                >
                  <select
                    name="linkedShiftId"
                    defaultValue={editor.value?.linkedShiftId || ""}
                  >
                    <option value="">{he ? "ללא קישור" : "No link"}</option>
                    {data.shifts
                      .filter((s) => s.end && !s.scheduled)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {
                            data.workplaces.find((w) => w.id === s.workplaceId)
                              ?.name
                          }{" "}
                          · {new Date(s.start).toLocaleDateString()}
                        </option>
                      ))}
                  </select>
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
            {editor.kind === "goal" && (
              <Field
                label={
                  he
                    ? "אחוז מאומדן שכר המשמרת שמיועד לחיסכון"
                    : "Share of estimated shift income to save (%)"
                }
              >
                <input
                  name="savingShare"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  defaultValue={editor.value?.savingShare ?? 0}
                />
              </Field>
            )}
            {editor.kind === "contribution" && (
              <>
                <Field label={he ? "פעולה" : "Action"}>
                  <select name="contributionKind">
                    <option value="deposit">{he ? "הפקדה" : "Deposit"}</option>
                    <option value="withdrawal">
                      {he ? "משיכה" : "Withdrawal"}
                    </option>
                  </select>
                </Field>
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
            {editor.kind === "workplace" && (
              <PayrollFields workplace={editor.value} he={he} />
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
                        : editor.date
                          ? editor.date + "T09:00"
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
                        : editor.date
                          ? editor.date + "T17:00"
                          : undefined
                    }
                    required={!editor.value || Boolean(editor.value.end)}
                  />
                </Field>
                <ShiftExtras shift={editor.value} he={he} />
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
