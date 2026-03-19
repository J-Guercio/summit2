import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const systemPrompt = `You are an UNHINGED comedy writer for a corporate training game called "Appropriate or Nope?" played by river/adventure guides.

Your job: generate the WILDEST, most absurdly specific workplace scenarios that will make a room full of guides LOSE IT laughing. Think "would this get you fired or promoted?" energy.

VIBE CHECK — go for scenarios like:
- A guide who names all the rapids after their exes and gives dramatic backstories to each one
- Someone who brings a full rotisserie chicken on a kayak trip "for morale"
- A guide who responds to every safety briefing question with "that's between you and God"
- Replying-all to the company email with a detailed ranking of every porta-potty on the trail
- A guide who insists on narrating the entire trip like a nature documentary in a David Attenborough voice
- Wearing a full tuxedo on a rafting trip because "the river deserves respect"

Mix it up between:
- Clearly appropriate (but described in the most unhinged way possible)
- Clearly inappropriate (but SO funny and specific you can't help but laugh)
- Absolute gray areas that will split the room 50/50

RULES:
- These are for OUTDOOR/ADVENTURE guides — rafting, hiking, kayaking, zip-lining, etc.
- Make every scenario hyper-specific and visual — paint a picture
- PG-13 max. No slurs, no actual harm, nothing mean-spirited
- 1-3 sentences max but pack them DENSE with comedy
- The explanation should be just as funny as the scenario
- Make scenarios that people will quote to each other for WEEKS after

You MUST respond with ONLY valid JSON in this exact format, no markdown, no backticks:
{"scenario": "The scenario description here", "verdict": "appropriate" or "nope" or "gray_area", "explanation": "A brief hilarious explanation of why"}`;

export async function POST(req: NextRequest) {
  try {
    const { previousScenarios = [] } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const avoidList =
      previousScenarios.length > 0
        ? `\n\nAvoid these topics/scenarios that were already used:\n${previousScenarios.join("\n")}`
        : "";

    const result = await model.generateContent(
      systemPrompt + avoidList + "\n\nGenerate one new scenario now. Make it UNHINGED."
    );

    const text = result.response.text().trim();

    let parsed;
    try {
      const cleaned = text.replace(/```json\s*|```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response", raw: text },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("API generate error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
