"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FunnelChartProps {
  data?: {
    developer: Array<{ label: string; value: number }>;
    customer: Array<{ label: string; value: number }>;
  } | null;
  loading: boolean;
}

const DEV_COLORS = [
  "linear-gradient(90deg, #8b5cf6, #a78bfa)",
  "linear-gradient(90deg, #6366f1, #818cf8)",
  "linear-gradient(90deg, #3b82f6, #60a5fa)",
  "linear-gradient(90deg, #10b981, #34d399)",
];
const CUST_COLORS = [
  "linear-gradient(90deg, #f59e0b, #fbbf24)",
  "linear-gradient(90deg, #f97316, #fb923c)",
  "linear-gradient(90deg, #ef4444, #f87171)",
  "linear-gradient(90deg, #22c55e, #4ade80)",
];

function MiniBar({
  items,
  colors,
}: {
  items: Array<{ label: string; value: number }>;
  colors: string[];
}) {
  const maxVal = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={item.label} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium text-xs">
              {item.label}
            </span>
            <span className="font-bold tabular-nums text-sm">
              {item.value}
              {maxVal > 0 && idx > 0 && (
                <span className="text-[10px] font-normal text-muted-foreground ml-1.5">
                  ({Math.round((item.value / (items[0]?.value || 1)) * 100)}%)
                </span>
              )}
            </span>
          </div>
          <div className="h-2.5 bg-muted/80 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out shadow-sm"
              style={{
                width: `${
                  maxVal > 0 ? (item.value / maxVal) * 100 : 0
                }%`,
                background: colors[idx % colors.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FunnelChart({ data, loading }: FunnelChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="animate-pulse h-5 w-32 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-2.5 bg-muted rounded-full w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const devFunnel = data?.developer || [
    { label: "新导入", value: 0 },
    { label: "已分析", value: 0 },
    { label: "已触达", value: 0 },
    { label: "已转化", value: 0 },
  ];
  const custFunnel = data?.customer || [
    { label: "线索总数", value: 0 },
    { label: "已验证", value: 0 },
    { label: "跟进中", value: 0 },
    { label: "成交", value: 0 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            开发者招募漏斗
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MiniBar items={devFunnel} colors={DEV_COLORS} />
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            客户增长漏斗
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MiniBar items={custFunnel} colors={CUST_COLORS} />
        </CardContent>
      </Card>
    </div>
  );
}
