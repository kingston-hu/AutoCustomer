"use client";

import {
  Users,
  UserPlus,
  TrendingUp,
  Target,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardsProps {
  data: {
    developers?: {
      total: number;
      new: number;
      analyzed: number;
      contacted: number;
      converted: number;
      conversionRate: number;
    };
    leads?: {
      total: number;
      qualified: number;
      contacted: number;
      won: number;
      conversionRate: number;
    };
  } | null;
  loading: boolean;
}

export function StatsCards({ data, loading }: StatsCardsProps) {
  const stats = [
    {
      title: "开发者总数",
      value: data?.developers?.total ?? 0,
      change: "+12%",
      positive: true,
      icon: Users,
      gradient: "from-violet-500 to-indigo-500",
      shadowColor: "shadow-violet-500/20",
      bgColor: "bg-violet-50 dark:bg-violet-950/40",
    },
    {
      title: "已分析",
      value: data?.developers?.analyzed ?? 0,
      change: `${data?.developers?.conversionRate || 0}% 转化率`,
      positive: (data?.developers?.conversionRate || 0) > 5,
      icon: UserPlus,
      gradient: "from-blue-500 to-cyan-500",
      shadowColor: "shadow-blue-500/20",
      bgColor: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      title: "客户线索",
      value: data?.leads?.total ?? 0,
      change: "+8",
      positive: true,
      icon: Target,
      gradient: "from-emerald-500 to-teal-500",
      shadowColor: "shadow-emerald-500/20",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      title: "成交客户",
      value: data?.leads?.won ?? 0,
      change: `${data?.leads?.conversionRate || 0}% 转化`,
      positive: (data?.leads?.conversionRate || 0) > 3,
      icon: TrendingUp,
      gradient: "from-orange-500 to-amber-500",
      shadowColor: "shadow-orange-500/20",
      bgColor: "bg-orange-50 dark:bg-orange-950/40",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card
          key={stat.title}
          className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 group"
        >
          <CardContent className="pt-6 pb-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {stat.title}
                </p>
                {loading ? (
                  <div className="h-9 w-20 bg-muted rounded-md animate-pulse" />
                ) : (
                  <>
                    <p className="text-3xl font-bold tracking-tight tabular-nums">
                      {typeof stat.value === "number"
                        ? stat.value.toLocaleString()
                        : "-"}
                    </p>
                    {stat.value !== undefined &&
                      stat.value > 0 &&
                      !loading && (
                        <div
                          className={`flex items-center text-[11px] font-semibold mt-1 ${
                            stat.positive
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-500 dark:text-red-400"
                          }`}
                        >
                          {stat.positive ? (
                            <ArrowUpRight className="w-3 h-3 mr-0.5" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3 mr-0.5" />
                          )}
                          {stat.change}
                        </div>
                      )}
                  </>
                )}
              </div>
              <div
                className={`rounded-xl p-2.5 bg-gradient-to-br ${stat.gradient} text-white shadow-lg ${stat.shadowColor} group-hover:scale-110 transition-transform duration-300`}
              >
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
            {/* Decorative gradient blob */}
            <div
              className={`absolute -bottom-6 -right-6 w-28 h-28 bg-gradient-to-tl from-primary/8 to-transparent rounded-full pointer-events-none transition-opacity group-hover:opacity-100 opacity-60`}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
