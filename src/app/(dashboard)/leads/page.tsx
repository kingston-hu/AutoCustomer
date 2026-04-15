"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  User,
  Building2,
  Mail,
  Star,
  Brain,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ExternalLink,
  Sparkles,
  Tag,
  TrendingUp,
  Users,
  Target,
  CheckCircle2,
  Clock,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// 类型定义
interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  company: string | null;
  title: string | null;
  stage: string; // SalesStage
  category: string; // LeadCategory
  source: string; // LeadSource
  potentialValue: number | null;
  notes: string | null;
  lastContactAt: Date | null;
  createdAt: string;
}

// SalesStage 配置（匹配 Prisma Schema）
const STAGE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  NEW: { label: "新线索", color: "bg-blue-100 text-blue-700 border-blue-200", icon: <Sparkles className="w-3 h-3" /> },
  QUALIFIED: { label: "已确认", color: "bg-cyan-100 text-cyan-700 border-cyan-200", icon: <CheckCircle2 className="w-3 h-3" /> },
  CONTACTED: { label: "已联系", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: <Mail className="w-3 h-3" /> },
  MEETING_SCHEDULED: { label: "会议安排", color: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: <Clock className="w-3 h-3" /> },
  TRIAL_STARTED: { label: "试用中", color: "bg-purple-100 text-purple-700 border-purple-200", icon: <Target className="w-3 h-3" /> },
  NEGOTIATING: { label: "谈判中", color: "bg-orange-100 text-orange-700 border-orange-200", icon: <TrendingUp className="w-3 h-3" /> },
  WON: { label: "已成交", color: "bg-green-100 text-green-700 border-green-200", icon: <Star className="w-3 h-3" /> },
  LOST: { label: "已流失", color: "bg-red-100 text-red-700 border-red-200", icon: <X className="w-3 h-3" /> },
  CHURNED: { label: "已流失", color: "bg-gray-100 text-gray-600 border-gray-200", icon: <X className="w-3 h-3" /> },
};

// LeadCategory 配置
const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  ECOMMERCE_MONITORING: { label: "电商监控", color: "bg-pink-100 text-pink-700" },
  SOCIAL_MARKETING: { label: "社媒营销", color: "bg-sky-100 text-sky-700" },
  SALES_INTELLIGENCE: { label: "销售情报", color: "bg-violet-100 text-violet-700" },
  MARKET_RESEARCH: { label: "市场调研", color: "bg-emerald-100 text-emerald-700" },
  DATA_ANALYTICS: { label: "数据分析", color: "bg-amber-100 text-amber-700" },
  OTHER: { label: "其他", color: "bg-gray-100 text-gray-600" },
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const [newLead, setNewLead] = useState({ name: "", email: "", company: "", title: "" });
  const [creating, setCreating] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        ...(search && { search }),
        ...(stageFilter !== "all" && { stage: stageFilter }),
        ...(categoryFilter !== "all" && { category: categoryFilter }),
      });
      const res = await fetch(`/api/leads?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch leads:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, stageFilter, categoryFilter]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  const handleCreate = async () => {
    if (!newLead.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLead),
      });
      if (res.ok) {
        setCreateOpen(false);
        setNewLead({ name: "", email: "", company: "", title: "" });
        fetchLeads();
      } else {
        const err = await res.json();
        alert(err.error || "创建失败");
      }
    } catch (error) {
      alert("网络错误");
    } finally {
      setCreating(false);
    }
  };

  const handleStatusUpdate = async (id: string, stage: string) => {
    try {
      await fetch(`/api/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: stage }),
      });
      fetchLeads();
    } catch (error) {
      console.error(error);
    }
  };

  const handleAiClassify = async (leadId: string) => {
    setAnalyzingId(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}/ai-classify`, { method: "POST" });
      if (res.ok) {
        fetchLeads();
        alert("AI 分类完成！");
      } else {
        alert("AI 分析失败，请检查 API Key 配置");
      }
    } catch (error) {
      alert("网络错误");
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除此线索？")) return;
    try {
      await fetch(`/api/leads/${id}`, { method: "DELETE" });
      setDetailOpen(false);
      fetchLeads();
    } catch (error) {
      console.error(error);
    }
  };

  const openDetail = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailOpen(true);
  };

  const stats = {
    total,
    newCount: leads.filter((l) => l.stage === "NEW").length,
    contacted: leads.filter((l) => l.stage === "CONTACTED").length,
    converted: leads.filter((l) => l.stage === "WON").length,
  };

  return (
    <div className="space-y-6">
      {/* 页头 — 品牌渐变 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span>
              线索<span className="gradient-text">管理</span>
            </span>
          </h1>
          <p className="text-muted-foreground mt-1 ml-[44px]">
            捕获、分类和转化潜在客户 · 共 <span className="font-semibold tabular-nums text-foreground">{stats.total}</span> 条线索
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 px-4 cursor-pointer outline-none">
              <Plus className="w-4 h-4" />添加线索
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新建线索</DialogTitle>
              <DialogDescription>手动添加新的潜在客户信息</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">姓名 *</label>
                <Input value={newLead.name} onChange={(e) => setNewLead({ ...newLead, name: e.target.value })} placeholder="输入姓名" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">邮箱</label>
                <Input type="email" value={newLead.email} onChange={(e) => setNewLead({ ...newLead, email: e.target.value })} placeholder="email@example.com" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">公司</label>
                  <Input value={newLead.company} onChange={(e) => setNewLead({ ...newLead, company: e.target.value })} placeholder="公司名称" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">职位</label>
                  <Input value={newLead.title} onChange={(e) => setNewLead({ ...newLead, title: e.target.value })} placeholder="职位头衔" />
                </div>
              </div>
              <Button onClick={handleCreate} disabled={creating} className="w-full">
                {creating ? "创建中..." : "创建线索"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* 统计卡片 — Premium 渐变风格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow duration-300 group hover:-translate-y-0.5">
          <CardContent className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/20 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">总线索</p>
              <p className="text-3xl font-black tabular-nums mt-1 text-blue-700 dark:text-blue-300">{stats.total}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5 text-white" />
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow duration-300 group hover:-translate-y-0.5">
          <CardContent className="p-5 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/20 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">已成交</p>
              <p className="text-3xl font-black tabular-nums mt-1 text-emerald-600 dark:text-emerald-400">{stats.converted}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow duration-300 group hover:-translate-y-0.5">
          <CardContent className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/20 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">待联系</p>
              <p className="text-3xl font-black tabular-nums mt-1 text-amber-600 dark:text-amber-400">{stats.newCount}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5 text-white" />
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow duration-300 group hover:-translate-y-0.5">
          <CardContent className="p-5 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/20 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">成交率</p>
              <p className="text-3xl font-black tabular-nums mt-1 text-violet-600 dark:text-violet-400">{stats.total > 0 ? Math.round((stats.converted / stats.total) * 100) : 0}<span className="text-lg">%</span></p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 工具栏 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="搜索姓名、邮箱、公司..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-10" />
            </div>
            <Select value={stageFilter} onValueChange={(v) => { setStageFilter(v || "all"); setPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="阶段筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部阶段</SelectItem>
                {Object.entries(STAGE_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v || "all"); setPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <Tag className="w-4 h-4 mr-2" />
                <SelectValue placeholder="分类筛选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                  <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 线索表格 */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-muted-foreground">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
              加载中...
            </div>
          ) : leads.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 rounded-2xl mx-auto bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-950 dark:to-teal-900 flex items-center justify-center mb-4">
                <Target className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="font-medium text-lg mb-1">暂无线索</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">添加你的第一个线索，或从 GitHub 导入开发者作为潜在客户</p>
              <Button variant="outline" onClick={() => setCreateOpen(true)} className="rounded-xl">
                <Plus className="w-4 h-4 mr-2" />添加第一条线索
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">联系人</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">来源</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">分类</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">阶段</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">价值</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden xl:table-cell">添加时间</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => openDetail(lead)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center text-sm font-medium">
                              {(lead.name || "?").charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">{lead.name || "未命名"}</p>
                              <p className="text-xs text-muted-foreground truncate">{lead.email || lead.company || "无邮箱"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <Badge variant="outline" className="text-xs">{lead.source.replace(/_/g, " ")}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className={`text-xs ${CATEGORY_CONFIG[lead.category]?.color || ""}`}>
                            {CATEGORY_CONFIG[lead.category]?.label || lead.category}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-xs gap-1 ${STAGE_CONFIG[lead.stage]?.color || ""}`}>
                            {STAGE_CONFIG[lead.stage]?.icon}
                            {STAGE_CONFIG[lead.stage]?.label || lead.stage}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {lead.potentialValue != null ? (
                            <div className="flex items-center gap-1">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-3.5 h-3.5 ${i < lead.potentialValue! ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
                              ))}
                            </div>
                          ) : <span className="text-xs text-muted-foreground">&#x2014;</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden xl:table-cell">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-lg size-8 hover:bg-muted hover:text-foreground cursor-pointer outline-none">
                                <MoreHorizontal className="w-4 h-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDetail(lead)}>
                                <ExternalLink className="w-4 h-4 mr-2" />查看详情
                              </DropdownMenuItem>
                              <DropdownMenuItem disabled={analyzingId === lead.id} onClick={() => handleAiClassify(lead.id)}>
                                <Brain className={`w-4 h-4 mr-2 ${analyzingId === lead.id ? "animate-pulse" : ""}`} />
                                {analyzingId === lead.id ? "AI分析中..." : "AI智能分类"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(lead.id)} className="text-red-600">
                                <Trash2 className="w-4 h-4 mr-2" />删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="border-t px-4 py-3 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">共 {total} 条记录，第 {page}/{totalPages} 页</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 详情弹窗 */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          {selectedLead && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-emerald-500/25">
                    {(selectedLead.name || "?").charAt(0)}
                  </div>
                  <div>
                    <DialogTitle>{selectedLead.name || "未命名"}</DialogTitle>
                    <DialogDescription className="mt-1">{selectedLead.email || "未填写邮箱"}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">公司</p>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{selectedLead.company || "&#x2014;"}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">职位</p>
                    <span className="text-sm">{selectedLead.title || "&#x2014;"}</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">来源</p>
                    <Badge variant="outline" className="text-xs">{selectedLead.source.replace(/_/g, " ")}</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">添加时间</p>
                    <span className="text-xs">{new Date(selectedLead.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">销售阶段</p>
                    <div className="flex flex-wrap gap-2">
                      <Select value={selectedLead.stage} onValueChange={(v) => { if (v) handleStatusUpdate(selectedLead.id, v); }}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STAGE_CONFIG).map(([key, cfg]) => (
                            <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Badge className={`${CATEGORY_CONFIG[selectedLead.category]?.color || ""}`}>
                        {CATEGORY_CONFIG[selectedLead.category]?.label || selectedLead.category}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">潜力评分</p>
                    {selectedLead.potentialValue != null ? (
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-5 h-5 ${i < selectedLead.potentialValue! ? "fill-yellow-400 text-yellow-400" : "text-gray-200 dark:text-gray-700"}`} />
                        ))}
                        <span className="ml-2 text-sm text-muted-foreground">{selectedLead.potentialValue}/5</span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">尚未评估 — 点击下方按钮进行 AI 分析</p>
                    )}
                  </div>
                </div>

                {selectedLead.notes && (
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground mb-1">备注</p>
                    <pre className="text-xs whitespace-pre-wrap font-sans">{selectedLead.notes}</pre>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="default" className="flex-1 gap-2" disabled={analyzingId === selectedLead.id} onClick={() => handleAiClassify(selectedLead.id)}>
                    <Brain className={`w-4 h-4 ${analyzingId === selectedLead.id ? "animate-pulse" : ""}`} />
                    {analyzingId === selectedLead.id ? "AI 分析中..." : "AI 智能分类"}
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => handleDelete(selectedLead.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
