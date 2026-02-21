import { describe, expect, it } from "vitest";
import {
  buildSystemPrompt,
  extractAssistantContent,
  normalizeGenerateQuizInput,
  parseAndValidateQuiz,
} from "../../supabase/functions/generate-quiz/logic";

describe("generate-quiz edge logic", () => {
  describe("normalizeGenerateQuizInput", () => {
    it("normalizes defaults and truncates very long text", () => {
      const longText = "A".repeat(20000);
      const result = normalizeGenerateQuizInput({ textContent: longText });

      expect(result.questionCount).toBe(20);
      expect(result.difficulty).toBe("medium");
      expect(result.truncatedContent).toHaveLength(15000);
    });

    it("accepts explicit questionCount and difficulty", () => {
      const result = normalizeGenerateQuizInput({
        textContent: "B".repeat(80),
        questionCount: 12,
        difficulty: "hard",
      });

      expect(result.questionCount).toBe(12);
      expect(result.difficulty).toBe("hard");
    });

    it("rejects invalid text/questionCount/difficulty", () => {
      expect(() => normalizeGenerateQuizInput({ textContent: "short" })).toThrow(/too short/i);
      expect(() => normalizeGenerateQuizInput({ textContent: "A".repeat(80), questionCount: 0 })).toThrow(/between 1 and 50/i);
      expect(() => normalizeGenerateQuizInput({ textContent: "A".repeat(80), difficulty: "expert" })).toThrow(/difficulty/i);
    });
  });

  describe("buildSystemPrompt", () => {
    it("embeds selected count and difficulty", () => {
      const prompt = buildSystemPrompt(15, "easy");
      expect(prompt).toContain("exactly 15 multiple-choice questions");
      expect(prompt).toContain("Difficulty: easy");
    });
  });

  describe("extractAssistantContent", () => {
    it("extracts content from chat completion response", () => {
      const content = extractAssistantContent({
        choices: [{ message: { content: "{\"questions\":[]}" } }],
      });
      expect(content).toBe("{\"questions\":[]}");
    });

    it("throws when content is missing", () => {
      expect(() => extractAssistantContent({ choices: [] })).toThrow(/No quiz data/i);
      expect(() => extractAssistantContent({})).toThrow(/No quiz data/i);
    });
  });

  describe("parseAndValidateQuiz", () => {
    it("accepts valid quiz JSON", () => {
      const json = JSON.stringify({
        questions: [
          {
            question: "2 + 2 = ?",
            options: { A: "1", B: "4", C: "6", D: "8" },
            correctAnswer: "B",
            explanation: "Basic arithmetic.",
          },
        ],
      });

      const parsed = parseAndValidateQuiz(json);
      expect(parsed.questions).toHaveLength(1);
      expect(parsed.questions[0].correctAnswer).toBe("B");
    });

    it("rejects malformed quiz payloads", () => {
      expect(() => parseAndValidateQuiz("not json")).toThrow(/valid JSON/i);
      expect(() => parseAndValidateQuiz(JSON.stringify({ questions: [] }))).toThrow(/include any questions/i);
      expect(() =>
        parseAndValidateQuiz(
          JSON.stringify({
            questions: [
              {
                question: "Q",
                options: { A: "1", B: "2", C: "3" },
                correctAnswer: "B",
                explanation: "ok",
              },
            ],
          }),
        ),
      ).toThrow(/incomplete options/i);
      expect(() =>
        parseAndValidateQuiz(
          JSON.stringify({
            questions: [
              {
                question: "Q",
                options: { A: "1", B: "2", C: "3", D: "4" },
                correctAnswer: "E",
                explanation: "ok",
              },
            ],
          }),
        ),
      ).toThrow(/invalid correct answer/i);
    });
  });
});
