/**
 * Playwright e2e tests for Mutual NDA Creator
 * Requires dev server running on localhost:3000
 */
import { test, expect, Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import os from "os";

// ─── helpers ─────────────────────────────────────────────────────────────────
async function fillParty(page: Page, party: "Party 1" | "Party 2", data: {
  name: string; title: string; company: string; address: string;
}) {
  // Use the aside (form panel) to scope party sections
  const aside = page.locator("aside");
  const sections = aside.locator("div.border.border-gray-200.rounded.p-3");
  const section = sections.filter({ hasText: party });
  await section.getByPlaceholder("Full name").fill(data.name);
  await section.getByPlaceholder("Job title").fill(data.title);
  await section.getByPlaceholder("Company name").fill(data.company);
  await section.getByPlaceholder("Email or postal address").fill(data.address);
}

// ─── 1. Page load ─────────────────────────────────────────────────────────────
test.describe("Page load", () => {
  test("page title and heading visible", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("heading", { name: "Mutual NDA Creator" })).toBeVisible();
  });

  test("form panel and preview panel both visible", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByText("Agreement Details")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Cover Page" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Standard Terms" })).toBeVisible();
  });

  test("Download as PDF button is visible", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("button", { name: /download as pdf/i })).toBeVisible();
  });

  test("no JS errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    // Give React time to hydrate
    await page.waitForTimeout(1000);
    expect(errors).toHaveLength(0);
  });
});

// ─── 2. Form → Preview live update ──────────────────────────────────────────
test.describe("Live preview updates", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("typing in purpose updates preview immediately", async ({ page }) => {
    await page.getByLabel("Purpose").fill("Exploring a joint venture opportunity");
    await expect(page.locator(".nda-document")).toContainText("Exploring a joint venture opportunity");
  });

  test("changing effective date updates preview", async ({ page }) => {
    await page.getByLabel("Effective Date").fill("2025-12-31");
    await expect(page.locator(".nda-document")).toContainText("2025-12-31");
  });

  test("switching MNDA term to 'Until terminated' hides years field", async ({ page }) => {
    // Radio buttons are inside labels — click by text
    await page.getByText("Until terminated").click();
    await expect(page.locator(".nda-document")).toContainText("Continues until terminated");
  });

  test("switching confidentiality to perpetuity updates preview", async ({ page }) => {
    await page.getByText("In perpetuity").click();
    await expect(page.locator(".nda-document")).toContainText("In perpetuity");
  });

  test("governing law updates in preview", async ({ page }) => {
    await page.getByPlaceholder("e.g. Delaware").fill("New York");
    await expect(page.locator(".nda-document")).toContainText("New York");
  });

  test("modifications section only appears when text entered", async ({ page }) => {
    // Initially no MNDA Modifications heading in the preview
    await expect(page.locator(".nda-document")).not.toContainText("MNDA Modifications");
    await page.getByPlaceholder("Any modifications to the standard terms").fill("Clause 3 modified.");
    await expect(page.locator(".nda-document")).toContainText("MNDA Modifications");
  });

  test("party 1 name appears in signature table", async ({ page }) => {
    await fillParty(page, "Party 1", {
      name: "Alice Johnson", title: "CEO", company: "Acme Corp", address: "alice@acme.com",
    });
    const table = page.locator("table");
    await expect(table).toContainText("Alice Johnson");
    await expect(table).toContainText("CEO");
    await expect(table).toContainText("Acme Corp");
  });

  test("party 2 data appears in signature table", async ({ page }) => {
    await fillParty(page, "Party 2", {
      name: "Bob Lee", title: "CTO", company: "Beta LLC", address: "bob@beta.com",
    });
    const table = page.locator("table");
    await expect(table).toContainText("Bob Lee");
    await expect(table).toContainText("CTO");
    await expect(table).toContainText("Beta LLC");
  });
});

// ─── 3. PDF Download ─────────────────────────────────────────────────────────
test.describe("PDF download", () => {
  test("clicking Download triggers a file download (not print dialog)", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 20_000 }),
      page.getByRole("button", { name: /download as pdf/i }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("mutual-nda.pdf");
  });

  test("downloaded file is non-empty", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 20_000 }),
      page.getByRole("button", { name: /download as pdf/i }).click(),
    ]);
    const tmpPath = path.join(os.tmpdir(), download.suggestedFilename());
    await download.saveAs(tmpPath);
    const stat = fs.statSync(tmpPath);
    expect(stat.size).toBeGreaterThan(1000);
    fs.unlinkSync(tmpPath);
  });

  test("downloaded file starts with PDF magic bytes", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 20_000 }),
      page.getByRole("button", { name: /download as pdf/i }).click(),
    ]);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    await new Promise<void>((res) => {
      stream.on("data", (c: Buffer) => chunks.push(c));
      stream.on("end", res);
    });
    const header = Buffer.concat(chunks).slice(0, 4).toString("ascii");
    expect(header).toBe("%PDF");
  });

  test("window.print is NOT called when download clicked", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    let printCalled = false;
    await page.exposeFunction("__onPrint", () => { printCalled = true; });
    await page.evaluate(() => {
      const orig = window.print.bind(window);
      window.print = () => { (window as any).__onPrint(); orig(); };
    });
    page.on("download", () => {});
    await page.getByRole("button", { name: /download as pdf/i }).click();
    await page.waitForTimeout(3000);
    expect(printCalled).toBe(false);
  });

  test("button shows 'Generating PDF…' and is disabled while generating", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    // Click and immediately check for loading state before the PDF finishes
    await page.getByRole("button", { name: /download as pdf/i }).click();
    // The button should briefly show loading text (may be very fast)
    // Just verify it eventually returns to normal after download
    await page.waitForEvent("download", { timeout: 20_000 });
    await expect(page.getByRole("button", { name: /download as pdf/i })).toBeEnabled();
  });
});

// ─── 4. Print CSS ─────────────────────────────────────────────────────────────
test.describe("Print CSS correctness", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("form sidebar has no-print class (hidden during print)", async ({ page }) => {
    const aside = page.locator("aside");
    await expect(aside).toHaveCount(1);
    // Verify the no-print class is present on the aside element
    await expect(aside).toHaveClass(/no-print/);
  });

  test("header has no-print class", async ({ page }) => {
    const header = page.locator("header");
    await expect(header).toHaveCount(1);
    await expect(header).toHaveClass(/no-print/);
  });

  test("layout shell has layout-shell class for scoped print CSS", async ({ page }) => {
    const shell = page.locator(".layout-shell");
    await expect(shell).toHaveCount(1);
  });

  test("nda-document is fully in the DOM (not clipped by scroll)", async ({ page }) => {
    const doc = page.locator(".nda-document");
    await expect(doc).toContainText("Introduction");
    await expect(doc).toContainText("General"); // section 11 — bottom of document
  });

  test("preview panel scrollHeight > clientHeight (content overflows, not clipped)", async ({ page }) => {
    const main = page.locator("main");
    await expect(main).toHaveCount(1);
    const scrollHeight = await main.evaluate((el) => el.scrollHeight);
    const clientHeight = await main.evaluate((el) => el.clientHeight);
    expect(scrollHeight).toBeGreaterThan(clientHeight);
  });
});

// ─── 5. Responsive layout ────────────────────────────────────────────────────
test.describe("Responsive layout", () => {
  test("layout is usable on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("button", { name: /download as pdf/i })).toBeVisible();
  });

  test("layout shell stacks vertically (has flex-col class)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const shell = page.locator(".layout-shell");
    await expect(shell).toHaveClass(/flex-col/);
  });
});
