/**
 * Tests for AI Chat NDA Creator – page.tsx
 */
import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import Home from "../app/page";
import { emptyFields } from "../app/types/nda";

// ─── html2pdf mock ───────────────────────────────────────────────────────────
const mockSave = jest.fn().mockResolvedValue(undefined);
const mockFrom = jest.fn().mockReturnValue({ save: mockSave });
const mockSet = jest.fn().mockReturnValue({ from: mockFrom });
const mockHtml2pdf = jest.fn().mockReturnValue({ set: mockSet });

jest.mock("html2pdf.js", () => ({
  __esModule: true,
  default: mockHtml2pdf,
}));

// ─── fetch mock ──────────────────────────────────────────────────────────────
const SESSION_ID = "test-session-id";

const greetingResponse = {
  reply: "Hello! I'm your NDA assistant. What is Party 1's company name?",
  fields: { ...emptyFields },
};

function mockCreateSession() {
  return Promise.resolve({ ok: true, json: async () => ({ session_id: SESSION_ID }) });
}

function mockGreeting() {
  return Promise.resolve({ ok: true, json: async () => greetingResponse });
}

function mockReply(reply: string, fields = emptyFields) {
  return Promise.resolve({ ok: true, json: async () => ({ reply, fields }) });
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();

  // Default: new session flow (POST /sessions, then POST /sessions/id/messages __init__)
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ session_id: SESSION_ID }) } as Response)
    .mockResolvedValueOnce({ ok: true, json: async () => greetingResponse } as Response);
});

// ─── 1. Initial render ───────────────────────────────────────────────────────
describe("Initial render", () => {
  it("renders the Mutual NDA Creator heading", async () => {
    render(<Home />);
    await waitFor(() => expect(screen.getByText("Mutual NDA Creator")).toBeInTheDocument());
  });

  it("renders the chat input", () => {
    render(<Home />);
    expect(screen.getByRole("textbox", { name: /chat input/i })).toBeInTheDocument();
  });

  it("renders the NDA preview panel", () => {
    render(<Home />);
    expect(screen.getByText("NDA Preview")).toBeInTheDocument();
  });

  it("renders the Download as PDF button", () => {
    render(<Home />);
    expect(screen.getByRole("button", { name: /download as pdf/i })).toBeInTheDocument();
  });

  it("renders the NDA Assistant header", () => {
    render(<Home />);
    expect(screen.getByText("NDA Assistant")).toBeInTheDocument();
  });

  it("shows AI greeting after mount", async () => {
    render(<Home />);
    await waitFor(() =>
      expect(screen.getByText(/party 1/i)).toBeInTheDocument()
    );
  });

  it("creates a session and stores it in localStorage", async () => {
    render(<Home />);
    await waitFor(() => expect(localStorage.getItem("prelegal_session_id")).toBe(SESSION_ID));
  });
});

// ─── 2. Chat interactions ────────────────────────────────────────────────────
describe("Chat interactions", () => {
  it("user message appears in chat after send", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: "Got it!", fields: emptyFields }),
    } as Response);

    render(<Home />);
    await waitFor(() => screen.getByText(greetingResponse.reply));

    const input = screen.getByRole("textbox", { name: /chat input/i });
    await userEvent.type(input, "Acme Corp");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getByText("Acme Corp")).toBeInTheDocument());
  });

  it("AI reply appears after user sends a message", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: "Great! What is Party 2's company name?", fields: emptyFields }),
    } as Response);

    render(<Home />);
    await waitFor(() => screen.getByText(greetingResponse.reply));

    const input = screen.getByRole("textbox", { name: /chat input/i });
    await userEvent.type(input, "Acme Corp");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() =>
      expect(screen.getByText("Great! What is Party 2's company name?")).toBeInTheDocument()
    );
  });

  it("NDA preview updates when AI response includes company name", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reply: "Got it! What is the signatory's name at Acme Corp?",
        fields: { ...emptyFields, party1_company: "Acme Corp" },
      }),
    } as Response);

    render(<Home />);
    await waitFor(() => screen.getByText(greetingResponse.reply));

    const input = screen.getByRole("textbox", { name: /chat input/i });
    await userEvent.type(input, "Acme Corp");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getAllByText("Acme Corp").length).toBeGreaterThan(0));
  });

  it("NDA preview shows governing law when AI extracts it", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        reply: "Perfect. Which city/county and state should handle disputes?",
        fields: { ...emptyFields, governing_law: "California" },
      }),
    } as Response);

    render(<Home />);
    await waitFor(() => screen.getByText(greetingResponse.reply));

    const input = screen.getByRole("textbox", { name: /chat input/i });
    await userEvent.type(input, "California");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => expect(screen.getAllByText("California").length).toBeGreaterThan(0));
  });

  it("send button is disabled while loading", async () => {
    let resolveGreeting!: (v: unknown) => void;
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ session_id: SESSION_ID }) } as Response)
      .mockReturnValueOnce(new Promise((res) => { resolveGreeting = res; }));

    render(<Home />);
    // While greeting is pending, send button should reflect disabled state
    const sendBtn = screen.getByRole("button", { name: /send/i });
    expect(sendBtn).toBeDisabled();

    act(() => resolveGreeting({ ok: true, json: async () => greetingResponse }));
    await waitFor(() => screen.getByText(greetingResponse.reply));
  });

  it("input is cleared after send", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ reply: "Got it!", fields: emptyFields }),
    } as Response);

    render(<Home />);
    await waitFor(() => screen.getByText(greetingResponse.reply));

    const input = screen.getByRole("textbox", { name: /chat input/i }) as HTMLInputElement;
    await userEvent.type(input, "Test text");
    await userEvent.click(screen.getByRole("button", { name: /send/i }));

    expect(input.value).toBe("");
  });
});

// ─── 3. Session restore ──────────────────────────────────────────────────────
describe("Session restore", () => {
  it("loads existing session from localStorage on mount", async () => {
    localStorage.setItem("prelegal_session_id", SESSION_ID);

    const history = [
      { role: "user", content: "Acme Corp" },
      { role: "assistant", content: "Got it! What is Party 2's name?" },
    ];

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ messages: history }),
    } as Response);

    render(<Home />);

    await waitFor(() => expect(screen.getByText("Acme Corp")).toBeInTheDocument());
    expect(screen.getByText("Got it! What is Party 2's name?")).toBeInTheDocument();
  });

  it("starts fresh session if existing session returns 404", async () => {
    localStorage.setItem("prelegal_session_id", "old-session");

    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({ detail: "Session not found" }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ session_id: SESSION_ID }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => greetingResponse } as Response);

    render(<Home />);

    await waitFor(() => expect(screen.getByText(/party 1/i)).toBeInTheDocument());
    expect(localStorage.getItem("prelegal_session_id")).toBe(SESSION_ID);
  });
});

// ─── 4. Download PDF ─────────────────────────────────────────────────────────
describe("Download as PDF", () => {
  it("calls html2pdf when download button is clicked", async () => {
    render(<Home />);
    await waitFor(() => screen.getByText(greetingResponse.reply));

    await userEvent.click(screen.getByRole("button", { name: /download as pdf/i }));
    await waitFor(() => expect(mockHtml2pdf).toHaveBeenCalled(), { timeout: 3000 });
  });

  it("passes correct filename to html2pdf", async () => {
    render(<Home />);
    await waitFor(() => screen.getByText(greetingResponse.reply));

    await userEvent.click(screen.getByRole("button", { name: /download as pdf/i }));
    await waitFor(() =>
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ filename: "mutual-nda.pdf" })
      ), { timeout: 3000 }
    );
  });

  it("passes A4 portrait jsPDF options", async () => {
    render(<Home />);
    await waitFor(() => screen.getByText(greetingResponse.reply));

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
    await waitFor(() => screen.getByText(greetingResponse.reply));

    await userEvent.click(screen.getByRole("button", { name: /download as pdf/i }));
    await waitFor(() =>
      expect(mockFrom).toHaveBeenCalledWith(expect.any(HTMLElement)), { timeout: 3000 }
    );
  });

  it("disables button and shows Generating PDF while generating", async () => {
    let resolveSave!: () => void;
    mockSave.mockReturnValueOnce(new Promise<void>((res) => { resolveSave = res; }));

    render(<Home />);
    await waitFor(() => screen.getByText(greetingResponse.reply));

    await userEvent.click(screen.getByRole("button", { name: /download as pdf/i }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /generating pdf/i })).toBeDisabled()
    );

    act(() => resolveSave());
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /download as pdf/i })).not.toBeDisabled()
    );
  });

  it("shows alert on PDF generation failure", async () => {
    mockSave.mockRejectedValueOnce(new Error("canvas error"));
    const alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});

    render(<Home />);
    await waitFor(() => screen.getByText(greetingResponse.reply));

    await userEvent.click(screen.getByRole("button", { name: /download as pdf/i }));
    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(expect.stringMatching(/failed to generate pdf/i)),
      { timeout: 3000 }
    );

    alertSpy.mockRestore();
  });
});

// ─── 5. NDA Preview content ──────────────────────────────────────────────────
describe("NDA Preview content", () => {
  it("shows placeholder for empty governing law", async () => {
    render(<Home />);
    await waitFor(() => screen.getByText(greetingResponse.reply));
    expect(screen.getByText(/\[Fill in state\]/)).toBeInTheDocument();
  });

  it("shows placeholder for empty jurisdiction", async () => {
    render(<Home />);
    await waitFor(() => screen.getByText(greetingResponse.reply));
    expect(screen.getByText(/\[Fill in city/)).toBeInTheDocument();
  });

  it("shows Party 1 and Party 2 column headers in signature table", async () => {
    render(<Home />);
    await waitFor(() => screen.getByText(greetingResponse.reply));
    expect(screen.getAllByText("Party 1").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Party 2").length).toBeGreaterThan(0);
  });
});
