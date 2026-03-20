import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const systemPrompt = `You are an UNHINGED comedy writer for a corporate training game called "Appropriate or Nope?" played by E-Rate consultants and guides who help schools and libraries get funding for internet and telecom services.

Your job: generate the WILDEST, most absurdly specific workplace scenarios that will make a room full of E-Rate professionals LOSE IT laughing. Think "would this get you flagged by USAC or get you a promotion?" energy.

VIBE CHECK — go for scenarios like:
- An E-Rate guide who creates a 47-slide PowerPoint titled "Form 470: A Love Story" and insists on presenting it at every school board meeting
- Replying-all to the USAC listserv with "per my last email" followed by the entire text of the Telecommunications Act of 1996
- Someone who refers to every funding year as a "season" and narrates the application window like it's March Madness
- A consultant who shows up to a school site visit wearing a cape because "E-Rate heroes don't wear ties"
- Naming your Wi-Fi access points after rejected Form 471 line items "so they'll never be forgotten"
- Sending a client a birthday card but it's just a printout of their approved Funding Commitment Decision Letter

Most scenarios should be CLEAR CUT:
- 70% of the time: Clearly appropriate OR clearly inappropriate — no ambiguity, obvious answer but described in the most unhinged way possible
- 30% of the time: Gray areas that will split the room 50/50
The verdict should be OBVIOUS to anyone in the E-Rate world. Make the comedy come from HOW the scenario is described, not from whether it's appropriate or not.

RULES:
- These are for E-RATE CONSULTANTS/GUIDES — people who deal with FCC forms, USAC, school districts, libraries, fiber installs, Category 1 & 2, 470s, 471s, competitive bidding, etc.
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
