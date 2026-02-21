import type { McqOptionKey, QuizQuestion } from "@/types/quiz";

const normalize = (s: string) => s.replace(/\r/g, "").trim();

const hashString = (input: string) => {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
};

export const buildQuestionBankId = (combinedContent: string) => {
  return `bank_${hashString(normalize(combinedContent))}`;
};

const stripAfterMarkers = (block: string) => {
  const markers = [
    "Type your comment",
    "Reference:",
    "References:",
    "anjanc",
    "Highly Voted",
    "Most Recent",
    "upvoted",
  ];
  const lines = normalize(block).split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if (markers.some((m) => line.includes(m))) break;
    out.push(line);
  }
  return out.join("\n").trim();
};

const splitQuestionBlocks = (content: string) => {
  const text = normalize(content);
  const parts = text.split(/(?=\bQuestion\s*#\d+)/g);
  return parts.map((p) => p.trim()).filter(Boolean);
};

const parseMcq = (block: string, id: string): QuizQuestion | null => {
  const cleaned = stripAfterMarkers(block);
  const lines = cleaned.split("\n").map((l) => l.trim()).filter(Boolean);

  const qStartIdx = lines.findIndex((l) => !/^Question\s*#\d+/.test(l) && !/^Topic\s*/i.test(l) && !/\b(MCQ|HOTSPOT|DRAG\s*DROP)\b/i.test(l));
  if (qStartIdx < 0) return null;

  const questionLines: string[] = [];
  let i = qStartIdx;
  for (; i < lines.length; i++) {
    const l = lines[i];
    if (/^[A-D][).:]\s+/.test(l)) break;
    if (/^Correct Answer\s*:/i.test(l)) break;
    questionLines.push(l);
  }

  const options: Partial<Record<McqOptionKey, string>> = {};
  for (; i < lines.length; i++) {
    const l = lines[i];
    const m = l.match(/^([A-D])[).:]\s+(.*)$/);
    if (!m) break;
    options[m[1] as McqOptionKey] = m[2];
  }

  const correctLine = lines.find((l) => /^Correct Answer\s*:/i.test(l));
  const correct = correctLine?.match(/Correct Answer\s*:\s*([A-D])/i)?.[1] as McqOptionKey | undefined;

  if (!options.A || !options.B || !options.C || !options.D || !correct) return null;

  return {
    id,
    type: "mcq",
    question: questionLines.join(" ").trim(),
    options: options as Record<McqOptionKey, string>,
    correctAnswer: correct,
  };
};

const parseYesNoGrid = (block: string, id: string): QuizQuestion | null => {
  const cleaned = stripAfterMarkers(block);
  const lines = cleaned.split("\n");
  const idxCorrect = lines.findIndex((l) => /Correct Answer\s*:/i.test(l));
  if (idxCorrect < 0) return null;

  const after = lines.slice(idxCorrect + 1);
  const boxRegex = /^\s*Box\s*(\d+)\s*:\s*(Yes|No)\s*-/i;

  const boxes: Array<{ box: number; value: "Yes" | "No"; statement: string }> = [];
  let current: { box: number; value: "Yes" | "No"; statementLines: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    const statement = current.statementLines.join(" ").replace(/\s+/g, " ").trim();
    boxes.push({ box: current.box, value: current.value, statement });
    current = null;
  };

  for (const raw of after) {
    const line = raw.replace(/\r/g, "");
    if (!line.trim()) continue;
    if (/^Reference(s)?\s*:/i.test(line)) break;
    if (/^Question\s*#\d+/i.test(line)) break;

    const m = line.match(boxRegex);
    if (m) {
      flush();
      current = {
        box: Number(m[1]),
        value: (m[2].toLowerCase() === "yes" ? "Yes" : "No"),
        statementLines: [line.replace(boxRegex, "").trim()].filter(Boolean),
      };
      continue;
    }

    if (current) current.statementLines.push(line.trim());
  }
  flush();

  if (boxes.length < 2) return null;

  const promptLines = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const questionLineIdx = promptLines.findIndex((l) => /HOTSPOT/i.test(l));
  const questionTextStart = questionLineIdx >= 0 ? questionLineIdx + 1 : 0;
  const questionText = promptLines
    .slice(questionTextStart)
    .filter((l) => !/^Correct Answer\s*:/i.test(l))
    .join(" ")
    .trim();

  return {
    id,
    type: "yesno",
    question: questionText || "Select Yes/No for each statement.",
    statements: boxes.map((b) => b.statement).filter(Boolean),
    correct: boxes.map((b) => b.value),
  };
};

const parseMatching = (block: string, id: string): QuizQuestion | null => {
  const cleaned = stripAfterMarkers(block);
  const lines = cleaned.split("\n");
  const idxCorrect = lines.findIndex((l) => /Correct Answer\s*:/i.test(l));
  if (idxCorrect < 0) return null;

  const after = lines.slice(idxCorrect + 1);

  const pairs: Array<{ left: string; right: string }> = [];
  let currentLeft: string | null = null;
  let currentRightLines: string[] = [];

  const flush = () => {
    if (!currentLeft) return;
    const right = currentRightLines.join(" ").replace(/\s+/g, " ").trim();
    if (currentLeft.trim() && right) pairs.push({ left: currentLeft.trim(), right });
    currentLeft = null;
    currentRightLines = [];
  };

  for (const raw of after) {
    const line = raw.replace(/\r/g, "");
    if (/^Reference(s)?\s*:/i.test(line)) break;
    if (/^Question\s*#\d+/i.test(line)) break;

    const m = line.match(/^\s*Box\s*\d+\s*:\s*(.*)$/i);
    if (m) {
      flush();
      currentLeft = m[1].trim();
      continue;
    }

    if (currentLeft) {
      if (!line.trim()) continue;
      currentRightLines.push(line.trim());
    }
  }
  flush();

  if (pairs.length < 2) return null;

  const promptLines = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const questionLineIdx = promptLines.findIndex((l) => /DRAG\s*DROP/i.test(l));
  const questionTextStart = questionLineIdx >= 0 ? questionLineIdx + 1 : 0;
  const questionText = promptLines
    .slice(questionTextStart)
    .filter((l) => !/^Correct Answer\s*:/i.test(l))
    .join(" ")
    .trim();

  return {
    id,
    type: "matching",
    question: questionText || "Match the items.",
    pairs,
  };
};

export const parseQuestionBank = (combinedContent: string): QuizQuestion[] => {
  const blocks = splitQuestionBlocks(combinedContent);
  const out: QuizQuestion[] = [];

  for (const b of blocks) {
    const header = b.match(/Question\s*#(\d+)/i)?.[1];
    const id = `q_${header ?? hashString(b)}`;

    if (/\bHOTSPOT\b/i.test(b)) {
      const q = parseYesNoGrid(b, id);
      if (q) out.push(q);
      continue;
    }

    if (/\bDRAG\s*DROP\b/i.test(b)) {
      const q = parseMatching(b, id);
      if (q) out.push(q);
      continue;
    }

    const mcq = parseMcq(b, id);
    if (mcq) out.push(mcq);
  }

  return out;
};
