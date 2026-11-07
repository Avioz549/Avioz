import { test, expect, type Page, type Download } from "@playwright/test";
import { emptyData, type FinanceData } from "../../lib/finance";
import { emptyLife } from "../../lib/life-model";
import { mkdir } from "node:fs/promises";
test.use({
  timezoneId: "UTC",
  viewport: { width: 390, height: 844 },
  reducedMotion: "reduce",
});
function fixture() {
  const d = emptyData();
  d.profile.language = "en";
  d.profile.name = "QA";
  d.workplaces = [
    {
      id: crypto.randomUUID(),
      name: "Studio",
      wage: 50,
      regularHours: 8,
      overtimeHours: 2,
      overtimeRate: 1.25,
      extraRate: 1.5,
      premiumRate: 1.5,
    },
  ];
  d.transactions = [
    {
      id: crypto.randomUUID(),
      title: "Recorded salary",
      kind: "income",
      amount: 1000,
      category: "Salary",
      date: "2026-11-01",
      recurring: false,
    },
    {
      id: crypto.randomUUID(),
      title: "Recorded bill",
      kind: "expense",
      amount: 200,
      category: "Bills",
      date: "2026-11-02",
      recurring: false,
    },
  ];
  d.futureMetadata = { preserve: true };
  return d;
}
async function seed(page: Page, data = fixture()) {
  await page.clock.install({ time: new Date("2026-11-07T12:00:00Z") });
  await page.addInitScript((d) => {
    if (!localStorage.getItem("savio-local-v1"))
      localStorage.setItem("savio-local-v1", JSON.stringify(d));
  }, data);
}
async function open(page: Page, tab: string) {
  await page.goto("/?tab=" + tab);
  await expect(page.locator(".main-content")).toBeVisible();
  if (tab === "planner")
    await expect(page.locator(".life-planner")).toBeVisible();
  if (tab === "insights")
    await expect(
      page.getByText("SAVIO INSIGHTS", { exact: true }),
    ).toBeVisible();
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
      return await new Promise<{ data: FinanceData; revision: number }>(
        (resolve, reject) => {
          const r = db
            .transaction("workspace-v4")
            .objectStore("workspace-v4")
            .get("main");
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
        },
      );
    } finally {
      db.close();
    }
  });
}
async function downloadText(download: Download) {
  let text = "";
  for await (const chunk of (await download.createReadStream())!)
    text += chunk.toString();
  return text;
}
async function save(page: Page) {
  const f = page.getByRole("dialog").last();
  await f.getByRole("button", { name: "Save", exact: true }).click();
  await expect(f).not.toBeVisible();
}
async function addTask(page: Page, title: string) {
  await page.getByRole("button", { name: "New task", exact: true }).click();
  const f = page.getByRole("dialog");
  await f.getByLabel("Task title", { exact: true }).fill(title);
  await save(page);
}
test("planner recurring tasks, daily completion, event CRUD and original shift editing are integrated", async ({
  page,
}) => {
  const d = fixture();
  d.shifts = [
    {
      id: crypto.randomUUID(),
      workplaceId: d.workplaces[0].id,
      start: "2026-11-07T09:00:00Z",
      end: "2026-11-07T17:00:00Z",
      breakMinutes: 0,
      paidBreak: false,
      premium: false,
      scheduled: true,
    },
  ];
  await seed(page, d);
  await open(page, "planner");
  await page.getByRole("button", { name: "New task", exact: true }).click();
  let f = page.getByRole("dialog");
  await f.getByLabel("Task title", { exact: true }).fill("Study math");
  await f.getByLabel("Repeat", { exact: true }).selectOption("daily");
  await f.getByLabel("Priority", { exact: true }).selectOption("high");
  await f
    .getByLabel("Notes", { exact: true })
    .fill("Use the saved study notes");
  await save(page);
  await page.getByRole("button", { name: "day", exact: true }).click();
  await page
    .getByRole("button", { name: "Toggle task Study math", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Toggle task Study math", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await page.getByRole("button", { name: "day", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Toggle task Study math", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Next period", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Toggle task Study math", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  expect((await stored(page)).data.life?.tasks).toHaveLength(1);
  await page.getByRole("button", { name: "New event", exact: true }).click();
  f = page.getByRole("dialog");
  await f.getByLabel("Event title", { exact: true }).fill("Dentist");
  await f.getByLabel("Start time", { exact: true }).fill("10:00");
  await f.getByLabel("End time", { exact: true }).fill("11:00");
  await save(page);
  await expect(page.locator(".life-agenda")).toContainText("Dentist");
  await page.getByRole("button", { name: "Edit Dentist", exact: true }).click();
  await f.getByLabel("Event title", { exact: true }).fill("Dental appointment");
  await save(page);
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await page
    .getByLabel("Calendar filter", { exact: true })
    .selectOption("shift");
  await page.locator(".life-entry-body").click();
  await expect(f.getByLabel("Workplace", { exact: true })).toHaveValue(
    d.workplaces[0].id,
  );
  await f
    .getByLabel("Shift notes", { exact: true })
    .fill("Edited through unified planner");
  await save(page);
  expect((await stored(page)).data.shifts).toHaveLength(1);
  expect((await stored(page)).data.shifts[0].id).toBe(d.shifts[0].id);
  await open(page, "smart");
  await expect(page.locator(".life-day-score")).toContainText("100%");
  await expect(page.locator(".smart-day")).toContainText("Study math");
  expect((await stored(page)).data.futureMetadata).toEqual(d.futureMetadata);
});
test("personal/habit goals, milestones, related tasks and completion history persist without changing savings", async ({
  page,
}) => {
  const d = fixture();
  d.goals = [
    {
      id: crypto.randomUUID(),
      name: "Emergency",
      target: 1000,
      existing: 100,
      monthly: 10,
      date: null,
      contributions: [],
    },
  ];
  await seed(page, d);
  await open(page, "goals");
  await page
    .getByRole("button", { name: "New personal goal", exact: true })
    .click();
  let f = page.getByRole("dialog");
  await f.getByLabel("Goal name", { exact: true }).fill("Read two days");
  await f.getByLabel("Goal type", { exact: true }).selectOption("habit");
  await f.getByLabel("Target quantity", { exact: true }).fill("2");
  await f.getByLabel("Progress unit", { exact: true }).fill("days");
  await save(page);
  await page
    .getByRole("button", { name: "Record progress", exact: true })
    .click();
  f = page.getByRole("dialog");
  await save(page);
  await page
    .getByRole("button", { name: "Record progress", exact: true })
    .click();
  await f.getByRole("button", { name: "Save", exact: true }).click();
  await expect(f.getByRole("alert")).toBeVisible();
  await f.getByRole("button", { name: "Close", exact: true }).click();
  expect((await stored(page)).data.life?.personalGoals[0].history).toHaveLength(
    1,
  );
  await page.clock.setSystemTime(new Date("2026-11-08T12:00:00Z"));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page
    .getByRole("button", { name: "Record progress", exact: true })
    .click();
  await save(page);
  await expect(page.locator(".life-goal-card")).toContainText("100%");
  await page.locator(".life-goal-card details summary").click();
  await expect(page.locator(".life-goal-card details")).toContainText(
    "Completed",
  );
  await page
    .getByRole("button", { name: "Add milestone", exact: true })
    .click();
  await f
    .getByLabel("Milestone title", { exact: true })
    .fill("Discuss the book");
  await save(page);
  await page
    .getByRole("button", {
      name: "Toggle milestone Discuss the book",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Toggle milestone Discuss the book",
      exact: true,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  await open(page, "planner");
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await f.getByLabel("Task title", { exact: true }).fill("Choose a book");
  await f
    .getByLabel("Related goal", { exact: true })
    .selectOption({ label: "Read two days" });
  await save(page);
  const before = (await stored(page)).data;
  expect(before.life?.tasks[0].goalId).toBe(before.life?.personalGoals[0].id);
  expect(before.goals).toEqual(d.goals);
  await open(page, "goals");
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Delete goal Read two days", exact: true })
    .click();
  await expect(page.locator(".life-goal-card")).toHaveCount(0);
  const after = (await stored(page)).data;
  expect(after.life?.tasks[0].goalId).toBeNull();
  expect(after.life?.tasks).toHaveLength(1);
  expect(after.goals).toEqual(d.goals);
});
test("subscription confirmation updates cash forecast exactly once and pausing/deleting preserves confirmed records", async ({
  page,
}) => {
  await seed(page);
  await open(page, "subscriptions");
  await page
    .getByRole("button", { name: "Add subscription", exact: true })
    .click();
  const f = page.getByRole("dialog");
  await f.getByLabel("Payment or income name", { exact: true }).fill("Music");
  await f.getByLabel("Amount", { exact: true }).fill("100");
  await f.getByLabel("First renewal date", { exact: true }).fill("2026-11-01");
  await save(page);
  await expect(page.locator(".life-cashflow")).toContainText("700");
  await page
    .getByRole("button", { name: "Confirm occurrence", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Confirm occurrence", exact: true }),
  ).toHaveCount(0);
  expect((await stored(page)).data.transactions).toHaveLength(3);
  await page.reload();
  await expect(page.locator(".life-cashflow")).toContainText("700");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.locator(".life-grid-two")).toContainText("Paused");
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Delete subscription Music", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Delete subscription Music",
      exact: true,
    }),
  ).toHaveCount(0);
  expect((await stored(page)).data.transactions).toHaveLength(3);
});
test("work targets, weekly plan and payslip comparisons use saved shifts and do not post received income", async ({
  page,
}) => {
  const d = fixture();
  d.shifts = [
    {
      id: crypto.randomUUID(),
      workplaceId: d.workplaces[0].id,
      start: "2026-11-01T08:00:00Z",
      end: "2026-11-01T18:00:00Z",
      breakMinutes: 0,
      paidBreak: false,
      premium: false,
    },
  ];
  await seed(page, d);
  await open(page, "shifts");
  await page
    .getByRole("button", { name: "Set work targets", exact: true })
    .click();
  let f = page.getByRole("dialog");
  await f.getByLabel("Monthly hours target", { exact: true }).fill("30");
  await f.getByLabel("Monthly gross target", { exact: true }).fill("1500");
  await save(page);
  await expect(page.locator(".work-pro")).toContainText("1,500");
  await page
    .getByRole("button", { name: "Record payslip", exact: true })
    .click();
  f = page.getByRole("dialog");
  await f.getByLabel("Gross from payslip", { exact: true }).fill("550");
  await f
    .getByLabel("Net from payslip (optional)", { exact: true })
    .fill("450");
  await f
    .getByLabel("I checked these amounts against my payslip", { exact: true })
    .check();
  await save(page);
  await expect(page.locator(".life-payslip")).toContainText("25");
  await expect(page.locator(".life-payslip")).toContainText("Checked by you");
  expect((await stored(page)).data.transactions).toEqual(d.transactions);
  await page
    .getByRole("button", { name: "Record payslip", exact: true })
    .click();
  await f.getByLabel("Gross from payslip", { exact: true }).fill("100");
  await f.getByRole("button", { name: "Save", exact: true }).click();
  await expect(f.getByRole("alert")).toBeVisible();
  await f.getByRole("button", { name: "Close", exact: true }).click();
  expect((await stored(page)).data.life?.payslips).toHaveLength(1);
  await page.getByLabel("Work week date", { exact: true }).fill("2026-11-20");
  await page
    .getByRole("button", { name: "Plan shift on 2026-11-20", exact: true })
    .click();
  await f
    .getByLabel("Scheduled shift — exclude from worked earnings", {
      exact: true,
    })
    .check();
  await save(page);
  expect((await stored(page)).data.shifts).toHaveLength(2);
  await page.reload();
  await expect(page.locator(".work-pro")).toContainText("1,500");
});
test("dashboard widget order, visibility, quick actions and opening preference survive reload", async ({
  page,
}) => {
  await seed(page);
  await open(page, "overview");
  await page
    .getByRole("button", { name: "Customize dashboard", exact: true })
    .click();
  const f = page.getByRole("dialog");
  await f.getByLabel("Financial overview", { exact: true }).uncheck();
  await expect(
    f.getByLabel("Financial overview", { exact: true }),
  ).not.toBeChecked();
  await f
    .getByRole("button", { name: "Move down Work & salary", exact: true })
    .click();
  await f.getByLabel("Event", { exact: true }).check();
  await f
    .getByLabel("Preferred opening screen", { exact: true })
    .selectOption("planner");
  await expect(
    f.getByLabel("Preferred opening screen", { exact: true }),
  ).toHaveValue("planner");
  await f.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.locator('[data-widget="finance"]')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-widget="finance"]')).toHaveCount(0);
  await expect(page.locator(".life-quick-actions")).toContainText("Event");
  await page.goto("/");
  await expect(page.locator(".life-planner")).toBeVisible();
  await page
    .locator(".bottom-nav")
    .getByRole("button", { name: "Home", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Customize dashboard", exact: true })
    .click();
  await f
    .getByRole("button", { name: "Restore dashboard defaults", exact: true })
    .click();
  await expect(
    f.getByLabel("Financial overview", { exact: true }),
  ).toBeChecked();
  await f.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.locator(".hero-balance")).toContainText("800");
});
test("recap export/share are explicit, analytics show real activity and health identifies release", async ({
  page,
  request,
}) => {
  const d = fixture();
  d.life = emptyLife();
  d.life.tasks = [
    {
      id: crypto.randomUUID(),
      title: "Completed task",
      due: "2026-11-07",
      time: null,
      priority: "normal",
      category: "Personal",
      notes: "",
      repeat: "none",
      until: null,
      goalId: null,
      completions: { "2026-11-07": "2026-11-07T10:00:00Z" },
    },
  ];
  await seed(page, d);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page, "recap");
  await expect(page.locator(".life-recap")).toContainText("Tasks completed");
  await page.evaluate(() =>
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        document.documentElement.dataset.shared = data.text;
      },
    }),
  );
  expect(await page.locator("html").getAttribute("data-shared")).toBeNull();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export recap", exact: true }).click();
  const text = await downloadText(await download);
  expect(text).toContain("SAVIO 4.0");
  expect(text).toContain("1000.00");
  expect(text).toContain("Completed tasks: 1");
  await page
    .getByRole("button", { name: "Share explicitly", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-shared",
    /SAVIO 4.0/,
  );
  await open(page, "insights");
  await expect(page.locator(".life-chart")).toHaveCount(5);
  expect(errors).toEqual([]);
  const health = await request.get("/api/health");
  expect((await health.json()).version).toBe("4.0.0");
  expect(health.headers()["cache-control"]).toContain("no-store");
});
test("all new modules load offline, including previously unvisited lazy code and local task saves", async ({
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
  await context.setOffline(true);
  await page
    .locator(".bottom-nav")
    .getByRole("button", { name: "Planner", exact: true })
    .click();
  await expect(page.locator(".life-planner")).toBeVisible();
  await addTask(page, "Offline task");
  await page.reload();
  await expect(page.locator(".life-planner")).toContainText("Offline task");
  await open(page, "insights");
  await expect(page.locator(".life-chart")).toHaveCount(5);
  await open(page, "recap");
  await expect(page.locator(".life-recap")).toBeVisible();
  await context.setOffline(false);
  expect((await stored(page)).data.life?.tasks[0].title).toBe("Offline task");
  const cached = await page.evaluate(async () => {
    const keys = await caches.keys();
    return (
      await Promise.all(
        keys.map(async (k) =>
          (await (await caches.open(k)).keys()).map((r) => r.url),
        ),
      )
    ).flat();
  });
  expect(cached.some((url) => url.includes("/api/"))).toBe(false);
});
test("safe V3 migration retains original snapshot and history while new records and V5 backups use active stores", async ({
  page,
}) => {
  const original = fixture();
  await page.goto("/offline.html");
  await page.evaluate(async (data) => {
    await new Promise<void>((resolve, reject) => {
      const r = indexedDB.open("savio-local-v3", 1);
      r.onupgradeneeded = () => {
        r.result.createObjectStore("workspace", { keyPath: "id" });
        r.result.createObjectStore("history", { keyPath: "key" });
      };
      r.onerror = () => reject(r.error);
      r.onsuccess = () => {
        const db = r.result,
          t = db.transaction(["workspace", "history"], "readwrite");
        t.objectStore("workspace").put({
          id: "main",
          revision: 7,
          data,
          updatedAt: "2026-11-01T12:00:00Z",
        });
        t.objectStore("history").put({
          id: "main",
          key: 6,
          revision: 6,
          data,
          updatedAt: "2026-10-01T12:00:00Z",
        });
        t.oncomplete = () => {
          db.close();
          resolve();
        };
      };
    });
  }, original);
  await page.clock.install({ time: new Date("2026-11-07T12:00:00Z") });
  await open(page, "planner");
  expect((await stored(page)).data).toEqual(original);
  await addTask(page, "Migrated task");
  await open(page, "settings");
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export JSON backup", exact: true })
    .click();
  const backup = JSON.parse(await downloadText(await download));
  expect(backup.schemaVersion).toBe(5);
  expect(backup.data.life.tasks).toHaveLength(1);
  expect(backup.data.transactions).toEqual(original.transactions);
  const source = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("savio-local-v3");
      r.onsuccess = () => resolve(r.result);
    });
    const result = await new Promise<FinanceData>((resolve) => {
      const r = db
        .transaction("workspace")
        .objectStore("workspace")
        .get("main");
      r.onsuccess = () => resolve(r.result.data);
    });
    db.close();
    return result;
  });
  expect(source).toEqual(original);
});
test("five themes, Hebrew RTL and small mobile viewports support every new screen without overflow", async ({
  page,
}) => {
  test.setTimeout(120000);
  const d = fixture();
  d.profile.language = "he";
  d.profile.name = "בדיקה";
  await seed(page, d);
  await mkdir("docs/screenshots/v4", { recursive: true });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const [name, id] of [
    ["כהה פרימיום", "dark"],
    ["בהיר נקי", "light"],
    ["כחול חצות", "midnight"],
    ["סגול ניאון", "purple"],
    ["לפי המכשיר", "system"],
  ]) {
    await open(page, "settings");
    await page.getByRole("button", { name: /עיצוב האפליקציה/ }).click();
    const f = page.getByRole("dialog");
    await f.getByRole("button", { name, exact: true }).click();
    await expect(f.getByRole("button", { name, exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await f.getByRole("button", { name: "Close", exact: true }).click();
    for (const tab of [
      "overview",
      "planner",
      "smart",
      "goals",
      "subscriptions",
      "insights",
      "recap",
      "shifts",
    ]) {
      await open(page, tab);
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        id + " " + tab,
      ).toBe(true);
    }
    await open(page, "overview");
    await page.screenshot({
      path: `docs/screenshots/v4/home-${id}.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
  for (const width of [320, 360, 430]) {
    await page.setViewportSize({ width, height: 844 });
    for (const tab of [
      "overview",
      "planner",
      "smart",
      "goals",
      "subscriptions",
      "insights",
      "recap",
    ]) {
      await open(page, tab);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        width + " " + tab,
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const tab of [
    "planner",
    "smart",
    "goals",
    "subscriptions",
    "insights",
    "recap",
    "shifts",
  ]) {
    await open(page, tab);
    await page.screenshot({
      path: `docs/screenshots/v4/${tab}.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
  expect(errors).toEqual([]);
});

test("V5 browser backup restore preserves every Life record, preferences and opaque fields", async ({
  page,
}) => {
  const d = fixture();
  d.life = emptyLife();
  const goalId = crypto.randomUUID();
  d.life.personalGoals = [
    {
      id: goalId,
      name: "Language",
      kind: "personal",
      category: "Learning",
      target: 20,
      unit: "lessons",
      deadline: "2027-01-01",
      milestones: [],
      history: [],
      completedAt: null,
      opaque: { safe: true },
    },
  ];
  d.life.tasks = [
    {
      id: crypto.randomUUID(),
      title: "Read",
      due: "2026-11-07",
      time: "15:00",
      priority: "high",
      category: "Learning",
      notes: "Note",
      repeat: "weekly",
      until: null,
      goalId,
      completions: {},
      opaque: 1,
    },
  ];
  d.life.events = [
    {
      id: crypto.randomUUID(),
      title: "Meeting",
      date: "2026-11-08",
      time: "10:00",
      endTime: "11:00",
      category: "Personal",
      notes: "",
      repeat: "none",
      until: null,
    },
  ];
  d.life.subscriptions = [
    {
      id: crypto.randomUUID(),
      name: "Service",
      amount: 20,
      kind: "expense",
      category: "Other",
      start: "2026-11-01",
      repeat: "monthly",
      until: null,
      active: true,
    },
  ];
  d.life.payslips = [
    {
      id: crypto.randomUUID(),
      workplaceId: d.workplaces[0].id,
      month: "2026-11",
      gross: 1200,
      net: 1000,
      verified: true,
      notes: "Manual",
    },
  ];
  d.life.workTargets = { "2026-11": { hours: 100, gross: 5000 } };
  d.life.preferences.hidden = ["recent"];
  d.life.preferences.opaque = { retained: true };
  await seed(page, d);
  await open(page, "settings");
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export JSON backup", exact: true })
    .click();
  const backup = await downloadText(await downloading);
  expect(JSON.parse(backup).data).toEqual(d);
  await page
    .getByRole("button", { name: "Restore & recovery", exact: true })
    .click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "private.json",
    mimeType: "application/json",
    buffer: Buffer.from(backup),
  });
  const dialog = page.getByRole("dialog", {
    name: "Review before restoring",
    exact: true,
  });
  await expect(dialog).toContainText("1 tasks");
  await dialog.getByRole("checkbox").check();
  await dialog
    .getByRole("button", { name: "Restore reviewed backup", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  expect((await stored(page)).data).toEqual(d);
  const revision = (await stored(page)).revision;
  await page.locator('input[type="file"]').setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"life":{"version":99}}'),
  });
  await expect(dialog).not.toBeVisible();
  expect((await stored(page)).revision).toBe(revision);
  expect((await stored(page)).data).toEqual(d);
});

test("foreground planner notifications require opt-in, omit private details and fire once", async ({
  page,
}) => {
  const d = fixture();
  d.life = emptyLife();
  d.life.events = [
    {
      id: crypto.randomUUID(),
      title: "Private appointment",
      date: "2026-11-07",
      time: "12:20",
      endTime: "13:00",
      category: "Personal",
      notes: "Secret",
      repeat: "none",
      until: null,
    },
  ];
  await seed(page, d);
  await page.addInitScript(() => {
    Object.defineProperty(Notification, "permission", {
      configurable: true,
      get: () => "granted",
    });
    Notification.requestPermission = async () => "granted";
    const alerts: { title: string; body?: string }[] = [];
    Object.defineProperty(window, "__qaAlerts", { value: alerts });
    ServiceWorkerRegistration.prototype.showNotification = async (
      title,
      options,
    ) => {
      alerts.push({ title, body: options?.body });
    };
  });
  await open(page, "planner");
  await page.evaluate(() => navigator.serviceWorker.ready);
  expect(
    await page.evaluate(
      () => (window as unknown as { __qaAlerts: unknown[] }).__qaAlerts.length,
    ),
  ).toBe(0);
  await page
    .getByRole("button", { name: "Enable planner reminders", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Disable planner reminders",
      exact: true,
    }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { __qaAlerts: unknown[] }).__qaAlerts.length,
      ),
    )
    .toBe(1);
  const alerts = await page.evaluate(
    () => (window as unknown as { __qaAlerts: unknown[] }).__qaAlerts,
  );
  expect(JSON.stringify(alerts)).not.toMatch(/Private appointment|Secret|1000/);
  await page.clock.fastForward(60000);
  expect(
    await page.evaluate(
      () => (window as unknown as { __qaAlerts: unknown[] }).__qaAlerts.length,
    ),
  ).toBe(1);
});

test("waiting updates require an explicit refresh and cannot interrupt an open editor", async ({
  page,
}) => {
  await seed(page);
  await page.addInitScript(() => {
    const registration = new EventTarget() as ServiceWorkerRegistration;
    Object.defineProperty(registration, "waiting", {
      value: {
        postMessage(message: unknown) {
          document.documentElement.dataset.updateMessage =
            JSON.stringify(message);
        },
      },
    });
    registration.update = async () => registration;
    Object.defineProperty(navigator.serviceWorker, "controller", {
      configurable: true,
      get: () => ({}),
    });
    navigator.serviceWorker.getRegistration = async () => registration;
  });
  await open(page, "overview");
  const refresh = page.getByRole("button", {
    name: "Refresh to update",
    exact: true,
  });
  await expect(refresh).toBeVisible();
  expect(
    await page.locator("html").getAttribute("data-update-message"),
  ).toBeNull();
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .first()
    .click();
  const form = page.getByRole("dialog");
  await form.getByLabel("Description", { exact: true }).fill("Unsaved record");
  await expect(refresh).toBeDisabled();
  await expect(form.getByLabel("Description", { exact: true })).toHaveValue(
    "Unsaved record",
  );
  expect(
    await page.locator("html").getAttribute("data-update-message"),
  ).toBeNull();
  await form.getByRole("button", { name: "Close", exact: true }).click();
  await expect(refresh).toBeEnabled();
  await refresh.click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-update-message",
    '{"type":"ACTIVATE_SAVIO_UPDATE"}',
  );
  expect((await stored(page)).data.transactions).toHaveLength(2);
});

test("idle scheduled-shift boundaries refresh forecasts without editing stored records", async ({
  page,
}) => {
  const d = fixture();
  d.shifts = [
    {
      id: crypto.randomUUID(),
      workplaceId: d.workplaces[0].id,
      start: "2026-11-07T12:00:00Z",
      end: "2026-11-07T12:01:00Z",
      breakMinutes: 0,
      paidBreak: false,
      premium: false,
      scheduled: true,
    },
  ];
  await seed(page, d);
  await open(page, "overview");
  const work = page.locator('[data-widget="work"]');
  await expect(work).toContainText("Studio");
  const before = await stored(page);
  await page.clock.fastForward(61000);
  await expect(work).toContainText("No upcoming shift has been planned.");
  expect(await stored(page)).toEqual(before);
});
