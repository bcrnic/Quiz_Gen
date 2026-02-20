import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get("origin");

  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-api-version, x-supabase-client-info, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { textContent, questionCount, difficulty } = await req.json();

    if (!textContent || textContent.trim().length < 50) {
      return new Response(
        JSON.stringify({ error: "Text content is too short. Please provide more study material." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

    const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

    const truncatedContent = textContent.slice(0, 15000);
    const count = questionCount || 20;
    const diff = difficulty || "medium";

    const systemPrompt = `You are a quiz generator. Given study material, generate exactly ${count} multiple-choice questions.

Rules:
- Difficulty: ${diff}
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

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a quiz from this study material:\n\n${truncatedContent}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate quiz");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content || typeof content !== "string") {
      throw new Error("No quiz data returned from AI");
    }

    let quizData: unknown;
    try {
      quizData = JSON.parse(content);
    } catch (_e) {
      throw new Error("AI response was not valid JSON");
    }

    return new Response(JSON.stringify(quizData), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-quiz error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
