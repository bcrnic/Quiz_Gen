import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentProps } from "react";
import ResultsView from "@/components/ResultsView";
import { LanguageProvider } from "@/i18n/LanguageContext";
import type { QuizAnswer, QuizQuestion } from "@/types/quiz";

const mocks = vi.hoisted(() => {
  return {
    useAuthMock: vi.fn(),
    insertMock: vi.fn(),
    fromMock: vi.fn(),
    toastError: vi.fn(),
    confettiMock: vi.fn(),
  };
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mocks.useAuthMock(),
}));

vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
  },
}));

vi.mock("canvas-confetti", () => ({
  default: (...args: unknown[]) => mocks.confettiMock(...args),
}));

vi.mock("jspdf", () => ({
  default: function MockJsPdf() {
    return {
      internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
      setFontSize: vi.fn(),
      setFont: vi.fn(),
      setTextColor: vi.fn(),
      text: vi.fn(),
      line: vi.fn(),
      addPage: vi.fn(),
      splitTextToSize: (t: string) => [t],
      setDrawColor: vi.fn(),
      save: vi.fn(),
    };
  },
}));

vi.mock("@/integrations/supabase/client", () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: (...args: unknown[]) => mocks.fromMock(...args),
  },
}));

const renderResults = (questions: QuizQuestion[], userAnswers: QuizAnswer[], props?: Partial<ComponentProps<typeof ResultsView>>) => {
  const defaultProps: ComponentProps<typeof ResultsView> = {
    questions,
    userAnswers,
    fileName: "test.txt",
    onNewQuiz: vi.fn(),
    onUploadNew: vi.fn(),
    onRetryWrong: vi.fn(),
  };

  return render(
    <LanguageProvider>
      <ResultsView {...defaultProps} {...props} />
    </LanguageProvider>,
  );
};

describe("ResultsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthMock.mockReturnValue({ user: { id: "u1" } });
    mocks.insertMock.mockResolvedValue({ error: null });
    mocks.fromMock.mockReturnValue({ insert: mocks.insertMock });
  });

  it("saves quiz result once even after rerender", async () => {
    const questions: QuizQuestion[] = [
      {
        id: "q1",
        type: "mcq",
        question: "2 + 2?",
        options: { A: "3", B: "4", C: "5", D: "6" },
        correctAnswer: "B",
      },
    ];
    const answers: QuizAnswer[] = [{ type: "mcq", answer: "B" }];

    const view = renderResults(questions, answers);
    await waitFor(() => expect(mocks.insertMock).toHaveBeenCalledTimes(1));

    view.rerender(
      <LanguageProvider>
        <ResultsView
          questions={questions}
          userAnswers={answers}
          fileName="test.txt"
          onNewQuiz={vi.fn()}
          onUploadNew={vi.fn()}
          onRetryWrong={vi.fn()}
        />
      </LanguageProvider>,
    );

    await waitFor(() => expect(mocks.insertMock).toHaveBeenCalledTimes(1));
  });

  it("shows correct mixed-type score", () => {
    const questions: QuizQuestion[] = [
      {
        id: "q1",
        type: "mcq",
        question: "Capital of France?",
        options: { A: "Paris", B: "Rome", C: "Madrid", D: "Berlin" },
        correctAnswer: "A",
      },
      {
        id: "q2",
        type: "yesno",
        question: "Mark",
        statements: ["Sky is blue", "Fish live on trees"],
        correct: ["Yes", "No"],
      },
      {
        id: "q3",
        type: "matching",
        question: "Match",
        pairs: [
          { left: "France", right: "Paris" },
          { left: "Serbia", right: "Belgrade" },
        ],
      },
    ];
    const answers: QuizAnswer[] = [
      { type: "mcq", answer: "A" },
      { type: "yesno", answers: ["Yes", "No"] },
      { type: "matching", matches: [1, 0] },
    ];

    renderResults(questions, answers);
    expect(screen.getByText("67%")).toBeInTheDocument();
    expect(screen.getByText("2/3 correct answers")).toBeInTheDocument();
  });

  it("calls retryWrong with only incorrect questions", () => {
    const onRetryWrong = vi.fn();
    const questions: QuizQuestion[] = [
      {
        id: "q1",
        type: "mcq",
        question: "Q1",
        options: { A: "a", B: "b", C: "c", D: "d" },
        correctAnswer: "A",
      },
      {
        id: "q2",
        type: "mcq",
        question: "Q2",
        options: { A: "a", B: "b", C: "c", D: "d" },
        correctAnswer: "B",
      },
    ];
    const answers: QuizAnswer[] = [
      { type: "mcq", answer: "C" },
      { type: "mcq", answer: "B" },
    ];

    renderResults(questions, answers, { onRetryWrong });
    fireEvent.click(screen.getByRole("button", { name: "Retry 1 Wrong Answer" }));

    expect(onRetryWrong).toHaveBeenCalledTimes(1);
    expect(onRetryWrong).toHaveBeenCalledWith([questions[0]]);
  });
});
