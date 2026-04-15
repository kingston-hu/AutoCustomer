"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  Megaphone,
  Calendar,
  Users,
  Mail,
  TrendingUp,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Trash2,
  ArrowRight,
  Zap,
  Target,
  Sparkles,
  BarChart3,
} from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  type: string;
  status: string;
  targetCount: number;
  totalSent: number;
  totalReplied: number;
  totalConverted: number;
  scheduledAt: string | null;
  createdAt: string;
  updatedAt: string;
  creator?: { name: string | null; email: string };
  _count?: { leads: number; outreachLogs: number };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  DRAFT: { label: "草稿", color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-100 dark:bg-gray-800", icon: <Clock className="w-3 h-3" /> },
  SCHEDULED: { label: "已排期", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/50", icon: <Calendar className="w-3 h-3" /> },
  RUNNING: { label: "运行中", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/50", icon: <Play className="w-3 h-3" /> },
  PAUSED: { label: "已暂停", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/50", icon: <Pause className="w-3 h-3" /> },
  COMPLETED: { label: "已完成", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-100 dark:bg-violet-900/50", icon: <CheckCircle2 className="w-3 h-3" /> },
  CANCELLED: { label: "已取消", color: "text-red-500 dark:text-red-400", bg: "bg-red-100 dark:bg-red-900/50", icon: <XCircle className="w-3 h-3" /> },
};

const TYPE_CONFIG: Record<string, { label: string; icon: React.ReactNode; gradient: string }> = {
  DEVELOPER_RECRUIT: { label: "开发者招募", icon: <Users className="w-4 h-4" />, gradient: "from-blue-500 to-indigo-500" },
  CUSTOMER_GROWTH: { label: "客户增长", icon: <TrendingUp className="w-4 h-4" />, gradient: "from-emerald-500 to-teal-500" },
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    description: "",
    type: "DEVELOPER_RECRUIT",
    targetCount: "",
    scheduledAt: "",
  });
  const [creating, setCreating] = useState(false);

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "12");
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/campaigns?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Failed to fetch campaigns:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCreate = async () => {
    if (!createForm.name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          targetCount: Number(createForm.targetCount) || undefined,
          scheduledAt: createForm.scheduledAt || undefined,
        }),
      });
      if (res.ok) {
        setCreateOpen(false);
        setCreateForm({ name: "", description: "", type: "DEVELOPER_RECRUIT", targetCount: "", scheduledAt: "" });
        fetchCampaigns();
      } else {
        const err = await res.json();
        alert(`创建失败：${err.error}`);
      }
    } catch {
      alert("网络错误");
    } finally {
      setCreating(false);
    }
  };

  const updateCampaignStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchCampaigns();
      }
    } catch {}
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm("确定删除此活动？此操作不可恢复。")) return;
    try {
      await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      fetchCampaigns();
    } catch {}
  };

  // Calculate aggregate stats
  const stats = {
    total: total || campaigns.length,
    running: campaigns.filter((c) => c.status === "RUNNING").length,
    completed: campaigns.filter((c) => c.status === "COMPLETED").length,
    totalSent: campaigns.reduce((sum, c) => sum + c.totalSent, 0),
    totalReplied: campaigns.reduce((sum, c) => sum + c.totalReplied, 0),
    replyRate: campaigns.reduce((sum, c) => sum + c.totalReplied, 0) / Math.max(1, campaigns.reduce((sum, c) => sum + c.totalSent, 0)),
  };

  return (
    <div className="space-y-6">
      {/* ===== Header — Brand Gradient ===== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Megaphone className="w-5 h-5 text-white" />
            </div>
            <span>
              营销<span className="gradient-text">活动</span>
            </span>
          </h1>
          <p className="text-muted-foreground mt-1 ml-[44px]">
            管理营销活动，追踪触达效果 · 共 <span className="font-semibold tabular-nums text-foreground">{stats.total}</span> 个活动
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg shadow-violet-500/20 px-4 cursor-pointer outline-none">
              <Plus className="w-4 h-4" />新建活动
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                新建营销活动
              </DialogTitle>
              <DialogDescription>创建一个新的营销触达活动</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">活动名称 *</Label>
                <Input
                  id="name"
                  placeholder="例如：Rust 开发者春季招募"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">描述</Label>
                <Textarea
                  id="desc"
                  placeholder="描述这个活动的目标和计划..."
                  rows={3}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  className="rounded-lg"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>类型</Label>
                  <Select
                    value={createForm.type}
                    onValueChange={(v) => setCreateForm({ ...createForm, type: v || "DEVELOPER_RECRUIT" })}
                  >
                    <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEVELOPER_RECRUIT">开发者招募</SelectItem>
                      <SelectItem value="CUSTOMER_GROWTH">客户增长</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="targetCount">目标数量</Label>
                  <Input
                    id="targetCount"
                    type="number"
                    placeholder="50"
                    value={createForm.targetCount}
                    onChange={(e) => setCreateForm({ ...createForm, targetCount: e.target.value })}
                    className="rounded-lg"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>排期时间（可选）</Label>
                <Input
                  type="datetime-local"
                  value={createForm.scheduledAt}
                  onChange={(e) => setCreateForm({ ...createForm, scheduledAt: e.target.value })}
                  className="rounded-lg"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-lg">取消</Button>
              <Button onClick={handleCreate} disabled={creating || !createForm.name.trim()} className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-lg">
                {creating ? "创建中..." : "创建活动"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ===== Stats Cards — Premium Gradient ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 group hover:-translate-y-0.5">
          <CardContent className="p-5 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/20 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">总活动数</p>
              <p className="text-3xl font-black tabular-nums mt-1 text-violet-700 dark:text-violet-300">{stats.total}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:scale-110 transition-transform duration-300">
              <Megaphone className="w-5 h-5 text-white" />
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 group hover:-translate-y-0.5">
          <CardContent className="p-5 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/20 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">运行中</p>
              <p className="text-3xl font-black tabular-nums mt-1 text-emerald-600 dark:text-emerald-400">{stats.running}</p>
              <p className="text-xs text-emerald-500/70">{stats.completed} 已完成</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:scale-110 transition-transform duration-300 relative">
              <Play className="w-5 h-5 text-white" />
              {stats.running > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse ring-2 ring-background" />
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 group hover:-translate-y-0.5">
          <CardContent className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/20 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">已发送</p>
              <p className="text-3xl font-black tabular-nums mt-1 text-blue-700 dark:text-blue-300">{stats.totalSent}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform duration-300">
              <Mail className="w-5 h-5 text-white" />
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 group hover:-translate-y-0.5">
          <CardContent className="p-5 bg-gradient-to-br from-fuchsia-50 to-pink-50 dark:from-fuchsia-950/40 dark:to-pink-950/20 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">回复率</p>
              <p className="text-3xl font-black tabular-nums mt-1 text-fuchsia-600 dark:text-fuchsia-400">{(stats.replyRate * 100).toFixed(1)}<span className="text-lg">%</span></p>
              <p className="text-xs text-fuchsia-500/70">{stats.totalReplied} 次回复</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center shadow-lg shadow-fuchsia-500/25 group-hover:scale-110 transition-transform duration-300">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== Filters — Glass Style ===== */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索活动名称..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl bg-background/80 backdrop-blur-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v || "all"); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[160px] rounded-xl">
            <SelectValue placeholder="状态筛选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="DRAFT">📝 草稿</SelectItem>
            <SelectItem value="SCHEDULED">📅 已排期</SelectItem>
            <SelectItem value="RUNNING">▶️ 运行中</SelectItem>
            <SelectItem value="COMPLETED">✅ 已完成</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ===== Campaign Grid — Premium Cards ===== */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse overflow-hidden border-0 shadow-sm">
              <CardHeader className="pb-3 pt-5 px-5">
                <div className="h-5 bg-muted rounded-lg w-3/4 mb-2" />
                <div className="h-4 bg-muted rounded-lg w-1/2" />
              </CardHeader>
              <CardContent className="px-5 pb-5">
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="h-10 bg-muted rounded-lg" />
                    ))}
                  </div>
                  <div className="h-2 bg-muted rounded-full w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <Card className="border-dashed border-2 border-violet-200/60 dark:border-violet-800/30 bg-gradient-to-b from-violet-50/30 to-transparent dark:from-violet-950/10">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-2xl mx-auto bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900 dark:to-purple-900 flex items-center justify-center mb-4">
              <Megaphone className="w-8 h-8 text-violet-500" />
            </div>
            <h3 className="font-semibold text-lg mb-1">还没有营销活动</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm text-center">创建你的第一个营销活动来开始精准客户触达</p>
            <Button onClick={() => setCreateOpen(true)} className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-xl gap-2">
              <Plus className="w-4 h-4" /> 创建第一个活动
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {campaigns.map((campaign) => {
            const sc = STATUS_CONFIG[campaign.status] || STATUS_CONFIG.DRAFT;
            const tc = TYPE_CONFIG[campaign.type] || TYPE_CONFIG.DEVELOPER_RECRUIT;
            const replyRate = campaign.totalSent > 0 ? ((campaign.totalReplied / campaign.totalSent) * 100).toFixed(1) : "0.0";
            const progressPct = Math.min(100, (campaign.totalSent / Math.max(1, campaign.targetCount)) * 100);

            return (
              <Card key={campaign.id} className="group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                {/* Color accent bar */}
                <div className={`h-1 bg-gradient-to-r ${tc.gradient}`} />

                <CardHeader className="pb-3 pt-5 px-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${tc.gradient} flex items-center justify-center shadow-sm`}>
                          {tc.icon}
                        </div>
                        <CardTitle className="text-base font-bold truncate leading-tight">
                          {campaign.name}
                        </CardTitle>
                      </div>
                      <CardDescription className="mt-1 line-clamp-2 text-xs ml-9">
                        {campaign.description || tc.label}
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className={`shrink-0 text-xs font-medium ${sc.bg} ${sc.color} border-transparent`}>
                      {sc.icon} {sc.label}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="px-5 pb-5">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <div className="text-center p-2.5 rounded-xl bg-violet-50/80 dark:bg-violet-950/20 group-hover:bg-violet-100/60 dark:group-hover:bg-violet-950/30 transition-colors">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">目标</p>
                      <p className="text-base font-bold tabular-nums text-violet-700 dark:text-violet-300">{campaign.targetCount || 0}</p>
                    </div>
                    <div className="text-center p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/20 group-hover:bg-blue-100/60 dark:group-hover:bg-blue-950/30 transition-colors">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">发送</p>
                      <p className="text-base font-bold tabular-nums text-blue-700 dark:text-blue-300">{campaign.totalSent}</p>
                    </div>
                    <div className="text-center p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/20 group-hover:bg-emerald-100/60 dark:group-hover:bg-emerald-950/30 transition-colors">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">回复</p>
                      <p className="text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{campaign.totalReplied}</p>
                    </div>
                    <div className="text-center p-2.5 rounded-xl bg-fuchsia-50/80 dark:bg-fuchsia-950/20 group-hover:bg-fuchsia-100/60 dark:group-hover:bg-fuchsia-950/30 transition-colors">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">转化</p>
                      <p className="text-base font-bold tabular-nums text-fuchsia-600 dark:text-fuchsia-400">{campaign.totalConverted}</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  {campaign.totalSent > 0 && (
                    <div className="space-y-1.5 mb-4">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span className="font-medium">发送进度</span>
                        <span className="font-semibold tabular-nums text-fuchsia-600 dark:text-fuchsia-400">{replyRate}% 回复率</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/60 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 transition-all duration-500 ease-out relative"
                          style={{ width: `${progressPct}%` }}
                        >
                          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.3),transparent)] animate-shimmer" style={{ backgroundSize: '200% 100%' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-border/50">
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {new Date(campaign.createdAt).toLocaleDateString("zh-CN")}
                    </span>
                    <div className="flex items-center gap-1">
                      {(campaign.status === "DRAFT" || campaign.status === "SCHEDULED") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-lg"
                          onClick={() => updateCampaignStatus(campaign.id, "RUNNING")}
                        >
                          <Play className="w-3 h-3 mr-1" /> 启动
                        </Button>
                      )}
                      {campaign.status === "RUNNING" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg"
                          onClick={() => updateCampaignStatus(campaign.id, "PAUSED")}
                        >
                          <Pause className="w-3 h-3 mr-1" /> 暂停
                        </Button>
                      )}
                      <Link href={`/campaigns/${campaign.id}`}
                        className="inline-flex items-center justify-center h-7 rounded-lg px-2 text-xs text-muted-foreground hover:bg-violet-50 dark:hover:bg-violet-950/30 hover:text-foreground transition-colors"
                        >
                          <Eye className="w-3 h-3 mr-1" /> 详情
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-destructive/70 hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg"
                        onClick={() => deleteCampaign(campaign.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ===== Pagination ===== */}
      {!loading && total > 12 && (
        <div className="flex items-center justify-between pt-4">
          <p className="text-sm text-muted-foreground">
            共 <span className="font-semibold tabular-nums">{total}</span> 个活动
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="rounded-lg"
            >
              上一页
            </Button>
            <span className="text-sm font-medium tabular-nums px-2">第 {page} 页</span>
            <Button
              variant="outline"
              size="sm"
              disabled={page * 12 >= total}
              onClick={() => setPage(page + 1)}
              className="rounded-lg"
            >
              下一页
            </Button>
          </div>
        </div>
      )}

      {/* Shimmer animation */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite linear;
        }
      `}</style>
    </div>
  );
}
