import { NextRequest, NextResponse } from "next/server";
import { aiRouter } from "@/services/ai/router";
import {
  outreachMessagePrompt,
  OUTREACH_COPYWRITING_SYSTEM,
  replySuggestionPrompt,
  REPLY_SUGGESTION_SYSTEM,
  coldOutreachPrompt,
  COLD_OUTREACH_SYSTEM,
} from "@/services/ai/prompts/templates";

/**
 * POST /api/ai/generate — AI generate content (outreach messages / replies)
 * Body: { type: "outreach" | "reply" | "cold-outreach", data: {...} }
 */
export async function POST(request: NextRequest) {
  try {
    const { type, data } = await request.json();

    if (!type) {
      return NextResponse.json({ error: "type is required (outreach/reply/cold-outreach)" }, { status: 400 });
    }

    let result;

    switch (type) {
      case "outreach": {
        // Generate personalized outreach message for a developer
        result = await aiRouter.generate({
          taskType: "copywriting",
          messages: [
            { role: "system", content: OUTREACH_COPYWRITING_SYSTEM },
            {
              role: "user",
              content: outreachMessagePrompt({
                developerName: data.developerName || "开发者",
                developerHighlights: data.highlights || "",
                callToAction: data.callToAction || "期待你的回复",
                tone: data.tone || "professional",
                customOutline: data.customOutline || "", // 用户自定义大纲
              }),
            },
          ],
          temperature: 0.8,
          jsonMode: !data.customOutline, // 有自定义大纲时不强制 JSON 模式
          preferStream: true,            // [性能] 短文本生成走流式优先
        });
        break;
      }

      case "reply": {
        // Generate reply suggestion
        result = await aiRouter.generate({
          taskType: "reply-suggestion",
          messages: [
            { role: "system", content: REPLY_SUGGESTION_SYSTEM },
            {
              role: "user",
              content: replySuggestionPrompt(data.message || "", {
                developerOrLeadName: data.name || "对方",
                stage: data.stage || "CONTACTED",
                previousContext: data.previousContext,
              }),
            },
          ],
          temperature: 0.6,
          jsonMode: true,
        });
        break;
      }

      case "cold-outreach": {
        // Generate B2B cold outreach for leads
        result = await aiRouter.generate({
          taskType: "copywriting",
          messages: [
            { role: "system", content: COLD_OUTREACH_SYSTEM },
            {
              role: "user",
              content: coldOutreachPrompt({
                companyName: data.companyName || "",
                contactName: data.contactName,
                industry: data.industry,
                category: data.category || "OTHER",
                painPoints: Array.isArray(data.painPoints) ? data.painPoints : [],
                approach: data.approach || "email",
              }),
            },
          ],
          temperature: 0.8,
          jsonMode: true,
        });
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
    }

/**
 * Strip markdown code fence wrapping (```json ... ```)
 * GLM-5 sometimes wraps output in markdown code blocks
 */
function stripMarkdownFence(text: string): string {
  let cleaned = text.trim();
  // Remove ```json or ``` or other language tags at start
  cleaned = cleaned.replace(/^```\w*\s*\n?/i, "");
  // Remove ``` at end
  cleaned = cleaned.replace(/\n?```\s*$/i, "");
  // Also handle cases where there are multiple code blocks - take inner content
  const match = cleaned.match(/```\w*\s*\n?([\s\S]*?)\n?```\s*/i);
  if (match) {
    cleaned = match[1];
  }
  return cleaned.trim();
}

// Parse JSON response — with robust handling of various formats
function parseAiContent(rawContent: string): any {
  // Step 0: Strip markdown code fences from raw text
  let content = stripMarkdownFence(rawContent);

  // Step 1: Try direct JSON parse
  try {
    return JSON.parse(content);
  } catch { /* not valid top-level JSON */ }

  // Step 2: Extract JSON object from within text (handles "Here is the result:\n{...}")
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      // Recursively clean string values that might contain nested markdown
      if (parsed.raw && typeof parsed.raw === "string") {
        parsed.raw = stripMarkdownFence(parsed.raw);
        // If raw itself looks like JSON, try to re-parse it
        try {
          const innerParsed = JSON.parse(parsed.raw);
          if (innerParsed.subject || innerParsed.body) {
            return innerParsed;
          }
        } catch { /* keep as raw */ }
      }
      return parsed;
    } catch { /* invalid json inside */ }
  }

  // Step 3: Return as raw text
  return { raw: content };
}

    // Parse JSON response
    const parsed = parseAiContent(result.content);

    return NextResponse.json({
      content: parsed,
      model: `${result.provider} / ${result.model}`,
      usage: result.usage,
    });
  } catch (error) {
    console.error("[POST /api/ai/generate] error:", error);
    return NextResponse.json(
      { error: `AI generation failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
