import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FileUpload from "@/components/FileUpload";
import { LanguageProvider } from "@/i18n/LanguageContext";

const mocks = vi.hoisted(() => {
  return {
    getDocumentMock: vi.fn(),
  };
});

vi.mock("pdfjs-dist", () => ({
  version: "test",
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: (...args: unknown[]) => mocks.getDocumentMock(...args),
}));

const renderUpload = (onFilesReady = vi.fn()) =>
  render(
    <LanguageProvider>
      <FileUpload onFilesReady={onFilesReady} />
    </LanguageProvider>,
  );

const getFileInput = (container: HTMLElement) => {
  const input = container.querySelector("input[type=\"file\"]") as HTMLInputElement | null;
  if (!input) throw new Error("File input not found");
  return input;
};

describe("FileUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unsupported file types", async () => {
    const { container } = renderUpload();
    const input = getFileInput(container);

    const badFile = new File(["hello world"], "notes.doc");
    fireEvent.change(input, { target: { files: [badFile] } });

    expect(await screen.findByText("Only .txt and .pdf files are supported.")).toBeInTheDocument();
  });

  it("rejects files over 10MB", async () => {
    const { container } = renderUpload();
    const input = getFileInput(container);

    const bigFile = new File(["small"], "huge.txt");
    Object.defineProperty(bigFile, "size", { value: 11 * 1024 * 1024 });

    fireEvent.change(input, { target: { files: [bigFile] } });
    expect(await screen.findByText("File is too large. Maximum size is 10MB.")).toBeInTheDocument();
  });

  it("disables continue for short pasted text", async () => {
    const onFilesReady = vi.fn();
    renderUpload(onFilesReady);

    fireEvent.click(screen.getByRole("button", { name: "Paste Text" }));
    fireEvent.change(screen.getByPlaceholderText("Paste or type your study material here..."), {
      target: { value: "too short text" },
    });
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(onFilesReady).not.toHaveBeenCalled();
  });

  it("submits valid pasted text", async () => {
    const onFilesReady = vi.fn();
    renderUpload(onFilesReady);

    const longText = "A".repeat(80);
    fireEvent.click(screen.getByRole("button", { name: "Paste Text" }));
    fireEvent.change(screen.getByPlaceholderText("Paste or type your study material here..."), {
      target: { value: longText },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(onFilesReady).toHaveBeenCalledWith(longText, ["Pasted text"]);
    });
  });

  it("shows pdf parse error when pdfjs fails", async () => {
    mocks.getDocumentMock.mockImplementation(() => {
      throw new Error("parse failed");
    });

    const { container } = renderUpload();
    const input = getFileInput(container);
    const pdfFile = new File(["%PDF-1.4"], "file.pdf", { type: "application/pdf" });

    fireEvent.change(input, { target: { files: [pdfFile] } });
    expect(await screen.findByText("Failed to parse PDF. The file may be corrupted or image-only.")).toBeInTheDocument();
  });
});
