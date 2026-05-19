"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import * as XLSX from "xlsx";

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

type ImportedLeadRow = {
  name: string;
  email: string;
  company?: string;
  title?: string;
  notes?: string;
};

type ImportSummary = {
  fileName: string;
  parsed: number;
  imported: number;
  skippedExisting: number;
  duplicateCount: number;
  invalidCount: number;
  invalidRows: Array<{ row: number; email: string }>;
};

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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const NAME_KEYS = ["name", "姓名", "联系人", "联系人姓名", "称呼"];
const EMAIL_KEYS = ["email", "邮箱", "电子邮箱", "mail", "邮箱地址"];
const COMPANY_KEYS = ["company", "公司", "机构", "organization"];
const TITLE_KEYS = ["title", "职位", "岗位"];
const NOTES_KEYS = ["notes", "备注", "说明"];

function normalizeHeader(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function findValue(record: Record<string, unknown>, candidates: string[]) {
  for (const [key, value] of Object.entries(record)) {
    const normalizedKey = normalizeHeader(key);
    if (candidates.some((candidate) => normalizeHeader(candidate) === normalizedKey)) {
      return String(value || "").trim();
    }
  }
  return "";
}

function parseImportedLeads(rows: Record<string, unknown>[]) {
  const importedRows: ImportedLeadRow[] = [];
  const invalidRows: Array<{ row: number; email: string }> = [];

  rows.forEach((row, index) => {
    const email = findValue(row, EMAIL_KEYS).toLowerCase();
    const name = findValue(row, NAME_KEYS);
    const company = findValue(row, COMPANY_KEYS);
    const title = findValue(row, TITLE_KEYS);
    const notes = findValue(row, NOTES_KEYS);

    if (!email || !EMAIL_REGEX.test(email)) {
      invalidRows.push({ row: index + 2, email });
      return;
    }

    importedRows.push({
      email,
      name: name || email.split("@")[0],
      company: company || undefined,
      title: title || undefined,
      notes: notes || undefined,
    });
  });

  return { importedRows, invalidRows };
}

function TimelineStep({ label, time, isActive, isLast, color }: { label: string; time?: string | null; isActive: boolean; isLast: boolean; color: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-2.5 h-2.5 rounded-full ring-2 ring-background ${isActive ? color : "bg-muted"}`} />
        {!isLast && <div className={`w-0.5 h-6 mt-1 ${isActive ? `bg-${color.split("-")[1]}-200 dark:bg-${color.split("-")[1]}-800` : "bg-muted"}`} />}
      </div>
      <div className="flex-1 pb-4">
        <p className={`text-xs font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>{label}</p>
        {time && <p className={`text-[11px] font-mono ${isActive ? "text-foreground/70" : "text-muted-foreground/60"} mt-0.5`}>{new Date(time).toLocaleString("zh-CN")}</p>}
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

  const [manualEmailMode, setManualEmailMode] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [manualName, setManualName] = useState("");
  const [importingXlsx, setImportingXlsx] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

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

  const fetchTargets = useCallback(async () => {
    const apiUrl = composeForm.targetType === "DEVELOPER" ? "/api/developers?limit=100" : "/api/leads?limit=100";
    const res = await fetch(apiUrl);
    const data = await res.json();
    if (composeForm.targetType === "DEVELOPER") {
      setTargets((data.data || []).map((d: any) => ({
        id: d.id,
        displayName: d.displayName || d.username || d.id,
        email: d.email || null,
      })));
    } else {
      setTargets((data.data || []).map((l: any) => ({
        id: l.id,
        displayName: l.contactName || l.name || l.companyName || l.id,
        email: l.contactEmail || l.email || null,
      })));
    }
  }, [composeForm.targetType]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (composeOpen) {
      fetchTargets().catch(() => {});
      if (composeForm.targetId) {
        setComposeForm((prev) => ({ ...prev, targetId: "" }));
      }
    }
  }, [composeOpen, composeForm.targetType, fetchTargets]);

  const handleImportXlsx = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      alert("请上传 .xlsx 文件");
      event.target.value = "";
      return;
    }

    setImportingXlsx(true);
    setImportSummary(null);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) {
        alert("Excel 中没有可读取的工作表");
        return;
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], { defval: "" });
      if (rows.length === 0) {
        alert("Excel 中没有可导入的数据");
        return;
      }

      const { importedRows, invalidRows } = parseImportedLeads(rows);
      if (importedRows.length === 0) {
        alert(`没有找到可导入的有效邮箱。无效行数：${invalidRows.length}`);
        return;
      }

      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: importedRows }),
      });

      const result = await res.json();
      if (!res.ok) {
        alert(result.error || "导入联系人草稿失败");
        return;
      }

      setComposeForm((prev) => ({ ...prev, targetType: "LEAD", targetId: "" }));
      setManualEmailMode(false);
      setImportSummary({
        fileName: file.name,
        parsed: importedRows.length,
        imported: result.imported || 0,
        skippedExisting: result.skippedExisting || 0,
        duplicateCount: result.duplicateCount || 0,
        invalidCount: invalidRows.length + (result.invalidCount || 0),
        invalidRows: [...invalidRows, ...(result.invalidRows || [])].slice(0, 10),
      });

      await fetchTargets();
    } catch (error) {
      console.error("Import xlsx failed:", error);
      alert("导入 .xlsx 联系人失败，请检查文件格式");
    } finally {
      if (event.target) event.target.value = "";
      setImportingXlsx(false);
    }
  };

  const handleSend = async () => {
    if (manualEmailMode) {
      if (!manualEmail.trim() || !composeForm.body) return;
      if (!EMAIL_REGEX.test(manualEmail.trim())) {
        alert("请输入有效的邮箱地址");
        return;
      }
    } else {
      if (!composeForm.targetId || !composeForm.body) return;
    }

    setSending(true);
    try {
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
        setManualEmailMode(false);
        setManualEmail("");
        setManualName("");
        setImportSummary(null);
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

  const stats = {
    total: total || logs.length,
    sent: logs.filter((l) => ["SENT", "DELIVERED"].includes(l.status)).length,
    opened: logs.filter((l) => l.status === "OPENED").length,
    replied: logs.filter((l) => l.status === "REPLIED").length,
    failed: logs.filter((l) => ["FAILED", "BOUNCED"].includes(l.status)).length,
  };

  return (
    <div className="space-y-6">
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
                  <Select value={composeForm.targetType} onValueChange={(v) => setComposeForm({ ...composeForm, targetType: v || "LEAD", targetId: "" })}>
                    <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LEAD">线索</SelectItem>
                      <SelectItem value="DEVELOPER">开发者</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>渠道</Label>
                  <Select value={composeForm.channel} onValueChange={(v) => setComposeForm({ ...composeForm, channel: v || "EMAIL" })}>
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
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <Label>选择目标</Label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input ref={importInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleImportXlsx} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1"
                      onClick={() => importInputRef.current?.click()}
                      disabled={importingXlsx}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" /> {importingXlsx ? "导入中..." : "导入 .xlsx 草稿"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 gap-1"
                      onClick={() => {
                        setManualEmailMode(!manualEmailMode);
                        if (!manualEmailMode) {
                          setComposeForm((prev) => ({ ...prev, targetId: "" }));
                        } else {
                          setManualEmail("");
                          setManualName("");
                        }
                      }}
                    >
                      {manualEmailMode ? <>从列表选择</> : <><UserPlus className="w-3.5 h-3.5" /> 手动输入邮箱</>}
                    </Button>
                  </div>
                </div>

                {importSummary && (
                  <div className="rounded-lg border border-emerald-200/60 bg-emerald-50/70 dark:border-emerald-900/40 dark:bg-emerald-950/20 p-3 space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-200">
                      <Upload className="w-4 h-4" /> 已导入联系人草稿：{importSummary.fileName}
                    </div>
                    <p className="text-xs text-emerald-700/90 dark:text-emerald-300/90">
                      解析 {importSummary.parsed} 条，新增 {importSummary.imported} 条，已存在跳过 {importSummary.skippedExisting} 条，文件内重复 {importSummary.duplicateCount} 条，无效邮箱 {importSummary.invalidCount} 条。
                    </p>
                    {importSummary.invalidRows.length > 0 && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-300">
                        无效示例：{importSummary.invalidRows.map((item) => `第 ${item.row} 行`).join("、")}
                      </p>
                    )}
                  </div>
                )}

                {!manualEmailMode ? (
                  <>
                    <Select value={composeForm.targetId} onValueChange={(v) => setComposeForm({ ...composeForm, targetId: v || "" })}>
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
                          ? "提示：请先在开发者页面导入 GitHub 开发者数据，或切换为“手动输入邮箱”"
                          : "提示：请先添加线索数据，或通过“.xlsx 导入草稿”批量导入联系人"}
                      </p>
                    )}
                  </>
                ) : (
                  <div className="space-y-2 rounded-lg border border-border/50 p-3 bg-muted/20">
                    <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
                      <Label htmlFor="manualName" className="text-xs text-muted-foreground whitespace-nowrap">姓名 (可选)</Label>
                      <Input id="manualName" placeholder="收件人姓名..." value={manualName} onChange={(e) => setManualName(e.target.value)} className="rounded-md h-9 text-sm" />
                    </div>
                    <div className="grid grid-cols-[100px_1fr] gap-2 items-center">
                      <Label htmlFor="manualEmail" className="text-xs font-medium whitespace-nowrap">邮箱地址 *</Label>
                      <Input id="manualEmail" type="email" placeholder="example@email.com" value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} className="rounded-md h-9 text-sm border-cyan-200 focus:border-cyan-400 dark:border-cyan-800 dark:focus:border-cyan-500" autoFocus />
                    </div>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Zap className="w-3 h-3 text-cyan-500" />
                      直接输入单个邮箱可立即发送；如需批量整理，请先用“.xlsx 导入草稿”进入线索列表。
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">主题</Label>
                <Input id="subject" placeholder="邮件或消息主题..." value={composeForm.subject} onChange={(e) => setComposeForm({ ...composeForm, subject: e.target.value })} className="rounded-lg" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">内容</Label>
                <Textarea id="body" rows={6} placeholder="输入消息内容..." value={composeForm.body} onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })} className="rounded-lg" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setComposeOpen(false); setManualEmailMode(false); setManualEmail(""); setManualName(""); setImportSummary(null); }} className="rounded-lg">取消</Button>
              <Button onClick={handleSend} disabled={sending || (!manualEmailMode ? (!composeForm.targetId || !composeForm.body) : (!manualEmail.trim() || !composeForm.body))} className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-lg">
                {sending ? "发送中..." : <><Send className="w-4 h-4 mr-1" /> 发送</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

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

      {(stats.sent > 0 || stats.opened > 0 || stats.replied > 0) && (
        <div className="flex items-center gap-1 p-3 rounded-xl bg-gradient-to-r from-slate-50 via-blue-50/30 to-emerald-50/30 dark:from-slate-950/20 dark:via-blue-950/10 dark:to-emerald-950/10 border border-border/50">
          <span className="text-[11px] text-muted-foreground font-medium mr-2 whitespace-nowrap">转化漏斗:</span>
          <div className="flex items-center gap-1 flex-1 min-w-0">
            {[{ n: stats.sent, c: "blue", l: "发送" }, { n: stats.opened, c: "emerald", l: "打开" }, { n: stats.replied, c: "green", l: "回复" }].map((step, i) => (
              <div key={i} className="flex items-center gap-1.5 flex-1 min-w-0">
                <div className={`flex-1 h-2 rounded-full bg-${step.c}-200/60 dark:bg-${step.c}-900/30 overflow-hidden`}>
                  <div className={`h-full rounded-full bg-gradient-to-r from-${step.c}-400 to-${step.c}-500 transition-all duration-500`} style={{ width: `${stats.total > 0 ? (step.n / stats.total) * 100 : 0}%` }} />
                </div>
                <span className={`text-[10px] font-bold tabular-nums text-${step.c}-600 dark:text-${step.c}-400 whitespace-nowrap`}>{step.n}</span>
                {i < 2 && <ArrowUpRight className="w-3 h-3 text-muted-foreground/40 shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


