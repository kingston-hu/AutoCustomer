/**
 * AI Router — Multi-model routing with fallback
 * Automatically selects the best model for each task type,
 * with automatic fallback on failure.
 *
 * [v2 性能优化]
 * - 任务级 max_tokens（文案 1024 vs 默认 4096）
 * - AbortController 超时控制（单次调用 ≤30s）
 * - 流式优先策略（短文本生成更快）
 * - 简化稳定端点的重试链
 */

import { AI_PROVIDERS, TASK_ROUTING } from "./providers/types";
import type { AiModelType, AiProviderConfig } from "./providers/types";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiGenerateOptions {
  taskType: AiModelType;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  /** 流式优先模式 — 对短文本生成更快，默认 false */
  preferStream?: boolean;
  /** 单次 API 调用超时(ms)，默认 30000 */
  timeoutMs?: number;
}

export interface AiGenerateResult {
  content: string;
  model: string;
  provider: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * 每种任务类型推荐的最大输出 token 数
 * 文案只需 ~200 字 ≈ 300-400 tokens，不需要等模型跑到 4096
 */
const TASK_MAX_TOKENS: Record<AiModelType, number> = {
  copywriting: 1024,
  reasoning: 4096,
  chinese: 2048,
  analysis: 2048,
  classification: 1024,
  summarize: 1024,
  "reply-suggestion": 1024,
  vision: 2048,
  chat: 2048,
};

class AiRouter {
  private cache = new Map<string, AiProviderConfig>();

  getProvider(name: string): AiProviderConfig | undefined {
    return AI_PROVIDERS[name];
  }

  /**
   * Generate completion with automatic provider selection and fallback
   */
  async generate(options: AiGenerateOptions): Promise<AiGenerateResult> {
    const routing = TASK_ROUTING[options.taskType] || TASK_ROUTING.analysis;
    const providersToTry = [routing.provider, ...(routing.fallback || [])];

    // 根据任务类型自动设置合理的 max_tokens
    const effectiveMaxTokens = options.maxTokens ?? TASK_MAX_TOKENS[options.taskType] ?? 2048;

    let lastError: Error | null = null;

    for (const providerName of providersToTry) {
      const provider = AI_PROVIDERS[providerName];
      if (!provider) continue;

      const apiKey = process.env[provider.apiKeyEnv];
      if (!apiKey) {
        console.log(`[AI Router] Skipping ${providerName}: no API key (${provider.apiKeyEnv})`);
        continue;
      }

      try {
        const result = await this.callProvider(provider, { ...options, maxTokens: effectiveMaxTokens }, apiKey);
        return result;
      } catch (error) {
        lastError = error as Error;
        console.error(`[AI Router] ${providerName} failed:`, error);
      }
    }

    throw new Error(
      `All AI providers failed. Last error: ${lastError?.message}`
    );
  }

  private async callProvider(
    provider: AiProviderConfig,
    options: AiGenerateOptions,
    apiKey: string
  ): Promise<AiGenerateResult> {
    const modelName =
      provider.models[options.taskType] || provider.models.default || "gpt-4o-mini";

    const timeoutMs = options.timeoutMs ?? 30000; // 30s 超时

    // 内部辅助：执行一次 API 调用
    const doCall = async (useJsonMode: boolean, useStream: boolean = false): Promise<AiGenerateResult> => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const requestBody: Record<string, any> = {
          model: modelName,
          messages: options.messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? TASK_MAX_TOKENS[options.taskType] ?? 2048,
        };

        // jsonMode 只在非流式模式下加（很多聚合平台 stream+json_format 冲突）
        if (options.jsonMode && useJsonMode && !useStream) {
          requestBody.response_format = { type: "json_object" };
        }

        // 流式模式开关
        if (useStream) {
          requestBody.stream = true;
        }

        const response = await fetch(`${provider.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(
            `${provider.name} API error ${response.status}: ${errorBody}`
          );
        }

        // ===== 流式模式：从 SSE chunks 中组装内容 =====
        if (useStream) {
          let fullContent = "";
          let usageData: any = undefined;

          try {
            const reader = response.body?.getReader();
            if (!reader) {
              throw new Error("Response body is not readable for streaming");
            }
            const decoder = new TextDecoder();

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split("\n");

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === "data: [DONE]") continue;
                if (!trimmed.startsWith("data: ")) continue;

                try {
                  const json = JSON.parse(trimmed.slice(6));
                  const delta = json.choices?.[0]?.delta?.content;
                  if (delta) {
                    fullContent += delta;
                  }
                  if (json.usage && !usageData) {
                    usageData = json.usage;
                  }
                } catch {
                  // 跳过无法解析的行
                }
              }
            }
          } catch (streamError) {
            console.error(`[AI Router] Stream parsing error:`, streamError);
            throw streamError;
          }

          console.log(`[AI Router] ${provider.name} [stream=${useStream}] model=${modelName}, streamed_content_length=${fullContent.length}`);

          return {
            content: fullContent,
            model: modelName,
            provider: provider.name,
            usage: usageData
              ? {
                  promptTokens: usageData.prompt_tokens,
                  completionTokens: usageData.completion_tokens,
                  totalTokens: usageData.total_tokens,
                }
              : undefined,
          };
        }

        // ===== 非流式模式：普通 JSON 响应 =====
        const data = await response.json();

        // 多路径提取 content（兼容各种聚合平台/代理的非标准响应结构）
        const rawContent =
          data.choices?.[0]?.message?.content          // 标准 OpenAI 格式
          || data.choices?.[0]?.text                   // 某些代理格式
          || data.output                               // 某些平台格式
          || data.content                              // 顶层 content
          || (typeof data.choices?.[0]?.message === "string" ? data.choices[0].message : null)
          || "";

        console.log(`[AI Router] ${provider.name} [jsonMode=${useJsonMode}] model=${data.model}, content_length=${rawContent.length ?? "null"}`);

        // Debug: 如果 content 为空但 completion_tokens > 0，说明平台吞了内容
        if ((!rawContent || rawContent.trim().length === 0) && (data.usage?.completion_tokens ?? 0) > 0) {
          console.error(`[AI Router] ❌ ${provider.name} [jsonMode=${useJsonMode}] BUG: completion_tokens=${data.usage.completion_tokens} but NO content!`);
          try {
            const fs = await import("fs");
            const path = await import("path");
            const debugDir = path.join(process.cwd(), "debug-ai-responses");
            if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
            const ts = new Date().toISOString().replace(/[:.]/g, "-");
            fs.writeFileSync(
              path.join(debugDir, `api-response-${provider.name.replace(/[^a-zA-Z0-9]/g, "_")}-${useJsonMode ? "json" : "plain"}-${ts}.json`),
              JSON.stringify(data, null, 2),
              "utf-8"
            );
          } catch {/* ignore */}
          return {
            content: "",
            model: data.model || modelName,
            provider: provider.name,
            usage: undefined,
          };
        }

        return {
          content: rawContent || "",
          model: data.model,
          provider: provider.name,
          usage: data.usage
            ? {
                promptTokens: data.usage.prompt_tokens,
                completionTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens,
              }
            : undefined,
        };
      } catch (err: any) {
        clearTimeout(timer);
        if (err?.name === "AbortError") {
          throw new Error(`${provider.name} timed out after ${timeoutMs}ms`);
        }
        throw err;
      }
    };

    // ===== 调用策略链 =====

    // [优化] 短文本任务 + preferStream：直接走流式（最快路径）
    if (options.preferStream) {
      console.log(`[AI Router] 🚀 ${provider.name} STREAM-FIRST mode for ${options.taskType}`);
      try {
        const result = await doCall(false, true);
        if (result.content && result.content.trim().length > 0) {
          return result;
        }
        console.warn(`[AI Router] ⚠️ ${provider.name} stream-first returned empty, trying non-stream...`);
      } catch (e) {
        console.warn(`[AI Router] ⚠️ ${provider.name} stream-first failed: ${(e as Error).message}, falling back...`);
      }
      // 流式失败回退到非流式（只试 1 次，不再 3 重试）
      return doCall(false, false);
    }

    // 策略 1: 如果请求了 jsonMode，先试带 response_format 的非流式调用
    if (options.jsonMode) {
      try {
        const result = await doCall(true, false);
        if (result.content && result.content.trim().length > 0) {
          return result;
        }
      } catch (e) {
        console.warn(`[AI Router] ⚠️ ${provider.name} jsonMode call failed: ${(e as Error).message}`);
      }
      // 策略 2: 去掉 response_format 重试（非流式）
      try {
        const result = await doCall(false, false);
        if (result.content && result.content.trim().length > 0) {
          return result;
        }
      } catch (e) {
        console.warn(`[AI Router] ⚠️ ${provider.name} non-json call failed: ${(e as Error).message}`);
      }
      // 策略 3: 流式兜底
      try {
        const streamResult = await doCall(false, true);
        if (streamResult.content && streamResult.content.trim().length > 0) {
          console.log(`[AI Router] ✅ ${provider.name} STREAM fallback succeeded! Got ${streamResult.content.length} chars`);
          return streamResult;
        }
      } catch (streamError) {
        console.error(`[AI Router] ❌ ${provider.name} STREAM fallback failed:`, streamError);
      }
      return { content: "", model: modelName, provider: provider.name };
    }

    // 非 jsonMode 模式
    // 策略 A: 非流式
    try {
      const result = await doCall(false, false);
      if (result.content && result.content.trim().length > 0) {
        return result;
      }
    } catch (e) {
      console.warn(`[AI Router] ⚠️ ${provider.name} non-stream failed: ${(e as Error).message}, trying stream...`);
    }

    // 策略 B: 流式兜底
    try {
      const streamResult = await doCall(false, true);
      if (streamResult.content && streamResult.content.trim().length > 0) {
        return streamResult;
      }
    } catch (streamError) {
      console.error(`[AI Router] ❌ ${provider.name} STREAM fallback failed:`, streamError);
    }

    return { content: "", model: modelName, provider: provider.name };
  }

  /**
   * Quick helper: generate a single user message with system prompt
   */
  async quickGenerate(
    systemPrompt: string,
    userPrompt: string,
    taskType: AiModelType = "analysis"
  ): Promise<string> {
    const result = await this.generate({
      taskType,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    return result.content;
  }

  /**
   * Check which providers are configured (have API keys)
   */
  getAvailableProviders(): { name: string; available: boolean }[] {
    return Object.entries(AI_PROVIDERS).map(([key, provider]) => ({
      name: provider.name,
      available: !!process.env[provider.apiKeyEnv],
    }));
  }
}

// Singleton
export const aiRouter = new AiRouter();
