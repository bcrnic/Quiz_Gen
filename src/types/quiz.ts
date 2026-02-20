export interface QuizQuestion {
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: "A" | "B" | "C" | "D";
  explanation?: string;
}

export interface QuizResult {
  id: string;
  date: string;
  fileName: string;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  questions: QuizQuestion[];
  userAnswers: (string | null)[];
}

export type Difficulty = "easy" | "medium" | "hard";
