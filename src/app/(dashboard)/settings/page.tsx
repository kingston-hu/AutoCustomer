"use client";

import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Settings2,
  Key,
  Bot,
  GitBranch,
  Mail,
  Palette,
  Database,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Save,
  TestTube2,
  ExternalLink,
  Info,
  Trash2,
  Download,
  HardDrive,
  Globe,
  BellRing,
  User,
  Zap,
  Lock,
  Server,
  Cpu,
  Wifi,
  Brain,
  Sparkles,
  ChevronRight,
} from "lucide-react";

interface ConfigData {
  ai: {
    provider: string;
    openaiApiKey: string | null;
    deepseekApiKey: string | null;
    zhipuApiKey: string | null;
    openaiBaseUrl: string;
    deepseekBaseUrl: string;
    defaultModel: string;
  };
  github: {
    token: string | null;
    rateLimit: number;
  };
  email: {
    provider: string;
    resendApiKey: string | null;
    fromAddress: string;
    smtpHost: string;
    smtpPort: string;
    smtpUser: string;
  };
  app: {
    name: string;
    version: string;
    nodeEnv: string;
    dbUrl: string;
  };
}

interface StatusData {
  aiReady: boolean;
  githubReady: boolean;
  emailReady: boolean;
  dbReady: boolean;
}

export default function SettingsPage() {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [status, setStatus] = useState<StatusData>({
    aiReady: false,
    githubReady: false,
    emailReady: false,
    dbReady: false,
  });
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // Preferences state
  const [preferences, setPreferences] = useState({
    language: "zh-CN",
    timezone: "Asia/Shanghai",
    theme: "system",
    notifications: true,
    autoAnalyzeOnImport: true,
    defaultEmailTemplate: "cold-outreach",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setStatus(data.status);
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async (type: "ai" | "email") => {
    setTesting(type);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: `test-${type}`,
          settings: type === "email" ? { to: config?.email.fromAddress } : {},
        }),
      });
      const result = await res.json();
      alert(result.message || (result.success ? `${type.toUpperCase()} 连接成功！` : "测试失败"));
    } catch {
      alert("网络错误");
    } finally {
      setTesting(null);
    }
  };

  const handleSavePreferences = async () => {
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save-preferences", settings: preferences }),
      });
      alert("偏好设置已保存！");
    } catch {
      alert("保存失败");
    }
  };

  // Premium status badge
  const StatusBadge = ({ ready, label }: { ready: boolean; label: string }) =>
    ready ? (
      <Badge className="gap-1.5 bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400 border-transparent font-medium">
        <CheckCircle2 className="w-3.5 h-3.5" /> {label}
      </Badge>
    ) : (
      <Badge variant="outline" className="gap-1.5 bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 border-transparent">
        <XCircle className="w-3.5 h-3.5" /> {label}
      </Badge>
    );

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 bg-muted rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ===== Header — Brand Gradient ===== */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-600 via-zinc-600 to-neutral-700 flex items-center justify-center shadow-lg shadow-slate-500/25">
            <Settings2 className="w-5 h-5 text-white" />
          </div>
          <span>
            系统<span className="gradient-text">设置</span>
          </span>
        </h1>
        <p className="text-muted-foreground mt-1 ml-[44px]">配置 API Keys、偏好设置和系统参数</p>
      </div>

      {/* ===== Quick Status Bar — Premium ===== */}
      <Card className="overflow-hidden border-0 shadow-md">
        <div className="bg-gradient-to-r from-slate-50 via-zinc-50 to-neutral-50 dark:from-slate-900/40 dark:via-zinc-900/30 dark:to-neutral-900/10 px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold text-foreground flex items-center gap-1.5 shrink-0">
              <Shield className="w-4 h-4 text-primary" /> 服务状态
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge ready={status.aiReady} label={status.aiReady ? "AI 已连接" : "AI 未配置"} />
              <StatusBadge ready={status.githubReady} label={status.githubReady ? "GitHub 已连接" : "GitHub 未配置"} />
              <StatusBadge ready={status.emailReady} label={status.emailReady ? "邮件已配置" : "邮件未配置"} />
              <StatusBadge ready={status.dbReady} label={status.dbReady ? "数据库正常" : "数据库未配置"} />
            </div>
            <Button size="sm" variant="ghost" onClick={() => fetchSettings()} className="ml-auto gap-1.5 rounded-lg hover:bg-background/60">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> 刷新
            </Button>
          </div>
        </div>
      </Card>

      {/* ===== Main Settings Tabs ===== */}
      <Tabs defaultValue="ai" className="space-y-5">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex bg-muted/40 p-1 rounded-xl">
          <TabsTrigger value="ai" className="gap-1.5 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md">
            <Bot className="w-4 h-4" /> AI
          </TabsTrigger>
          <TabsTrigger value="github" className="gap-1.5 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-700 data-[state=active]:to-gray-800 data-[state=active]:text-white data-[state=active]:shadow-md">
            <GitBranch className="w-4 h-4" /> GitHub
          </TabsTrigger>
          <TabsTrigger value="email" className="gap-1.5 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-md">
            <Mail className="w-4 h-4" /> 邮件
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-1.5 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-500 data-[state=active]:text-white data-[state=active]:shadow-md">
            <Palette className="w-4 h-4" /> 偏好
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-1.5 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-md">
            <Database className="w-4 h-4" /> 数据
          </TabsTrigger>
        </TabsList>

        {/* ===== AI Settings Tab ===== */}
        <TabsContent value="ai">
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">AI 配置</CardTitle>
                  <CardDescription>配置 AI 模型和 API Key，用于开发者分析和内容生成</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-0">
              {/* Provider Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* OpenAI (GPT-5.4 / API 聚合平台) */}
                <div className="rounded-xl border border-emerald-200/50 dark:border-emerald-800/30 p-4 space-y-3 hover:border-emerald-300/50 hover:shadow-md transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-emerald-100 to-transparent dark:from-emerald-950/20 rounded-bl-full opacity-50" />
                  <div className="flex items-center justify-between relative">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Zap className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <Label className="font-bold text-sm">OpenAI</Label>
                      <Badge className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 border-transparent font-medium">GPT-5.4</Badge>
                    </div>
                    <StatusBadge ready={!!config?.ai.openaiApiKey} label={config?.ai.openaiApiKey ? "✅ 已配置" : "⚠️ 未配置"} />
                  </div>
                  <div className="relative">
                    <Input
                      placeholder="sk-...•••••"
                      type={showKeys.openai ? "text" : "password"}
                      defaultValue={(config as any)?.ai?.openaiApiKey || ""}
                      disabled
                      className="rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 text-sm pr-9"
                    />
                    <button
                      onClick={() => setShowKeys({ ...showKeys, openai: !showKeys.openai })}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                    >
                      {showKeys.openai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed space-y-0.5">
                    <span>API 聚合平台 · 1M 上下文</span>
                    <code className="bg-emerald-100 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded text-[10px font-mono block mt-1 break-all">{(config as any)?.ai?.openaiBaseUrl || "https://api.openai.com/v1"}</code>
                    <span className="text-emerald-600/70 dark:text-emerald-400/70">OPENAI_API_KEY</span>
                  </p>
                </div>

                {/* DeepSeek */}
                <div className="rounded-xl border border-border/50 p-4 space-y-3 hover:border-cyan-300/50 hover:shadow-md transition-all group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Cpu className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <Label className="font-bold text-sm">DeepSeek</Label>
                    </div>
                    <StatusBadge ready={!!config?.ai.deepseekApiKey} label={config?.ai.deepseekApiKey ? "已配置" : "未配置"} />
                  </div>
                  <Input placeholder="sk-..." type="password" defaultValue="" disabled className="rounded-lg bg-muted/40 text-sm" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    在 <code className="bg-muted px-1 rounded text-[10px]">.env</code> 中设置{" "}
                    <code className="bg-muted px-1 rounded text-[10px]">DEEPSEEK_API_KEY</code>
                  </p>
                </div>

                {/* Zhipu / 智谱 */}
                <div className="rounded-xl border border-violet-200/50 dark:border-violet-800/30 p-4 space-y-3 hover:border-violet-400/50 hover:shadow-md transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-violet-100 to-transparent dark:from-violet-950/20 rounded-bl-full opacity-50" />
                  <div className="flex items-center justify-between relative">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900 dark:to-purple-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Brain className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                      </div>
                      <Label className="font-bold text-sm">智谱 AI</Label>
                    </div>
                    <StatusBadge ready={!!(config as any)?.ai?.zhipuApiKey || status.aiReady} label={status.aiReady ? "✅ 已配置" : "⚠️ 未配置"} />
                  </div>
                  <div className="relative">
                    <Input
                      placeholder="••••••••"
                      type={showKeys.zhipu ? "text" : "password"}
                      defaultValue={(config as any)?.ai?.zhipuApiKey || ""}
                      disabled
                      className="rounded-lg bg-violet-50/50 dark:bg-violet-950/20 text-sm pr-9"
                    />
                    <button
                      onClick={() => setShowKeys({ ...showKeys, zhipu: !showKeys.zhipu })}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                    >
                      {showKeys.zhipu ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    GLM-4.6V · <code className="bg-violet-100 dark:bg-violet-900/40 px-1 rounded text-[10px]">ZHIPU_API_KEY</code>
                  </p>
                </div>
              </div>

              {/* Current Config Display */}
              <div className="rounded-xl bg-gradient-to-r from-slate-50 to-zinc-50 dark:from-slate-900/20 dark:to-zinc-900/10 p-5 space-y-3 border border-border/30">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5" /> 当前生效配置
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-lg bg-background/60 p-3 border border-border/20">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">默认提供商</p>
                    <p className="font-bold text-sm mt-0.5">{config?.ai.provider || "deepseek"}</p>
                  </div>
                  <div className="rounded-lg bg-background/60 p-3 border border-border/20">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">默认模型</p>
                    <p className="font-mono font-bold text-xs mt-0.5 text-violet-600 dark:text-violet-400">{config?.ai.defaultModel}</p>
                  </div>
                  <div className="rounded-lg bg-background/60 p-3 border border-border/20">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">DeepSeek URL</p>
                    <p className="font-mono text-[11px] mt-0.5 truncate">{config?.ai.deepseekBaseUrl}</p>
                  </div>
                  <div className="rounded-lg bg-background/60 p-3 border border-border/20">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Key 状态</p>
                    <div className="flex gap-1 mt-0.5">
                      {(!!config?.ai.openaiApiKey || !!config?.ai.deepseekApiKey || !!(config as any)?.ai?.zhipuApiKey) ? (
                        <div className="flex gap-1">
                          {!!config?.ai.openaiApiKey && <Badge className="text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-transparent">OAI</Badge>}
                          {!!config?.ai.deepseekApiKey && <Badge className="text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-transparent">DS</Badge>}
                          {!!(config as any)?.ai?.zhipuApiKey && <Badge className="text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 border-transparent">GLM</Badge>}
                        </div>
                      ) : <span className="text-xs text-muted-foreground">无</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Test Button */}
              <div className="flex items-center gap-3 pt-1">
                <Button
                  onClick={() => handleTest("ai")}
                  disabled={testing === "ai"}
                  className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-xl gap-2 shadow-md shadow-violet-500/15"
                >
                  {testing === "ai" ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> 测试中...</>
                  ) : (
                    <><TestTube2 className="w-4 h-4" /> 测试 AI 连接</>
                  )}
                </Button>
                {!status.aiReady && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 bg-amber-50 dark:bg-amber-950/20 px-3 py-1.5 rounded-lg">
                    <Info className="w-3.5 h-3.5 text-amber-500" />
                    请先在 .env 文件中配置 API Key 后重启服务
                  </p>
                )}
              </div>

              {/* Tip card */}
              <div className="rounded-xl bg-gradient-to-r from-violet-50/80 via-purple-50/30 to-fuchsia-50/20 dark:from-violet-950/15 dark:via-purple-950/5 dark:to-fuchsia-950/5 border border-violet-200/30 dark:border-violet-800/15 p-4 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
                <div className="text-sm leading-relaxed">
                  <strong className="text-violet-800 dark:text-violet-200">推荐：</strong>
                  <span className="text-violet-700/80 dark:text-violet-300/70"> 使用智谱 GLM-4 Plus 作为默认模型，中文理解能力出色。
                  获取 Key：<a href="https://open.bigmodel.cn/" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5 hover:no-underline font-medium">open.bigmodel.cn <ExternalLink className="w-3 h-3" /></a></span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== GitHub Settings Tab ===== */}
        <TabsContent value="github">
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shadow-lg shadow-gray-700/20">
                  <GitBranch className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">GitHub 配置</CardTitle>
                  <CardDescription>配置 GitHub Token 用于开发者搜索和资料获取</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-0">
              <div className="rounded-xl border border-border/50 p-5 space-y-4 hover:border-gray-300/50 transition-colors">
                <div className="flex items-center justify-between">
                  <Label className="font-bold flex items-center gap-2">
                    <Lock className="w-4 h-4 text-gray-500" /> Personal Access Token
                  </Label>
                  <StatusBadge ready={!!config?.github.token} label={config?.github.token ? "已配置 ✅" : "未配置"} />
                </div>
                <div className="relative">
                  <Input
                    placeholder="ghp_..."
                    type={showKeys.github ? "text" : "password"}
                    defaultValue={config?.github.token || ""}
                    disabled
                    className="rounded-lg bg-muted/40 pr-9"
                  />
                  <button
                    onClick={() => setShowKeys({ ...showKeys, github: !showKeys.github })}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
                  >
                    {showKeys.github ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[11px] text-muted-foreground">
                    在 <code className="bg-muted px-1 rounded text-[10px]">.env</code> 中设置{" "}
                    <code className="bg-muted px-1 rounded text-[10px]">GITHUB_TOKEN</code> 或{" "}
                    <code className="bg-muted px-1 rounded text-[10px]">GITHUB_PERSONAL_TOKEN</code>
                  </p>
                  <p className="text-[11px] text-muted-foreground">需要权限：<Badge className="text-[10px] px-1 py-0">public_repo</Badge> <Badge className="text-[10px] px-1 py-0">read:user</Badge> <Badge className="text-[10px] px-1 py-0">read:org</Badge></p>
                </div>
                <a
                  href="https://github.com/settings/tokens/new?scopes=repo,read:user,read:org&description=AutoCustomer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline bg-gray-50 dark:bg-gray-900/30 px-3 py-1.5 rounded-lg"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> 创建 GitHub Token
                </a>
              </div>

              {/* Current config display */}
              <div className="rounded-xl bg-gradient-to-r from-gray-50 to-zinc-50 dark:from-gray-900/20 dark:to-zinc-900/10 p-5 space-y-3 border border-border/30">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">当前配置</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-background/60 p-3 border border-border/20">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Token 尾号</p>
                    <p className="font-mono font-bold text-sm mt-0.5">{config?.github.token ? `...${config.github.token.slice(-4)}` : "-"}</p>
                  </div>
                  <div className="rounded-lg bg-background/60 p-3 border border-border/20">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">API 限额</p>
                    <p className="font-bold text-sm mt-0.5 tabular-nums">{config?.github.rateLimit?.toLocaleString() || 5000}<span className="text-xs text-muted-foreground ml-0.5">次/时</span></p>
                  </div>
                  <div className="rounded-lg bg-background/60 p-3 border border-border/20">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">搜索能力</p>
                    <p className="font-bold text-sm mt-0.5 flex items-center gap-1">
                      {config?.github.token ? (
                        <><Wifi className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-600">可用</span></>
                      ) : (
                        <><Wifi className="w-3.5 h-3.5 text-gray-300" /><span className="text-muted-foreground">受限</span></>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Email Settings Tab ===== */}
        <TabsContent value="email">
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">邮件配置</CardTitle>
                  <CardDescription>配置邮件发送服务（Resend 或 SMTP）</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-0">
              {/* Provider selection */}
              <div className="rounded-xl border border-border/50 p-4 space-y-3 bg-gradient-to-r from-blue-50/30 to-indigo-50/20 dark:from-blue-950/10 dark:to-indigo-950/5">
                <Label className="font-semibold text-sm">发送模式</Label>
                <Select defaultValue={config?.email.provider}>
                  <SelectTrigger className="max-w-[280px] rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="log"><Badge className="mr-2 bg-gray-100 text-gray-700 border-none">📝</Badge> Log 模式（开发用）</SelectItem>
                    <SelectItem value="resend"><Badge className="mr-2 bg-blue-100 text-blue-700 border-none">✉️</Badge> Resend（推荐）</SelectItem>
                    <SelectItem value="nodemailer"><Badge className="mr-2 bg-indigo-100 text-indigo-700 border-none">📮</Badge> 自定义 SMTP</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  当前模式：<Badge variant="secondary" className="text-[11px]">{config?.email.provider || "log"}</Badge>
                </p>
              </div>

              {/* Resend config */}
              <div className="rounded-xl border border-border/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold flex items-center gap-1.5">
                    ✉️ Resend API Key
                  </Label>
                  <StatusBadge ready={!!config?.email.resendApiKey} label={config?.email.resendApiKey ? "已配置" : "未配置"} />
                </div>
                <Input placeholder="re_..." type="password" defaultValue="" disabled className="rounded-lg bg-muted/40" />
                <p className="text-[11px] text-muted-foreground space-y-0.5">
                  <p><code className="bg-muted px-1 rounded text-[10px]">RESEND_API_KEY=re_...</code></p>
                  <p><code className="bg-muted px-1 rounded text-[10px]">EMAIL_FROM=noreply@example.com</code></p>
                </p>
                <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline bg-blue-50 dark:bg-blue-950/20 px-3 py-1.5 rounded-lg">
                  <ExternalLink className="w-3.5 h-3.5" /> 获取 Resend API Key（免费额度）
                </a>
              </div>

              {/* Test button */}
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => handleTest("email")}
                  disabled={testing === "email"}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl gap-2 shadow-md shadow-blue-500/15"
                >
                  {testing === "email" ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> 测试中...</>
                  ) : (
                    <><TestTube2 className="w-4 h-4" /> 发送测试邮件</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Preferences Tab ===== */}
        <TabsContent value="preferences">
          <Card className="border-0 shadow-md overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/20">
                  <Palette className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">用户偏好</CardTitle>
                  <CardDescription>个性化你的工作区体验</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Region settings */}
                <div className="rounded-xl border border-border/50 p-4 space-y-3 hover:border-pink-300/30 transition-colors">
                  <Label className="font-semibold flex items-center gap-1.5 text-sm">
                    <Globe className="w-4 h-4 text-pink-500" /> 区域设置
                  </Label>
                  <div className="space-y-2.5">
                    <div>
                      <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">语言</Label>
                      <Select value={preferences.language} onValueChange={(v) => setPreferences({ ...preferences, language: v || "zh-CN" })}>
                        <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="zh-CN">🇨🇳 简体中文</SelectItem>
                          <SelectItem value="en-US">🇺🇸 English</SelectItem>
                          <SelectItem value="ja-JP">🇯🇵 日本語</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">时区</Label>
                      <Select value={preferences.timezone} onValueChange={(v) => setPreferences({ ...preferences, timezone: v || "Asia/Shanghai" })}>
                        <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Asia/Shanghai">中国 (UTC+8)</SelectItem>
                          <SelectItem value="America/New_York">美东 (UTC-5)</SelectItem>
                          <SelectItem value="Europe/London">伦敦 (UTC+0)</SelectItem>
                          <SelectItem value="Asia/Tokyo">日本 (UTC+9)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Appearance */}
                <div className="rounded-xl border border-border/50 p-4 space-y-3 hover:border-pink-300/30 transition-colors">
                  <Label className="font-semibold text-sm">外观 & 通知</Label>
                  <div className="space-y-2.5">
                    <div>
                      <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">主题</Label>
                      <Select value={preferences.theme} onValueChange={(v) => setPreferences({ ...preferences, theme: v || "system" })}>
                        <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system">🖥 跟随系统</SelectItem>
                          <SelectItem value="light">☀️ 亮色</SelectItem>
                          <SelectItem value="dark">🌙 暗色</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/30">
                      <Label className="text-sm cursor-pointer flex items-center gap-2">
                        <BellRing className="w-4 h-4 text-pink-500" /> 桌面通知
                      </Label>
                      <Switch checked={preferences.notifications} onCheckedChange={(v) => setPreferences({ ...preferences, notifications: v })} />
                    </div>
                  </div>
                </div>

                {/* Automation behavior */}
                <div className="rounded-xl border border-border/50 p-4 space-y-3 md:col-span-2 hover:border-pink-300/30 transition-colors">
                  <Label className="font-semibold flex items-center gap-1.5 text-sm">
                    <Bot className="w-4 h-4 text-pink-500" /> 自动化行为
                  </Label>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <label className="flex items-center gap-2.5 cursor-pointer p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors flex-1 max-w-md">
                      <Switch checked={preferences.autoAnalyzeOnImport} onCheckedChange={(v) => setPreferences({ ...preferences, autoAnalyzeOnImport: v })} />
                      <div>
                        <p className="text-sm font-medium">导入时自动分析</p>
                        <p className="text-[11px] text-muted-foreground">导入新开发者后自动运行 AI 分析</p>
                      </div>
                    </label>
                    <div className="flex-1 max-w-sm">
                      <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">默认邮件模板</Label>
                      <Select value={preferences.defaultEmailTemplate} onValueChange={(v) => setPreferences({ ...preferences, defaultEmailTemplate: v || "cold-outreach" })}>
                        <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cold-outreach">冷启动邮件</SelectItem>
                          <SelectItem value="follow-up">跟进邮件</SelectItem>
                          <SelectItem value="meeting-invitation">会议邀请</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSavePreferences} className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-xl gap-2 shadow-md shadow-pink-500/15">
                  <Save className="w-4 h-4" /> 保存偏好
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Data Management Tab ===== */}
        <TabsContent value="data">
          <div className="space-y-4">
            <Card className="border-0 shadow-md overflow-hidden">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">数据库信息</CardTitle>
                    <CardDescription>查看和管理系统数据</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "运行环境", value: config?.app.nodeEnv, icon: <Server className="w-4 h-4" />, color: "from-slate-500 to-gray-600" },
                    { label: "版本", value: config?.app.version, icon: <Cpu className="w-4 h-4" />, color: "from-blue-500 to-indigo-500" },
                    { label: "数据库", value: config?.app.dbUrl?.replace("file:./", ""), icon: <HardDrive className="w-4 h-4" />, color: "from-emerald-500 to-teal-500" },
                    { label: "应用名", value: config?.app.name, icon: <User className="w-4 h-4" />, color: "from-pink-500 to-rose-500" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-gradient-to-br from-{item.color.split('-')[0]}-50 to-{item.color.split('-')[1]}-50 dark:from-{item.color.split('-')[0]}-950/20 dark:to-{item.color.split('-')[1]}-950/10 p-3.5 space-y-1 border border-border/20">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                          {item.icon}
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                      </div>
                      <p className="text-sm font-bold truncate">{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Data actions */}
            <Card className="border-0 shadow-md overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                    <HardDrive className="w-4.5 h-4.5 text-white" />
                  </div>
                  <CardTitle className="text-base">数据操作</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => { if (!confirm("确定要导出所有数据？")) return; alert("导出功能需要在后端实现完整备份接口"); }}
                    className="group flex items-center gap-3.5 p-4 rounded-xl border border-border/50 hover:border-emerald-300/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10 transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                      <Download className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">导出数据</p>
                      <p className="text-[11px] text-muted-foreground">JSON 备份所有记录</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>

                  <button
                    onClick={() => { if (!confirm("⚠️ 危险操作！此操作将清空所有数据。确定继续吗？")) return; alert("清除功能需要在后端实现"); }}
                    className="group flex items-center gap-3.5 p-4 rounded-xl border border-red-200/50 hover:bg-red-50/50 dark:hover:bg-red-950/10 transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                      <Trash2 className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-red-700 dark:text-red-400">清除数据</p>
                      <p className="text-[11px] text-muted-foreground">删除全部记录</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-red-300 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>

                  <button
                    onClick={() => alert("数据库迁移功能将在后续版本提供")}
                    className="group flex items-center gap-3.5 p-4 rounded-xl border border-border/50 hover:border-blue-300/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/10 transition-all text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center group-hover:rotate-180 transition-transform duration-500 shrink-0">
                      <RefreshCw className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">运行迁移</p>
                      <p className="text-[11px] text-muted-foreground">Prisma DB 迁移</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Security warning */}
            <Card className="overflow-hidden border-2 border-red-200/60 dark:border-red-900/40">
              <div className="bg-gradient-to-r from-red-50/80 to-rose-50/40 dark:from-red-950/20 dark:to-rose-950/10 px-5 py-4 flex items-start gap-3.5">
                <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
                <div>
                  <p className="font-bold text-red-800 dark:text-red-200 text-sm flex items-center gap-1.5">
                    <Shield className="w-4 h-4" /> 安全提醒
                  </p>
                  <ul className="text-[12px] text-red-700/80 dark:text-red-300/70 mt-2 space-y-1 list-disc list-inside leading-relaxed">
                    <li>API Key 仅存储在服务器环境变量中，不会暴露给前端</li>
                    <li>前端显示的是掩码后的尾号（最后4位），不是真实密钥</li>
                    <li>修改 .env 后需重启 dev server 才能生效</li>
                    <li>生产环境请确保 DATABASE_URL 使用强密码</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
