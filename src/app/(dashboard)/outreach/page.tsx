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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Mail,
  Send,
  Search,
  Plus,
  Inbox,
  Clock,
  CheckCircle2,
  Eye,
  AlertCircle,
  MessageSquare,
  RefreshCw,
  Sparkles,
  FileText,
  ArrowUpRight,
  Zap,
  UserPlus,
} from "lucide-react";

interface OutreachLog {
  id: string;
  targetType: string;
  targetId: string;
  channel: string;
  subject: string | null;
  body: string | null;
  templateId: string | null;
  aiGenerated: boolean;
  status: string;
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  repliedAt: string | null;
  bouncedAt: string | null;
  error: string | null;
  campaignId: string | null;
  campaign?: { id: string; name: string };
  createdAt: string;
}

const CHANNEL_CONFIG: Record<string, { label: string; icon: React.ReactNode; gradient: string }> = {
  EMAIL: { label: "邮件", icon: <Mail className="w-3.5 h-3.5" />, gradient: "from-blue-500 to-indigo-500" },
  LINKEDIN_DM: { label: "LinkedIn", icon: <MessageSquare className="w-3.5 h-3.5" />, gradient: "from-sky-500 to-cyan-500" },
  TWITTER_DM: { label: "Twitter DM", icon: <MessageSquare className="w-3.5 h-3.5" />, gradient: "from-cyan-400 to-teal-500" },
  WECHAT: { label: "微信", icon: <MessageSquare className="w-3.5 h-3.5" />, gradient: "from-green-500 to-emerald-500" },
  SMS: { label: "短信", icon: <MessageSquare className="w-3.5 h-3.5" />, gradient: "from-orange-500 to-amber-500" },
  IN_APP: { label: "站内信", icon: <Inbox className="w-3.5 h-3.5" />, gradient: "from-purple-500 to-violet-500" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dotColor: string; icon: React.ReactNode }> = {
  PENDING: { label: "待发送", color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-100 dark:bg-gray-800/60", dotColor: "bg-gray-400", icon: <Clock className="w-3 h-3" /> },
  QUEUED: { label: "队列中", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100/80 dark:bg-amber-900/40", dotColor: "bg-amber-400", icon: <Clock className="w-3 h-3" /> },
  SENT: { label: "已发送", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100/80 dark:bg-blue-900/40", dotColor: "bg-blue-500", icon: <Send className="w-3 h-3" /> },
  DELIVERED: { label: "已送达", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-100/80 dark:bg-indigo-900/40", dotColor: "bg-indigo-500", icon: <CheckCircle2 className="w-3 h-3" /> },
  OPENED: { label: "已打开", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100/80 dark:bg-emerald-900/40", dotColor: "bg-emerald-500", icon: <Eye className="w-3 h-3" /> },
  REPLIED: { label: "已回复", color: "text-green-600 dark:text-green-400", bg: "bg-green-100/80 dark:bg-green-900/40", dotColor: "bg-green-500 animate-pulse", icon: <CheckCircle2 className="w-3 h-3" /> },
  BOUNCED: { label: "退信", color: "text-red-500 dark:text-red-400", bg: "bg-red-100/80 dark:bg-red-900/40", dotColor: "bg-red-500", icon: <AlertCircle className="w-3 h-3" /> },
  FAILED: { label: "失败", color: "text-red-600 dark:text-red-400", bg: "bg-red-100/80 dark:bg-red-900/40", dotColor: "bg-red-500", icon: <AlertCircle className="w-3 h-3" /> },
  CANCELLED: { label: "已取消", color: "text-gray-400 dark:text-gray-500", bg: "bg-gray-100/50 dark:bg-gray-800/30", dotColor: "bg-gray-300", icon: <Clock className="w-3 h-3" /> },
};

// Timeline step component
function TimelineStep({ label, time, isActive, isLast, color }: { label: string; time?: string | null; isActive: boolean; isLast: boolean; color: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-2.5 h-2.5 rounded-full ring-2 ring-background ${isActive ? color : 'bg-muted'}`} />
        {!isLast && <div className={`w-0.5 h-6 mt-1 ${isActive ? `bg-${color.split('-')[1]}-200 dark:bg-${color.split('-')[1]}-800` : 'bg-muted'}`} />}
      </div>
      <div className="flex-1 pb-4">
        <p className={`text-xs font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</p>
        {time && <p className={`text-[11px] font-mono ${isActive ? 'text-foreground/70' : 'text-muted-foreground/60'} mt-0.5`}>{new Date(time).toLocaleString("zh-CN")}</p>}
      </div>
    </div>
  );
}

export default function OutreachPage() {
  const [logs, setLogs] = useState<OutreachLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Compose dialog
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeForm, setComposeForm] = useState({
    targetType: "LEAD",
    targetId: "",
    channel: "EMAIL",
    subject: "",
    body: "",
    templateId: "",
  });
  const [sending, setSending] = useState(false);
  const [targets, setTargets] = useState<Array<{ id: string; displayName: string; email: string | null }>>([]);

  // 手动输入邮箱模式
  const [manualEmailMode, setManualEmailMode] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [manualName, setManualName] = useState("");

  // Detail view
  const [selectedLog, setSelectedLog] = useState<OutreachLog | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (search) params.set("search", search);
      if (channelFilter !== "all") params.set("channel", channelFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/outreach?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch outreach logs:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, channelFilter, statusFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Fetch targets for compose (switches API based on targetType)
  useEffect(() => {
    if (composeOpen) {
      const apiUrl = composeForm.targetType === "DEVELOPER"
        ? "/api/developers?limit=100"
        : "/api/leads?limit=50";

      fetch(apiUrl)
        .then((res) => res.json())
        .then((data) => {
          if (composeForm.targetType === "DEVELOPER") {
            // /api/developers returns { data: [...], ... }
            setTargets((data.data || []).map((d: any) => ({
              id: d.id,
              displayName: d.displayName || d.username || d.id,
              email: d.email || null,
            })));
          } else {
            // /api/leads returns { data: [...], ... }
            setTargets((data.data || []).map((l: any) => ({
              id: l.id,
              displayName: l.contactName || l.name || l.companyName || l.id,
              email: l.contactEmail || l.email || null,
            })));
          }
        })
        .catch(() => {});
      // Reset target selection when type changes
      if (composeForm.targetId) {
        setComposeForm(prev => ({ ...prev, targetId: "" }));
      }
    }
  }, [composeOpen, composeForm.targetType]);

  const handleSend = async () => {
    // 校验：手动模式检查邮箱，选择模式检查 targetId
    if (manualEmailMode) {
      if (!manualEmail.trim() || !composeForm.body) return;
      // 简单的邮箱格式校验
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(manualEmail.trim())) {
        alert("请输入有效的邮箱地址");
        return;
      }
    } else {
      if (!composeForm.targetId || !composeForm.body) return;
    }

    setSending(true);
    try {
      // 手动模式：将邮箱作为自定义目标传递
      const payload = manualEmailMode
        ? {
            ...composeForm,
            targetId: `manual_${Date.now()}`,
            targetType: "LEAD",
            manualEmail: manualEmail.trim(),
            manualName: manualName.trim() || undefined,
          }
        : composeForm;

      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setComposeOpen(false);
        setComposeForm({ targetType: "LEAD", targetId: "", channel: "EMAIL", subject: "", body: "", templateId: "" });
        // 重置手动输入状态
        setManualEmailMode(false);
        setManualEmail("");
        setManualName("");
        fetchLogs();
      } else {
        const err = await res.json();
        alert(`发送失败：${err.error}`);
      }
    } catch {
      alert("网络错误");
    } finally {
      setSending(false);
    }
  };

  // Stats
  const stats = {
    total: total || logs.length,
    sent: logs.filter((l) => ["SENT", "DELIVERED"].includes(l.status)).length,
    opened: logs.filter((l) => l.status === "OPENED").length,
    replied: logs.filter((l) => l.status === "REPLIED").length,
    failed: logs.filter((l) => ["FAILED", "BOUNCED"].includes(l.status)).length,
  };

  return (
    <div className="space-y-6">
      {/* ===== Header — Brand Gradient ===== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-cyan-500/25">
              <Send className="w-5 h-5 text-white" />
            </div>
            <span>
              外联<span className="gradient-text">触达</span>
            </span>
          </h1>
          <p className="text-muted-foreground mt-1 ml-[44px]">
            管理所有对外触达记录 · 共 <span className="font-semibold tabular-nums text-foreground">{stats.total}</span> 条记录
          </p>
        </div>

        <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/20 px-4 cursor-pointer outline-none">
            <Plus className="w-4 h-4" />新建外联
          </DialogTrigger>
          <DialogContent className="sm:max-w-[560px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                    <Send className="w-4 h-4 text-white" />
                  </div>
                新建外联消息
              </DialogTitle>
              <DialogDescription>向目标发送邮件或消息</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>目标类型</Label>
                  <Select
                    value={composeForm.targetType}
                    onValueChange={(v) => setComposeForm({ ...composeForm, targetType: v || "LEAD", targetId: "" })}
                  >
                    <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LEAD">线索</SelectItem>
                      <SelectItem value="DEVELOPER">开发者</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>渠道</Label>
                  <Select
                    value={composeForm.channel}
                    onValueChange={(v) => setComposeForm({ ...composeForm, channel: v || "EMAIL" })}
                  >
                    <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMAIL">📧 邮件</SelectItem>
                      <SelectItem value="WECHAT">💬 微信</SelectItem>
                      <SelectItem value="LINKEDIN_DM">💼 LinkedIn</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>选择目标</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 gap-1"
                    onClick={() => {
                      setManualEmailMode(!manualEmailMode);
                      if (!manualEmailMode) {
                        // 切换到手动模式时清空选择
                        setComposeForm(prev => ({ ...prev, targetId: "" }));
                      } else {
                        // 切换回选择模式时清空手动输入
                        setManualEmail("");
                        setManualName("");
                      }
                    }}
                  >
                    {manualEmailMode ? (
                      <>从列表选择</>
                    ) : (
                      <><UserPlus className="w-3.5 h-3.5" /> 手动输入邮箱</>
                    )}
                  </Button>
                </div>

                {!manualEmailMode ? (
                  // 下拉选择模式
                  <>
                    <Select
                      value={composeForm.targetId}
                      onValueChange={(v) => setComposeForm({ ...composeForm, targetId: v || "" })}
                    >
                      <SelectTrigger className="rounded-lg"><SelectValue placeholder={`选择${composeForm.targetType === "DEVELOPER" ? "开发者" : "线索"}...`} /></SelectTrigger>
                      <SelectContent>
                        {targets.length === 0 ? (
                          <SelectItem value="_empty" disabled>暂无数据</SelectItem>
                        ) : targets.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.displayName}{t.email ? ` (${t.email})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {targets.length === 0 && composeOpen && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {composeForm.targetType === "DEVELOPER"
                          ? "提示：请先在开发者页面导入 GitHub 开发者数据，或切换为「手动输入邮箱」"
                          : "提示：请先添加线索数据，或切换为「手动输入邮箱」"}
                      </p>
                    )}
                  </>
                ) : (
                  // 手动输入邮箱模式
                  <div className="space-y-2 rounded-lg border border-border/50 p-3 bg-muted/20">
                    <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
                      <Label htmlFor="manualName" className="text-xs text-muted-foreground whitespace-nowrap">姓名 (可选)</Label>
                      <Input
                        id="manualName"
                        placeholder="收件人姓名..."
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        className="rounded-md h-9 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
                      <Label htmlFor="manualEmail" className="text-xs font-medium whitespace-nowrap">邮箱地址 *</Label>
                      <Input
                        id="manualEmail"
                        type="email"
                        placeholder="example@email.com"
                        value={manualEmail}
                        onChange={(e) => setManualEmail(e.target.value)}
                        className="rounded-md h-9 text-sm border-cyan-200 focus:border-cyan-400 dark:border-cyan-800 dark:focus:border-cyan-500"
                        autoFocus
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Zap className="w-3 h-3 text-cyan-500" />
                      直接输入任意邮箱即可发送，无需预先添加到系统
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">主题</Label>
                <Input
                  id="subject"
                  placeholder="邮件或消息主题..."
                  value={composeForm.subject}
                  onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })}
                  className="rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">内容</Label>
                <Textarea
                  id="body"
                  rows={6}
                  placeholder="输入消息内容..."
                  value={composeForm.body}
                  onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })}
                  className="rounded-lg"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setComposeOpen(false); setManualEmailMode(false); setManualEmail(""); setManualName(""); }} className="rounded-lg">取消</Button>
              <Button onClick={handleSend} disabled={sending || (!manualEmailMode ? (!composeForm.targetId || !composeForm.body) : (!manualEmail.trim() || !composeForm.body))} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-lg">
                {sending ? "发送中..." : <><Send className="w-4 h-4 mr-1" /> 发送</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ===== Stats Cards — Premium Horizontal ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 group">
          <CardContent className="p-4 bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-950/40 dark:to-gray-950/20 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">总记录</p>
              <p className="text-2xl font-black tabular-nums mt-0.5">{stats.total}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center opacity-60 group-hover:opacity-90 group-hover:scale-105 transition-all duration-300">
              <Inbox className="w-4 h-4 text-white" />
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 group">
          <CardContent className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/20 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">已发送</p>
              <p className="text-2xl font-black tabular-nums mt-0.5 text-blue-700 dark:text-blue-300">{stats.sent}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform duration-300">
              <Send className="w-4 h-4 text-white" />
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 group">
          <CardContent className="p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/20 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">已打开</p>
              <p className="text-2xl font-black tabular-nums mt-0.5 text-emerald-600 dark:text-emerald-400">{stats.opened}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-110 transition-transform duration-300">
              <Eye className="w-4 h-4 text-white" />
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 group">
          <CardContent className="p-4 bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-950/40 dark:to-teal-950/20 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">已回复</p>
              <p className="text-2xl font-black tabular-nums mt-0.5 text-green-600 dark:text-green-400">{stats.replied}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center shadow-md shadow-green-500/20 group-hover:scale-110 transition-transform duration-300 relative">
              <CheckCircle2 className="w-4 h-4 text-white" />
              {stats.replied > 0 && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full animate-pulse ring-2 ring-background" />}
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 group col-span-2 sm:col-span-1">
          <CardContent className="p-4 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/40 dark:to-rose-950/20 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">失败</p>
              <p className="text-2xl font-black tabular-nums mt-0.5 text-red-500 dark:text-red-400">{stats.failed}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-500 to-rose-500 flex items-center justify-center shadow-md shadow-red-500/20 group-hover:scale-110 transition-transform duration-300">
              <AlertCircle className="w-4 h-4 text-white" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== Funnel indicator bar ===== */}
      {(stats.sent > 0 || stats.opened > 0 || stats.replied > 0) && (
        <div className="flex items-center gap-1 p-3 rounded-xl bg-gradient-to-r from-slate-50 via-blue-50/30 to-emerald-50/30 dark:from-slate-950/20 dark:via-blue-950/10 dark:to-emerald-950/10 border border-border/50">
          <span className="text-[11px] text-muted-foreground font-medium mr-2 whitespace-nowrap">转化漏斗:</span>
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {[{ n: stats.sent, c: "blue", l: "发送" }, { n: stats.opened, c: "emerald", l: "打开" }, { n: stats.replied, c: "green", l: "回复" }].map((step, i) => (
              <div key={i} className="flex items-center gap-1.5 flex-1 min-w-0">
                <div className={`flex-1 h-2 rounded-full bg-${step.c}-200/60 dark:bg-${step.c}-900/30 overflow-hidden`}>
                  <div
                    className={`h-full rounded-full bg-gradient-to-r from-${step.c}-400 to-${step.c}-500 transition-all duration-500`}
                    style={{ width: `${stats.total > 0 ? (step.n / stats.total) * 100 : 0}%` }}
                  />
                </div>
                <span className={`text-[10px] font-bold tabular-nums text-${step.c}-600 dark:text-${step.c}-400 whitespace-nowrap`}>
                  {step.n}
                </span>
                {i < 2 && <ArrowUpRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
              </div>
            ))}
          </div>
          {stats.total > 0 && (
            <span className="text-[11px] font-bold tabular-nums text-emerald-600 dark:text-emerald-400 ml-2 shrink-0">
              {Math.round((stats.replied / Math.max(stats.sent, 1)) * 100)}% 回复率
            </span>
          )}
        </div>
      )}

      {/* ===== Filters ===== */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索主题、内容..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl bg-background/80 backdrop-blur-sm"
          />
        </div>
        <Select value={channelFilter} onValueChange={(v) => { setChannelFilter(v || "all"); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[140px] rounded-xl">
            <SelectValue placeholder="渠道" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部渠道</SelectItem>
            <SelectItem value="EMAIL">📧 邮件</SelectItem>
            <SelectItem value="WECHAT">💬 微信</SelectItem>
            <SelectItem value="LINKEDIN_DM">💼 LinkedIn</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v || "all"); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[140px] rounded-xl">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="SENT">📤 已发送</SelectItem>
            <SelectItem value="OPENED">👁 已打开</SelectItem>
            <SelectItem value="REPLIED">✅ 已回复</SelectItem>
            <SelectItem value="FAILED">❌ 失败</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => fetchLogs()} className="rounded-xl hover:bg-primary/10">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* ===== Logs Table / List ===== */}
      {loading ? (
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="py-6 space-y-3 px-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-muted/60 rounded-xl animate-pulse" />
            ))}
          </CardContent>
        </Card>
      ) : logs.length === 0 ? (
        <Card className="border-dashed border-2 border-cyan-200/60 dark:border-cyan-800/30 bg-gradient-to-b from-cyan-50/30 to-transparent dark:from-cyan-950/10">
          <CardContent className="flex flex-col items-center py-16">
            <div className="w-16 h-16 rounded-2xl mx-auto bg-gradient-to-br from-cyan-100 to-blue-100 dark:from-cyan-900 dark:to-blue-900 flex items-center justify-center mb-4">
              <Send className="w-8 h-8 text-cyan-500" />
            </div>
            <h3 className="font-semibold text-lg mb-1">还没有外联记录</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm text-center">开始发送你的第一条外联消息，建立与目标客户的连接</p>
            <Button onClick={() => setComposeOpen(true)} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl gap-2">
              <Plus className="w-4 h-4" /> 发送第一条消息
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/20">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">渠道</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">主题 & 内容</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">状态</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">活动</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">时间</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const chCfg = CHANNEL_CONFIG[log.channel] || CHANNEL_CONFIG.EMAIL;
                  const stCfg = STATUS_CONFIG[log.status] || STATUS_CONFIG.PENDING;

                  return (
                    <tr
                      key={log.id}
                      className="border-b border-border/30 hover:bg-muted/20 transition-colors cursor-pointer group"
                      onClick={() => { setSelectedLog(log); setDetailOpen(true); }}
                    >
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`gap-1.5 text-[11px] font-medium bg-gradient-to-r ${chCfg.gradient} text-white border-transparent shadow-sm`}>
                          {chCfg.icon} {chCfg.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 max-w-[280px]">
                        <div>
                          <p className="font-medium text-sm truncate leading-snug">{log.subject || "(无主题)"}</p>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5 leading-relaxed">
                            {log.aiGenerated && <><Sparkles className="w-3 h-3 inline mr-0.5 text-amber-500" /></>}
                            {log.body?.substring(0, 80) || "..."}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`gap-1.5 text-[11px] font-medium ${stCfg.bg} ${stCfg.color} border-transparent`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${stCfg.dotColor}`} />
                          {stCfg.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">{log.campaign?.name || "-"}</span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground whitespace-nowrap font-mono hidden md:table-cell">
                        {new Date(log.createdAt).toLocaleDateString("zh-CN")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs hover:bg-cyan-50 dark:hover:bg-cyan-950/30 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => { e.stopPropagation(); setSelectedLog(log); setDetailOpen(true); }}
                        >
                          详情
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ===== Pagination ===== */}
      {!loading && total > 20 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            共 <span className="font-semibold tabular-nums">{total}</span> 条记录
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg">上一页</Button>
            <span className="text-sm font-medium tabular-nums px-2">第 {page} 页</span>
            <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage(page + 1)} className="rounded-lg">下一页</Button>
          </div>
        </div>
      )}

      {/* ===== Detail Dialog — Premium Timeline ===== */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto">
          {selectedLog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-white" />
                  </div>
                  外联详情
                </DialogTitle>
                <DialogDescription className="font-mono text-xs">
                  ID: {selectedLog.id.substring(0, 12)}...
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 pt-2">
                {/* Status & Channel Badges */}
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={`gap-1.5 text-xs font-medium bg-gradient-to-r ${(CHANNEL_CONFIG[selectedLog.channel]?.gradient || "")} text-white border-transparent shadow-sm`}>
                    {CHANNEL_CONFIG[selectedLog.channel]?.icon} {CHANNEL_CONFIG[selectedLog.channel]?.label}
                  </Badge>
                  <Badge variant="outline" className={`gap-1.5 text-xs font-medium ${STATUS_CONFIG[selectedLog.status]?.bg} ${STATUS_CONFIG[selectedLog.status]?.color} border-transparent`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[selectedLog.status]?.dotColor}`} />
                    {STATUS_CONFIG[selectedLog.status]?.icon} {STATUS_CONFIG[selectedLog.status]?.label}
                  </Badge>
                  {selectedLog.aiGenerated && (
                    <Badge className="gap-1 text-xs font-medium bg-gradient-to-r from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 text-amber-700 dark:text-amber-400 border-transparent">
                      <Sparkles className="w-3 h-3" /> AI生成
                    </Badge>
                  )}
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/10 p-3.5 space-y-1 border border-border/30">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">目标类型</p>
                    <p className="text-sm font-semibold">{selectedLog.targetType}</p>
                  </div>
                  <div className="rounded-xl bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-950/20 dark:to-gray-950/10 p-3.5 space-y-1 border border-border/30">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">活动关联</p>
                    <p className="text-sm font-semibold">{selectedLog.campaign?.name || "未关联"}</p>
                  </div>
                  <div className="col-span-2 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/15 dark:to-indigo-950/10 p-3.5 space-y-1 border border-border/30">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">主题</p>
                    <p className="text-sm font-semibold">{selectedLog.subject || "(无主题)"}</p>
                  </div>
                </div>

                {/* Body Content */}
                {selectedLog.body && (
                  <div className="rounded-xl border border-border/30 overflow-hidden">
                    <div className="bg-gradient-to-r from-muted/40 to-muted/20 px-4 py-2.5 flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">消息内容</h4>
                    </div>
                    <div className="bg-muted/10 p-4 text-sm whitespace-pre-wrap max-h-[220px] overflow-y-auto leading-relaxed">
                      {selectedLog.body}
                    </div>
                  </div>
                )}

                {/* Timeline — Visual */}
                <div className="rounded-xl border border-border/30 overflow-hidden">
                  <div className="bg-gradient-to-r from-cyan-50/50 to-blue-50/30 dark:from-cyan-950/10 dark:to-blue-950/5 px-4 py-2.5 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">时间线追踪</h4>
                  </div>
                  <div className="p-4">
                    <TimelineStep
                      label="创建"
                      time={selectedLog.createdAt}
                      isActive={!!selectedLog.createdAt}
                      isLast={false}
                      color="bg-slate-400"
                    />
                    <TimelineStep
                      label="发送"
                      time={selectedLog.sentAt}
                      isActive={!!selectedLog.sentAt}
                      isLast={false}
                      color="bg-blue-500"
                    />
                    <TimelineStep
                      label="送达"
                      time={selectedLog.deliveredAt}
                      isActive={!!selectedLog.deliveredAt}
                      isLast={!selectedLog.openedAt && !selectedLog.repliedAt && !selectedLog.bouncedAt}
                      color="bg-indigo-500"
                    />
                    <TimelineStep
                      label="打开"
                      time={selectedLog.openedAt}
                      isActive={!!selectedLog.openedAt}
                      isLast={!selectedLog.repliedAt && !selectedLog.bouncedAt}
                      color="bg-emerald-500"
                    />
                    <TimelineStep
                      label="回复 ✨"
                      time={selectedLog.repliedAt}
                      isActive={!!selectedLog.repliedAt}
                      isLast={!selectedLog.error && !selectedLog.bouncedAt}
                      color="bg-green-500"
                    />
                    {selectedLog.error && (
                      <div className="mt-3 rounded-xl bg-red-50 dark:bg-red-950/30 p-3 border border-red-200/50 dark:border-red-900/30">
                        <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1">⚠️ 错误信息</p>
                        <p className="text-xs text-red-700 dark:text-red-300">{selectedLog.error}</p>
                      </div>
                    )}
                    {selectedLog.bouncedAt && (
                      <TimelineStep
                        label="退信 ❌"
                        time={selectedLog.bouncedAt}
                        isActive={true}
                        isLast={true}
                        color="bg-red-500"
                      />
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
