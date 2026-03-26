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
  const section = page.locator(".border.border-gray-200.rounded.p-3.mb-4", { hasText: party });
  await section.getByPlaceholder("Full name").fill(data.name);
  await section.getByPlaceholder("Job title").fill(data.title);
  await section.getByPlaceholder("Company name").fill(data.company);
  await section.getByPlaceholder("Email or postal address").fill(data.address);
}

// ─── 1. Page load ─────────────────────────────────────────────────────────────
test.describe("Page load", () => {
  test("page title and heading visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Mutual NDA Creator" })).toBeVisible();
  });

  test("form panel and preview panel both visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Agreement Details")).toBeVisible();
    await expect(page.getByText("Cover Page")).toBeVisible();
    await expect(page.getByText("Standard Terms")).toBeVisible();
  });

  test("Download as PDF button is visible", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /download as pdf/i })).toBeVisible();
  });

  test("no console errors on load", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(errors).toHaveLength(0);
  });
});

// ─── 2. Form → Preview live update ──────────────────────────────────────────
test.describe("Live preview updates", () => {
  test.beforeEach(async ({ page }) => { await page.goto("/"); });

  test("typing in purpose updates preview immediately", async ({ page }) => {
    const textarea = page.getByLabel("Purpose");
    await textarea.fill("Exploring a joint venture opportunity");
    await expect(page.locator(".nda-document")).toContainText("Exploring a joint venture opportunity");
  });

  test("changing effective date updates preview", async ({ page }) => {
    await page.getByLabel("Effective Date").fill("2025-12-31");
    await expect(page.locator(".nda-document")).toContainText("2025-12-31");
  });

  test("switching MNDA term to 'Until terminated' hides years field", async ({ page }) => {
    await page.getByLabel("Until terminated").click();
    await expect(page.getByPlaceholder("Years").first()).toBeHidden();
    await expect(page.locator(".nda-document")).toContainText("Continues until terminated");
  });

  test("switching confidentiality to perpetuity updates preview", async ({ page }) => {
    await page.getByLabel("In perpetuity").click();
    await expect(page.locator(".nda-document")).toContainText("In perpetuity");
  });

  test("governing law updates in preview", async ({ page }) => {
    await page.getByPlaceholder("e.g. Delaware").fill("New York");
    await expect(page.locator(".nda-document")).toContainText("New York");
  });

  test("modifications section only appears when text entered", async ({ page }) => {
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
    // Wait for download event – if print() were called instead, no download would fire
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 15_000 }),
      page.getByRole("button", { name: /download as pdf/i }).click(),
    ]);
    expect(download.suggestedFilename()).toBe("mutual-nda.pdf");
  });

  test("downloaded file is non-empty", async ({ page }) => {
    await page.goto("/");
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 15_000 }),
      page.getByRole("button", { name: /download as pdf/i }).click(),
    ]);
    const tmpPath = path.join(os.tmpdir(), download.suggestedFilename());
    await download.saveAs(tmpPath);
    const stat = fs.statSync(tmpPath);
    expect(stat.size).toBeGreaterThan(1000); // real PDF > 1 KB
    fs.unlinkSync(tmpPath);
  });

  test("downloaded file starts with PDF magic bytes", async ({ page }) => {
    await page.goto("/");
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 15_000 }),
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
    let printCalled = false;
    await page.exposeFunction("__onPrint", () => { printCalled = true; });
    await page.evaluate(() => {
      const orig = window.print.bind(window);
      window.print = () => { (window as any).__onPrint(); orig(); };
    });
    // Ignore download; just check print wasn't called
    page.on("download", () => {});
    await page.getByRole("button", { name: /download as pdf/i }).click();
    await page.waitForTimeout(3000);
    expect(printCalled).toBe(false);
  });
});

// ─── 4. Print CSS ─────────────────────────────────────────────────────────────
test.describe("Print CSS correctness", () => {
  test("form panel has no-print class (hidden during print)", async ({ page }) => {
    await page.goto("/");
    const aside = page.locator("aside.no-print");
    await expect(aside).toHaveCount(1);
  });

  test("header has no-print class", async ({ page }) => {
    await page.goto("/");
    const header = page.locator("header.no-print");
    await expect(header).toHaveCount(1);
  });

  test("nda-document element exists and is fully scrollable in preview", async ({ page }) => {
    await page.goto("/");
    // The document should be scrollable (overflow-y-auto on main)
    const main = page.locator("main");
    const scrollHeight = await main.evaluate((el) => el.scrollHeight);
    const clientHeight = await main.evaluate((el) => el.clientHeight);
    // Document is long enough to need scrolling
    expect(scrollHeight).toBeGreaterThan(clientHeight);
  });

  test("full document content is in the DOM (not clipped)", async ({ page }) => {
    await page.goto("/");
    // All 11 section headings should exist in DOM regardless of scroll position
    const doc = page.locator(".nda-document");
    await expect(doc).toContainText("Introduction");
    await expect(doc).toContainText("General"); // section 11 - bottom of document
  });
});

// ─── 5. Responsive layout ────────────────────────────────────────────────────
test.describe("Responsive layout", () => {
  test("layout is usable on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expect(page.getByRole("button", { name: /download as pdf/i })).toBeVisible();
  });

  test("layout stacks vertically on small screens", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    // On mobile, aside and main should stack (flex-col)
    const container = page.locator(".flex.flex-col");
    await expect(container).toHaveCount(1);
  });
});
