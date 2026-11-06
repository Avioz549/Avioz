import { test, expect, type Page } from "@playwright/test";
import { emptyData, type FinanceData } from "../../lib/finance";
import { mkdir } from "node:fs/promises";
const month = new Date().toLocaleDateString("en-CA").slice(0, 7);
function fixture() {
  const d = emptyData();
  d.profile.language = "en";
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
      title: "Real QA receipt",
      amount: 200,
      kind: "income",
      category: "Salary",
      date: month + "-01",
      recurring: false,
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
async function open(page: Page, tab: string) {
  await page.goto("/?tab=" + tab);
  await expect(page.locator(".main-content")).toBeVisible();
}
test("advanced workplace agreement, scheduled shift, calendar edit and reports retain actual data", async ({
  page,
}) => {
  const data = fixture();
  await seed(page, data);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, "shifts");
  await page.locator(".workplace-manager > summary").click();
  await page
    .locator(".workplace-manager")
    .getByRole("button", { name: "Edit", exact: true })
    .click();
  let d = page.getByRole("dialog");
  await d.locator(".payroll-policy > summary").click();
  await d.getByLabel("Enable advanced rules").check();
  await d.getByLabel("Weekly regular hours").fill("40");
  await d.getByLabel("Premium + overtime").selectOption("maximum");
  await d.getByLabel("Automatically apply Saturday rate").check();
  await d.getByRole("button", { name: "Save", exact: true }).click();
  await expect(d).not.toBeVisible();
  await page
    .getByRole("button", { name: "Manual shift entry", exact: true })
    .click();
  d = page.getByRole("dialog");
  await d.getByLabel("Start (local time)").fill(month + "-20T09:00");
  await d
    .getByLabel("End (use next date for overnight shifts)")
    .fill(month + "-20T17:00");
  await d.getByLabel("Tips", { exact: true }).fill("30");
  await d.getByLabel("Travel reimbursement").fill("20");
  await d.getByLabel("Shift notes").fill("Scheduled studio shift");
  await d.getByLabel("Scheduled shift — exclude from worked earnings").check();
  await d.getByRole("button", { name: "Save", exact: true }).click();
  await expect(d).not.toBeVisible();
  await expect(page.locator(".salary-overview")).toContainText("450");
  await expect(page.locator("tbody")).toContainText("Scheduled");
  await page
    .locator(".shift-calendar")
    .getByRole("button", { name: month + "-20", exact: true })
    .click();
  await page.locator(".calendar-shift-row").click();
  await expect(d.getByLabel("Shift notes")).toHaveValue(
    "Scheduled studio shift",
  );
  await d.getByLabel("Tips", { exact: true }).fill("40");
  await d.getByRole("button", { name: "Save", exact: true }).click();
  await page.reload();
  await expect(page.locator(".salary-overview")).toContainText("460");
  await open(page, "reports");
  await expect(
    page.getByRole("heading", { name: "Monthly salary", exact: true }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page
    .locator(".report-block")
    .first()
    .getByRole("button", { name: "CSV", exact: true })
    .click();
  expect((await download).suggestedFilename()).toContain(month);
  await expect(page.locator(".report-block").nth(1)).toContainText(
    "Scheduled studio shift",
  );
  await mkdir("docs/screenshots/upgrade", { recursive: true });
  await page.screenshot({
    path: "docs/screenshots/upgrade/reports.png",
    fullPage: true,
  });
});
test("goal saving share, contributions, withdrawals and overdraw protection persist", async ({
  page,
}) => {
  await seed(page, fixture());
  await open(page, "goals");
  await page.getByRole("button", { name: "New goal", exact: true }).click();
  let d = page.getByRole("dialog");
  await d.getByLabel("Name", { exact: true }).fill("Training");
  await d.getByLabel("Target amount").fill("1000");
  await d.getByLabel("Existing savings").fill("100");
  await d.getByLabel("Planned monthly contribution").fill("100");
  await d.getByLabel("Share of estimated shift income to save (%)").fill("25");
  await d.getByRole("button", { name: "Save", exact: true }).click();
  await page.locator(".goal-plan-details > summary").click();
  await page.getByRole("button", { name: "Contribute", exact: true }).click();
  d = page.getByRole("dialog");
  await d.getByLabel("Action", { exact: true }).selectOption("withdrawal");
  await d.getByLabel("Amount", { exact: true }).fill("40");
  await d.getByRole("button", { name: "Save", exact: true }).click();
  await expect(d).not.toBeVisible();
  await expect(page.locator(".reference-goal")).toContainText("60");
  await page.getByRole("button", { name: "Contribute", exact: true }).click();
  await d.getByLabel("Action", { exact: true }).selectOption("withdrawal");
  await d.getByLabel("Amount", { exact: true }).fill("1000");
  await d.getByRole("button", { name: "Save", exact: true }).click();
  await expect(d.getByRole("alert")).toContainText("withdrawals");
  await d.getByRole("button", { name: "Close", exact: true }).click();
  await page.reload();
  await expect(page.locator(".reference-goal")).toContainText("60");
});
test("local chat answers saved-record questions without any external AI request; categories and budget history work", async ({
  page,
}) => {
  await seed(page, fixture());
  let posts = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("/api/ai") && r.method() === "POST") posts++;
  });
  await open(page, "ai");
  await page.getByRole("textbox").fill("How much did I earn this month?");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.locator(".chat-message").last()).toContainText("200");
  await expect(page.locator(".chat-message").last()).toContainText(
    "Local calculation",
  );
  expect(posts).toBe(0);
  await open(page, "transactions");
  await page.locator(".category-manager summary").click();
  await page.getByLabel("New category name").fill("Training");
  await page.getByRole("button", { name: "Add category", exact: true }).click();
  await page.reload();
  await page.locator(".category-manager summary").click();
  await expect(page.locator(".category-manager")).toContainText("Training");
  await open(page, "budgets");
  await page
    .getByRole("button", { name: "Set category budget", exact: true })
    .click();
  const d = page.getByRole("dialog");
  await d.getByLabel("Category", { exact: true }).selectOption("Training");
  await d.getByLabel("Monthly budget", { exact: true }).fill("300");
  await d.getByRole("button", { name: "Save", exact: true }).click();
  await page.locator(".budget-history summary").click();
  await expect(page.locator(".budget-history")).toContainText("300");
});
test("all themes retain RTL, mobile layout and advanced screens without runtime errors", async ({
  page,
}) => {
  const data = fixture();
  data.profile.language = "he";
  await seed(page, data);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mkdir("docs/screenshots/upgrade", { recursive: true });
  for (const theme of [
    ["כחול חצות", "midnight"],
    ["סגול ניאון", "purple"],
    ["בהיר נקי", "light"],
    ["כהה פרימיום", "dark"],
    ["לפי המכשיר", "system"],
  ]) {
    await open(page, "settings");
    await page.getByRole("button", { name: /עיצוב האפליקציה/ }).click();
    await page.getByRole("button", { name: theme[0], exact: true }).click();
    await page.getByRole("button", { name: "Close", exact: true }).click();
    for (const tab of [
      "overview",
      "shifts",
      "goals",
      "budgets",
      "calendar",
      "ai",
      "reports",
    ]) {
      await open(page, tab);
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        theme[1] + " " + tab,
      ).toBe(true);
    }
    await open(page, "shifts");
    if (theme[1] === "light") {
      const contrast = await page.evaluate(() => {
        const luminance = (color: string) => {
          const rgb = color
            .match(/\d+(?:\.\d+)?/g)!
            .slice(0, 3)
            .map(Number)
            .map((n) => {
              const c = n / 255;
              return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
            });
          return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
        };
        return [
          [".reference-timer", ".work-timer-card"],
          [".work-timer-card > span", ".work-timer-card"],
          [".work-month-summary strong", ".work-month-summary"],
        ].every(([text, bg]) => {
          const a = luminance(
              getComputedStyle(document.querySelector(text)!).color,
            ),
            b = luminance(
              getComputedStyle(document.querySelector(bg)!).backgroundColor,
            );
          return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5;
        });
      });
      expect(contrast).toBe(true);
    }
    await page.screenshot({
      path: `docs/screenshots/upgrade/${theme[1]}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 320, height: 740 });
  await open(page, "shifts");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const targets = await page
    .locator(".shift-calendar-grid button")
    .evaluateAll((buttons) =>
      buttons.every(
        (b) =>
          b.getBoundingClientRect().width >= 44 &&
          b.getBoundingClientRect().height >= 44,
      ),
    );
  expect(targets).toBe(true);
  expect(errors).toEqual([]);
});

test("reviewed JSON merge retains current records and imported extended fields", async ({
  page,
}) => {
  const current = fixture(),
    incoming = emptyData();
  incoming.profile.language = "en";
  incoming.workplaces = [{ ...current.workplaces[0] }];
  incoming.shifts = [
    {
      id: crypto.randomUUID(),
      workplaceId: incoming.workplaces[0].id,
      start: new Date(month + "-02T08:00:00").toISOString(),
      end: new Date(month + "-02T12:00:00").toISOString(),
      breakMinutes: 0,
      paidBreak: false,
      premium: false,
      tips: 15,
      travel: 10,
      notes: "Merged backup shift",
    },
  ];
  await seed(page, current);
  await open(page, "settings");
  await page.getByRole("button", { name: /Restore & recovery/ }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "merge.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        application: "SAVIO",
        schemaVersion: 4,
        data: incoming,
      }),
    ),
  });
  const review = page.getByRole("dialog").last();
  await review.getByRole("checkbox").check();
  await review
    .getByRole("button", {
      name: "Merge without replacing existing records",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Backup merged. Existing preferences were kept.", {
      exact: true,
    }),
  ).toBeVisible();
  await open(page, "shifts");
  await expect(page.locator("tbody")).toContainText("Merged backup shift");
  await open(page, "overview");
  await expect(page.locator(".hero-balance")).toContainText("200");
});

test("recurring income remains expected until explicitly confirmed and is recorded only once", async ({
  page,
}) => {
  const data = fixture();
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - 1);
  const prior = date.toLocaleDateString("en-CA");
  data.transactions = [
    {
      ...data.transactions[0],
      title: "Recurring salary",
      date: prior,
      recurring: true,
      amount: 700,
    },
  ];
  await seed(page, data);
  await open(page, "overview");
  await expect(page.locator(".hero-balance")).toHaveText(/^[^\d]*0(?:\.00)?$/);
  await open(page, "transactions");
  await expect(page.locator(".transaction-row")).toContainText(
    "Expected, not recorded",
  );
  await page
    .getByRole("button", { name: "Confirm received / paid", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Confirm received / paid", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".transaction-row")).toHaveCount(1);
  await open(page, "overview");
  await expect(page.locator(".hero-balance")).toContainText("700");
});
