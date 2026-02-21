import { describe, expect, it } from "vitest";
import { buildQuestionBankId, parseQuestionBank } from "@/lib/questionBank";

describe("buildQuestionBankId", () => {
  it("returns the same id for equivalent content with CRLF differences", () => {
    const a = "Question #1\r\nWhat is 2+2?\r\nA) 3\r\nB) 4\r\nC) 5\r\nD) 6\r\nCorrect Answer: B";
    const b = "Question #1\nWhat is 2+2?\nA) 3\nB) 4\nC) 5\nD) 6\nCorrect Answer: B";

    expect(buildQuestionBankId(a)).toBe(buildQuestionBankId(b));
  });
});

describe("parseQuestionBank", () => {
  it("parses a standard MCQ question", () => {
    const content = [
      "Question #1",
      "MCQ",
      "What is the capital of France?",
      "A) Berlin",
      "B) Madrid",
      "C) Paris",
      "D) Rome",
      "Correct Answer: C",
    ].join("\n");

    const parsed = parseQuestionBank(content);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      id: "q_1",
      type: "mcq",
      question: "What is the capital of France?",
      options: {
        A: "Berlin",
        B: "Madrid",
        C: "Paris",
        D: "Rome",
      },
      correctAnswer: "C",
    });
  });

  it("parses HOTSPOT yes/no blocks", () => {
    const content = [
      "Question #2",
      "HOTSPOT",
      "Select Yes or No for each statement.",
      "Correct Answer:",
      "Box 1: Yes - Earth revolves around the Sun.",
      "Box 2: No - Humans can breathe in space without equipment.",
    ].join("\n");

    const parsed = parseQuestionBank(content);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      id: "q_2",
      type: "yesno",
      statements: [
        "Earth revolves around the Sun.",
        "Humans can breathe in space without equipment.",
      ],
      correct: ["Yes", "No"],
    });
  });

  it("parses DRAG DROP matching blocks", () => {
    const content = [
      "Question #3",
      "DRAG DROP",
      "Match each country with its capital.",
      "Correct Answer:",
      "Box 1: France",
      "Paris",
      "Box 2: Serbia",
      "Belgrade",
    ].join("\n");

    const parsed = parseQuestionBank(content);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      id: "q_3",
      type: "matching",
      pairs: [
        { left: "France", right: "Paris" },
        { left: "Serbia", right: "Belgrade" },
      ],
    });
  });

  it("parses multiple question types from one combined document", () => {
    const content = [
      "Question #1",
      "MCQ",
      "2 + 2 = ?",
      "A) 3",
      "B) 4",
      "C) 5",
      "D) 6",
      "Correct Answer: B",
      "",
      "Question #2",
      "HOTSPOT",
      "Mark each statement.",
      "Correct Answer:",
      "Box 1: Yes - Sky appears blue.",
      "Box 2: No - Fish live on trees.",
    ].join("\n");

    const parsed = parseQuestionBank(content);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].id).toBe("q_1");
    expect(parsed[1].id).toBe("q_2");
  });

  it("ignores trailing reference/comment sections", () => {
    const content = [
      "Question #10",
      "MCQ",
      "What color is the sky on a clear day?",
      "A) Green",
      "B) Blue",
      "C) Red",
      "D) Black",
      "Correct Answer: B",
      "References:",
      "Some long source list that should be ignored",
    ].join("\n");

    const parsed = parseQuestionBank(content);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      type: "mcq",
      correctAnswer: "B",
    });
  });

  it("skips malformed questions and keeps valid ones", () => {
    const content = [
      "Question #1",
      "MCQ",
      "Broken question without all options",
      "A) One",
      "B) Two",
      "Correct Answer: B",
      "",
      "Question #2",
      "MCQ",
      "Valid question",
      "A) One",
      "B) Two",
      "C) Three",
      "D) Four",
      "Correct Answer: C",
    ].join("\n");

    const parsed = parseQuestionBank(content);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe("q_2");
  });
});
