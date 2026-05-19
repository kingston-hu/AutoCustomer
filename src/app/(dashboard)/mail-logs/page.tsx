"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Filter,
  Mail,
  RefreshCw,
  Search,
  Send,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface MailLogItem {
  id: string;
  subject: string | null;
  body: string | null;
  status: string;
  sent_at?: string | null;
  createdAt: string;
  error: string | null;
  developerEmail: string | null;
  developerName: string | null;
  developerUsername: string | null;
  githubUrl: string | null;
  senderEmail: string | null;
  batchId?: string | null;
  runId?: string | null;
  reasonCode?: string | null;
}


const STATUS_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "SENT", label: "成功" },
  { value: "FAILED", label: "失败" },
  { value: "BOUNCED", label: "退信" },
  { value: "REPLIED", label: "已回复" },
];

const SENDER_OPTIONS = [
  { value: "all", label: "全部发信邮箱" },
  { value: "163", label: "163 邮箱" },
  { value: "zoho", label: "Zoho 邮箱" },
];

const QUICK_FILTER_OPTIONS = [
  { value: "all", label: "全部记录" },
  { value: "failed", label: "仅看失败" },
  { value: "today", label: "仅看今天" },
];

const REASON_CODE_OPTIONS = [
  { value: "all", label: "全部原因码" },
  { value: "SENT", label: "SENT" },
  { value: "FAILED_SEND", label: "FAILED_SEND" },
  { value: "FAILED_AI_GENERATION", label: "FAILED_AI_GENERATION" },
  { value: "SKIPPED_NO_EMAIL", label: "SKIPPED_NO_EMAIL" },
  { value: "SKIPPED_INVALID_EMAIL", label: "SKIPPED_INVALID_EMAIL" },
  { value: "SKIPPED_ALREADY_SENT", label: "SKIPPED_ALREADY_SENT" },
  { value: "SKIPPED_NOT_SELECTED", label: "SKIPPED_NOT_SELECTED" },
  { value: "SKIPPED_DUPLICATE_EMAIL", label: "SKIPPED_DUPLICATE_EMAIL" },
  { value: "GENERATED_DRY_RUN", label: "GENERATED_DRY_RUN" },
];

const reasonCodeBadgeMap: Record<string, string> = {
  SENT: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40",
  FAILED_SEND: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200/60 dark:border-red-800/40",
  FAILED_AI_GENERATION: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 border-red-200/60 dark:border-red-800/40",
  SKIPPED_NO_EMAIL: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40",
  SKIPPED_INVALID_EMAIL: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40",
  SKIPPED_ALREADY_SENT: "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300 border-slate-200/60 dark:border-slate-800/40",
  SKIPPED_NOT_SELECTED: "bg-slate-100 text-slate-700 dark:bg-slate-900/40 dark:text-slate-300 border-slate-200/60 dark:border-slate-800/40",
  SKIPPED_DUPLICATE_EMAIL: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/40",
  GENERATED_DRY_RUN: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200/60 dark:border-blue-800/40",
};

const reasonCodeLabelMap: Record<string, string> = {
  SENT: "发送成功",
  FAILED_SEND: "发送失败",
  FAILED_AI_GENERATION: "AI 生成失败",
  SKIPPED_NO_EMAIL: "无邮箱",
  SKIPPED_INVALID_EMAIL: "邮箱无效",
  SKIPPED_ALREADY_SENT: "已发送过",
  SKIPPED_NOT_SELECTED: "未被选中",
  SKIPPED_DUPLICATE_EMAIL: "重复邮箱",
  GENERATED_DRY_RUN: "仅生成未发送",
};

const statusMeta: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  SENT: { label: "成功", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  DELIVERED: { label: "已送达", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", icon: <Send className="w-3.5 h-3.5" /> },
  REPLIED: { label: "已回复", className: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  FAILED: { label: "失败", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", icon: <AlertCircle className="w-3.5 h-3.5" /> },
  BOUNCED: { label: "退信", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: <AlertCircle className="w-3.5 h-3.5" /> },
};


function formatTime(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function detectSenderLabel(senderEmail: string | null) {
  if (!senderEmail) return "未记录";
  const value = senderEmail.toLowerCase();
  if (value.includes("163.com")) return "163";
  if (value.includes("zoho")) return "Zoho";
  return senderEmail;
}

function todayString() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export default function MailLogsPage() {
  const [logs, setLogs] = useState<MailLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [senderFilter, setSenderFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [batchIdFilter, setBatchIdFilter] = useState("");
  const [runIdFilter, setRunIdFilter] = useState("");
  const [reasonCodeFilter, setReasonCodeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const buildParams = useCallback((forExport = false) => {
    const params = new URLSearchParams({
      limit: forExport ? "2000" : "20",
      emailOnly: "true",
    });
    if (!forExport) params.set("page", String(page));
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (senderFilter !== "all") params.set("sentBy", senderFilter);
    if (quickFilter !== "all") params.set("quickFilter", quickFilter);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (batchIdFilter.trim()) params.set("batchId", batchIdFilter.trim());
    if (runIdFilter.trim()) params.set("runId", runIdFilter.trim());
    if (reasonCodeFilter !== "all") params.set("reasonCode", reasonCodeFilter);
    if (forExport) params.set("export", "csv");
    return params;
  }, [page, search, statusFilter, senderFilter, quickFilter, startDate, endDate, batchIdFilter, runIdFilter, reasonCodeFilter]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/outreach?${buildParams(false).toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const pageCount = Math.max(1, Math.ceil(total / 20));

  const stats = useMemo(() => {
    const success = logs.filter((item) => ["SENT", "DELIVERED", "REPLIED"].includes(item.status)).length;
    const failed = logs.filter((item) => ["FAILED", "BOUNCED"].includes(item.status)).length;
    const replied = logs.filter((item) => item.status === "REPLIED").length;
    return {
      current: logs.length,
      success,
      failed,
      replied,
    };
  }, [logs]);

  const runSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const resetFilters = () => {
    setPage(1);
    setSearch("");
    setSearchInput("");
    setStatusFilter("all");
    setSenderFilter("all");
    setQuickFilter("all");
    setStartDate("");
    setEndDate("");
    setBatchIdFilter("");
    setRunIdFilter("");
    setReasonCodeFilter("all");
  };

  const applyTodayFilter = () => {
    const today = todayString();
    setQuickFilter("today");
    setStartDate(today);
    setEndDate(today);
    setPage(1);
  };

  const exportCsv = () => {
    const url = `/api/outreach?${buildParams(true).toString()}`;
    window.open(url, "_blank");
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <span>发信<span className="gradient-text">记录</span></span>
          </h1>
          <p className="text-muted-foreground mt-1 ml-[44px]">
            查看每天邮件发送明细，支持按开发者邮箱搜索、日期筛选、快捷筛选和导出 CSV
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/outreach" className="inline-flex items-center justify-center rounded-xl border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
            返回外联触达
          </Link>
          <Button variant="outline" className="rounded-xl" onClick={exportCsv}>
            <Download className="w-4 h-4 mr-1.5" />导出 CSV
          </Button>
          <Button onClick={fetchLogs} className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-700 hover:to-fuchsia-700">
            <RefreshCw className="w-4 h-4 mr-1.5" />刷新
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="rounded-2xl border-violet-200/50 dark:border-violet-800/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">当前结果</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{total}</div></CardContent>
        </Card>
        <Card className="rounded-2xl border-emerald-200/50 dark:border-emerald-800/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">当前页成功</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-emerald-600">{stats.success}</div></CardContent>
        </Card>
        <Card className="rounded-2xl border-red-200/50 dark:border-red-800/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">当前页失败</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-red-600">{stats.failed}</div></CardContent>
        </Card>
        <Card className="rounded-2xl border-blue-200/50 dark:border-blue-800/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">当前页回复</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold text-blue-600">{stats.replied}</div></CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-border/60 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="w-4 h-4" />筛选与搜索
          </div>

          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_220px_220px_220px]">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") runSearch(); }}
                placeholder="按开发者邮箱搜索，也支持姓名 / GitHub 用户名"
                className="pl-9 rounded-xl"
              />
            </div>
            <Select value={senderFilter} onValueChange={(value) => { setPage(1); setSenderFilter(value || "all"); }}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="发信邮箱" /></SelectTrigger>
              <SelectContent>
                {SENDER_OPTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => { setPage(1); setStatusFilter(value || "all"); }}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="发送状态" /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={quickFilter} onValueChange={(value) => { setPage(1); setQuickFilter(value || "all"); }}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="快捷筛选" /></SelectTrigger>
              <SelectContent>
                {QUICK_FILTER_OPTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[220px_220px_220px_220px_220px]">
            <Input
              value={batchIdFilter}
              onChange={(e) => { setPage(1); setBatchIdFilter(e.target.value); }}
              placeholder="按 batchId 过滤"
              className="rounded-xl"
            />
            <Input
              value={runIdFilter}
              onChange={(e) => { setPage(1); setRunIdFilter(e.target.value); }}
              placeholder="按 runId 过滤"
              className="rounded-xl"
            />
            <Select value={reasonCodeFilter} onValueChange={(value) => { setPage(1); setReasonCodeFilter(value || "all"); }}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="原因码" /></SelectTrigger>
              <SelectContent>
                {REASON_CODE_OPTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={startDate} onChange={(e) => { setPage(1); setStartDate(e.target.value); }} className="rounded-xl" />
            <Input type="date" value={endDate} onChange={(e) => { setPage(1); setEndDate(e.target.value); }} className="rounded-xl" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[auto_auto_auto]">
            <Button className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-700 hover:to-fuchsia-700" onClick={runSearch}>查询</Button>
            <Button variant="outline" className="rounded-xl" onClick={() => { setPage(1); setQuickFilter("failed"); }}>仅看失败</Button>
            <Button variant="outline" className="rounded-xl" onClick={applyTodayFilter}>仅看今天</Button>
          </div>

          <div className="flex justify-end">
            <Button variant="ghost" className="rounded-xl text-muted-foreground" onClick={resetFilters}>重置筛选</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-2xl border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[170px]">发送时间</TableHead>
                  <TableHead className="min-w-[160px]">发信邮箱</TableHead>
                  <TableHead className="min-w-[220px]">开发者邮箱</TableHead>
                  <TableHead className="min-w-[160px]">GitHub 主页</TableHead>
                  <TableHead className="min-w-[180px]">批次 / 运行</TableHead>
                  <TableHead className="min-w-[180px]">原因码</TableHead>
                  <TableHead className="min-w-[320px]">发信内容</TableHead>
                  <TableHead className="min-w-[120px]">发送状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">正在加载发信记录...</TableCell></TableRow>
                ) : logs.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">没有找到符合条件的发信记录</TableCell></TableRow>
                ) : (

                  logs.map((log) => {
                    const meta = statusMeta[log.status] || statusMeta.FAILED;
                    const senderLabel = detectSenderLabel(log.senderEmail);
                    return (
                      <TableRow key={log.id} className="align-top">
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {formatTime(log.sent_at || log.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant="secondary" className="rounded-full">{senderLabel}</Badge>
                            <div className="text-xs text-muted-foreground break-all">{log.senderEmail || "未记录"}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium break-all">{log.developerEmail || "-"}</div>
                            <div className="text-xs text-muted-foreground">{log.developerName || log.developerUsername || "未知开发者"}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.githubUrl ? (
                            <a href={log.githubUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                              打开主页 <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-xs">
                            <div><span className="text-muted-foreground">batch：</span><span className="font-mono break-all">{log.batchId || "-"}</span></div>
                            <div><span className="text-muted-foreground">run：</span><span className="font-mono break-all">{log.runId || "-"}</span></div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.reasonCode ? (
                            <Badge variant="outline" className={`rounded-full text-[11px] font-mono ${reasonCodeBadgeMap[log.reasonCode] || ""}`} title={log.reasonCode}>{reasonCodeLabelMap[log.reasonCode] || log.reasonCode}</Badge>


                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="font-medium line-clamp-1">{log.subject || "(无主题)"}</div>
                            <div className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">{log.body || "-"}</div>
                            {log.error ? <div className="text-xs text-red-500 line-clamp-2">失败原因：{log.error}</div> : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`rounded-full gap-1 ${meta.className}`}>
                            {meta.icon}
                            {meta.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              当前第 <span className="font-semibold text-foreground">{page}</span> / <span className="font-semibold text-foreground">{pageCount}</span> 页，共 <span className="font-semibold text-foreground">{total}</span> 条
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="rounded-xl" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="w-4 h-4 mr-1" />上一页
              </Button>
              <Button variant="outline" className="rounded-xl" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>
                下一页<ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
