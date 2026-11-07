import { test, expect, type Page } from "@playwright/test";
import { emptyData } from "../../lib/finance";
import { emptyLife } from "../../lib/life-model";
import type { Theme } from "../../lib/themes";
import { mkdir, readFile } from "node:fs/promises";
test.use({
  viewport: { width: 390, height: 844 },
  timezoneId: "UTC",
  reducedMotion: "reduce",
});
function fixture(theme: Theme = "ocean") {
  const d = emptyData();
  d.profile = { ...d.profile, name: "עדי", theme, opaque: { keep: true } };
  d.opaque = { preserved: true };
  const workplaceId = crypto.randomUUID();
  d.workplaces = [
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
  d.shifts = [
    {
      id: crypto.randomUUID(),
      workplaceId,
      start: "2026-11-08T16:00:00Z",
      end: "2026-11-08T22:00:00Z",
      scheduled: true,
      breakMinutes: 0,
      paidBreak: false,
      premium: false,
    },
  ];
  d.transactions = [
    {
      id: crypto.randomUUID(),
      title: "Actual income",
      amount: 1000,
      kind: "income",
      date: "2026-11-01",
      category: "Salary",
      recurring: false,
    },
    {
      id: crypto.randomUUID(),
      title: "Actual expense",
      amount: 200,
      kind: "expense",
      date: "2026-11-02",
      category: "Food",
      recurring: false,
    },
  ];
  d.goals = [
    {
      id: crypto.randomUUID(),
      name: "Ocean trip",
      target: 2000,
      existing: 800,
      monthly: 100,
      date: null,
      contributions: [],
    },
    {
      id: crypto.randomUUID(),
      name: "Study",
      target: 500,
      existing: 100,
      monthly: 20,
      date: null,
      contributions: [],
    },
  ];
  d.life = emptyLife();
  d.life.tasks = [
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
      opaque: true,
    },
  ];
  return d;
}
async function seed(page: Page, d = fixture()) {
  await page.clock.install({ time: new Date("2026-11-07T12:00:00Z") });
  await page.addInitScript((data) => {
    if (!localStorage.getItem("ocean-seeded")) {
      localStorage.setItem("savio-local-v1", JSON.stringify(data));
      localStorage.setItem("ocean-seeded", "1");
    }
  }, d);
}
async function stored(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("savio-local-v3");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const snapshot = await new Promise<{
      data: ReturnType<typeof emptyData>;
      revision: number;
    }>((resolve, reject) => {
      const r = db
        .transaction("workspace-v4")
        .objectStore("workspace-v4")
        .get("main");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const version = db.version;
    db.close();
    return { ...snapshot, version };
  });
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
test("fresh install defaults to Ocean Blue with a single truthful dashboard and home-only photo", async ({
  page,
}) => {
  await open(page, "overview");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "ocean");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator(".hero-balance")).toContainText("0");
  expect(
    await page
      .locator(".life-widget-grid")
      .first()
      .locator(":scope > section")
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-widget"))),
  ).toEqual(["work", "finance", "savings", "smart"]);
  await expect(page.locator(".bottom-nav button")).toHaveCount(5);
  await expect(page.locator(".main-content h1")).toHaveCount(1);
  expect(
    await page
      .locator(".life-home-intro")
      .evaluate((el) => getComputedStyle(el).backgroundImage),
  ).toContain("ocean-sunset.webp");
  expect((await stored(page)).data.transactions).toEqual([]);
});
for (const theme of [
  "dark",
  "light",
  "midnight",
  "purple",
  "system",
] as const) {
  test(`existing ${theme} preference and all opaque/financial records survive load and explicit Ocean selection`, async ({
    page,
  }) => {
    const d = fixture(theme);
    d.life!.preferences.widgets = [
      "finance",
      "smart",
      "work",
      "savings",
      "goals",
      "payments",
      "insights",
      "recent",
    ];
    await seed(page, d);
    await open(page, "settings");
    expect((await stored(page)).data).toEqual(d);
    expect((await stored(page)).version).toBe(2);
    await page.getByRole("button", { name: /עיצוב האפליקציה/ }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.locator(".theme-option")).toHaveCount(6);
    await dialog
      .getByRole("button", { name: "Ocean Blue", exact: true })
      .click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "ocean");
    await expect(
      dialog.getByRole("button", { name: "Ocean Blue", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    expect((await stored(page)).data).toEqual({
      ...d,
      profile: { ...d.profile, theme: "ocean" },
    });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "ocean");
    expect((await stored(page)).data).toEqual({
      ...d,
      profile: { ...d.profile, theme: "ocean" },
    });
  });
}
test("home uses actual earnings/savings and supports task completion, primary goal selection and backup", async ({
  page,
}) => {
  const d = fixture();
  await seed(page, d);
  await open(page, "overview");
  await expect(page.locator(".ocean-next-shift")).toContainText(
    "16:00 – 22:00",
  );
  await expect(page.locator(".ocean-next-shift")).toContainText("300");
  await expect(page.locator(".ocean-summary-cards")).toContainText("1,000");
  await expect(page.locator(".ocean-summary-cards")).toContainText("900");
  await expect(page.locator(".ocean-main-goal")).toContainText("Ocean trip");
  await expect(
    page.locator(".ocean-main-goal [role=progressbar]"),
  ).toHaveAttribute("aria-valuenow", "40");
  await page
    .getByRole("button", { name: "סימון משימה Read today", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "סימון משימה Read today", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "התאמת הבית", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("יעד חיסכון מרכזי", { exact: true })
    .selectOption(d.goals[1].id);
  await expect(
    dialog.getByLabel("יעד חיסכון מרכזי", { exact: true }),
  ).toHaveValue(d.goals[1].id);
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.locator(".ocean-main-goal")).toContainText("Study");
  await page.reload();
  await expect(page.locator(".ocean-main-goal")).toContainText("Study");
  const saved = (await stored(page)).data;
  expect(saved.transactions).toEqual(d.transactions);
  expect(saved.shifts).toEqual(d.shifts);
  expect(saved.goals).toEqual(d.goals);
  expect(saved.life?.preferences.primarySavingsGoalId).toBe(d.goals[1].id);
  await page.locator(".ocean-finance-details > summary").click();
  await expect(page.locator(".reference-chart")).toBeVisible();
  await page
    .locator(".ocean-finance-details")
    .getByRole("button", { name: "הוספת תנועה", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await open(page, "settings");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /גיבוי נתונים/ }).click();
  const file = await (await download).path();
  const backup = JSON.parse(await readFile(file!, "utf8"));
  expect(backup.data.life.preferences.primarySavingsGoalId).toBe(d.goals[1].id);
  expect(backup.data.transactions).toEqual(d.transactions);
});
test("Ocean layouts keep all modules clean, readable and navigable across mobile and desktop widths", async ({
  page,
}) => {
  test.setTimeout(120000);
  await seed(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await mkdir("docs/screenshots/ocean", { recursive: true });
  for (const width of [320, 390, 430, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    for (const tab of [
      "overview",
      "transactions",
      "shifts",
      "planner",
      "goals",
      "budgets",
      "ai",
      "settings",
      "smart",
      "subscriptions",
      "insights",
      "recap",
      "calendar",
      "reports",
      "challenges",
      "more",
    ]) {
      await open(page, tab);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${width} ${tab}`,
      ).toBe(true);
      const background = await page
        .locator(".main-content")
        .evaluate((el) => getComputedStyle(el, "::before").backgroundImage);
      expect(background.includes("ocean-sunset.webp"), tab).toBe(false);
      if (tab === "overview")
        expect(
          await page
            .locator(".life-home-intro")
            .evaluate((el) => getComputedStyle(el).backgroundImage),
        ).toContain("ocean-sunset.webp");
      if (
        width === 390 &&
        [
          "overview",
          "transactions",
          "shifts",
          "planner",
          "goals",
          "budgets",
          "ai",
          "settings",
        ].includes(tab)
      )
        await page.screenshot({
          path: `docs/screenshots/ocean/${tab}.png`,
          fullPage: true,
          animations: "disabled",
        });
    }
  }
  expect(errors).toEqual([]);
});
test("Ocean photo and local records remain usable offline with no API response cached", async ({
  page,
  context,
}) => {
  await seed(page);
  await open(page, "overview");
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
  await (
    await context.newCDPSession(page)
  ).send("Network.setCacheDisabled", { cacheDisabled: true });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".hero-balance")).toContainText("800");
  expect(
    await page.evaluate(async () => {
      const r = await fetch("/ocean-sunset.webp");
      return (await createImageBitmap(await r.blob())).width;
    }),
  ).toBeGreaterThan(0);
  await page
    .locator(".bottom-nav")
    .getByRole("button", { name: "יומן", exact: true })
    .click();
  await expect(page.locator(".life-planner")).toBeVisible();
  expect(
    await page.evaluate(async () =>
      (
        await Promise.all(
          (await caches.keys()).map(async (key) =>
            (await (await caches.open(key)).keys()).map((r) => r.url),
          ),
        )
      )
        .flat()
        .some((url) => url.includes("/api/")),
    ),
  ).toBe(false);
});
