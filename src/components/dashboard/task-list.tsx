"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, AlertTriangle, Clock, ArrowRight } from "lucide-react";

export function TaskList() {
  const tasks = [
    {
      id: 1,
      title: "导入 GitHub 开发者",
      desc: "搜索 TypeScript 高影响力开发者",
      icon: "import",
      action: "/developers",
    },
    {
      id: 2,
      title: "AI 分析候选人",
      desc: `${0} 位开发者待分析`,
      icon: "analyze",
      action: "/developers?status=NEW",
    },
    {
      id: 3,
      title: "发送邀约邮件",
      desc: "已批准 ${0} 位等待触达",
      icon: "email",
      action: "/developers?status=APPROVED",
    },
    {
      id: 4,
      title: "配置 AI 模型",
      desc: "添加 OpenAI / DeepSeek API Key",
      icon: "config",
      action: "/settings",
    },
  ];

  const taskIcons: Record<string, React.ReactNode> = {
    import: <ArrowRight className="w-4 h-4" />,
    analyze: <AlertTriangle className="w-4 h-4" />,
    email: <Clock className="w-4 h-4" />,
    config: <CheckCircle2 className="w-4 h-4" />,
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">待办事项</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {tasks.map((task) => (
            <a
              key={task.id}
              href={task.action}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/80 transition-colors group"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0 text-muted-foreground">
                {taskIcons[task.icon] || <Circle className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{task.title}</p>
                <p className="text-xs text-muted-foreground truncate">{task.desc}</p>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </a>
          ))}
        </div>

        {/* AI Status */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">AI 服务状态</span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-400">就绪</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
            <div className="text-center p-1.5 bg-muted/50 rounded">
              <p className="font-medium text-foreground">OpenAI</p>
              <p>GPT-4o</p>
            </div>
            <div className="text-center p-1.5 bg-muted/50 rounded">
              <p className="font-medium text-foreground">DeepSeek</p>
              <p>R1</p>
            </div>
            <div className="text-center p-1.5 bg-muted/50 rounded">
              <p className="font-medium text-foreground">通义</p>
              <p>Qwen+</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
