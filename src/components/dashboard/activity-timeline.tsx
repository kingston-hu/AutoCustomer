"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, Brain, Clock, ArrowRightLeft } from "lucide-react";

interface ActivityTimelineProps {
  activities?: any[] | null;
  loading: boolean;
}

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  EMAIL: <Mail className="w-3.5 h-3.5" />,
  REPLY: <MessageSquare className="w-3.5 h-3.5" />,
  FOLLOW_UP: <ArrowRightLeft className="w-3.5 h-3.5" />,
  NOTE: <MessageSquare className="w-3.5 h-3.5" />,
};

const CHANNEL_COLORS: Record<string, string> = {
  EMAIL: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400",
  LINKEDIN_DM: "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400",
  IN_APP: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-400",
  default: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

function timeAgo(dateStr: string | Date): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

export function ActivityTimeline({ activities, loading }: ActivityTimelineProps) {
  const items = activities || [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">最近活动</CardTitle>
          <span className="text-xs text-muted-foreground">{items.length} 条记录</span>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-8 h-8 bg-muted rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-2/3" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            暂无活动记录
          </div>
        ) : (
          <div className="space-y-1 max-h-[340px] overflow-y-auto -mx-2 px-2">
            {items.map((activity: any, idx: number) => {
              const isOutreach = activity.activityType === "outreach";
              const typeLabel = isOutreach
                ? activity.channel || "EMAIL"
                : activity.type || "NOTE";

              return (
                <div
                  key={activity.id || idx}
                  className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
                      CHANNEL_COLORS[typeLabel] || CHANNEL_COLORS.default
                    }`}
                  >
                    {ACTIVITY_ICONS[typeLabel] || <Clock className="w-3.5 h-3.5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">
                      {isOutreach
                        ? `发送${typeLabel}: ${activity.subject || "(无主题)"}`
                        : activity.content?.length > 80
                          ? activity.content.slice(0, 80) + "..."
                          : activity.content || "无内容"
                      }
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {timeAgo(activity.createdAt)}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                        {activity.status === "SENT" || activity.direction === "OUTGOING"
                          ? "已发送"
                          : activity.status === "REPLIED" || activity.direction === "INCOMING"
                            ? "收到回复"
                            : activity.status || activity.type}
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
