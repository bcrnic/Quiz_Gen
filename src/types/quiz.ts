export type QuestionId = string;

export type McqOptionKey = "A" | "B" | "C" | "D";

export type QuizQuestion =
  | {
      id: QuestionId;
      type: "mcq";
      question: string;
      options: Record<McqOptionKey, string>;
      correctAnswer: McqOptionKey;
      explanation?: string;
    }
  | {
      id: QuestionId;
      type: "yesno";
      question: string;
      statements: string[];
      correct: ("Yes" | "No")[];
      explanation?: string;
    }
  | {
      id: QuestionId;
      type: "matching";
      question: string;
      pairs: Array<{ left: string; right: string }>;
      explanation?: string;
    };

export type QuizAnswer =
  | { type: "mcq"; answer: McqOptionKey | null }
  | { type: "yesno"; answers: ("Yes" | "No" | null)[] }
  | { type: "matching"; matches: Array<number | null> };

export interface QuizResult {
  id: string;
  date: string;
  fileName: string;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  questions: QuizQuestion[];
  userAnswers: QuizAnswer[];
}

export type Difficulty = "easy" | "medium" | "hard";
