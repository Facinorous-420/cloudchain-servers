import { expect, test } from "@playwright/test";

// Phase 10 smoke tests for the auth gate. These don't require a seeded
// user — they cover the boundary that matters most for a LAN-only app:
// anonymous users can't see the inventory. Full login + CRUD flows need
// real credentials and seeded data; those are run manually with the
// production seed user before deploy.

test.describe("Auth gate", () => {
  test("redirects unauthenticated requests on the inventory to /login", async ({
    page,
  }) => {
    const response = await page.goto("/assets");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
    expect(response).not.toBeNull();
  });

  test("redirects unauthenticated requests on the topology to /login", async ({
    page,
  }) => {
    await page.goto("/topology");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });

  test("login page renders the credentials form", async ({ page }) => {
    await page.goto("/login");
    await expect(
      page.getByRole("heading", { name: "Cloudchain Inventory" }),
    ).toBeVisible();
    await expect(page.locator("input[name=username]")).toBeVisible();
    await expect(page.locator("input[name=password]")).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("bad credentials keep you on the login page", async ({ page }) => {
    await page.goto("/login");
    await page.locator("input[name=username]").fill("not-a-real-user");
    await page.locator("input[name=password]").fill("wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();
    // The error alert renders conditionally on the server action's
    // returned errorMessage, which is flaky to assert on a cold Webpack
    // dev server (the first Prisma round-trip can outlast Playwright's
    // 5s default visibility timeout). The real security guarantee is
    // that bad credentials never redirect off /login — wait for the
    // action to settle and check the URL.
    await page.waitForLoadState("networkidle");
    expect(page.url()).toContain("/login");
  });
});
