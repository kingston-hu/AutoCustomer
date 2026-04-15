/**
 * AI Provider Types & Configuration
 * Multi-model routing: OpenAI (GPT-5.4) / DeepSeek / Qwen / 智谱AI
 * Supports custom base URL (API aggregation platforms)
 */

export type AiModelType =
  | "copywriting"      // 文案生成 - GLM-5
  | "reasoning"        // 推理分析 - GPT-5.4
  | "chinese"          // 中文任务 - GPT-5.4
  | "analysis"         // 数据分析 - GPT-5.4-mini (fast)
  | "classification"   // 分类任务 - GPT-5.4-mini (cost-effective)
  | "summarize"        // 摘要生成 - GPT-5.4-mini
  | "reply-suggestion" // 回复建议 - GLM-5
  | "vision"           // 视觉理解 - GLM-4V Plus (智谱)
  | "chat"             // 通用对话 - GPT-5.4

export interface AiProviderConfig {
  name: string;
  provider: "openai" | "deepseek" | "qwen" | "zhipu";
  baseUrl: string;
  apiKeyEnv: string;                    // 对应 .env 变量名
  models: Record<string, string>;       // taskType -> modelName 映射
}

// Default routing configuration
export const AI_PROVIDERS: Record<string, AiProviderConfig> = {
  openai: {
    name: "OpenAI (GPT-5.4)",
    provider: "openai",
    // 支持通过 OPENAI_BASE_URL 环境变量覆盖（用于 API 聚合平台）
    baseUrl: (() => process.env.OPENAI_BASE_URL || "https://api.openai.com/v1")(),
    apiKeyEnv: "OPENAI_API_KEY",
    models: {
      copywriting: "gpt-5.4",
      reasoning: "gpt-5.4",
      chinese: "gpt-5.4",
      analysis: "gpt-5.4-mini",
      classification: "gpt-5.4-mini",
      summarize: "gpt-5.4-mini",
      "reply-suggestion": "gpt-5.4",
      chat: "gpt-5.4",
      vision: "gpt-5.4",           // GPT-5.4 也支持视觉
      default: "gpt-5.4",
    },
  },
  deepseek: {
    name: "DeepSeek",
    provider: "deepseek",
    baseUrl: "https://api.deepseek.com/v1",
    apiKeyEnv: "DEEPSEEK_API_KEY",
    models: {
      reasoning: "deepseek-reasoner",
      classification: "deepseek-chat",
      default: "deepseek-chat",
    },
  },
  qwen: {
    name: "通义千问",
    provider: "qwen",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKeyEnv: "QWEN_API_KEY",
    models: {
      chinese: "qwen-plus",
      default: "qwen-plus",
    },
  },
  zhipu: {
    name: "智谱AI",
    provider: "zhipu",
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    apiKeyEnv: "ZHIPU_API_KEY",
    models: {
      vision: "glm-4v-plus",
      chat: "glm-4-plus",
      reasoning: "glm-4-plus",
      copywriting: "glm-4-plus",
      analysis: "glm-4-flash",
      classification: "glm-4-flash",
      summarize: "glm-4-flash",
      default: "glm-4-plus",
    },
  },
  glm5: {
    name: "GLM-5 (聚合平台)",
    provider: "openai", // OpenAI 兼容接口
    baseUrl: (() => process.env.GLM5_BASE_URL || "https://pucn.lifesecretary.com:9000/v1")(),
    apiKeyEnv: "GLM5_API_KEY",
    models: {
      copywriting: "glm-5",
      "reply-suggestion": "glm-5",
      reasoning: "glm-5",
      chinese: "glm-5",
      analysis: "glm-5",
      classification: "glm-5",
      summarize: "glm-5",
      chat: "glm-5",
      vision: "glm-5",
      default: "glm-5",
    },
  },
};

// Task type -> provider mapping
// 文案/回复走 GLM-5，其他任务走 OpenAI (聚合平台 GPT-5.4)，视觉任务保留智谱 GLM-4V
export const TASK_ROUTING: Record<AiModelType, { provider: string; fallback?: string[] }> = {
  copywriting:       { provider: "glm5", fallback: ["openai", "zhipu"] },
  reasoning:         { provider: "openai" },
  chinese:           { provider: "openai" },
  analysis:          { provider: "openai" },
  classification:    { provider: "openai" },
  summarize:         { provider: "openai" },
  "reply-suggestion": { provider: "glm5", fallback: ["openai"] },
  vision:            { provider: "zhipu" },      // 视觉任务保留智谱 GLM-4V
  chat:              { provider: "openai" },
};
