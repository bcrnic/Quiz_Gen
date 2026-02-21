import React, { useCallback, useState } from "react";
import { Upload, FileText, X, AlertCircle, Plus, Loader2, Type } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import { useLanguage } from "@/i18n/LanguageContext";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface UploadedFile {
  name: string;
  content: string;
  size: number;
}

interface FileUploadProps {
  onFilesReady: (combinedContent: string, fileNames: string[]) => void;
}

const MAX_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = [".txt", ".pdf"];

type InputMode = "file" | "text";

const FileUpload: React.FC<FileUploadProps> = ({ onFilesReady }) => {
  const { t } = useLanguage();
  const [mode, setMode] = useState<InputMode>("file");
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [pastedText, setPastedText] = useState("");

  const addFile = useCallback((name: string, content: string) => {
    if (content.trim().length < 50) {
      setError(t.fileTooShort);
      return;
    }
    setFiles((prev) => {
      if (prev.some((f) => f.name === name)) {
        setError(t.fileAlreadyAdded(name));
        return prev;
      }
      return [...prev, { name, content, size: content.length }];
    });
  }, [t]);

  const extractPdfText = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => {
          const maybe = item as unknown as { str?: string };
          return typeof maybe.str === "string" ? maybe.str : "";
        })
        .filter((s) => s.length > 0)
        .join(" ");
      pages.push(pageText);
    }
    return pages.join("\n\n");
  };

  const processFile = useCallback(async (file: File) => {
    setError(null);
    const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
    if (!ACCEPTED_TYPES.includes(ext)) {
      setError(t.onlyTxtPdf);
      return;
    }
    if (file.size > MAX_SIZE) {
      setError(t.fileTooLarge);
      return;
    }
    if (ext === ".pdf") {
      setProcessing(true);
      try {
        const text = await extractPdfText(file);
        addFile(file.name, text);
      } catch {
        setError(t.pdfParseFailed);
      } finally {
        setProcessing(false);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        addFile(file.name, text);
      };
      reader.onerror = () => setError(t.fileReadFailed);
      reader.readAsText(file);
    }
  }, [addFile, t]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    Array.from(e.dataTransfer.files).forEach(processFile);
  }, [processFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach(processFile);
    e.target.value = "";
  }, [processFile]);

  const removeFile = (name: string) => {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  };

  const handleContinue = () => {
    if (files.length === 0) return;
    const combined = files.map((f) => f.content).join("\n\n---\n\n");
    const names = files.map((f) => f.name);
    onFilesReady(combined, names);
  };

  const handleTextContinue = () => {
    if (pastedText.trim().length < 50) {
      setError(t.textTooShort);
      return;
    }
    setError(null);
    onFilesReady(pastedText, [t.pastedText]);
  };

  const totalChars = files.reduce((sum, f) => sum + f.size, 0);
  const estimatedFacts = Math.max(1, Math.floor(totalChars / 60));

  return (
    <div className="w-full max-w-xl mx-auto animate-fade-in">
      {/* Mode toggle */}
      <div className="flex gap-2 mb-6 bg-secondary rounded-xl p-1">
        <button
          onClick={() => { setMode("file"); setError(null); }}
          className={`flex-1 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
            mode === "file"
              ? "gradient-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Upload className="w-4 h-4" />
          {t.uploadFiles}
        </button>
        <button
          onClick={() => { setMode("text"); setError(null); }}
          className={`flex-1 py-2.5 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
            mode === "text"
              ? "gradient-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Type className="w-4 h-4" />
          {t.pasteText}
        </button>
      </div>

      {mode === "file" ? (
        <>
          <label
            className={`relative flex flex-col items-center justify-center w-full h-48 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300 ${
              dragOver
                ? "border-primary bg-primary/10 glow-primary"
                : "border-border bg-card hover:border-primary/50 hover:bg-card/80"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <Upload className="w-10 h-10 text-primary mb-3" strokeWidth={1.5} />
            <p className="text-foreground font-semibold text-lg mb-1">{t.dropFiles}</p>
            <p className="text-muted-foreground text-sm">{t.fileTypes}</p>
            <input
              type="file"
              accept=".txt,.pdf"
              multiple
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileInput}
            />
          </label>

          {processing && (
            <div className="mt-4 flex items-center justify-center gap-2 text-primary">
              <Loader2 className="w-4 h-4 animate-spin" />
              <p className="text-sm font-medium">{t.processingPdf}</p>
            </div>
          )}

          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((f) => (
                <div key={f.name} className="gradient-card rounded-lg px-4 py-3 border border-border flex items-center gap-3">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground text-sm font-medium truncate">{f.name}</p>
                    <p className="text-muted-foreground text-xs">{(f.size / 1024).toFixed(1)}KB</p>
                  </div>
                  <button onClick={() => removeFile(f.name)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <div className="flex items-center justify-between pt-2">
                <p className="text-muted-foreground text-sm">
                  {t.fileCount(files.length)} · {t.facts(estimatedFacts)} · {(totalChars / 1024).toFixed(1)}KB {t.total}
                </p>
                <label className="text-primary text-sm font-medium cursor-pointer hover:underline flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  {t.addMore}
                  <input type="file" accept=".txt,.pdf" multiple className="hidden" onChange={handleFileInput} />
                </label>
              </div>

              <button
                onClick={handleContinue}
                disabled={processing}
                className="w-full mt-2 py-4 rounded-xl font-bold text-lg gradient-primary text-primary-foreground hover:opacity-90 transition-all duration-200 disabled:opacity-50"
              >
                {t.continue}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          <textarea
            value={pastedText}
            onChange={(e) => { setPastedText(e.target.value); setError(null); }}
            placeholder={t.pasteOrType}
            className="w-full h-48 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground p-4 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
          />
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground text-sm">
              {pastedText.trim().length} {t.characters}
              {pastedText.trim().length < 50 && pastedText.trim().length > 0 && (
                <span className="text-destructive"> {t.min50}</span>
              )}
            </p>
          </div>
          <button
            onClick={handleTextContinue}
            disabled={pastedText.trim().length < 50}
            className="w-full py-4 rounded-xl font-bold text-lg gradient-primary text-primary-foreground hover:opacity-90 transition-all duration-200 disabled:opacity-50"
          >
            {t.continue}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 text-destructive bg-destructive/10 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
