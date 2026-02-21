import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QuizView from "@/components/QuizView";
import { LanguageProvider } from "@/i18n/LanguageContext";
import type { QuizQuestion } from "@/types/quiz";

const renderQuiz = (
  questions: QuizQuestion[],
  onComplete: (answers: unknown[]) => void = vi.fn(),
  timeLimit: number | null = null,
) =>
  render(
    <LanguageProvider>
      <QuizView questions={questions} onComplete={onComplete} timeLimit={timeLimit} />
    </LanguageProvider>,
  );

describe("QuizView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handles MCQ flow and completes with selected answers", async () => {
    const onComplete = vi.fn();
    const questions: QuizQuestion[] = [
      {
        id: "q1",
        type: "mcq",
        question: "2 + 2 = ?",
        options: { A: "3", B: "4", C: "5", D: "6" },
        correctAnswer: "B",
      },
      {
        id: "q2",
        type: "mcq",
        question: "Capital of Serbia?",
        options: { A: "Belgrade", B: "Paris", C: "Rome", D: "Berlin" },
        correctAnswer: "A",
      },
    ];

    renderQuiz(questions, onComplete);

    fireEvent.click(screen.getByRole("button", { name: /B 4/i }));
    fireEvent.click(screen.getByRole("button", { name: "Next Question" }));
    fireEvent.click(screen.getByRole("button", { name: /A Belgrade/i }));
    fireEvent.click(screen.getByRole("button", { name: "See Results" }));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith([
        { type: "mcq", answer: "B" },
        { type: "mcq", answer: "A" },
      ]);
    });
  });

  it("supports keyboard shortcuts for MCQ selection and enter-to-next", async () => {
    const onComplete = vi.fn();
    const questions: QuizQuestion[] = [
      {
        id: "q1",
        type: "mcq",
        question: "Pick B",
        options: { A: "One", B: "Two", C: "Three", D: "Four" },
        correctAnswer: "B",
      },
      {
        id: "q2",
        type: "mcq",
        question: "Pick C",
        options: { A: "A", B: "B", C: "C", D: "D" },
        correctAnswer: "C",
      },
    ];

    renderQuiz(questions, onComplete);

    fireEvent.keyDown(window, { key: "2" });
    fireEvent.keyDown(window, { key: "Enter" });
    fireEvent.keyDown(window, { key: "c" });
    fireEvent.click(screen.getByRole("button", { name: "See Results" }));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith([
        { type: "mcq", answer: "B" },
        { type: "mcq", answer: "C" },
      ]);
    });
  });

  it("reveals and scores yes/no only after all statements are answered", async () => {
    const onComplete = vi.fn();
    const questions: QuizQuestion[] = [
      {
        id: "q1",
        type: "yesno",
        question: "Mark statements",
        statements: ["Sky is blue", "Fish can fly naturally"],
        correct: ["Yes", "No"],
      },
    ];

    renderQuiz(questions, onComplete);

    const yesButtons = screen.getAllByRole("button", { name: "Yes" });
    const noButtons = screen.getAllByRole("button", { name: "No" });

    fireEvent.click(yesButtons[0]);
    fireEvent.click(screen.getByRole("button", { name: "Next Question" }));
    expect(onComplete).not.toHaveBeenCalled();

    fireEvent.click(noButtons[1]);
    fireEvent.click(screen.getByRole("button", { name: "Next Question" }));
    fireEvent.click(screen.getByRole("button", { name: "See Results" }));

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith([
        { type: "yesno", answers: ["Yes", "No"] },
      ]);
    });
  });

  it("auto-completes when timer reaches zero", async () => {
    vi.useFakeTimers();
    try {
      const onComplete = vi.fn();
      const questions: QuizQuestion[] = [
        {
          id: "q1",
          type: "mcq",
          question: "Timed question",
          options: { A: "A", B: "B", C: "C", D: "D" },
          correctAnswer: "A",
        },
      ];

      renderQuiz(questions, onComplete, 0.02);

      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onComplete).toHaveBeenCalledWith([{ type: "mcq", answer: null }]);
    } finally {
      vi.useRealTimers();
    }
  });
});
