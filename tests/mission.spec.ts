import { test, expect } from "@playwright/test";

/**
 * MISSION FLOW — the user journey that must never break.
 * These tests need no Supabase account: they cover the public surface
 * and the legally required consent gating.
 * Deeper flows (rating, paywalls) are appended in later phases.
 */

test("landing page presents the app and both entry points", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Mon Beau Miroir/);
  await expect(page.getByRole("link", { name: "Create your mirror" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Log in" }).first()).toBeVisible();
});

test("signup methods stay locked until BOTH consents are ticked", async ({ page }) => {
  await page.goto("/signup");

  const passwordButton = page.getByRole("button", { name: "Sign up with password" });
  const magicButton = page.getByRole("button", { name: "Email me a magic link" });
  const googleButton = page.getByRole("button", { name: "Continue with Google" });

  // Nothing ticked: everything locked.
  await expect(googleButton).toBeDisabled();

  // Only one consent: still locked.
  await page.getByLabel("I am 18 years of age or older.").check();
  await expect(googleButton).toBeDisabled();

  // Both consents + valid inputs: unlocked.
  await page
    .getByLabel("I have read and accept the Terms of Service and Privacy Policy.")
    .check();
  await page.getByLabel("Email").fill("someone@example.com");
  await page.getByLabel("Password (for the password option)").fill("longenough123");
  await expect(googleButton).toBeEnabled();
  await expect(magicButton).toBeEnabled();
  await expect(passwordButton).toBeEnabled();
});

test("protected pages bounce anonymous visitors to /login", async ({ page }) => {
  await page.goto("/feed");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/me");
  await expect(page).toHaveURL(/\/login/);
});

test("billing settings are also behind login", async ({ page }) => {
  await page.goto("/settings/billing");
  await expect(page).toHaveURL(/\/login/);
});

test("terms page renders the plain-English document", async ({ page }) => {
  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible();
  await expect(page.getByText("You must be at least 18 years old")).toBeVisible();
});

test("privacy page renders and the footer links to it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Privacy" }).click();
  await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
});
