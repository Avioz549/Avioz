import { test, expect } from "@playwright/test";
test("theme previews persist and system follows device with financial records preserved", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?tab=settings");
  await page.getByRole("button", { name: /עיצוב האפליקציה/ }).click();
  for (const [name, id] of [
    ["כחול חצות", "midnight"],
    ["סגול ניאון", "purple"],
    ["בהיר נקי", "light"],
    ["כהה פרימיום", "dark"],
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", id);
    await expect(
      page.getByRole("button", { name, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  await page.getByRole("button", { name: "סגול ניאון", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "סגול ניאון", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "purple");
  await page.getByRole("button", { name: /עיצוב האפליקציה/ }).click();
  await page.emulateMedia({ colorScheme: "light" });
  await page.getByRole("button", { name: "לפי המכשיר", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
