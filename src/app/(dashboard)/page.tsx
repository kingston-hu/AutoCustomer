"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  TrendingUp,
  Target,
  GitBranch,
  Brain,
  ArrowRight,
  RefreshCw,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { FunnelChart } from "@/components/dashboard/funnel-chart";
import { ConversionFunnel } from "@/components/dashboard/conversion-funnel";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { TaskList } from "@/components/dashboard/task-list";

interface DashboardData {
  developers: {
    total: number;
    new: number;
    analyzed: number;
    contacted: number;
    converted: number;
    conversionRate: number;
  };
  leads: {
    total: number;
    qualified: number;
    contacted: number;
    won: number;
    conversionRate: number;
  };
  funnel: {
    developer: Array<{ label: string; value: number }>;
    customer: Array<{ label: string; value: number }>;
  };
  recentActivity: any[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/dashboard/stats");
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-6 p-2 md:p-0">
      {/* Page Header — 品牌化 */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight gradient-text">
            仪表盘
          </h1>
          <p className="text-sm text-muted-foreground">
            AutoCustomer —{" "}
            <span className="text-foreground/70">
              AI 驱动的自动获客系统总览
            </span>
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStats}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw
            className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
          />
          刷新数据
        </Button>
      </div>

      {/* Stats Cards */}
      <StatsCards data={data} loading={loading} />

      {/* Funnel Charts */}
      <FunnelChart data={data?.funnel} loading={loading} />

      {/* Middle Row — Funnel + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <ConversionFunnel />
        </div>
        <div className="lg:col-span-3">
          <ActivityTimeline
            activities={data?.recentActivity}
            loading={loading}
          />
        </div>
      </div>

      {/* Bottom Row — Tasks + Automation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TaskList />

        {/* Automation Panel — Premium style */}
        <Card className="lg:col-span-2 border-0 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-br from-card to-card/50">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              自动化任务
              <span className="ml-auto text-xs font-normal text-muted-foreground font-mono">
                v2.0
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
              配置自动化工作流：GitHub 定时采集、AI 批量分析、邮件自动跟进
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  name: "GitHub 采集",
                  desc: "搜索并导入开发者",
                  emoji: "🔍",
                  type: "github-scrape",
                  color: "from-violet-500/10 to-indigo-500/10 border-violet-500/20 hover:border-violet-500/40",
                },
                {
                  name: "AI 分析",
                  desc: "批量能力评估",
                  emoji: "🧠",
                  type: "ai-analyze",
                  color: "from-blue-500/10 to-cyan-500/10 border-blue-500/20 hover:border-blue-500/40",
                },
                {
                  name: "邮件跟进",
                  desc: "自动发送提醒",
                  emoji: "📧",
                  type: "email-followup",
                  color: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20 hover:border-emerald-500/40",
                },
                {
                  name: "数据同步",
                  desc: "统计与清理",
                  emoji: "🔄",
                  type: "data-sync",
                  color: "from-orange-500/10 to-amber-500/10 border-orange-500/20 hover:border-orange-500/40",
                },
              ].map((task) => (
                <button
                  key={task.type}
                  onClick={() => {
                    if (confirm(`确定执行「${task.name}」任务？`)) {
                      fetch("/api/tasks", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ type: task.type }),
                      })
                        .then((res) => res.json())
                        .then((result) => {
                          alert(
                            result.message ||
                              (result.success
                                ? `${task.name} 执行成功！`
                                : `失败：${result.error}`)
                          );
                          fetchStats();
                        })
                        .catch(() => alert("网络错误"));
                    }
                  }}
                  className={`flex items-center gap-3 p-3.5 rounded-xl border bg-gradient-to-br ${task.color} transition-all duration-200 text-left group hover:scale-[1.02]`}
                >
                  <span className="text-xl group-hover:scale-110 transition-transform">
                    {task.emoji}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{task.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {task.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links — Premium cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            href: "/developers",
            icon: Users,
            label: "开发者招募",
            sub: `${data?.developers.total || 0} 位候选人`,
            gradient:
              "hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50/50 dark:hover:bg-violet-950/20",
            iconColor: "text-violet-600 dark:text-violet-400",
          },
          {
            href: "/leads",
            icon: Target,
            label: "客户增长",
            sub: `${data?.leads.total || 0} 条线索`,
            gradient:
              "hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-950/20",
            iconColor: "text-blue-600 dark:text-blue-400",
          },
          {
            href: "/campaigns",
            icon: GitBranch,
            label: "Campaign 管理",
            sub: "创建自动化触达",
            gradient:
              "hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20",
            iconColor: "text-emerald-600 dark:text-emerald-400",
          },
          {
            href: "/settings",
            icon: Brain,
            label: "系统配置",
            sub: "模型 / 提示词管理",
            gradient:
              "hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50/50 dark:hover:bg-orange-950/20",
            iconColor: "text-orange-600 dark:text-orange-400",
          },
        ].map((link) => (
          <Link key={link.href} href={link.href}
            className={`w-full h-auto py-4 px-4 flex-col gap-2 rounded-xl border transition-all duration-200 hover:scale-[1.02] group ${link.gradient}`}
          >
            <link.icon
              className={`w-5 h-5 group-hover:scale-110 transition-transform ${link.iconColor}`}
            />
            <span className="font-semibold text-xs">{link.label}</span>
            <span className="text-[11px] text-muted-foreground font-normal">
              {link.sub}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
