/**
 * Tests for Mutual NDA Creator – page.tsx
 * Covers: rendering, form interactions, PDF download trigger, edge cases, accessibility
 */
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import Home from "../app/page";

// ─── html2pdf mock ───────────────────────────────────────────────────────────
const mockSave = jest.fn().mockResolvedValue(undefined);
const mockFrom = jest.fn().mockReturnValue({ save: mockSave });
const mockSet = jest.fn().mockReturnValue({ from: mockFrom });
const mockHtml2pdf = jest.fn().mockReturnValue({ set: mockSet });

jest.mock("html2pdf.js", () => ({
  __esModule: true,
  default: mockHtml2pdf,
}));

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── 1. Rendering ────────────────────────────────────────────────────────────
describe("Initial render", () => {
  it("renders the page heading", () => {
    render(<Home />);
    expect(screen.getByText("Mutual NDA Creator")).toBeInTheDocument();
  });

  it("renders the Download as PDF button", () => {
    render(<Home />);
    expect(screen.getByRole("button", { name: /download as pdf/i })).toBeInTheDocument();
  });

  it("renders Party 1 and Party 2 section headings in the form", () => {
    render(<Home />);
    // Both appear in form headings AND signature table — use getAllByText
    expect(screen.getAllByText("Party 1").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Party 2").length).toBeGreaterThanOrEqual(1);
  });

  it("renders the NDA document preview", () => {
    render(<Home />);
    expect(screen.getByText("Mutual Non-Disclosure Agreement")).toBeInTheDocument();
    expect(screen.getByText("Cover Page")).toBeInTheDocument();
    expect(screen.getByText("Standard Terms")).toBeInTheDocument();
  });

  it("renders all 11 standard term sections", () => {
    render(<Home />);
    const terms = [
      "Introduction", "Use and Protection of Confidential Information", "Exceptions",
      "Disclosures Required by Law", "Term and Termination",
      "Return or Destruction of Confidential Information", "Proprietary Rights",
      "Disclaimer", "Governing Law and Jurisdiction", "Equitable Relief", "General",
    ];
    terms.forEach((title) => {
      expect(screen.getByText(new RegExp(title))).toBeInTheDocument();
    });
  });

  it("pre-fills effective date to today", () => {
    render(<Home />);
    const today = new Date().toISOString().split("T")[0];
    expect(screen.getByDisplayValue(today)).toBeInTheDocument();
  });

  it("download button is not disabled initially", () => {
    render(<Home />);
    expect(screen.getByRole("button", { name: /download as pdf/i })).not.toBeDisabled();
  });
});

// ─── 2. Form interactions ────────────────────────────────────────────────────
describe("Form interactions", () => {
  it("updates purpose text and reflects it in preview", async () => {
    render(<Home />);
    const purposeTextarea = screen.getByLabelText("Purpose");
    await userEvent.clear(purposeTextarea);
    await userEvent.type(purposeTextarea, "Testing mutual NDA purpose");
    expect(screen.getAllByText(/Testing mutual NDA purpose/).length).toBeGreaterThan(0);
  });

  it("switches MNDA term to 'Until terminated' and hides years input", async () => {
    render(<Home />);
    await userEvent.click(screen.getByLabelText("Until terminated"));
    // The years number input should disappear
    const yearsInputs = screen.queryAllByPlaceholderText("Years");
    // Confidentiality years input may still be present; MNDA one should be gone
    // After switching, there should be one fewer "Years" input
    expect(yearsInputs.length).toBeLessThanOrEqual(1);
    expect(screen.getAllByText(/Continues until terminated/i).length).toBeGreaterThan(0);
  });

  it("switches confidentiality term to 'In perpetuity'", async () => {
    render(<Home />);
    await userEvent.click(screen.getByLabelText("In perpetuity"));
    expect(screen.getAllByText(/In perpetuity/i).length).toBeGreaterThan(0);
  });

  it("fills Party 1 print name and reflects it in signature table", async () => {
    render(<Home />);
    const fullNameInputs = screen.getAllByPlaceholderText("Full name");
    await userEvent.type(fullNameInputs[0], "Alice Smith");
    expect(screen.getByDisplayValue("Alice Smith")).toBeInTheDocument();
    // Should appear in the signature table
    expect(screen.getAllByText("Alice Smith").length).toBeGreaterThan(0);
  });

  it("fills Governing Law and reflects it in preview", async () => {
    render(<Home />);
    const govLawInput = screen.getByPlaceholderText(/e.g. Delaware/i);
    await userEvent.type(govLawInput, "California");
    expect(screen.getAllByText(/California/).length).toBeGreaterThan(0);
  });

  it("shows MNDA modifications section only when text is entered", async () => {
    render(<Home />);
    expect(screen.queryByText("MNDA Modifications")).not.toBeInTheDocument();
    const modInput = screen.getByPlaceholderText(/Any modifications/i);
    await userEvent.type(modInput, "Section 2 is amended.");
    expect(screen.getByText("MNDA Modifications")).toBeInTheDocument();
  });

  it("updates effective date and reflects it in preview", () => {
    render(<Home />);
    const today = new Date().toISOString().split("T")[0];
    const dateInput = screen.getByDisplayValue(today);
    fireEvent.change(dateInput, { target: { value: "2025-06-01" } });
    expect(screen.getAllByText("2025-06-01").length).toBeGreaterThan(0);
  });
});

// ─── 3. Download / PDF generation ────────────────────────────────────────────
describe("Download as PDF button", () => {
  it("does NOT call window.print()", async () => {
    const printSpy = jest.spyOn(window, "print").mockImplementation(() => {});
    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: /download as pdf/i }));
    expect(printSpy).not.toHaveBeenCalled();
    printSpy.mockRestore();
  });

  it("calls html2pdf() when download button is clicked", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: /download as pdf/i }));
    await waitFor(() => expect(mockHtml2pdf).toHaveBeenCalled(), { timeout: 3000 });
  });

  it("passes correct filename to html2pdf", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: /download as pdf/i }));
    await waitFor(() =>
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ filename: "mutual-nda.pdf" })
      ), { timeout: 3000 }
    );
  });

  it("passes A4 portrait jsPDF options", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: /download as pdf/i }));
    await waitFor(() =>
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({
          jsPDF: expect.objectContaining({ format: "a4", orientation: "portrait" }),
        })
      ), { timeout: 3000 }
    );
  });

  it("calls .from() with the nda-document HTMLElement", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: /download as pdf/i }));
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalledWith(expect.any(HTMLElement));
    }, { timeout: 3000 });
  });

  it("calls .save() to trigger the download", async () => {
    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: /download as pdf/i }));
    await waitFor(() => expect(mockSave).toHaveBeenCalled(), { timeout: 3000 });
  });

  it("disables button and shows 'Generating PDF…' while generating", async () => {
    // Make save() hang so we can inspect the in-progress state
    let resolveSave!: () => void;
    mockSave.mockReturnValueOnce(new Promise<void>((res) => { resolveSave = res; }));

    render(<Home />);
    const btn = screen.getByRole("button", { name: /download as pdf/i });
    await userEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /generating pdf/i })).toBeDisabled();
    }, { timeout: 3000 });

    // Resolve and button should return to normal
    act(() => resolveSave());
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /download as pdf/i })).not.toBeDisabled();
    });
  });

  it("second click while generating is a no-op (no double call)", async () => {
    let resolveSave!: () => void;
    mockSave.mockReturnValueOnce(new Promise<void>((res) => { resolveSave = res; }));

    render(<Home />);
    const btn = screen.getByRole("button", { name: /download as pdf/i });
    await userEvent.click(btn);

    await waitFor(() => expect(screen.getByRole("button", { name: /generating pdf/i })).toBeDisabled());

    // Clicking a disabled button should not trigger another call
    await userEvent.click(screen.getByRole("button", { name: /generating pdf/i }));
    expect(mockHtml2pdf).toHaveBeenCalledTimes(1);

    act(() => resolveSave());
    await waitFor(() => expect(screen.getByRole("button", { name: /download as pdf/i })).not.toBeDisabled());
  });

  it("shows alert on PDF generation failure", async () => {
    mockSave.mockRejectedValueOnce(new Error("canvas error"));
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: /download as pdf/i }));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith(
      expect.stringMatching(/failed to generate pdf/i)
    ), { timeout: 3000 });

    // Button should re-enable after failure
    expect(screen.getByRole("button", { name: /download as pdf/i })).not.toBeDisabled();
    alertSpy.mockRestore();
  });
});

// ─── 4. Edge cases ───────────────────────────────────────────────────────────
describe("Edge cases", () => {
  it("shows [Governing Law] placeholder when field is empty", () => {
    render(<Home />);
    expect(screen.getAllByText(/\[Governing Law\]/).length).toBeGreaterThan(0);
  });

  it("shows [Jurisdiction] placeholder when field is empty", () => {
    render(<Home />);
    expect(screen.getAllByText(/\[Jurisdiction\]/).length).toBeGreaterThan(0);
  });

  it("shows default purpose text when purpose field is cleared", async () => {
    render(<Home />);
    const purposeTextarea = screen.getByLabelText("Purpose");
    await userEvent.clear(purposeTextarea);
    expect(
      screen.getAllByText(/Evaluating whether to enter into a business relationship/).length
    ).toBeGreaterThan(0);
  });

  it("signature table shows effective date in both party columns", () => {
    render(<Home />);
    const today = new Date().toISOString().split("T")[0];
    const cells = screen.getAllByText(today);
    expect(cells.length).toBeGreaterThanOrEqual(2);
  });

  it("MNDA term years input has min=1 attribute", () => {
    render(<Home />);
    // The first "Years" placeholder input (MNDA term)
    const inputs = screen.getAllByPlaceholderText("Years");
    inputs.forEach((input) => expect(input).toHaveAttribute("min", "1"));
  });

  it("gracefully handles missing .nda-document element without crashing", async () => {
    const origQS = document.querySelector.bind(document);
    jest.spyOn(document, "querySelector").mockImplementation((sel: string) => {
      if (sel === ".nda-document") return null;
      return origQS(sel);
    });
    render(<Home />);
    await expect(
      userEvent.click(screen.getByRole("button", { name: /download as pdf/i }))
    ).resolves.not.toThrow();
    expect(mockHtml2pdf).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it("mndaTerm uses '1' as fallback when years field is empty", async () => {
    render(<Home />);
    const yearsInputs = screen.getAllByPlaceholderText("Years");
    fireEvent.change(yearsInputs[0], { target: { value: "" } });
    expect(screen.getAllByText(/Expires 1 year\(s\) from Effective Date/).length).toBeGreaterThan(0);
  });
});

// ─── 5. Accessibility ────────────────────────────────────────────────────────
describe("Accessibility", () => {
  it("download button is focusable", () => {
    render(<Home />);
    const btn = screen.getByRole("button", { name: /download as pdf/i });
    btn.focus();
    expect(document.activeElement).toBe(btn);
  });

  it("download button has aria-busy=false when idle", () => {
    render(<Home />);
    expect(screen.getByRole("button", { name: /download as pdf/i })).toHaveAttribute("aria-busy", "false");
  });

  it("download button has aria-busy=true while generating", async () => {
    let resolveSave!: () => void;
    mockSave.mockReturnValueOnce(new Promise<void>((res) => { resolveSave = res; }));

    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: /download as pdf/i }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /generating pdf/i })).toHaveAttribute("aria-busy", "true")
    , { timeout: 3000 });

    act(() => resolveSave());
  });

  it("Purpose field has an associated label", () => {
    render(<Home />);
    expect(screen.getByLabelText("Purpose")).toBeInTheDocument();
  });

  it("Effective Date field has an associated label", () => {
    render(<Home />);
    expect(screen.getByLabelText("Effective Date")).toBeInTheDocument();
  });
});
