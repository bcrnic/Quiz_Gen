export type QuizDifficulty = "easy" | "medium" | "hard";
export type McqOptionKey = "A" | "B" | "C" | "D";

export interface NormalizedGenerateQuizInput {
  truncatedContent: string;
  questionCount: number;
  difficulty: QuizDifficulty;
}

export interface GeneratedQuestion {
  question: string;
  options: Record<McqOptionKey, string>;
  correctAnswer: McqOptionKey;
  explanation: string;
}

export interface GeneratedQuiz {
  questions: GeneratedQuestion[];
}

const MAX_TEXT_LENGTH = 15000;
const MIN_TEXT_LENGTH = 50;
const MIN_QUESTION_COUNT = 1;
const MAX_QUESTION_COUNT = 50;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const normalizeGenerateQuizInput = (payload: unknown): NormalizedGenerateQuizInput => {
  if (!isObject(payload)) {
    throw new Error("Invalid request body");
  }

  const rawText = payload.textContent;
  if (typeof rawText !== "string" || rawText.trim().length < MIN_TEXT_LENGTH) {
    throw new Error("Text content is too short. Please provide more study material.");
  }

  const rawQuestionCount = payload.questionCount;
  const questionCount = rawQuestionCount === undefined ? 20 : Number(rawQuestionCount);
  if (!Number.isInteger(questionCount) || questionCount < MIN_QUESTION_COUNT || questionCount > MAX_QUESTION_COUNT) {
    throw new Error("questionCount must be an integer between 1 and 50");
  }

  const rawDifficulty = payload.difficulty;
  const difficulty = (typeof rawDifficulty === "string" ? rawDifficulty.toLowerCase() : "medium") as QuizDifficulty;
  if (difficulty !== "easy" && difficulty !== "medium" && difficulty !== "hard") {
    throw new Error("difficulty must be one of: easy, medium, hard");
  }

  return {
    truncatedContent: rawText.slice(0, MAX_TEXT_LENGTH),
    questionCount,
    difficulty,
  };
};

export const buildSystemPrompt = (questionCount: number, difficulty: QuizDifficulty) => {
  return `You are a quiz generator. Given study material, generate exactly ${questionCount} multiple-choice questions.

Rules:
- Difficulty: ${difficulty}
- Each question has exactly 4 options (A, B, C, D)
- Exactly 1 correct answer per question
- For each question, provide a brief explanation (1-2 sentences) of why the correct answer is correct
- Questions should test comprehension, recall, and understanding
- Mix question types: factual recall, definitions, concepts, relationships
- Write questions AND explanations in the same language as the source material
- Make wrong answers plausible but clearly incorrect

Return ONLY valid JSON (no markdown, no extra text) with this shape:
{
  "questions": [
    {
      "question": string,
      "options": { "A": string, "B": string, "C": string, "D": string },
      "correctAnswer": "A"|"B"|"C"|"D",
      "explanation": string
    }
  ]
}`;
};

export const extractAssistantContent = (data: unknown): string => {
  if (!isObject(data)) {
    throw new Error("No quiz data returned from AI");
  }

  const choices = data.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error("No quiz data returned from AI");
  }

  const first = choices[0];
  if (!isObject(first) || !isObject(first.message) || typeof first.message.content !== "string") {
    throw new Error("No quiz data returned from AI");
  }

  return first.message.content;
};

export const parseAndValidateQuiz = (content: string): GeneratedQuiz => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (_e) {
    throw new Error("AI response was not valid JSON");
  }

  if (!isObject(parsed) || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw new Error("AI response did not include any questions");
  }

  const questions: GeneratedQuestion[] = parsed.questions.map((q) => validateQuestion(q));
  return { questions };
};

const validateQuestion = (question: unknown): GeneratedQuestion => {
  if (!isObject(question)) {
    throw new Error("AI response contained an invalid question");
  }

  if (typeof question.question !== "string" || question.question.trim().length === 0) {
    throw new Error("AI response contained a question with missing text");
  }

  if (!isObject(question.options)) {
    throw new Error("AI response contained a question with invalid options");
  }

  const options = question.options;
  const keys: McqOptionKey[] = ["A", "B", "C", "D"];
  for (const key of keys) {
    if (typeof options[key] !== "string" || options[key].trim().length === 0) {
      throw new Error("AI response contained a question with incomplete options");
    }
  }

  const correctAnswer = question.correctAnswer;
  if (correctAnswer !== "A" && correctAnswer !== "B" && correctAnswer !== "C" && correctAnswer !== "D") {
    throw new Error("AI response contained a question with an invalid correct answer");
  }

  if (typeof question.explanation !== "string" || question.explanation.trim().length === 0) {
    throw new Error("AI response contained a question with missing explanation");
  }

  return {
    question: question.question,
    options: {
      A: options.A,
      B: options.B,
      C: options.C,
      D: options.D,
    },
    correctAnswer,
    explanation: question.explanation,
  };
};
