import { test, expect, type Page } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("savio-local-v1"))
      localStorage.setItem(
        "savio-local-v1",
        JSON.stringify({
          transactions: [],
          workplaces: [],
          shifts: [],
          goals: [],
          budgets: {},
          reminders: [],
          profile: { name: "", currency: "ILS", language: "en", theme: "dark" },
        }),
      );
  });
});
async function open(page: Page, tab = "overview") {
  await page.goto("/?tab=" + tab);
  await expect(page.locator(".main-content")).toBeVisible();
}
async function transaction(
  page: Page,
  title: string,
  amount: string,
  kind = "expense",
  recurring = false,
) {
  await page
    .getByRole("button", { name: "Add transaction", exact: true })
    .first()
    .click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Description").fill(title);
  await d.getByLabel("Amount").fill(amount);
  await d.getByLabel("Type", { exact: true }).selectOption(kind);
  if (recurring) await d.getByLabel("Repeat every month").check();
  await d.getByRole("button", { name: "Save", exact: true }).click();
  await expect(d).not.toBeVisible();
}
async function workplace(page: Page) {
  await page
    .getByRole("button", { name: "Add workplace", exact: true })
    .click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Name", { exact: true }).fill("Cafe");
  await d.getByLabel("Hourly wage (gross)").fill("50");
  await d.getByRole("button", { name: "Save", exact: true }).click();
  await expect(d).not.toBeVisible();
}
test("real records persist and drive the balance, search, editing, analytics and CSV", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await open(page);
  await transaction(page, "Monthly salary", "10000", "income", true);
  await expect(page.locator(".hero-balance")).toContainText("10,000");
  await page.reload();
  await expect(page.locator(".hero-balance")).toContainText("10,000");
  await transaction(page, "Groceries", "250");
  await expect(page.locator(".hero-balance")).toContainText("9,750");
  await page.getByRole("button", { name: "Money", exact: true }).click();
  await page.getByPlaceholder("Search transactions…").fill("Groceries");
  await expect(page.locator(".transaction-row")).toHaveCount(1);
  await page.locator(".row-menu>summary").first().click();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Amount").fill("300");
  await d.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".transaction-amount")).toContainText("300");
  await page
    .getByText("Spending analytics & monthly comparison", { exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Where your money goes" }),
  ).toBeVisible();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV", exact: true }).click();
  expect((await dl).suggestedFilename()).toContain(".csv");
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.locator(".hero-balance")).toContainText("9,700");
  await page.screenshot({
    path: "/tmp/savio3-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(errors).toEqual([]);
});
test("work retains overnight rules, unpaid breaks, estimates, timer and editing", async ({
  page,
}) => {
  await open(page, "shifts");
  await workplace(page);
  await page
    .getByRole("button", { name: "Manual shift entry", exact: true })
    .click();
  const d = page.getByRole("dialog"),
    month = new Date().toLocaleDateString("en-CA").slice(0, 7);
  await d.getByLabel("Start (local time)").fill(month + "-01T20:00");
  await d
    .getByLabel("End (use next date for overnight shifts)")
    .fill(month + "-02T07:00");
  await d.getByLabel("Break minutes").fill("60");
  await d.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator("tbody")).toContainText("525");
  await expect(page.locator("tbody")).toContainText("10.00");
  await page
    .locator("tbody")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  await d.getByLabel("Paid break").check();
  await d.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator("tbody")).toContainText("600");
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await expect(page.locator(".timer")).toBeVisible();
  await page.getByRole("button", { name: "Pause shift", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Resume shift", exact: true }),
  ).toBeVisible();
  const frozen = await page.locator(".reference-timer").textContent();
  await page.reload();
  await expect(page.locator(".timer")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Resume shift", exact: true }),
  ).toBeVisible();
  await page.waitForTimeout(1100);
  await expect(page.locator(".reference-timer")).toHaveText(frozen!);
  await page.getByRole("button", { name: "Resume shift", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause shift", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Stop shift", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(2);
});
test("savings contributions, undated goals, plan changes and purchase calculator", async ({
  page,
}) => {
  await open(page, "goals");
  await page.getByRole("button", { name: "New goal", exact: true }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Name", { exact: true }).fill("Emergency fund");
  await d.getByLabel("Target amount").fill("10000");
  await d.getByLabel("Existing savings").fill("1000");
  await d.getByLabel("Planned monthly contribution").fill("500");
  await d.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".goal-card")).toContainText("No target date");
  await page.locator(".goal-plan-details>summary").first().click();
  await page.getByRole("button", { name: "Contribute", exact: true }).click();
  await d.getByLabel("Amount").fill("500");
  await d.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".goal-values")).toContainText("1,500");
  await expect(page.locator(".goal-card .pill")).toHaveText("15%");
  await page.getByLabel("Savings plan").selectOption("accelerated");
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await d.getByLabel("Planned monthly contribution").fill("600");
  await d.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".goal-card")).toContainText("600");
  await page.getByLabel("Purchase price").fill("500");
  await page.getByLabel("Gross hourly wage").fill("50");
  await page
    .getByRole("button", { name: "Calculate work hours", exact: true })
    .click();
  await expect(page.locator(".calculator-result")).toContainText("10.0");
});
test("budgets, reminder CRUD and challenges remain usable", async ({
  page,
}) => {
  await open(page, "budgets");
  await page
    .getByRole("button", { name: "Set category budget", exact: true })
    .click();
  const budgetDialog = page.getByRole("dialog");
  await budgetDialog.getByLabel("Monthly budget").fill("500");
  await budgetDialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".budget-ratio")).toContainText("500");
  await page.getByRole("button", { name: "Calendar", exact: true }).click();
  await page.getByRole("button", { name: "New reminder", exact: true }).click();
  const d = page.getByRole("dialog");
  await expect(d).toHaveAccessibleName("New reminder");
  await d.getByLabel("Reminder title").fill("Pay rent");
  await d.getByRole("button", { name: "Save reminder", exact: true }).click();
  await expect(page.locator(".workplace")).toContainText("Pay rent");
  await page
    .getByRole("button", { name: "Edit reminder", exact: true })
    .click();
  await d.getByLabel("Reminder title").fill("Rent tomorrow");
  await d.getByRole("button", { name: "Save reminder", exact: true }).click();
  await page
    .getByRole("button", { name: "Mark reminder complete", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Mark reminder incomplete", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Delete reminder", exact: true })
    .click();
  await expect(page.locator(".workplace")).toHaveCount(0);
  await page.getByRole("button", { name: "Challenges", exact: true }).click();
  await expect(page.locator(".challenge-card")).toHaveCount(3);
});
test("iPhone bottom navigation, More screens, readable forms, RTL and light mode", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await open(page);
  await expect(page.locator(".bottom-nav button")).toHaveCount(5);
  await expect(page.locator("aside")).not.toBeVisible();
  for (const tab of ["Money", "Work", "Goals", "Planner", "Home"])
    await page
      .locator(".bottom-nav")
      .getByRole("button", { name: tab, exact: true })
      .click();
  await page.getByRole("button", { name: "More options", exact: true }).click();
  await page.getByRole("button", { name: /^Settings/ }).click();
  await expect(
    page.getByRole("button", { name: /^Profile & personal details/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /^Profile & personal details/ })
    .click();
  const prefs = page.getByRole("dialog");
  await prefs.getByLabel("Language", { exact: true }).selectOption("he");
  await prefs.getByLabel("Appearance", { exact: true }).selectOption("light");
  await prefs
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page
    .locator(".bottom-nav")
    .getByRole("button", { name: "בית", exact: true })
    .click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/savio3-mobile-he.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "הוספת תנועה", exact: true })
    .first()
    .click();
  const input = page.getByRole("dialog").getByLabel("סכום");
  expect(
    await input.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
  ).toBeGreaterThanOrEqual(16);
  for (const button of await page.locator(".bottom-nav button").all()) {
    const box = await button.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);
  }
});
test("legacy V2 migration preserves every record and original browser copy", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const key = "savio-local-v1";
    if (!localStorage.getItem("test-legacy-source")) {
      localStorage.setItem("test-legacy-source", "1");
      localStorage.setItem(
        key,
        JSON.stringify({
          transactions: [
            {
              id: crypto.randomUUID(),
              title: "Legacy salary",
              kind: "income",
              amount: 7000,
              category: "Salary",
              date: new Date().toLocaleDateString("en-CA"),
              recurring: false,
            },
          ],
          workplaces: [],
          shifts: [],
          goals: [],
          budgets: {},
          profile: {
            name: "Dana",
            currency: "ILS",
            language: "en",
            theme: "dark",
          },
        }),
      );
    }
  });
  await open(page);
  await expect(page.locator(".hero-balance")).toContainText("7,000");
  await expect(page.locator("h1")).toContainText("Dana");
  await transaction(page, "New expense", "100");
  await page.reload();
  await expect(page.locator(".hero-balance")).toContainText("6,900");
  const legacy = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("savio-local-v1")!),
  );
  expect(legacy.transactions).toHaveLength(1);
});
test("JSON restore is reviewed, malformed input changes nothing, recovery history works", async ({
  page,
}) => {
  await open(page);
  await transaction(page, "Preserved record", "100", "income");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("button", { name: "Restore & recovery", exact: true })
    .click();
  await page.getByLabel("Choose backup file").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"broken":true}'),
  });
  await expect(page.locator(".backup-panel").getByRole("status")).toContainText(
    "not a valid",
  );
  const data = {
    transactions: [],
    workplaces: [],
    shifts: [],
    goals: [],
    budgets: {},
    reminders: [],
    profile: {
      name: "Restored name",
      currency: "ILS",
      language: "en",
      theme: "dark",
    },
  };
  await page.getByLabel("Choose backup file").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
  });
  const d = page.getByRole("dialog", {
    name: "Review before restoring",
    exact: true,
  });
  await expect(d).toHaveAccessibleName("Review before restoring");
  await expect(
    d.getByRole("button", { name: "Restore reviewed backup" }),
  ).toBeDisabled();
  await d.getByRole("checkbox").check();
  await d.getByRole("button", { name: "Restore reviewed backup" }).click();
  await expect(d).not.toBeVisible();
  await page.reload();
  await page
    .getByRole("button", { name: /^Profile & personal details/ })
    .click();
  await expect(page.getByLabel("Your name")).toHaveValue("Restored name");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Restore & recovery", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Recovery history", exact: true })
    .click();
  await page
    .locator(".recovery-list")
    .getByRole("button", { name: "Review", exact: true })
    .first()
    .click();
  await d.getByRole("checkbox").check();
  await d.getByRole("button", { name: "Restore reviewed backup" }).click();
  await page
    .getByRole("dialog", { name: "Backup & restore", exact: true })
    .getByRole("button", { name: "Close", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Home", exact: true }).click();
  await expect(page.locator(".hero-balance")).toContainText("100");
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Back up now", exact: true }).click();
  expect((await dl).suggestedFilename()).toMatch(/SAVIO-backup.*json/);
});
test("stale local tabs cannot overwrite newer IndexedDB records", async ({
  page,
  context,
}) => {
  await open(page);
  const other = await context.newPage();
  await open(other);
  await transaction(page, "First tab", "100");
  await other
    .getByRole("button", { name: "Add transaction", exact: true })
    .first()
    .click();
  const d = other.getByRole("dialog");
  await d.getByLabel("Description").fill("Stale tab");
  await d.getByLabel("Amount").fill("50");
  await d.getByRole("button", { name: "Save", exact: true }).click();
  await expect(d.getByRole("alert")).toContainText("another tab");
  await page.reload();
  await expect(page.locator(".hero-balance")).toContainText("100");
  await expect(page.locator(".transaction-row")).toContainText("First tab");
  await other.close();
});
test("broken legacy records can be exported and safely restored without being erased", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("savio-local-v1", '{"broken":true}'),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Retry loading" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("savio-local-v1")),
  ).toBe('{"broken":true}');
  await page.locator('input[type="file"]').setInputFiles({
    name: "valid.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        transactions: [],
        workplaces: [],
        shifts: [],
        goals: [],
        budgets: {},
        profile: {
          name: "Recovered",
          currency: "ILS",
          language: "en",
          theme: "dark",
        },
      }),
    ),
  });
  const d = page.getByRole("dialog");
  await d.getByRole("checkbox").check();
  await d
    .getByRole("button", { name: /Restore reviewed backup|שחזור הגיבוי שנבדק/ })
    .click();
  await expect(page.locator("h1")).toContainText("Recovered");
  expect(
    await page.evaluate(() => localStorage.getItem("savio-local-v1")),
  ).toBe('{"broken":true}');
});
test("AI has local insights without authentication; retired auth routes redirect", async ({
  page,
  request,
}) => {
  await open(page, "ai");
  await expect(
    page.getByRole("heading", { name: "Local insights", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send message", exact: true }),
  ).toBeEnabled();
  await expect(page.getByText("Sign in", { exact: true })).toHaveCount(0);
  const res = await request.post("/api/ai", {
    headers: { origin: "https://untrusted.example" },
    data: {},
  });
  expect(res.status()).toBe(403);
  await page.goto("/login");
  await expect(page).toHaveURL(/tab=settings/);
  await expect(
    page.getByRole("button", { name: "Restore & recovery", exact: true }),
  ).toBeVisible();
});
test("installed shell opens offline with local records and never caches financial data", async ({
  page,
  context,
  request,
}) => {
  await open(page);
  await transaction(page, "PRIVATE OFFLINE RECORD", "123", "income");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    await new Promise<void>((resolve) => {
      if (navigator.serviceWorker.controller) resolve();
      else
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        );
    });
  });
  await page.reload();
  await expect(page.locator(".hero-balance")).toContainText("123");
  const cached = await page.evaluate(async () => {
    const name = (await caches.keys()).find((k) =>
      k.startsWith("savio-public-shell-"),
    );
    if (!name) throw new Error("Missing offline shell cache");
    const cache = await caches.open(name);
    return {
      urls: (await cache.keys()).map((r) => r.url),
      html: await (await cache.match("/"))!.text(),
    };
  });
  expect(cached.html).not.toContain("PRIVATE OFFLINE RECORD");
  expect(cached.urls.some((url) => url.includes("/api/"))).toBe(false);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".hero-balance")).toContainText("123");
  await context.setOffline(false);
  const manifest = await request.get("/manifest.webmanifest");
  expect((await manifest.json()).display).toBe("standalone");
  expect((await request.get("/icons/apple-touch-icon.png")).ok()).toBe(true);
});

test("small and large iPhone widths retain unclipped navigation and action controls", async ({
  page,
}) => {
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await open(page);
    for (const selector of [
      ".heading-actions",
      ".month-picker",
      ".ocean-cash-line",
      ".bottom-nav",
    ]) {
      const box = await page.locator(selector).boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 0.5);
    }
    for (const button of await page.locator(".month-picker button").all()) {
      const box = await button.boundingBox();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  }
});

test("permitted foreground reminders use the service-worker notification API without exposing record details", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["notifications"]);
  await open(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    ServiceWorkerRegistration.prototype.showNotification = async function (
      title,
      options,
    ) {
      localStorage.setItem(
        "savio-test-notice",
        JSON.stringify({ title, options }),
      );
    };
  });
  await transaction(page, "PRIVATE MEDICAL EXPENSE", "42");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("savio-test-notice")))
    .not.toBeNull();
  const notice = await page.evaluate(() =>
    localStorage.getItem("savio-test-notice"),
  );
  expect(notice).not.toContain("PRIVATE MEDICAL EXPENSE");
  expect(notice).not.toContain("42");
  expect(notice).toContain("1 recorded payment");
});
