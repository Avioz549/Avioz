import { test, expect, type Page } from "@playwright/test";
import { emptyData } from "../../lib/finance";
import { emptyLife } from "../../lib/life-model";
import { mkdir } from "node:fs/promises";
test.use({
  viewport: { width: 390, height: 844 },
  timezoneId: "UTC",
  reducedMotion: "reduce",
});
function fixture() {
  const data = emptyData(),
    workplaceId = crypto.randomUUID();
  data.profile.name = "עדי";
  data.workplaces = [
    {
      id: workplaceId,
      name: "Studio",
      wage: 50,
      regularHours: 8,
      overtimeHours: 2,
      overtimeRate: 1.25,
      extraRate: 1.5,
      premiumRate: 1.5,
    },
  ];
  data.shifts = [
    {
      id: crypto.randomUUID(),
      workplaceId,
      start: "2026-11-07T09:00:00Z",
      end: "2026-11-07T10:00:00Z",
      breakMinutes: 0,
      paidBreak: false,
      premium: false,
    },
    {
      id: crypto.randomUUID(),
      workplaceId,
      start: "2026-11-08T16:00:00Z",
      end: "2026-11-08T22:00:00Z",
      breakMinutes: 0,
      paidBreak: false,
      premium: false,
      scheduled: true,
    },
  ];
  data.transactions = [
    {
      id: crypto.randomUUID(),
      title: "Salary",
      date: "2026-11-01",
      kind: "income",
      amount: 1000,
      category: "Salary",
      recurring: false,
    },
    {
      id: crypto.randomUUID(),
      title: "Lunch",
      date: "2026-11-07",
      kind: "expense",
      amount: 40,
      category: "Food",
      recurring: false,
    },
    {
      id: crypto.randomUUID(),
      title: "Refund",
      date: "2026-11-07",
      kind: "income",
      amount: 10,
      category: "Food",
      recurring: false,
    },
  ];
  data.goals = [
    {
      id: crypto.randomUUID(),
      name: "Study",
      target: 2000,
      existing: 800,
      monthly: 100,
      date: null,
      contributions: [],
    },
  ];
  data.budgets = { "2026-11:Food": 100 };
  data.life = emptyLife();
  data.life.tasks = [
    {
      id: crypto.randomUUID(),
      title: "Read today",
      due: "2026-11-07",
      time: "15:00",
      priority: "high",
      category: "Personal",
      notes: "",
      repeat: "daily",
      until: null,
      goalId: null,
      completions: {},
    },
  ];
  data.futureRoot = { preserved: true };
  data.profile.futurePreference = { preserved: true };
  return data;
}
async function seed(page: Page, data = fixture()) {
  await page.clock.install({ time: new Date("2026-11-07T12:00:00Z") });
  await page.addInitScript((data) => {
    if (!localStorage.getItem("refinement-seeded")) {
      localStorage.setItem("savio-local-v1", JSON.stringify(data));
      localStorage.setItem("refinement-seeded", "1");
    }
  }, data);
}
async function open(page: Page, tab: string) {
  await page.goto("/?tab=" + tab);
  await expect(page.locator(".main-content")).toBeVisible();
  if (tab === "planner")
    await expect(page.locator(".life-planner")).toBeVisible();
  if (tab === "insights")
    await expect(page.locator(".insights-screen")).toBeVisible();
  if (tab === "recap") await expect(page.locator(".life-recap")).toBeVisible();
}
async function stored(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("savio-local-v3");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    try {
      return await new Promise<{
        revision: number;
        data: ReturnType<typeof emptyData>;
      }>((resolve, reject) => {
        const r = db
          .transaction("workspace-v4")
          .objectStore("workspace-v4")
          .get("main");
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    } finally {
      db.close();
    }
  });
}
test("one Hebrew bottom navigation and grouped secondary destinations remain accessible without duplicate header shortcuts", async ({
  page,
}) => {
  await seed(page);
  await open(page, "overview");
  await expect(page.locator(".bottom-nav button span")).toHaveText([
    "בית",
    "עבודה",
    "כסף",
    "יומן",
    "עוד",
  ]);
  await expect(page.locator(".topbar button")).toHaveCount(0);
  await page
    .locator(".bottom-nav")
    .getByRole("button", { name: "עוד", exact: true })
    .click();
  await expect(page.locator(".navigation-group")).toHaveCount(4);
  const names = await page.locator(".navigation-rows button").allTextContents();
  expect(new Set(names).size).toBe(names.length);
  expect(names).toHaveLength(11);
  await page.getByRole("button", { name: "יעדים", exact: true }).click();
  await expect(page.locator(".bottom-nav [aria-current=page]")).toHaveText(
    "עוד",
  );
  await expect(page.locator(".main-content h1")).toHaveText("יעדים");
  await page
    .locator(".bottom-nav")
    .getByRole("button", { name: "יומן", exact: true })
    .click();
  await expect(page.locator(".life-planner")).toBeVisible();
  await expect(
    page.locator(".life-segments button[aria-pressed=true]"),
  ).toHaveText("יום");
});
test("work presents one focused section at a time and live timer state survives section navigation", async ({
  page,
}) => {
  await seed(page);
  await open(page, "shifts");
  const original = await stored(page);
  await expect(page.locator(".reference-work")).toBeVisible();
  await expect(page.locator(".salary-overview")).toHaveCount(0);
  await expect(page.locator(".shift-calendar")).toHaveCount(0);
  const today = page.getByRole("tab", { name: "היום", exact: true });
  await today.focus();
  await today.press("ArrowLeft");
  await expect(
    page.getByRole("tab", { name: "תכנון", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(page.locator(".shift-calendar")).toBeVisible();
  await page.getByRole("tab", { name: "שבוע", exact: true }).click();
  await expect(page.locator(".life-work-week")).toBeVisible();
  await expect(page.locator(".shift-calendar")).toHaveCount(0);
  await page.getByRole("tab", { name: "שכר", exact: true }).click();
  await expect(page.locator(".salary-overview")).toBeVisible();
  await expect(page.locator(".reference-work")).toHaveCount(0);
  expect(await stored(page)).toEqual(original);
  await today.click();
  await page.getByRole("button", { name: "התחלה", exact: true }).click();
  await page.clock.fastForward(60000);
  await page.getByRole("tab", { name: "שכר", exact: true }).click();
  await today.click();
  await expect(page.locator(".timer")).toContainText("00:01:00");
  await page.getByRole("button", { name: "סיום משמרת", exact: true }).click();
  expect((await stored(page)).data.shifts).toHaveLength(3);
});
test("money starts with transactions and independent type/category filters, while forecasts and charts remain reachable", async ({
  page,
}) => {
  await seed(page);
  await open(page, "transactions");
  const before = await stored(page);
  await expect(page.locator(".life-cashflow")).toHaveCount(0);
  await expect(page.locator(".floating-add")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "הוספת תנועה", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "הוצאה", exact: true }).click();
  await page.getByLabel("סינון קטגוריה", { exact: true }).selectOption("Food");
  await expect(page.locator(".transaction-row")).toHaveCount(1);
  await expect(page.locator(".transaction-row")).toContainText("Lunch");
  await expect(
    page.locator(".transaction-segments button[aria-pressed=true]"),
  ).toHaveText("הוצאה");
  await page.getByRole("tab", { name: "תחזית", exact: true }).click();
  await expect(page.locator(".life-cashflow")).toBeVisible();
  await page.getByRole("tab", { name: "ניתוח", exact: true }).click();
  await expect(page.locator(".analytics-grid")).toBeVisible();
  expect(await stored(page)).toEqual(before);
});
test("savings management, personal goals, tools, one theme entry and dedicated recovery all remain functional", async ({
  page,
}) => {
  await seed(page);
  await open(page, "goals");
  const original = await stored(page);
  await expect(page.locator(".goal-management")).not.toHaveAttribute(
    "open",
    "",
  );
  await page.locator(".goal-management > summary").click();
  await page.locator(".goal-plan-details > summary").click();
  await expect(
    page.getByRole("button", { name: "הפקדה", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "יעדים אישיים", exact: true }).click();
  await expect(page.locator(".life-personal-goals")).toBeVisible();
  await page.getByRole("tab", { name: "כלים", exact: true }).click();
  await expect(page.locator(".purchase-calculator")).toBeVisible();
  await open(page, "settings");
  await expect(
    page.getByRole("button", { name: /עיצוב האפליקציה/ }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: /פרופיל ופרטים/ }).click();
  await expect(
    page.getByRole("dialog").locator('select[name="theme"]'),
  ).toHaveCount(0);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page.getByRole("button", { name: "שחזור נתונים", exact: true }).click();
  await expect(page.locator(".backup-panel")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "חזרה להגדרות", exact: true }).click();
  expect(await stored(page)).toEqual(original);
});
test("all refined screens and internal sections render without overflow or clipped navigation at iPhone widths", async ({
  page,
}) => {
  test.setTimeout(180000);
  await seed(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await mkdir("docs/screenshots/refined", { recursive: true });
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const tab of [
      "overview",
      "shifts",
      "transactions",
      "planner",
      "smart",
      "goals",
      "insights",
      "recap",
      "settings",
      "more",
      "budgets",
      "subscriptions",
      "reports",
      "calendar",
      "ai",
      "challenges",
    ]) {
      await open(page, tab);
      await expect(page.locator(".main-content h1")).toHaveCount(1);
      await expect(page.locator(".main-content h1")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${width}:${tab}`,
      ).toBe(true);
      const before = await page
        .locator(".main-content")
        .evaluate((el) => getComputedStyle(el, "::before").backgroundImage);
      expect(before).not.toContain("ocean-sunset.webp");
      if (tab === "overview")
        expect(
          await page
            .locator(".life-home-intro")
            .evaluate((el) => getComputedStyle(el).backgroundImage),
        ).toContain("ocean-sunset.webp");
      const nav = page.locator(".bottom-nav");
      const box = await nav.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 0.5);
      for (const button of await nav.getByRole("button").all()) {
        const b = await button.boundingBox();
        expect(b!.width).toBeGreaterThanOrEqual(44);
        expect(b!.height).toBeGreaterThanOrEqual(44);
      }
      if (width === 390)
        await page.screenshot({
          path: `docs/screenshots/refined/${tab}.png`,
          fullPage: false,
          animations: "disabled",
        });
    }
    for (const [tab, sections] of [
      ["shifts", ["תכנון", "שכר", "מקומות עבודה"]],
      ["transactions", ["תחזית", "ניתוח"]],
      ["goals", ["יעדים אישיים", "כלים"]],
      ["insights", ["עבודה", "יעדים ומשימות"]],
    ] as const) {
      await open(page, tab);
      for (const [sectionIndex, name] of sections.entries()) {
        await page.getByRole("tab", { name, exact: true }).click();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${width}:${tab}:${name}`,
        ).toBe(true);
        if (width === 390)
          await page.screenshot({
            path: `docs/screenshots/refined/${tab}-${sectionIndex}.png`,
            fullPage: false,
            animations: "disabled",
          });
      }
    }
  }
  expect(errors).toEqual([]);
});
test("refined navigation and initially unvisited sections work offline without changing saved financial records", async ({
  page,
  context,
}) => {
  await seed(page);
  await open(page, "overview");
  const original = await stored(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        ),
      );
  });
  await context.setOffline(true);
  await page
    .locator(".bottom-nav")
    .getByRole("button", { name: "עבודה", exact: true })
    .click();
  await page.getByRole("tab", { name: "שכר", exact: true }).click();
  await expect(page.locator(".salary-overview")).toBeVisible();
  await page
    .locator(".bottom-nav")
    .getByRole("button", { name: "עוד", exact: true })
    .click();
  await page.getByRole("button", { name: "תובנות", exact: true }).click();
  await expect(page.locator(".life-chart")).toHaveCount(2);
  await page.getByRole("tab", { name: "עבודה", exact: true }).click();
  await expect(page.locator(".life-chart")).toHaveCount(2);
  await page.getByRole("tab", { name: "יעדים ומשימות", exact: true }).click();
  await expect(page.locator(".life-chart")).toHaveCount(1);
  expect(await stored(page)).toEqual(original);
});
