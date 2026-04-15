"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  Send,
  Sparkles,
  Code,
  MessageSquare,
  Settings2,
  Zap,
  Copy,
  RotateCcw,
  ChevronRight,
  Loader2,
  Cpu,
  Thermometer,
  FileCode,
  Lightbulb,
  Wand2,
  CheckCircle2,
  XCircle,
  Eye,
  Bot,
} from "lucide-react";

// ============================================================
// Types
// ============================================================

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
}

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface ModelOption {
  id: string;
  name: string;
  provider: string;
  providerColor: string;
  desc: string;
  supportsStreaming: boolean;
}

interface ProviderStatus {
  provider: string;
  configured: boolean;
  modelId: string;
}

// ============================================================
// Constants
// ============================================================

const MODELS: ModelOption[] = [
  // ===== OpenAI GPT-5.4 系列 (API 聚合平台) =====
  {
    id: "gpt-5.4",
    name: "GPT-5.4",
    provider: "openai",
    providerColor: "from-emerald-500 to-teal-600",
    desc: "OpenAI · 1M 上下文旗舰",
    supportsStreaming: true,
  },
  {
    id: "gpt-5.4-mini",
    name: "GPT-5.4 Mini",
    provider: "openai",
    providerColor: "from-emerald-400 to-teal-500",
    desc: "OpenAI · 快速经济",
    supportsStreaming: true,
  },
  {
    id: "gpt-5.4-nano",
    name: "GPT-5.4 Nano",
    provider: "openai",
    providerColor: "from-teal-400 to-cyan-500",
    desc: "OpenAI · 超轻量快速",
    supportsStreaming: true,
  },
  // OpenAI 经典
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "openai",
    providerColor: "from-green-500 to-emerald-600",
    desc: "OpenAI · 多模态经典",
    supportsStreaming: true,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    providerColor: "from-green-400 to-emerald-500",
    desc: "OpenAI · 快速经济",
    supportsStreaming: true,
  },
  // 智谱 AI (视觉能力)
  {
    id: "glm-4v-plus",
    name: "GLM-4V Plus",
    provider: "zhipu",
    providerColor: "from-blue-500 to-cyan-500",
    desc: "智谱AI · 视觉理解",
    supportsStreaming: true,
  },
  {
    id: "glm-4-plus",
    name: "GLM-4 Plus",
    provider: "zhipu",
    providerColor: "from-blue-500 to-cyan-500",
    desc: "智谱AI · 强大通用模型",
    supportsStreaming: true,
  },
  {
    id: "glm-4-flash",
    name: "GLM-4 Flash",
    provider: "zhipu",
    providerColor: "from-blue-500 to-emerald-500",
    desc: "智谱AI · 快速经济",
    supportsStreaming: true,
  },
  // DeepSeek
  {
    id: "deepseek-chat",
    name: "DeepSeek Chat",
    provider: "deepseek",
    providerColor: "from-blue-600 to-indigo-600",
    desc: "DeepSeek · 性价比高",
    supportsStreaming: true,
  },
  {
    id: "deepseek-reasoner",
    name: "DeepSeek R1",
    provider: "deepseek",
    providerColor: "from-indigo-600 to-purple-600",
    desc: "DeepSeek · 推理强",
    supportsStreaming: false, // R1 streaming is different
  },
];

const BUILTIN_PROMPTS: PromptTemplate[] = [
  {
    id: "developer-analysis",
    name: "开发者能力评估",
    description: "分析开发者 GitHub 资料，评估技术能力和匹配度",
    category: "analysis",
  },
  {
    id: "lead-classification",
    name: "线索智能分类",
    description: "自动分类线索，识别优先级和潜在价值",
    category: "classification",
  },
  {
    id: "cold-outreach",
    name: "冷启动外联邮件",
    description: "生成个性化的冷启动邮件，提高回复率",
    category: "generation",
  },
  {
    id: "follow-up",
    name: "跟进消息",
    description: "根据上下文生成合适的跟进消息",
    category: "generation",
  },
  {
    id: "tech-summary",
    name: "技术栈总结",
    description: "从 GitHub/代码仓库中提取和总结技术栈信息",
    category: "analysis",
  },
  {
    id: "vision-analysis",
    name: "图片内容分析",
    description: "使用 GLM-4V 分析图片中的文字、图表或界面截图",
    category: "vision",
  },
];

const DEFAULT_SYSTEM = `你是一个专业的客户增长助手（AutoCustomer AI）。你的职责包括：
1. 分析潜在客户的技术能力和匹配度
2. 撰写高转化率的营销文案和外联邮件
3. 对销售线索进行智能分类和优先级排序
4. 提供数据驱动的增长建议

回答风格：专业、简洁、有洞察力。用中文回答。`;

// ============================================================
// Provider detection helpers
// ============================================================

function detectProvider(modelId: string): string {
  const m = MODELS.find((m) => m.id === modelId);
  return m?.provider || "unknown";
}

function getModelInfo(modelId: string): ModelOption | undefined {
  return MODELS.find((m) => m.id === modelId);
}

// ============================================================
// Component
// ============================================================

export default function AIStudioPage() {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Config state — default to GPT-5.4 (OpenAI 聚合平台)
  const [model, setModel] = useState("gpt-5.4");
  const [temperature, setTemperature] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM);
  const [maxTokens, setMaxTokens] = useState(2048);

  // Streaming state
  const [streamingContent, setStreamingContent] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  // Provider status
  const [providerStatus, setProviderStatus] = useState<ProviderStatus[] | null>(null);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  // Load provider status on mount
  useEffect(() => {
    fetch("/api/ai/chat")
      .then((r) => r.json())
      .then((data) => {
        if (data.providers) setProviderStatus(data.providers);
      })
      .catch(() => {});
  }, []);

  // --- Streaming Chat ---
  const handleSend = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { role: "user", content: input.trim(), timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setStreamingContent("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: systemPrompt },
            ...newMessages.map((m) => ({ role: m.role, content: m.content })),
          ],
          model,
          temperature,
          maxTokens,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "请求失败" }));
        throw new Error(err.error || err.message || `HTTP ${res.status}`);
      }

      // SSE stream reader
      const reader = res.body?.getReader();
      if (!reader) throw new Error("无法读取响应流");

      const decoder = new TextDecoder();
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l) => l.startsWith("data:"));

        for (const line of lines) {
          const data = line.slice(5).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content || "";
            if (delta) {
              fullContent += delta;
              setStreamingContent(fullContent);
            }
          } catch {
            // ignore parse errors for partial chunks
          }
        }
      }

      // Finalize message
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: fullContent || "(无回复)",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setStreamingContent("");
    } catch (error: unknown) {
      if ((error as Error).name === "AbortError") {
        // User stopped the generation — save what we have
        if (streamingContent) {
          const assistantMsg: ChatMessage = {
            role: "assistant",
            content: streamingContent + "\n\n*(已停止生成)*",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMsg]);
          setStreamingContent("");
        }
      } else {
        const errorMsg: ChatMessage = {
          role: "assistant",
          content: `❌ 错误：${(error as Error).message}\n\n💡 请检查 API Key 配置（Settings → AI 设置）`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }, [input, loading, messages, model, temperature, maxTokens, systemPrompt, streamingContent]);

  const handleStop = () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --- Prompt Templates ---
  const loadPromptTemplate = (templateId: string) => {
    switch (templateId) {
      case "developer-analysis":
        setSystemPrompt(`你是一位资深的技术招聘专家和开源项目分析师。
你的任务是根据提供的 GitHub 用户资料（用户名、简介、仓库、技术栈等），进行全面的评估分析。

请按以下格式输出：
1. **技术能力评分** (1-10)：综合技术水平的量化评估
2. **核心技能**：列出最擅长的3-5个技术领域
3. **活跃度评估**：基于提交频率、参与度等判断
4. **推荐等级**：HIGH/MEDIUM/LOW - 是否值得联系
5. **建议行动**：具体的下一步建议
6. **AI 摘要**：一段50字以内的总体评价`);
        break;
      case "lead-classification":
        setSystemPrompt(`你是一个销售线索智能分类系统。

根据线索信息（姓名、公司、来源、备注等），输出以下 JSON 格式结果：
{
  "category": "ENTERPRISE|SMB|STARTUP|INDIVIDUAL|OTHER",
  "priority": "HOT|WARM|COLD",
  "estimatedValue": "数字(预估年价值)",
  "nextAction": "建议的下一步动作",
  "reasoning": "分类理由"
}`);
        break;
      case "cold-outreach":
        setSystemPrompt(`你是一个专业的冷启动邮件撰写专家。

目标：写一封能引起对方注意并促成回复的外联邮件。
要求：
1. 开头个性化——提及对方的公开信息（GitHub、博客、作品）
2. 长度控制在150字以内
3. 有明确的 Call to Action
4. 语气友好但不卑微
5. 避免模板化语言

输出纯文本邮件内容，不需要额外的解释。`);
        break;
      case "follow-up":
        setSystemPrompt(`你是一个客户关系管理专家。

任务：根据之前的沟通记录，生成一封得体的跟进邮件。
要求：
1. 引用之前对话的关键点
2. 提供新的有价值信息
3. 保持简洁（100-150字）
4. 有明确的下一步建议`);
        break;
      case "tech-summary":
        setSystemPrompt(`你是一个技术分析专家。从给定的 GitHub 或代码仓库信息中：
1. 提取主要编程语言和技术框架
2. 分析项目的架构模式
3. 评估代码质量指标
4. 总结该开发者的技术特长和偏好方向`);
        break;
      case "vision-analysis":
        setSystemPrompt(`你是一个视觉分析专家。使用多模态能力分析图片内容：
1. 识别图片中的所有文字（OCR）
2. 描述图片的主要内容和结构
3. 如果是界面截图，给出 UX/UI 改进建议
4. 如果是图表，解读数据趋势
5. 回答用户关于图片的任何问题

注意：请用中文回答，保持专业但易懂的风格。`);
        // Auto-switch to vision model
        setModel("glm-4v-plus");
        break;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const currentModel = getModelInfo(model);

  return (
    <div className="space-y-6">
      {/* Header with brand gradient */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span>
              AI <span className="gradient-text">Studio</span>
            </span>
          </h1>
            <p className="text-muted-foreground mt-1 ml-[44px]">
            多模型对话 · 流式输出 · GPT-5.4 / 智谱 GLM-4 / DeepSeek
          </p>
        </div>

        {/* Provider Status Pills */}
        {providerStatus && (
          <div className="hidden md:flex items-center gap-2">
            {providerStatus.map((p) => (
              <Badge
                key={p.provider}
                variant={p.configured ? "default" : "secondary"}
                className={`text-[11px] px-2 py-0.5 ${
                  p.configured ? "bg-emerald-500/15 text-emerald-600 border-emerald-200 dark:border-emerald-800" : ""
                }`}
              >
                {p.configured ? (
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                ) : (
                  <XCircle className="w-3 h-3 mr-1 opacity-40" />
                )}
                {p.provider === "zhipu"
                  ? "智谱AI"
                  : p.provider === "openai"
                  ? "OpenAI (GPT-5.4)"
                  : p.provider === "deepseek"
                  ? "DeepSeek"
                  : p.provider}
                {p.modelId && (
                  <span className="ml-1 opacity-60">· {p.modelId}</span>
                )}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Panel — Configuration */}
        <div className="lg:col-span-1 space-y-4">
          {/* Model Selection */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-r from-violet-500/5 to-purple-500/5">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Cpu className="w-4 h-4 text-primary" /> 模型配置
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {/* Model Select with provider color */}
              <div className="space-y-2">
                <Label>AI 模型</Label>
                <Select value={model} onValueChange={(v) => setModel(v || model)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {/* OpenAI GPT-5.4 组 */}
                    <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      🚀 OpenAI GPT-5.4
                    </div>
                    {MODELS.filter((m) => m.provider === "openai" && m.id.startsWith("gpt-5")).map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <span className="font-medium">{m.name}</span>
                        <span className="ml-1.5 text-xs text-muted-foreground">{m.desc.split(" · ")[1]}</span>
                      </SelectItem>
                    ))}
                    <div className="px-2 py-1 mt-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      🟢 OpenAI 经典
                    </div>
                    {MODELS.filter((m) => m.provider === "openai" && !m.id.startsWith("gpt-5")).map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <span>{m.name}</span>
                      </SelectItem>
                    ))}
                    {/* 智谱组 */}
                    <div className="px-2 py-1 mt-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      🧠 智谱 AI
                    </div>
                    {MODELS.filter((m) => m.provider === "zhipu").map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <span className="font-medium">{m.name}</span>
                        <span className="ml-1.5 text-xs text-muted-foreground">{m.desc.split(" · ")[1]}</span>
                      </SelectItem>
                    ))}
                    {/* DeepSeek 组 */}
                    <div className="px-2 py-1 mt-1 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      🔵 DeepSeek
                    </div>
                    {MODELS.filter((m) => m.provider === "deepseek").map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <span>{m.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Current model badge */}
                {currentModel && (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] bg-gradient-to-r ${currentModel.providerColor} bg-opacity-10 text-white border-0`}
                    >
                      <span className="text-white drop-shadow">{currentModel.provider === "zhipu" ? "🧠" : currentModel.provider === "openai" ? "🟢" : "🔵"} {currentModel.name}</span>
                    </Badge>
                    {currentModel.supportsStreaming && (
                      <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 dark:border-emerald-800">
                        <Zap className="w-2.5 h-2.5 mr-0.5" /> 流式输出
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Temperature slider */}
              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  温度 <span className="text-xs text-muted-foreground font-mono tabular-nums">{temperature.toFixed(1)}</span>
                </Label>
                <Input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  className="cursor-pointer [&::-webkit-slider-thumb]:shadow-md"
                />
                <p className="text-[11px] text-muted-foreground">
                  {temperature <= 0.3
                    ? "🎯 精确稳定"
                    : temperature <= 0.7
                    ? "⚖️ 平衡"
                    : temperature <= 1.2
                    ? "✨ 创意丰富"
                    : "🎲 高度随机"}
                </p>
              </div>

              {/* Max tokens */}
              <div className="space-y-2">
                <Label htmlFor="maxTokens">最大 Token 数</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  min={256}
                  max={16384}
                  step={256}
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  className="h-8 text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Prompt Templates */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileCode className="w-4 h-4 text-amber-500" /> 提示词模板
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {BUILTIN_PROMPTS.map((template) => (
                <button
                  key={template.id}
                  onClick={() => loadPromptTemplate(template.id)}
                  className="w-full text-left p-2.5 rounded-lg border hover:bg-muted/60 hover:border-primary/20 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-medium group-hover:text-primary transition-colors">{template.name}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all translate-x-[-4px] group-hover:translate-x-0" />
                  </div>
                  <p className="text-[11px] text-muted-foreground line-clamp-1">{template.description}</p>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel — Chat Interface */}
        <div className="lg:col-span-3 space-y-4">
          {/* System Prompt Bar */}
          <Card className="border-dashed hover:border-primary/30 transition-colors">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start gap-3">
                <Settings2 className="w-4 h-4 mt-1.5 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
                    <Bot className="w-3 h-3" /> System Prompt
                    <Badge variant="secondary" className="text-[10px] px-1.5">自定义</Badge>
                  </Label>
                  <Textarea
                    rows={2}
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    className="mt-0 text-sm resize-none bg-transparent border-none focus-visible:ring-0 shadow-none p-0 placeholder:text-muted-foreground/50"
                    placeholder="输入系统提示词..."
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 h-7 text-xs"
                  onClick={() => setSystemPrompt(DEFAULT_SYSTEM)}
                >
                  重置
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="min-h-[520px] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
              {messages.length === 0 && !streamingContent ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center h-full py-12">
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-xl shadow-violet-500/25 animate-pulse-slow">
                      <Sparkles className="w-9 h-9 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30 border-2 border-background">
                      <Eye className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                  <h3 className="font-bold text-xl mb-1.5 gradient-text">开始 AI 对话</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-md mb-8">
                    选择提示词模板或直接输入问题，支持流式输出和多模型切换
                  </p>
                  <div className="grid grid-cols-2 gap-2.5 w-full max-w-lg">
                    {[
                      { icon: <Zap />, label: "分析开发者", prompt: "帮我分析 @torvalds 的技术能力", color: "from-amber-500 to-orange-500" },
                      { icon: <Wand2 />, label: "写外联邮件", prompt: "帮我写一封给 Rust 开发者的冷启动邮件", color: "from-pink-500 to-rose-500" },
                      { icon: <Lightbulb />, label: "分类线索", prompt: "这个线索值不值得重点跟进？", color: "from-emerald-500 to-teal-500" },
                      { icon: <MessageSquare />, label: "自由对话", prompt: "你好！介绍一下你能做什么", color: "from-violet-500 to-purple-500" },
                    ].map((suggestion) => (
                      <button
                        key={suggestion.label}
                        onClick={() => setInput(suggestion.prompt as string)}
                        className="group p-3.5 rounded-xl border hover:bg-muted/50 hover:border-primary/20 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left"
                      >
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${suggestion.color} flex items-center justify-center mb-2 shadow-sm`}>
                          <span className="text-white">{suggestion.icon}</span>
                        </div>
                        <span className="text-sm font-medium block">{suggestion.label}</span>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">{suggestion.prompt}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Messages */
                <>
                  {messages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                          msg.role === "user"
                            ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-md shadow-primary/10"
                            : msg.role === "system"
                            ? "bg-yellow-50 dark:bg-yellow-950/50 border border-yellow-200 dark:border-yellow-800 text-yellow-900 dark:text-yellow-100 text-xs rounded-xl"
                            : "bg-muted/80 backdrop-blur-sm"
                        }`}
                      >
                        {msg.role !== "user" && (
                          <div className="flex items-center gap-1.5 mb-1.5">
                            {msg.role === "assistant" ? (
                              <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                            ) : (
                              <Settings2 className="w-3.5 h-3.5 text-amber-500" />
                            )}
                            <span className="text-[11px] uppercase tracking-wider font-medium opacity-70">
                              {msg.role === "assistant" ? (
                                <span className="flex items-center gap-1">
                                  AI
                                  {currentModel && (
                                    <span className={`text-[9px] px-1 rounded bg-gradient-to-r ${currentModel.providerColor} text-white`}>{currentModel.name.split(" ")[0]}</span>
                                  )}
                                </span>
                              ) : (
                                "System"
                              )}
                            </span>
                          </div>
                        )}
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                        <div className="flex items-center justify-between mt-2 pt-1">
                          <span className="text-[10px] opacity-40">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </span>
                          {msg.role === "assistant" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 px-1.5 text-[10px] opacity-0 hover:opacity-100 transition-opacity"
                              onClick={() => copyToClipboard(msg.content)}
                            >
                              <Copy className="w-3 h-3 mr-0.5" /> 复制
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Streaming message */}
                  {streamingContent && (
                    <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-3 bg-muted/80 backdrop-blur-sm border border-primary/10 shadow-sm">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[11px] uppercase tracking-wider font-medium opacity-70 flex items-center gap-1">
                            AI
                            {currentModel && (
                              <span className={`text-[9px] px-1 rounded bg-gradient-to-r ${currentModel.providerColor} text-white`}>{currentModel.name.split(" ")[0]}</span>
                            )}
                          </span>
                          <span className="text-[10px] text-emerald-500">生成中...</span>
                        </div>
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">{streamingContent}</div>
                        <div className="flex items-center gap-2 mt-2 pt-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 px-1.5 text-[10px]"
                            onClick={handleStop}
                          >
                            <RotateCcw className="w-3 h-3 mr-0.5" /> 停止
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Loading spinner (for non-streaming fallback) */}
                  {loading && !streamingContent && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-3 bg-muted/80">
                        <div className="flex items-center gap-2.5">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span className="text-sm text-muted-foreground">AI 正在思考...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </>
              )}
            </div>

            {/* Input Area */}
            <div className="border-t bg-card/50 backdrop-blur-sm p-4">
              <div className="flex gap-2">
                <Textarea
                  placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  className="resize-none text-sm border-muted-focus/50 focus-visible:ring-primary/30 rounded-xl"
                  disabled={loading}
                />
                <div className="flex flex-col gap-1.5 shrink-0 self-end">
                  {loading ? (
                    <Button
                      onClick={handleStop}
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSend}
                      disabled={!input.trim() || loading}
                      className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-violet-600 hover:from-primary/90 hover:to-violet-700 shadow-lg shadow-primary/20"
                      size="icon"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Bottom bar */}
              <div className="flex items-center justify-between mt-2.5">
                <div className="flex items-center gap-1.5">
                  {currentModel && (
                    <Badge variant="outline" className={`text-[10px] bg-gradient-to-r ${currentModel.providerColor} bg-opacity-10 border-0`}>
                      <span className="text-white font-medium drop-shadow-sm">{currentModel.name}</span>
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] font-mono">
                    T={temperature.toFixed(1)}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    maxTokens={maxTokens}
                  </Badge>
                </div>
                <button
                  onClick={() => { setMessages([]); setStreamingContent(""); }}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> 清空对话
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
