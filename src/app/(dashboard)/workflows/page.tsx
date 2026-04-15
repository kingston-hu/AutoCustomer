"use client";

import { useState, useEffect, useCallback } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Switch,
} from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";


import {
  Workflow,
  Play,
  Pause,
  Square,
  Plus,
  Settings2,
  Clock,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Edit3,
  Eye,
  GitBranch,
  Timer,
  Mail,
  Brain,
  Search,
  Database,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Sparkles,
  Bot,
  Layers,
  Activity,
  Users,
} from "lucide-react";

interface WorkflowConfig {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  steps: WorkflowStep[];
  enabled: boolean;
  lastRunAt: string | null;
  runCount: number;
  runtimeStatus?: "idle" | "running" | "completed" | "failed";
  runtimeProgress?: { done: number; total: number; succeeded: number; failed: number; skipped: number } | null;
  runtimeDurationMs?: number | null;
  runtimeStartedAt?: string | null;
  history?: Array<{
    id: string;
    startedAt: string;
    finishedAt: string | null;
    status: "running" | "completed" | "failed";
    durationMs: number | null;
    progress: { done: number; total: number; succeeded: number; failed: number; skipped: number };
    summary: string;
  }>;
}


interface WorkflowStep {
  id: string;
  type: string;
  config: Record<string, any>;
  order: number;
}

const TRIGGER_TYPES = [
  { value: "schedule", label: "定时触发", icon: <Timer className="w-4 h-4" />, desc: "按 cron 表达式定期执行", gradient: "from-amber-500 to-orange-500" },
  { value: "event", label: "事件触发", icon: <Zap className="w-4 h-4" />, desc: "当特定事件发生时执行", gradient: "from-blue-500 to-cyan-500" },
  { value: "manual", label: "手动触发", icon: <Play className="w-4 h-4" />, desc: "由用户手动启动", gradient: "from-emerald-500 to-green-500" },
];

const STEP_TYPES = [
  { value: "github-scrape", label: "GitHub 采集", icon: <Search className="w-4 h-4" />, color: "text-gray-700 dark:text-gray-300", bg: "bg-gray-100 dark:bg-gray-800/60", border: "border-gray-200 dark:border-gray-700", gradient: "from-slate-500 to-gray-600", category: "data", categoryLabel: "数据" },
  { value: "ai-analyze", label: "AI 分析", icon: <Brain className="w-4 h-4" />, color: "text-purple-700 dark:text-purple-300", bg: "bg-purple-100 dark:bg-purple-900/50", border: "border-purple-200 dark:border-purple-800", gradient: "from-violet-500 to-purple-600", category: "ai", categoryLabel: "智能" },
  { value: "send-email", label: "发送邮件", icon: <Mail className="w-4 h-4" />, color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-100 dark:bg-blue-900/50", border: "border-blue-200 dark:border-blue-800", gradient: "from-blue-500 to-indigo-500", category: "action", categoryLabel: "动作" },
  { value: "classify-lead", label: "分类线索", icon: <Database className="w-4 h-4" />, color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-100 dark:bg-emerald-900/50", border: "border-emerald-200 dark:border-emerald-800", gradient: "from-emerald-500 to-teal-500", category: "data", categoryLabel: "数据" },
  { value: "delay", label: "等待延迟", icon: <Clock className="w-4 h-4" />, color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-100 dark:bg-amber-900/50", border: "border-amber-200 dark:border-amber-800", gradient: "from-amber-500 to-yellow-500", category: "control", categoryLabel: "控制" },
  { value: "condition", label: "条件判断", icon: <GitBranch className="w-4 h-4" />, color: "text-orange-700 dark:text-orange-300", bg: "bg-orange-100 dark:bg-orange-900/50", border: "border-orange-200 dark:border-orange-800", gradient: "from-orange-500 to-red-500", category: "control", categoryLabel: "控制" },
];

type AutoOutreachStatus = {
  status: "idle" | "running" | "paused" | "completed";
  runId?: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  durationMs?: number;
  progress?: { done: number; total: number; succeeded: number; failed: number; skipped: number };
  controls?: { paused: boolean; stopRequested: boolean; canPause: boolean; canResume: boolean; canStop: boolean };
  history?: Array<{
    id: string;
    startedAt: string;
    finishedAt: string | null;
    status: "running" | "completed" | "failed";
    durationMs: number | null;
    progress: { done: number; total: number; succeeded: number; failed: number; skipped: number };
    summary: string;
  }>;
};

function formatDuration(ms?: number | null) {
  if (!ms || ms < 0) return "--";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}


const PRESET_WORKFLOWS: Omit<WorkflowConfig, "id">[] = [
  {
    name: "固定模板逐个邀约发送（Zoho）",
    description: "按候选人列表顺序逐个发送固定模板邮件，支持仅未发送恢复、过滤 bot/noreply/脏邮箱，并适配 Zoho 慢速分批发送",
    trigger: "manual",
    enabled: true,
    lastRunAt: null,
    runCount: 0,
    steps: [
      { id: "s1", type: "condition", config: { requireEmail: true, resumeOnlyUnsent: true, filterInvalidEmail: true }, order: 1 },
      { id: "s2", type: "send-email", config: { mode: "fixed-template", provider: "zoho", batchSize: 5, delayMs: 180000 }, order: 2 },
    ],
  },
  {
    name: "固定模板逐个邀约发送（163）",
    description: "复制 Zoho 固定模板邀约流程，但单独使用 163 SMTP 发信；排除旧 611 人后，可针对新导入开发者以 30 秒间隔发送",
    trigger: "manual",
    enabled: true,
    lastRunAt: null,
    runCount: 0,
    steps: [
      { id: "s1", type: "condition", config: { requireEmail: true, excludeLegacy611: true, filterInvalidEmail: true }, order: 1 },
      { id: "s2", type: "send-email", config: { mode: "fixed-template", provider: "163", delayMs: 30000 }, order: 2 },
    ],
  },
  {
    name: "每日开发者采集 + AI分析",
    description: "每天早上9点自动搜索 GitHub 开发者并运行 AI 能力评估",
    trigger: "schedule",
    enabled: true,
    lastRunAt: null,
    runCount: 12,
    steps: [
      { id: "s1", type: "github-scrape", config: { query: "language:rust followers:>50", maxResults: 10 }, order: 1 },
      { id: "s2", type: "delay", config: { seconds: 5 }, order: 2 },
      { id: "s3", type: "ai-analyze", config: { model: "glm-4-plus", taskType: "analysis" }, order: 3 },
      { id: "s4", type: "classify-lead", config: { autoCreateLead: true }, order: 4 },
    ],
  },
  {
    name: "新线索自动跟进",
    description: "当新线索创建后24小时，如果未回复则自动发送跟进邮件",
    trigger: "event",
    enabled: true,
    lastRunAt: null,
    runCount: 7,
    steps: [
      { id: "s1", type: "condition", config: { field: "stage", operator: "eq", value: "NEW" }, order: 1 },
      { id: "s2", type: "delay", config: { hours: 24 }, order: 2 },
      { id: "s3", type: "condition", config: { field: "lastContactedAt", operator: "null_or_before", hoursAgo: 24 }, order: 3 },
      { id: "s4", type: "ai-analyze", config: { generateFollowup: true, templateId: "follow-up" }, order: 4 },
      { id: "s5", type: "send-email", config: {}, order: 5 },
    ],
  },
  {
    name: "周报数据同步",
    description: "每周一生成上周的客户增长数据报告并发送通知",
    trigger: "schedule",
    enabled: false,
    lastRunAt: null,
    runCount: 3,
    steps: [
      { id: "s1", type: "delay", config: {} as any, order: 1 },
      { id: "s2", type: "ai-analyze", config: { generateSummary: true, period: "week" }, order: 2 },
      { id: "s3", type: "send-email", config: { recipients: ["admin@example.com"], templateId: "weekly-report" }, order: 3 },
    ],
  },
];

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);
  const [zohoOutreachStatus, setZohoOutreachStatus] = useState<AutoOutreachStatus | null>(null);
  const [status163Outreach, setStatus163Outreach] = useState<AutoOutreachStatus | null>(null);

  // Zoho 工作流独立模板配置
  const [zohoSubject, setZohoSubject] = useState("你好，想就你 GitHub 上的项目先建立联系");
  const [zohoBody, setZohoBody] = useState("你好，我在 GitHub 看到你的主页并浏览了一些仓库，对你的项目实现思路很感兴趣，所以先写信跟你打个招呼、建立联系。后续如果我在使用或学习过程中整理了反馈、文档补充或改进点，也希望能和你交流。");
  const [zohoDelaySeconds, setZohoDelaySeconds] = useState("180");

  // 163 工作流独立模板配置
  const [subject163, setSubject163] = useState("你好，想就你 GitHub 上的项目先建立联系");
  const [body163, setBody163] = useState("你好，我在 GitHub 看到你的主页并浏览了一些仓库，对你的项目实现思路很感兴趣，所以先写信跟你打个招呼、建立联系。后续如果我在使用或学习过程中整理了反馈、文档补充或改进点，也希望能和你交流。");
  const [delay163Seconds, setDelay163Seconds] = useState("60");

  // 兼容旧引用（统一入口）
  const getFixedSubject = (is163: boolean) => is163 ? subject163 : zohoSubject;
  const getFixedBody = (is163: boolean) => is163 ? body163 : zohoBody;
  const getDelaySeconds = (is163: boolean) => is163 ? delay163Seconds : zohoDelaySeconds;
  const setFixedSubjectFn = (is163: boolean) => is163 ? setSubject163 : setZohoSubject;
  const setFixedBodyFn = (is163: boolean) => is163 ? setBody163 : setZohoBody;
  const setDelaySecondsFn = (is163: boolean) => is163 ? setDelay163Seconds : setZohoDelaySeconds;
  const [developerPickerOpen, setDeveloperPickerOpen] = useState(false);
  const [developerOptions, setDeveloperOptions] = useState<any[]>([]);
  const [selectedDeveloperIds, setSelectedDeveloperIds] = useState<Set<string>>(new Set());
  const [developerSearch, setDeveloperSearch] = useState("");
  const [selectingAllResults, setSelectingAllResults] = useState(false);
  const [developerTotalCount, setDeveloperTotalCount] = useState(0);




  const loadDeveloperOptions = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: "1", pageSize: "100", ...(developerSearch && { search: developerSearch }) });
      const res = await fetch(`/api/developers?${params}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setDeveloperOptions(data.data || []);
      setDeveloperTotalCount(data.pagination?.total || 0);
    } catch {
      // ignore developer picker load errors
    }
  }, [developerSearch]);

  const selectAllMatchingDevelopers = async () => {
    try {
      setSelectingAllResults(true);
      const ids: string[] = [];
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages) {
        const params = new URLSearchParams({ page: String(page), pageSize: "50", ...(developerSearch && { search: developerSearch }) });
        const res = await fetch(`/api/developers?${params}`, { cache: "no-store" });
        if (!res.ok) break;
        const data = await res.json();
        const rows = data.data || [];
        const pagination = data.pagination || {};
        totalPages = pagination.totalPages || 1;
        ids.push(...rows.map((d: any) => d.id).filter(Boolean));
        page += 1;
      }

      setSelectedDeveloperIds(new Set(ids));
    } finally {
      setSelectingAllResults(false);
    }
  };


  const toggleDeveloperSelection = (id: string) => {
    setSelectedDeveloperIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisibleDevelopers = () => {
    setSelectedDeveloperIds(new Set(developerOptions.map((d: any) => d.id)));
  };

  const clearSelectedDevelopers = () => {
    setSelectedDeveloperIds(new Set());
  };

  const loadAutoOutreachStatus = useCallback(async () => {
    try {
      const [zohoRes, workflow163Res] = await Promise.all([
        fetch("/api/automation/auto-outreach?workflowKey=zoho-fixed", { cache: "no-store" }),
        fetch("/api/automation/auto-outreach?workflowKey=163-fixed", { cache: "no-store" }),
      ]);

      if (zohoRes.ok) {
        const data = await zohoRes.json();
        setZohoOutreachStatus(data);
      }

      if (workflow163Res.ok) {
        const data = await workflow163Res.json();
        setStatus163Outreach(data);
      }
    } catch {
      // ignore polling errors
    }
  }, []);




  // Create form
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newTrigger, setNewTrigger] = useState("manual");
  const [selectedSteps, setSelectedSteps] = useState<string[]>(["github-scrape"]);

  useEffect(() => {
    setWorkflows(PRESET_WORKFLOWS.map((w, i) => ({
      ...w,
      id: `wf-${i + 1}`,
    })));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAutoOutreachStatus();
    const timer = setInterval(loadAutoOutreachStatus, 5000);
    return () => clearInterval(timer);
  }, [loadAutoOutreachStatus]);


  const handleCreate = () => {
    if (!newName.trim()) return;

    const newWorkflow: WorkflowConfig = {
      id: `wf-new-${Date.now()}`,
      name: newName.trim(),
      description: newDesc.trim() || null,
      trigger: newTrigger,
      steps: selectedSteps.map((type, i) => ({
        id: `step-${i}`,
        type,
        config: {},
        order: i + 1,
      })),
      enabled: true,
      lastRunAt: null,
      runCount: 0,
    };

    setWorkflows((prev) => [...prev, newWorkflow]);
    setCreateOpen(false);
    setNewName("");
    setNewDesc("");
    setSelectedSteps(["github-scrape"]);
  };

  const toggleEnabled = (id: string) => {
    setWorkflows((prev) =>
      prev.map((wf) => (wf.id === id ? { ...wf, enabled: !wf.enabled } : wf))
    );
  };

  const runWorkflow = async (id: string) => {
    try {
      const workflow = workflows.find((w) => w.id === id);
      if (!workflow) return;

      // 特殊工作流：固定模板逐个邀约发送
      const isZohoFixedWorkflow = workflow.name === "固定模板逐个邀约发送（Zoho）";
      const is163FixedWorkflow = workflow.name === "固定模板逐个邀约发送（163）";
      if (isZohoFixedWorkflow || is163FixedWorkflow) {
        const is163 = !!is163FixedWorkflow;
        const delayMsValue = Math.max(5000, (parseInt(getDelaySeconds(is163), 10) || (is163 ? 60 : 180)) * 1000);
        const selectedIds = Array.from(selectedDeveloperIds);

        const payload: Record<string, any> = {
          workflowKey: is163 ? "163-fixed" : "zoho-fixed",
          templateName: is163 ? "fixed-163-outreach" : "fixed",


          limit: selectedIds.length > 0 ? selectedIds.length : 9999,
          offset: 0,
          dryRun: false,
          delayMs: delayMsValue,
          requireEmail: true,
          resumeOnlyUnsent: selectedIds.length === 0,
          fixedSubject: getFixedSubject(is163).trim() || "你好，想就你 GitHub 上的项目先建立联系",
          fixedBody: getFixedBody(is163).trim() || "你好，我在 GitHub 看到你的主页并浏览了一些仓库，对你的项目实现思路很感兴趣，所以先写信跟你打个招呼、建立联系。后续如果我在使用或学习过程中整理了反馈、文档补充或改进点，也希望能和你交流。",
        };

        if (selectedIds.length > 0) {
          payload.selectedDeveloperIds = selectedIds;
        }

        if (is163FixedWorkflow) {
          payload.smtpOverride = {
            host: "smtp.163.com",
            port: 465,
            user: "kingston2026@163.com",
            pass: "VXTQhPdcFJFNeXv2",
            from: "Kingston <kingston2026@163.com>",
          };
        }

        const res = await fetch("/api/automation/auto-outreach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          alert(`已启动！\n\n通道：${is163FixedWorkflow ? "163" : "Zoho"}\n主题：${payload.fixedSubject}\n发送间隔：${getDelaySeconds(is163)} 秒\n目标：${selectedIds.length > 0 ? `已选 ${selectedIds.length} 位开发者` : "所有未成功发送的候选人"}`);
        } else {
          const err = await res.json().catch(() => ({}));
          alert(`启动失败: ${err.error || res.statusText}`);
        }
        return;
      }

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: id }),
      });
      if (res.ok) {
        alert("工作流已触发！");
      }
    } catch {
      alert("触发工作流失败，请稍后重试");
    }
  };

  const controlFixedWorkflow = async (workflowKey: "zoho-fixed" | "163-fixed", action: "pause" | "resume" | "stop") => {
    try {
      const res = await fetch("/api/automation/auto-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowKey, action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || `${action} 操作失败`);
        return;
      }
      await loadAutoOutreachStatus();
    } catch {
      alert(`${action} 操作失败，请稍后重试`);
    }
  };

  const deleteWorkflow = (id: string) => {
    if (!confirm("确定删除此工作流？")) return;
    setWorkflows((prev) => prev.filter((wf) => wf.id !== id));
  };

  const toggleStepSelection = (stepType: string) => {
    if (selectedSteps.includes(stepType)) {
      setSelectedSteps(selectedSteps.filter((s) => s !== stepType));
    } else {
      setSelectedSteps([...selectedSteps, stepType]);
    }
  };

  // Stats
  const stats = {
    total: workflows.length,
    enabled: workflows.filter((w) => w.enabled).length,
    disabled: workflows.filter((w) => !w.enabled).length,
    totalRuns: workflows.reduce((s, w) => s + w.runCount, 0),
  };

  return (
    <div className="space-y-6">
      {/* ===== Header — Brand Gradient ===== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span>
              自动化<span className="gradient-text">工作流</span>
            </span>
          </h1>
          <p className="text-muted-foreground mt-1 ml-[44px]">
            配置自动化规则，让系统自动完成重复任务 · 共 <span className="font-semibold tabular-nums text-foreground">{stats.total}</span> 个
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-500/20 px-4 cursor-pointer outline-none">
            <Plus className="w-4 h-4" />新建工作流
          </DialogTrigger>
          <DialogContent className="sm:max-w-[580px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                新建工作流
              </DialogTitle>
              <DialogDescription>配置自动化流程的触发条件和步骤</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Basic Info */}
              <div className="space-y-2">
                <Label htmlFor="wf-name">工作流名称 *</Label>
                <Input
                  id="wf-name"
                  placeholder="例如：每日开发者采集"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wf-desc">描述</Label>
                <Textarea
                  id="wf-desc"
                  rows={2}
                  placeholder="这个工作流做什么..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="rounded-lg"
                />
              </div>

              {/* Trigger */}
              <div className="space-y-2">
                <Label>触发方式</Label>
                <Select value={newTrigger} onValueChange={(v) => setNewTrigger(v || "manual")}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.icon} {t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-amber-500" />
                  {TRIGGER_TYPES.find((t) => t.value === newTrigger)?.desc}
                </p>
              </div>

              {/* Step Selection — Grid with categories */}
              <div className="space-y-2">
                <Label>选择步骤（按顺序执行）</Label>
                <div className="grid grid-cols-2 gap-2.5">
                  {STEP_TYPES.map((st) => (
                    <button
                      key={st.value}
                      onClick={() => toggleStepSelection(st.value)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left group ${
                        selectedSteps.includes(st.value)
                          ? `${st.border} ${st.bg} ring-1 ring-offset-1 ring-offset-background`
                          : "border-border/60 bg-background hover:bg-muted/40 hover:border-border"
                      }`}
                    >
                      <span className={`${st.bg} ${st.color} p-2 rounded-lg shrink-0 group-hover:scale-110 transition-transform`}>{st.icon}</span>
                      <div className="min-w-0 flex-1">
                        <span className={`text-sm font-medium block truncate`}>{st.label}</span>
                        <span className={`text-[10px] text-muted-foreground`}>{st.categoryLabel}</span>
                      </div>
                      {selectedSteps.includes(st.value) && (
                        <CheckCircle2 className="w-4 h-4 ml-auto shrink-0 text-primary" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Selected Steps Preview — Flow visualization */}
              {selectedSteps.length > 0 && (
                <div className="rounded-xl bg-gradient-to-r from-amber-50/30 via-orange-50/20 to-red-50/10 dark:from-amber-950/10 dark:to-red-950/5 p-4 space-y-2 border border-amber-200/30 dark:border-amber-800/15">
                  <Label className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3 h-3" /> 执行流程预览
                  </Label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {selectedSteps.map((type, i) => {
                      const st = STEP_TYPES.find((s) => s.value === type)!;
                      return (
                        <div key={type} className="flex items-center gap-1">
                          <Badge variant="secondary" className={`${st.bg} ${st.color} border-transparent gap-1.5 px-2.5 py-1 text-xs font-medium`}>
                            <span>{st.icon}</span>
                            {st.label}
                          </Badge>
                          {i < selectedSteps.length - 1 && (
                            <ArrowRight className="w-3.5 h-3.5 text-amber-400 dark:text-amber-600" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-lg">取消</Button>
              <Button
                onClick={handleCreate}
                disabled={!newName.trim() || selectedSteps.length === 0}
                className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-lg"
              >
                创建工作流
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ===== Stats Cards — Premium ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 group hover:-translate-y-0.5">
          <CardContent className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/20 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">总工作流</p>
              <p className="text-3xl font-black tabular-nums mt-1 text-amber-700 dark:text-amber-300">{stats.total}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25 group-hover:scale-110 transition-transform duration-300">
              <Bot className="w-5 h-5 text-white" />
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 group hover:-translate-y-0.5">
          <CardContent className="p-5 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/20 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">已启用</p>
              <p className="text-3xl font-black tabular-nums mt-1 text-emerald-600 dark:text-emerald-400">{stats.enabled}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform duration-300 relative">
              <Play className="w-5 h-5 text-white" />
              {stats.enabled > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse ring-2 ring-background" />}
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 group hover:-translate-y-0.5">
          <CardContent className="p-5 bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-950/40 dark:to-gray-950/20 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">已禁用</p>
              <p className="text-3xl font-black tabular-nums mt-1 text-slate-500 dark:text-slate-400">{stats.disabled}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-400 to-gray-500 flex items-center justify-center shadow-lg shadow-slate-500/25 group-hover:scale-110 transition-transform duration-300">
              <Pause className="w-5 h-5 text-white" />
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 group hover:-translate-y-0.5">
          <CardContent className="p-5 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-950/20 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">总执行次数</p>
              <p className="text-3xl font-black tabular-nums mt-1 text-indigo-700 dark:text-indigo-300">{stats.totalRuns}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 group-hover:scale-110 transition-transform duration-300">
              <Activity className="w-5 h-5 text-white" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== Workflows List — Premium Cards with Visual Flow ===== */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse overflow-hidden border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-muted rounded-lg" />
                  <div className="h-5 bg-muted rounded-lg w-48" />
                  <div className="h-6 bg-muted rounded-full w-16 ml-auto" />
                </div>
                <div className="h-20 bg-muted rounded-xl" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <Card className="border-dashed border-2 border-amber-200/60 dark:border-amber-800/30 bg-gradient-to-b from-amber-50/30 to-transparent dark:from-amber-950/10">
          <CardContent className="flex flex-col items-center py-16">
            <div className="w-16 h-16 rounded-2xl mx-auto bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900 dark:to-orange-900 flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="font-semibold text-lg mb-1">还没有工作流</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm text-center">创建你的第一个自动化工作流，让重复任务自动完成</p>
            <Button onClick={() => setCreateOpen(true)} className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl gap-2">
              <Plus className="w-4 h-4" /> 创建第一个工作流
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {workflows.map((workflow) => {
            const isExpanded = expandedWorkflow === workflow.id;
            const triggerInfo = TRIGGER_TYPES.find((t) => t.value === workflow.trigger);
            const isFixedOutreachWorkflow = workflow.name === "固定模板逐个邀约发送（Zoho）" || workflow.name === "固定模板逐个邀约发送（163）";
            const isZohoWorkflow = workflow.name === "固定模板逐个邀约发送（Zoho）";
            const is163Workflow = workflow.name === "固定模板逐个邀约发送（163）";
            const runtimeSource = isZohoWorkflow ? zohoOutreachStatus : is163Workflow ? status163Outreach : null;
            const runtimeStatus = isFixedOutreachWorkflow ? runtimeSource?.status ?? "idle" : (workflow.enabled ? "running" : "idle");
            const runtimeProgress = isFixedOutreachWorkflow ? runtimeSource?.progress ?? null : null;
            const runtimeDurationMs = isFixedOutreachWorkflow ? runtimeSource?.durationMs ?? null : null;
            const runtimeHistory = isFixedOutreachWorkflow ? runtimeSource?.history ?? [] : [];

            return (

              <Card
                key={workflow.id}
                className={`overflow-hidden transition-all duration-300 ${
                  isExpanded ? "border-2 border-amber-300/40 dark:border-amber-700/30 shadow-xl shadow-amber-500/5" : "border-0 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                }`}
              >
                {/* Color accent bar */}
                <div className={`h-1 bg-gradient-to-r ${triggerInfo?.gradient || "from-gray-400 to-gray-500"} ${!workflow.enabled ? 'opacity-40' : ''}`} />

                {/* Header Row */}
                <div
                  className="px-5 py-4 cursor-pointer hover:bg-muted/20 transition-colors select-none"
                  onClick={() => setExpandedWorkflow(isExpanded ? null : workflow.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-amber-500" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>

                      {/* Status indicator */}
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-offset-1 ring-offset-background ${workflow.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="font-bold text-base truncate">{workflow.name}</h3>
                          <Badge variant="outline" className={`gap-1.5 text-[11px] font-medium shrink-0 bg-gradient-to-r ${(triggerInfo?.gradient || "")} text-white border-transparent shadow-sm`}>
                            {triggerInfo?.icon} {triggerInfo?.label}
                          </Badge>
                          {isFixedOutreachWorkflow ? (
                            <Badge className={`gap-1 text-[11px] font-medium border-transparent ${
                              runtimeStatus === "running"
                                ? "bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                                : runtimeStatus === "completed"
                                  ? "bg-blue-100/80 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400"
                                  : "bg-slate-100/80 dark:bg-slate-900/40 text-slate-700 dark:text-slate-400"
                            }`}>
                              <Activity className="w-3 h-3" />
                              {runtimeStatus === "running" ? "运行中" : runtimeStatus === "paused" ? "已暂停" : runtimeStatus === "completed" ? "最近已完成" : "空闲"}
                            </Badge>
                          ) : workflow.enabled && (
                            <Badge className="gap-1 text-[11px] font-medium bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-transparent">
                              <Activity className="w-3 h-3" /> 运行中
                            </Badge>
                          )}
                        </div>
                        {workflow.description && (
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{workflow.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="text-[11px] text-muted-foreground hidden md:flex items-center gap-1 font-mono tabular-nums">
                        <RefreshCw className="w-3 h-3" /> {workflow.runCount} 次
                      </span>

                      <Switch
                        checked={workflow.enabled}
                        onCheckedChange={() => toggleEnabled(workflow.id)}
                        onClick={(e) => e.stopPropagation()}
                      />

                      {isFixedOutreachWorkflow && runtimeSource?.controls?.canPause && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30"
                          onClick={(e) => { e.stopPropagation(); controlFixedWorkflow(is163Workflow ? "163-fixed" : "zoho-fixed", "pause"); }}
                        >
                          <Pause className="w-3.5 h-3.5 mr-1" /> 暂停
                        </Button>
                      )}

                      {isFixedOutreachWorkflow && runtimeSource?.controls?.canResume && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                          onClick={(e) => { e.stopPropagation(); controlFixedWorkflow(is163Workflow ? "163-fixed" : "zoho-fixed", "resume"); }}
                        >
                          <Play className="w-3.5 h-3.5 mr-1" /> 继续
                        </Button>
                      )}

                      {isFixedOutreachWorkflow && runtimeSource?.controls?.canStop && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs rounded-lg text-destructive/80 hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={(e) => { e.stopPropagation(); controlFixedWorkflow(is163Workflow ? "163-fixed" : "zoho-fixed", "stop"); }}
                        >
                          <Square className="w-3.5 h-3.5 mr-1" /> 中止
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg"
                        disabled={!workflow.enabled || (isFixedOutreachWorkflow && runtimeStatus === "running")}
                        onClick={(e) => { e.stopPropagation(); runWorkflow(workflow.id); }}
                      >
                        <Play className="w-3.5 h-3.5 mr-1" /> 运行
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-destructive/70 hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg"
                        onClick={(e) => { e.stopPropagation(); deleteWorkflow(workflow.id); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Content — Premium Visual Flow Editor */}
                {isExpanded && (
                  <div className="px-5 pb-6 pt-3 border-t border-border/30 space-y-5">
                    {/* Fixed Template Config Panel */}
                    {isFixedOutreachWorkflow && (
                      <div className={`rounded-2xl border ${is163Workflow ? 'border-green-200/50 dark:border-green-800/30 bg-gradient-to-br from-green-50/60 to-emerald-50/30 dark:from-green-950/10 dark:to-emerald-950/5' : 'border-blue-200/50 dark:border-blue-800/30 bg-gradient-to-br from-blue-50/60 to-indigo-50/30 dark:from-blue-950/10 dark:to-indigo-950/5'} p-4 space-y-4`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Edit3 className="w-4 h-4 text-blue-500" />
                          <h4 className="text-sm font-semibold">固定模板配置 — {is163Workflow ? "163 邮箱" : "Zoho 邮箱"} <span className="text-[11px] font-normal text-muted-foreground">（独立配置，互不影响）</span></h4>
                        </div>

                        {/* Subject */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">邮件主题</label>
                          <Input
                            value={is163Workflow ? subject163 : zohoSubject}
                            onChange={(e) => is163Workflow ? setSubject163(e.target.value) : setZohoSubject(e.target.value)}
                            placeholder="输入邮件主题..."
                            className="h-9 text-sm"
                          />
                        </div>

                        {/* Body */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground">邮件正文</label>
                          <Textarea
                            value={is163Workflow ? body163 : zohoBody}
                            onChange={(e) => is163Workflow ? setBody163(e.target.value) : setZohoBody(e.target.value)}
                            placeholder="输入邮件正文..."
                            rows={4}
                            className="text-sm resize-none"
                          />
                        </div>

                        {/* Delay + Developer Picker Row */}
                        <div className="flex items-end gap-3 flex-wrap">
                          <div className="space-y-1.5 flex-1 min-w-[140px]">
                            <label className="text-xs font-medium text-muted-foreground">发送间隔（秒）</label>
                            <Input
                              type="number"
                              value={is163Workflow ? delay163Seconds : zohoDelaySeconds}
                              onChange={(e) => is163Workflow ? setDelay163Seconds(e.target.value) : setZohoDelaySeconds(e.target.value)}
                              placeholder={is163Workflow ? "60" : "180"}
                              min={5}
                              max={3600}
                              className="h-9 text-sm"
                            />
                          </div>
                          <Dialog open={developerPickerOpen} onOpenChange={(open) => { setDeveloperPickerOpen(open); if (open) loadDeveloperOptions(); }}>
                            <DialogTrigger>
                              <Button variant="outline" className="gap-2 h-9 text-sm whitespace-nowrap border-blue-300/50 hover:bg-blue-50 dark:hover:bg-blue-950/20">
                                <Users className="w-4 h-4" />
                                选择开发者
                                {selectedDeveloperIds.size > 0 && (
                                  <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 text-[11px] tabular-nums">{selectedDeveloperIds.size}</Badge>
                                )}
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[640px] max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>选择开发者</DialogTitle>
                                <DialogDescription>勾选要发送的开发者。当前列表接口单页最多返回 50 条；可使用“全选全部结果”跨页选中全部搜索结果。</DialogDescription>
                              </DialogHeader>

                              <div className="space-y-3">
                                {/* Search + Actions */}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Input
                                    value={developerSearch}
                                    onChange={(e) => setDeveloperSearch(e.target.value)}
                                    placeholder="搜索用户名 / 显示名 / 邮箱..."
                                    className="h-8 text-sm flex-1 min-w-[220px]"
                                  />
                                  <Button size="sm" variant="outline" onClick={() => loadDeveloperOptions()} className="shrink-0 gap-1 h-8">
                                    <Search className="w-3 h-3" /> 搜索
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={selectAllVisibleDevelopers} className="shrink-0 gap-1 h-8">
                                    全选当前页（{developerOptions.length}）
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={selectAllMatchingDevelopers} disabled={selectingAllResults} className="shrink-0 gap-1 h-8">
                                    {selectingAllResults ? "全选中..." : `全选全部结果（${developerTotalCount}）`}
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={clearSelectedDevelopers} className="shrink-0 gap-1 h-8">
                                    清空
                                  </Button>
                                </div>

                                {/* Developer List */}
                                <div className="rounded-xl border border-border/60 max-h-[320px] overflow-y-auto divide-y divide-border/40">
                                  {developerOptions.length === 0 ? (
                                    <div className="p-6 text-center text-sm text-muted-foreground">暂无开发者数据，请尝试搜索或刷新</div>
                                  ) : developerOptions.map((dev: any) => {
                                    const isSelected = selectedDeveloperIds.has(dev.id);
                                    return (
                                      <div
                                        key={dev.id}
                                        className={`flex items-start gap-3 p-3 cursor-pointer transition-colors ${isSelected ? "bg-blue-50/70 dark:bg-blue-900/15" : "hover:bg-muted/30"}`}
                                        onClick={() => toggleDeveloperSelection(dev.id)}
                                      >
                                        <Checkbox checked={isSelected} className="mt-0.5 shrink-0" />
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium truncate">{dev.display_name || dev.username}</span>
                                            <span className="text-[11px] text-muted-foreground truncate font-mono">@{dev.username}</span>
                                          </div>
                                          {(dev as any).email && (
                                            <p className="text-xs text-muted-foreground mt-0.5 truncate font-mono">{(dev as any).email}</p>
                                          )}
                                          {(dev as any).bio && (
                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{(dev as any).bio}</p>
                                          )}
                                          {(dev as any).skillTags?.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                              {(dev as any).skillTags.slice(0, 5).map((tag: string, i: number) => (
                                                <Badge key={i} variant="secondary" className="text-[10px] px-1.5 py-0">{tag}</Badge>
                                              ))}
                                              {(dev as any).skillTags.length > 5 && (
                                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">+{(dev as any).skillTags.length - 5}</Badge>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Footer Summary */}
                                <div className="flex items-center justify-between pt-1 border-t border-border/40">
                                  <span className="text-xs text-muted-foreground">
                                    当前页加载 {developerOptions.length} 位开发者，已选择 <strong>{selectedDeveloperIds.size}</strong> 位
                                  </span>
                                  <Button size="sm" onClick={() => setDeveloperPickerOpen(false)}>确认选择</Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    )}

                    {/* Runtime Status Panel */}
                    {isFixedOutreachWorkflow && (
                      <div className="rounded-2xl border border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-br from-amber-50/60 to-orange-50/30 dark:from-amber-950/10 dark:to-orange-950/5 p-4 space-y-4">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div>
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                              <Activity className="w-4 h-4 text-amber-500" /> 当前运行状态
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">实时轮询 /api/automation/auto-outreach</p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline">状态：{runtimeStatus === "running" ? "运行中" : runtimeStatus === "paused" ? "已暂停" : runtimeStatus === "completed" ? "已完成" : "空闲"}</Badge>
                            <Badge variant="outline">本次运行时长：{formatDuration(runtimeDurationMs)}</Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                          <div className="rounded-xl bg-background/70 p-3 border border-border/50">
                            <p className="text-[11px] text-muted-foreground uppercase">已处理</p>
                            <p className="text-xl font-bold tabular-nums">{runtimeProgress?.done ?? 0}/{runtimeProgress?.total ?? 0}</p>
                          </div>
                          <div className="rounded-xl bg-background/70 p-3 border border-border/50">
                            <p className="text-[11px] text-muted-foreground uppercase">成功</p>
                            <p className="text-xl font-bold tabular-nums text-emerald-600">{runtimeProgress?.succeeded ?? 0}</p>
                          </div>
                          <div className="rounded-xl bg-background/70 p-3 border border-border/50">
                            <p className="text-[11px] text-muted-foreground uppercase">失败</p>
                            <p className="text-xl font-bold tabular-nums text-red-600">{runtimeProgress?.failed ?? 0}</p>
                          </div>
                          <div className="rounded-xl bg-background/70 p-3 border border-border/50">
                            <p className="text-[11px] text-muted-foreground uppercase">剩余</p>
                            <p className="text-xl font-bold tabular-nums text-slate-700 dark:text-slate-300">{Math.max(0, (runtimeProgress?.total ?? 0) - (runtimeProgress?.done ?? 0))}</p>
                          </div>
                          <div className="rounded-xl bg-background/70 p-3 border border-border/50">
                            <p className="text-[11px] text-muted-foreground uppercase">发信配置</p>
                            <p className="text-sm font-semibold">{is163Workflow ? "163 固定模板" : "Zoho 固定模板"}</p>
                            <p className="text-[11px] text-muted-foreground mt-1">间隔 {getDelaySeconds(is163Workflow)}s · {is163Workflow ? "kingston2026@163.com" : "Zoho"}</p>
                          </div>
                          <div className="rounded-xl bg-background/70 p-3 border border-border/50">
                            <p className="text-[11px] text-muted-foreground uppercase">刷新</p>
                            <Button size="sm" variant="outline" className="mt-1 h-8 text-xs" onClick={(e) => { e.stopPropagation(); loadAutoOutreachStatus(); }}>
                              <RefreshCw className="w-3 h-3 mr-1" /> 刷新
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">历史运行记录</h5>
                            <span className="text-[11px] text-muted-foreground">最近 {runtimeHistory.length} 次</span>
                          </div>
                          {runtimeHistory.length === 0 ? (
                            <div className="text-sm text-muted-foreground rounded-xl border border-dashed p-4">暂无历史记录</div>
                          ) : (
                            <div className="space-y-2">
                              {runtimeHistory.slice(0, 5).map((item) => (
                                <div key={item.id} className="rounded-xl border border-border/60 bg-background/70 p-3 flex flex-col gap-2">
                                  <div className="flex items-center justify-between gap-3 flex-wrap">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge variant="outline">{item.status === "running" ? "运行中" : item.status === "failed" ? "失败" : "已完成"}</Badge>
                                      <span className="text-xs text-muted-foreground font-mono">{new Date(item.startedAt).toLocaleString("zh-CN")}</span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">本次运行时长：{formatDuration(item.durationMs)}</span>
                                  </div>
                                  <div className="text-sm font-medium">
                                    本次发送 {item.progress.done} 封邮件
                                  </div>
                                  <div className="text-[11px] text-muted-foreground tabular-nums">
                                    成功 {item.progress.succeeded} · 失败 {item.progress.failed} · 跳过 {item.progress.skipped} · 总任务数 {item.progress.total}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {item.summary}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Steps Flow Visualization */}

                    <div className="py-2">
                      <h4 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-amber-500" />
                        执行流程 ({workflow.steps.length} 步骤)
                      </h4>

                      {/* Horizontal flow diagram */}
                      <div className="overflow-x-auto pb-2">
                        <div className="flex items-start gap-1 min-w-max px-1">
                          {/* Trigger Node */}
                          <div className="flex flex-col items-center">
                            <div className={`rounded-xl border-2 border-dashed px-4 py-3 text-center min-w-[120px] bg-gradient-to-br ${(triggerInfo?.gradient || "").replace("from-", "from-").replace("to-", "to-/30")} bg-opacity-10`}>
                              <div className="flex items-center justify-center gap-1.5 font-bold text-sm text-foreground">
                                <Zap className="w-4 h-4 text-amber-500" />
                                触发器
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-1">{triggerInfo?.label}</p>
                            </div>
                          </div>

                          {/* Connector */}
                          <div className="flex items-center self-center py-6">
                            <ArrowRight className="w-5 h-5 text-muted-foreground/40" />
                          </div>

                          {/* Step Nodes */}
                          {workflow.steps.map((step, idx) => {
                            const stepDef = STEP_TYPES.find((s) => s.value === step.type);
                            const isLast = idx === workflow.steps.length - 1;

                            return (
                              <div key={step.id} className="flex items-center">
                                <div className="flex flex-col items-center group relative">
                                  <div
                                    className={`rounded-xl border-2 px-4 py-3 text-center min-w-[130px] transition-all duration-200 hover:scale-105 hover:shadow-lg ${stepDef?.border || ""} ${stepDef?.bg || "bg-muted"} hover:${stepDef?.bg || "hover:bg-muted"}`}
                                  >
                                    <div className="flex items-center justify-between w-full mb-1">
                                      <GripVertical className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                      <span className={`text-[10px] font-black font-mono tabular-nums px-1.5 py-0.5 rounded-md bg-foreground/5`}>
                                        #{idx + 1}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-center gap-1.5 font-semibold text-sm">
                                      {stepDef?.icon || <Settings2 className="w-4 h-4" />}
                                      {stepDef?.label || step.type}
                                    </div>
                                  </div>
                                  {/* Config preview */}
                                  {Object.keys(step.config).length > 0 && (
                                    <div className="mt-1.5 max-w-[130px]">
                                      <span className={`inline-block text-[10px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md truncate max-w-full`}>
                                        {JSON.stringify(step.config).substring(0, 25)}...
                                      </span>
                                    </div>
                                  )}
                                </div>

                                {!isLast && (
                                  <div className="flex items-center self-center py-6 mx-0.5">
                                    <ArrowRight className="w-5 h-5 text-amber-400/50" />
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* End Node */}
                          {!workflow.steps.some(
                            (s) => s.type === "send-email" || s.type === "classify-lead"
                          ) && (
                            <>
                              <div className="flex items-center self-center py-6 mx-0.5">
                                <ArrowRight className="w-5 h-5 text-muted-foreground/40" />
                              </div>
                              <div className="rounded-xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/10 px-4 py-3 text-center">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                                <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold mt-1">完成</p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions Bar */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/30">
                      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                        {workflow.lastRunAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            上次运行：<span className="font-mono">{new Date(workflow.lastRunAt).toLocaleString("zh-CN")}</span>
                          </span>
                        )}
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          {workflow.steps.length} 步骤
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="text-xs h-8 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/30">
                          <Edit3 className="w-3 h-3 mr-1" /> 编辑步骤
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs h-8 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30">
                          <Eye className="w-3 h-3 mr-1" /> 运行日志
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ===== Tips Card — Premium ===== */}
      <Card className="overflow-hidden border-0 shadow-sm">
        <div className="bg-gradient-to-r from-amber-50/80 via-orange-50/50 to-red-50/30 dark:from-amber-950/20 dark:via-orange-950/10 dark:to-red-950/5 px-5 py-4 flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0 mt-0.5">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-900 dark:text-amber-200">💡 工作流提示</p>
            <p className="text-xs text-amber-800/70 dark:text-amber-300/70 mt-1 leading-relaxed">
              你可以将「GitHub 采集 → AI 分析 → 分类 → 邮件跟进」组合成一个完整的自动化管道。
              定时工作流需要配置环境变量中的 CRON 调度服务。推荐使用每日定时 + 事件触发的混合模式获得最佳效果。
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
