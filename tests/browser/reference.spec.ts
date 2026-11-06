import { test, expect } from "@playwright/test";
import { emptyData } from "../../lib/finance";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
// Isolated QA records only. They never seed a normal application installation.
function fixture() {
  const d = emptyData(),
    uuid = () => crypto.randomUUID(),
    work = uuid(),
    goal = uuid();
  d.profile = { name: "בדיקה", currency: "ILS", language: "he", theme: "dark" };
  d.transactions = [
    {
      id: uuid(),
      title: "משכורת",
      kind: "income",
      amount: 10000,
      category: "Salary",
      date: "2026-11-01",
      recurring: false,
    },
    {
      id: uuid(),
      title: "קניות בסופר",
      kind: "expense",
      amount: 1200,
      category: "Groceries",
      date: "2026-11-03",
      recurring: false,
    },
    {
      id: uuid(),
      title: "תחבורה",
      kind: "expense",
      amount: 320,
      category: "Transport",
      date: "2026-11-02",
      recurring: false,
    },
    {
      id: uuid(),
      title: "ביגוד",
      kind: "expense",
      amount: 480,
      category: "Shopping",
      date: "2026-11-02",
      recurring: false,
    },
    {
      id: uuid(),
      title: "הפקדה נוספת",
      kind: "income",
      amount: 1200,
      category: "Freelance",
      date: "2026-11-03",
      recurring: false,
    },
  ];
  d.workplaces = [
    {
      id: work,
      name: "מקום עבודה לבדיקה",
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
      id: uuid(),
      workplaceId: work,
      start: "2026-11-02T06:00:00Z",
      end: "2026-11-02T14:00:00Z",
      breakMinutes: 30,
      paidBreak: false,
      premium: false,
    },
    {
      id: uuid(),
      workplaceId: work,
      start: "2026-11-04T07:00:00Z",
      end: null,
      breakMinutes: 0,
      paidBreak: false,
      premium: false,
    },
  ];
  d.goals = [
    {
      id: goal,
      name: "הרכב שלי",
      target: 40000,
      existing: 12460,
      monthly: 1000,
      date: "2027-12-01",
      contributions: [{ id: uuid(), amount: 1500, date: "2026-11-01" }],
    },
    {
      id: uuid(),
      name: "חופשת קיץ",
      target: 10000,
      existing: 3000,
      monthly: 600,
      date: "2027-08-01",
      contributions: [{ id: uuid(), amount: 500, date: "2026-11-03" }],
    },
    {
      id: uuid(),
      name: "הבית שלנו",
      target: 70000,
      existing: 4200,
      monthly: 1500,
      date: "2030-06-01",
      contributions: [],
    },
  ];
  d.budgets = {
    "2026-11:Groceries": 3000,
    "2026-11:Transport": 1000,
    "2026-11:Shopping": 2000,
  };
  return d;
}
test("approved reference: capture all eight implemented screens at iPhone size", async ({
  page,
  context,
}) => {
  await context.setGeolocation({ latitude: 32.08, longitude: 34.78 });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.setFixedTime(new Date("2026-11-04T11:27:18Z"));
  const data = fixture();
  await page.addInitScript((d) => {
    if (!localStorage.getItem("savio-local-v1"))
      localStorage.setItem("savio-local-v1", JSON.stringify(d));
    localStorage.setItem("savio-last-export", "2026-11-04T11:00:00Z");
  }, data);
  const output = path.resolve("docs/screenshots/approved");
  await mkdir(output, { recursive: true });
  const screens = [
    ["welcome", "פתיחה"],
    ["overview", "דשבורד"],
    ["transactions", "תנועות"],
    ["shifts", "עבודה ושכר"],
    ["goals", "חיסכון"],
    ["budgets", "תקציבים"],
    ["ai", "SAVIO AI"],
    ["settings", "הגדרות"],
  ];
  for (const [tab] of screens) {
    await page.goto("/?tab=" + tab);
    if (tab === "welcome")
      await expect(
        page.getByRole("button", { name: "בואו נתחיל לחסוך", exact: true }),
      ).toBeVisible();
    else await expect(page.locator(".main-content")).toBeVisible();
    const dismiss = page.getByRole("button", { name: "Dismiss", exact: true });
    if (await dismiss.isVisible()) await dismiss.click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.waitForFunction(() =>
      Array.from(document.images).every(
        (image) => image.complete && image.naturalWidth > 0,
      ),
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: path.join(output, tab + ".png"),
      animations: "disabled",
    });
    if (tab === "overview")
      await expect(page.locator(".hero-balance")).toContainText("9,200");
    if (tab === "budgets")
      await expect(page.locator(".ring-content")).toContainText("67%");
  }
  const images = await Promise.all(
    screens.map(async ([tab, label]) => ({
      tab,
      label,
      src:
        "data:image/png;base64," +
        (await readFile(path.join(output, tab + ".png"))).toString("base64"),
    })),
  );
  await page.setViewportSize({ width: 1120, height: 800 });
  await page.setContent(
    `<html dir="rtl"><style>*{box-sizing:border-box}body{margin:0;padding:28px;background:#eef0ed;font-family:Arial;color:#14251a}h1{font-size:23px;margin:0 0 8px}p{font-size:14px;color:#4d6254;margin:0 0 22px}.grid{direction:ltr;display:grid;grid-template-columns:repeat(4,1fr);gap:22px 18px}.frame{padding:5px;background:#020704;border:1px solid #344c3d;border-radius:25px;overflow:hidden;box-shadow:0 5px 14px #0002}.frame img{display:block;width:100%;border-radius:20px}h2{font-size:14px;margin:0 0 8px;text-align:center}</style><h1>SAVIO — שמונת המסכים הממומשים</h1><p>צילומי דפדפן בגודל 390×844. נתוני QA מבודדים שנשמרו באפליקציה — לא נתונים פיננסיים של המשתמש.</p><div class="grid">${images.map((i) => `<section><h2>${i.label}</h2><div class="frame"><img src="${i.src}"/></div></section>`).join("")}</div></html>`,
  );
  await page.screenshot({
    path: path.join(output, "eight-screens.png"),
    fullPage: true,
    animations: "disabled",
  });
  await writeFile(
    path.join(output, "README.md"),
    "# Implemented screens\n\nActual Chromium screenshots at 390×844, compared with the user-supplied 8-screen reference. Fixtures are isolated QA records persisted through the real local storage path, not user balances and not application defaults. The sheet labels this explicitly. The supplied reference was a low-resolution composite (approximately 519×534), so tiny typography/photo details cannot be verified pixel-for-pixel. No pixel-perfect claim is made.\n\nIncludes welcome, dashboard, transactions, work, savings, budgets, AI and settings. Ring percentages and balances are calculated from the saved QA records. Goal thumbnails use locally generated decorative photographs, not extracted original photo assets and not photographs of the user’s actual belongings.\n",
  );
});
test("new install starts in Hebrew with functional welcome and no invented balances", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "בואו נתחיל לחסוך", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "בואו נתחיל לחסוך", exact: true })
    .click();
  await expect(page.locator(".user-guide")).toBeVisible();
  for (let i = 0; i < 4; i++)
    await page.getByRole("button", { name: "הבא", exact: true }).click();
  await page
    .getByRole("button", { name: "מתחילים להשתמש ב־SAVIO", exact: true })
    .click();
  await expect(page.locator(".hero-balance")).toContainText("0");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await page.reload();
  await expect(page.locator(".hero-balance")).toBeVisible();
  await expect(page.locator(".welcome-screen")).toHaveCount(0);
});
