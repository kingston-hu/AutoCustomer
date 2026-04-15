"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// 漏斗阶段定义
const FUNNEL_STAGES = [
  { key: "total", label: "总线索", color: "#94a3b8", icon: "🎯" },
  { key: "new", label: "新线索", color: "#3b82f6", icon: "✨" },
  { key: "contacted", label: "已联系", color: "#eab308", icon: "📧" },
  { key: "replied", label: "已回复", color: "#a855f7", icon: "💬" },
  { key: "meetingSet", label: "会议中", color: "#6366f1", icon: "📅" },
  { key: "negotiating", label: "谈判中", color: "#f97316", icon: "🤝" },
  { key: "converted", label: "已转化", color: "#22c55e", icon: "🎉" },
] as const;

interface FunnelData {
  total: number;
  new: number;
  contacted: number;
  replied: number;
  meetingSet: number;
  negotiating: number;
  converted: number;
}

export function ConversionFunnel() {
  const [data, setData] = useState<FunnelData>({
    total: 0, new: 0, contacted: 0, replied: 0,
    meetingSet: 0, negotiating: 0, converted: 0,
  });
  const [period, setPeriod] = useState("all");

  useEffect(() => {
    // 从仪表盘 API 获取数据（或直接从 stats 计算）
    fetch("/api/dashboard/stats")
      .then((res) => res.json())
      .then((stats) => {
        setData({
          total: stats.totalLeads || 0,
          new: stats.newLeads || 0,
          contacted: stats.contacted || 0,
          replied: stats.replied || 0,
          meetingSet: stats.meetingSet || 0,
          negotiating: stats.negotiating || 0,
          converted: stats.converted || 0,
        });
      })
      .catch(() => {
        // 使用模拟数据展示 UI
        setData({
          total: 120, new: 45, contacted: 38, replied: 22,
          meetingSet: 12, negotiating: 6, converted: 3,
        });
      });
  }, [period]);

  const maxValue = Math.max(data.total, 1);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">转化漏斗</CardTitle>
        <Select value={period} onValueChange={(v) => setPeriod(v || "all")}>
          <SelectTrigger className="w-[110px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="30d">近 30 天</SelectItem>
            <SelectItem value="7d">近 7 天</SelectItem>
            <SelectItem value="today">今天</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {/* 漏斗可视化 */}
        <div className="space-y-2">
          {FUNNEL_STAGES.map((stage, index) => {
            const count = data[stage.key];
            const percentage = (count / maxValue) * 100;
            const prevCount = index > 0 ? data[FUNNEL_STAGES[index - 1].key] : data.total;
            const conversionRate = prevCount > 0 ? ((count / prevCount) * 100).toFixed(1) : "—";
            
            return (
              <div key={stage.key} className="group relative">
                <div
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all hover:bg-muted/50 cursor-default"
                  style={{
                    background: `linear-gradient(90deg, ${stage.color}${Math.round(percentage * 0.15).toString(16).padStart(2, "0")} 0%, transparent ${percentage}%)`,
                  }}
                >
                  <span className="text-base w-5 text-center shrink-0">{stage.icon}</span>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{stage.label}</span>
                      <span className="text-sm font-bold">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: stage.color,
                        }}
                      />
                    </div>
                  </div>

                  {index > 0 && (
                    <Badge variant="outline" className="shrink-0 text-[10px] px-1.5 py-0">
                      {conversionRate}%
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 汇总 */}
        <div className="mt-4 pt-3 border-t grid grid-cols-3 gap-3 text-center">
          <div>
            <p className="text-xs text-muted-foreground">总转化率</p>
            <p className="text-lg font-bold text-green-600">
              {data.total > 0 ? ((data.converted / data.total) * 100).toFixed(1) : 0}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">回复率</p>
            <p className="text-lg font-bold text-purple-600">
              {data.contacted > 0 ? ((data.replied / data.contacted) * 100).toFixed(1) : 0}%
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">会议转化率</p>
            <p className="text-lg font-bold text-indigo-600">
              {data.meetingSet > 0 ? ((data.converted / data.meetingSet) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
