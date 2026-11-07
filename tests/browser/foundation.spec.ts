import { test, expect, type Page, type Download } from "@playwright/test";
import { emptyData, type FinanceData } from "../../lib/finance";
test.use({
  timezoneId: "UTC",
  viewport: { width: 390, height: 844 },
  reducedMotion: "reduce",
});
function fixture() {
  const d = emptyData();
  d.profile.language = "en";
  d.workplaces = [
    {
      id: crypto.randomUUID(),
      name: "Foundation",
      wage: 50,
      regularHours: 8,
      overtimeHours: 2,
      overtimeRate: 1.25,
      extraRate: 1.5,
      premiumRate: 1.5,
    },
  ];
  return d;
}
async function seed(page: Page, data: FinanceData) {
  await page.addInitScript((d) => {
    if (!localStorage.getItem("savio-local-v1"))
      localStorage.setItem("savio-local-v1", JSON.stringify(d));
  }, data);
}
async function workspace(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open("savio-local-v3");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    try {
      return await new Promise<{
        data: Record<string, unknown>;
        revision: number;
      }>((resolve, reject) => {
        const req = db
          .transaction("workspace-v4")
          .objectStore("workspace-v4")
          .get("main");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } finally {
      db.close();
    }
  });
}
async function open(page: Page, tab: string) {
  await page.goto("/?tab=" + tab);
  await expect(page.locator(".main-content")).toBeVisible();
}
async function csv(download: Download) {
  const stream = await download.createReadStream();
  let text = "";
  for await (const chunk of stream!) text += chunk.toString();
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "\uFEFF") continue;
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && c === ",") {
      row.push(cell);
      cell = "";
    } else if (!quoted && c === "\r" && text[i + 1] === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i++;
    } else cell += c;
  }
  row.push(cell);
  rows.push(row);
  return rows;
}
test("guide direct links survive reload and existing navigation still works in RTL", async ({
  page,
}) => {
  const d = fixture();
  d.profile.language = "he";
  await seed(page, d);
  for (const path of ["/?tab=guide", "/dashboard?tab=guide"]) {
    await page.goto(path);
    await expect(page.locator(".user-guide")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.reload();
    await expect(page.locator(".user-guide")).toBeVisible();
  }
  await page.getByRole("button", { name: "דילוג", exact: true }).click();
  await expect(page.locator(".hero-balance")).toBeVisible();
  await open(page, "settings");
  await page.getByRole("button", { name: /מדריך שימוש/ }).click();
  await expect(page.locator(".user-guide")).toBeVisible();
  expect((await workspace(page)).revision).toBe(0);
});
test("three one-minute shifts reconcile work totals and both CSV reports without rewriting historical records", async ({
  page,
}) => {
  const d = fixture();
  d.futureWorkspace = { preserve: true };
  d.shifts = [9, 10, 11].map((h) => ({
    id: crypto.randomUUID(),
    workplaceId: d.workplaces[0].id,
    start: new Date(Date.UTC(2026, 10, 1, h)).toISOString(),
    end: new Date(Date.UTC(2026, 10, 1, h, 1)).toISOString(),
    breakMinutes: 0,
    paidBreak: false,
    premium: false,
    futureShift: { original: h },
  }));
  await page.clock.install({ time: new Date("2026-11-06T12:00:00Z") });
  await seed(page, d);
  await open(page, "shifts");
  await expect(page.locator(".work-month-summary")).toContainText("2.49");
  await expect(page.locator("tbody")).toContainText("0.83");
  await expect(page.getByRole("note")).toContainText("Rounding policy");
  await open(page, "reports");
  const first = page.waitForEvent("download");
  await page
    .locator(".report-block")
    .nth(0)
    .getByRole("button", { name: "CSV", exact: true })
    .click();
  const salary = await csv(await first);
  expect(Number(salary[1][2])).toBe(2.49);
  const second = page.waitForEvent("download");
  await page
    .locator(".report-block")
    .nth(1)
    .getByRole("button", { name: "CSV", exact: true })
    .click();
  const history = await csv(await second);
  expect(history.slice(1).map((r) => Number(r[4]))).toEqual([0.83, 0.83, 0.83]);
  expect(
    history.slice(1).reduce((n, r) => n + Math.round(Number(r[4]) * 100), 0),
  ).toBe(Math.round(Number(salary[1][2]) * 100));
  const stored = await workspace(page);
  expect(stored.data).toEqual(d);
  expect(stored.revision).toBe(0);
  await page.reload();
  expect((await workspace(page)).data).toEqual(d);
});
test("overlapping completed shifts require explicit confirmation; cancelling leaves records untouched", async ({
  page,
}) => {
  const d = fixture();
  d.shifts = [
    {
      id: crypto.randomUUID(),
      workplaceId: d.workplaces[0].id,
      start: "2026-11-01T09:00:00Z",
      end: "2026-11-01T11:00:00Z",
      breakMinutes: 0,
      paidBreak: false,
      premium: false,
    },
  ];
  await page.clock.install({ time: new Date("2026-11-06T12:00:00Z") });
  await seed(page, d);
  await open(page, "shifts");
  await page
    .getByRole("button", { name: "Manual shift entry", exact: true })
    .click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Start (local time)").fill("2026-11-01T10:00");
  await form
    .getByLabel("End (use next date for overnight shifts)")
    .fill("2026-11-01T12:00");
  const warnings: string[] = [];
  page.once("dialog", async (dialog) => {
    warnings.push(dialog.message());
    await dialog.dismiss();
  });
  await form.getByRole("button", { name: "Save", exact: true }).click();
  await expect(form).toBeVisible();
  expect((await workspace(page)).data).toEqual(d);
  expect(warnings[0]).toContain("overlaps");
  page.once("dialog", async (dialog) => {
    warnings.push(dialog.message());
    await dialog.accept();
  });
  await form.getByRole("button", { name: "Save", exact: true }).click();
  await expect(form).not.toBeVisible();
  const stored = await workspace(page);
  expect((stored.data.shifts as unknown[]).length).toBe(2);
  expect((stored.data.shifts as unknown[])[0]).toEqual(d.shifts[0]);
  expect(warnings).toHaveLength(2);
});
test("ending an active shift also warns about completed overlaps and supports cancellation", async ({
  page,
}) => {
  const d = fixture(),
    base = {
      workplaceId: d.workplaces[0].id,
      breakMinutes: 0,
      paidBreak: false,
      premium: false,
    };
  d.shifts = [
    {
      ...base,
      id: crypto.randomUUID(),
      start: "2026-11-01T09:00:00Z",
      end: null,
    },
    {
      ...base,
      id: crypto.randomUUID(),
      start: "2026-11-01T09:15:00Z",
      end: "2026-11-01T09:30:00Z",
    },
  ];
  await page.clock.install({ time: new Date("2026-11-01T10:00:00Z") });
  await seed(page, d);
  await open(page, "shifts");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Stop shift", exact: true }).click();
  expect((await workspace(page)).data).toEqual(d);
  await expect(
    page.getByRole("button", { name: "Stop shift", exact: true }),
  ).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Stop shift", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Start", exact: true }),
  ).toBeVisible();
  expect((await workspace(page)).revision).toBe(1);
});
function datedFixture() {
  const d = fixture();
  d.transactions = [
    {
      id: crypto.randomUUID(),
      title: "November receipt",
      kind: "income",
      amount: 100,
      category: "Salary",
      date: "2026-11-01",
      recurring: false,
    },
    {
      id: crypto.randomUUID(),
      title: "December receipt",
      kind: "income",
      amount: 200,
      category: "Salary",
      date: "2026-12-01",
      recurring: false,
    },
  ];
  return d;
}
test("idle app rolls current month at midnight, preserves deliberate historical selection and never writes records", async ({
  page,
}) => {
  const d = datedFixture();
  await page.clock.install({ time: new Date("2026-11-30T23:59:50Z") });
  await page.clock.pauseAt(new Date("2026-11-30T23:59:59.500Z"));
  await seed(page, d);
  await open(page, "overview");
  await expect(page.locator(".hero-balance")).toContainText("100");
  await page.clock.runFor(1500);
  await expect(page.locator(".hero-balance")).toContainText("200");
  await page
    .getByRole("button", { name: "Previous month", exact: true })
    .click();
  await expect(page.locator(".hero-balance")).toContainText("100");
  await page.clock.setSystemTime(new Date("2027-01-01T00:01:00Z"));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.locator(".hero-balance")).toContainText("100");
  expect((await workspace(page)).data).toEqual(d);
  expect((await workspace(page)).revision).toBe(0);
});
test("background and pageshow restore the correct day without an active shift", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-11-30T22:00:00Z") });
  await seed(page, datedFixture());
  await open(page, "overview");
  await expect(page.locator(".hero-balance")).toContainText("100");
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.setSystemTime(new Date("2026-12-01T00:10:00Z"));
  await expect(page.locator(".hero-balance")).toContainText("100");
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator(".hero-balance")).toContainText("200");
  await page.clock.setSystemTime(new Date("2027-01-01T00:10:00Z"));
  await page.evaluate(() => window.dispatchEvent(new Event("pageshow")));
  await expect(page.locator(".hero-balance")).toHaveText(/^[^\d]*0(?:\.00)?$/);
  expect((await workspace(page)).revision).toBe(0);
});
test("visible idle app detects a device timezone change within one minute", async ({
  browser,
}) => {
  // Own the CDP timezone override: a context-level Playwright override cannot
  // be replaced by a second DevTools session.
  const context = await browser.newContext({
    timezoneId: undefined,
    baseURL: test.info().project.use.baseURL,
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage(),
      cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setTimezoneOverride", { timezoneId: "UTC" });
    await page.clock.install({ time: new Date("2026-11-30T23:30:00Z") });
    await seed(page, datedFixture());
    await open(page, "overview");
    await expect(page.locator(".hero-balance")).toContainText("100");
    await cdp.send("Emulation.setTimezoneOverride", { timezoneId: "" });
    await cdp.send("Emulation.setTimezoneOverride", {
      timezoneId: "Asia/Jerusalem",
    });
    await page.clock.runFor(60001);
    await expect(page.locator(".hero-balance")).toContainText("200");
    expect((await workspace(page)).revision).toBe(0);
  } finally {
    await context.close();
  }
});
test("ordinary editors preserve unknown root, profile, workplace, policy, shift, goal, contribution, transaction and reminder fields", async ({
  page,
}) => {
  const d = fixture();
  d.futureWorkspace = { keep: [1, 2] };
  d.profile.futureProfile = { keep: true };
  d.workplaces[0].futureWork = { keep: true };
  d.workplaces[0].policy = {
    weeklyHours: 42,
    weeklyRate: 1.25,
    weekStart: 0,
    saturday: false,
    holidayRate: 1.5,
    nightRate: 1,
    nightStart: 22,
    nightEnd: 6,
    combination: "maximum",
    dailyAcrossShifts: false,
    futurePolicy: { keep: true },
  };
  d.shifts = [
    {
      id: crypto.randomUUID(),
      workplaceId: d.workplaces[0].id,
      start: "2026-11-01T09:00:00Z",
      end: "2026-11-01T10:00:00Z",
      breakMinutes: 0,
      paidBreak: false,
      premium: false,
      futureShift: { keep: true },
    },
  ];
  d.goals = [
    {
      id: crypto.randomUUID(),
      name: "Future safe goal",
      target: 100,
      existing: 10,
      monthly: 5,
      date: null,
      futureGoal: { keep: true },
      contributions: [
        {
          id: crypto.randomUUID(),
          amount: 1,
          date: "2026-11-01",
          futureContribution: { keep: true },
        },
      ],
    },
  ];
  d.transactions = [
    {
      id: crypto.randomUUID(),
      title: "Original transaction",
      kind: "income",
      amount: 20,
      category: "Salary",
      date: "2026-11-01",
      recurring: false,
      futureTransaction: { keep: true },
    },
  ];
  d.reminders = [
    {
      id: crypto.randomUUID(),
      title: "Original reminder",
      date: "2026-11-02",
      done: false,
      futureReminder: { keep: true },
    },
  ];
  await page.clock.install({ time: new Date("2026-11-06T12:00:00Z") });
  await seed(page, d);
  await open(page, "shifts");
  await page.locator(".workplace-manager > summary").click();
  await page
    .locator(".workplace-manager")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  const f = page.getByRole("dialog");
  await f.locator(".payroll-policy > summary").click();
  await f.getByLabel("Enable advanced rules").uncheck();
  await f.getByRole("button", { name: "Save", exact: true }).click();
  await expect(f.getByRole("alert")).toContainText("unknown fields");
  expect((await workspace(page)).data).toEqual(d);
  await f.getByLabel("Enable advanced rules").check();
  await f.getByLabel("Name", { exact: true }).fill("Renamed workplace");
  await f.getByRole("button", { name: "Save", exact: true }).click();
  await expect(f).not.toBeVisible();
  await page
    .locator("tbody")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await f.getByLabel("Shift notes").fill("Updated notes");
  await f.getByRole("button", { name: "Save", exact: true }).click();
  await expect(f).not.toBeVisible();
  await open(page, "transactions");
  await page.locator(".row-menu > summary").click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await f.getByLabel("Description").fill("Updated transaction");
  await f.getByRole("button", { name: "Save", exact: true }).click();
  await open(page, "goals");
  await page.locator(".goal-plan-details > summary").click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await f.getByLabel("Name", { exact: true }).fill("Updated goal");
  await f.getByRole("button", { name: "Save", exact: true }).click();
  await open(page, "calendar");
  await page
    .getByRole("button", { name: "Edit reminder", exact: true })
    .click();
  await f.getByLabel("Reminder title").fill("Updated reminder");
  await f.getByRole("button", { name: "Save reminder", exact: true }).click();
  await open(page, "settings");
  await page
    .getByRole("button", { name: /Profile & personal details/ })
    .click();
  await f.getByLabel("Your name", { exact: true }).fill("Updated profile");
  await f
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await expect(f).not.toBeVisible();
  await page.reload();
  const stored = (await workspace(page)).data as FinanceData;
  expect(stored.futureWorkspace).toEqual(d.futureWorkspace);
  expect(stored.profile.futureProfile).toEqual(d.profile.futureProfile);
  for (const [collection, field] of [
    ["workplaces", "futureWork"],
    ["shifts", "futureShift"],
    ["transactions", "futureTransaction"],
    ["goals", "futureGoal"],
    ["reminders", "futureReminder"],
  ] as const)
    expect(stored[collection][0][field]).toEqual(d[collection][0][field]);
  expect(stored.workplaces[0].policy?.futurePolicy).toEqual(
    d.workplaces[0].policy.futurePolicy,
  );
  expect(stored.goals[0].contributions[0].futureContribution).toEqual(
    d.goals[0].contributions[0].futureContribution,
  );
});
