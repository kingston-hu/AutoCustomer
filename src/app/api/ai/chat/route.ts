import { NextRequest } from "next/server";
import { AI_PROVIDERS } from "@/services/ai/providers/types";

/**
 * POST /api/ai/chat — 通用 AI 对话（支持流式输出）
 *
 * Body: {
 *   messages: Array<{ role: "system"|"user"|"assistant", content: string }>,
 *   model?: string,        // 模型ID，默认 "glm-4-plus"
 *   provider?: string,     // provider key (zhipu/openai/deepseek/qwen)，自动检测
 *   temperature?: number,
 *   maxTokens?: number,
 *   stream?: boolean,      // 默认 true（流式）
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages = [], model, provider: requestedProvider, temperature = 0.7, maxTokens = 4096, stream = true } = body;

    if (!messages.length || !messages.some((m: { role: string }) => m.role === "user")) {
      return Response.json({ error: "messages must contain at least one user message" }, { status: 400 });
    }

    // 确定使用的 provider
    let targetProvider = requestedProvider;
    
    // 如果指定了模型名，尝试匹配到 provider
    if (!targetProvider && model) {
      if (model.startsWith("glm-") || model.startsWith("glm")) {
        targetProvider = "zhipu";
      } else if (model.startsWith("deepseek")) {
        targetProvider = "deepseek";
      } else if (model.startsWith("gpt")) {
        targetProvider = "openai";
      } else if (model.startsWith("qwen")) {
        targetProvider = "qwen";
      }
    }

    // 默认使用 OpenAI (GPT-5.4)
    if (!targetProvider) targetProvider = "openai";

    const provConfig = AI_PROVIDERS[targetProvider];
    if (!provConfig) {
      return Response.json({ error: `Unknown provider: ${targetProvider}` }, { status: 400 });
    }

    const apiKey = process.env[provConfig.apiKeyEnv];
    if (!apiKey) {
      return Response.json(
        { error: `No API key for ${provConfig.name}. Set ${provConfig.apiKeyEnv} in .env` },
        { status: 401 }
      );
    }

    const modelId = model || provConfig.models.default || "gpt-5.4";

    // 调用 AI API
    const response = await fetch(`${provConfig.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[${provConfig.name} API] Error ${response.status}:`, errText);
      return Response.json(
        { error: `${provConfig.name} API error ${response.status}: ${errText.slice(0, 300)}` },
        { status: response.status }
      );
    }

    // 流式返回（SSE 格式）
    if (stream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream<Uint8Array>({
        async start(controller) {
          const reader = response.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              // value is already Uint8Array from fetch Response
              controller.enqueue(value);
            }
          } catch (err) {
            const errMsg = `\ndata: {"error":"${(err as Error).message}"}\n\n`;
            controller.enqueue(encoder.encode(errMsg));
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // 非流式模式
    const data = await response.json();
    return Response.json({
      content: data.choices?.[0]?.message?.content || "",
      model: data.model,
      provider: provConfig.name,
      usage: data.usage,
    });
  } catch (error) {
    console.error("[POST /api/ai/chat] error:", error);
    return Response.json(
      { error: `Chat failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai/chat — 返回可用模型列表和状态
 */
export async function GET() {
  const providers = Object.entries(AI_PROVIDERS).map(([key, p]) => ({
    id: key,
    name: p.name,
    available: !!process.env[p.apiKeyEnv],
    models: Object.values(new Set(Object.values(p.models))),
  }));

  return Response.json({ providers });
}
