import { NextRequest, NextResponse } from "next/server";
import { executeTask, getAvailableTasks } from "@/services/tasks/scheduler";

// GET /api/tasks — 获取可用任务列表
export async function GET() {
  return NextResponse.json({
    tasks: getAvailableTasks(),
  });
}

// POST /api/tasks — 执行任务
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, config, dryRun } = body;

    if (!type) {
      return NextResponse.json({ error: "Missing task type" }, { status: 400 });
    }

    // 检查任务是否存在
    const available = getAvailableTasks();
    if (!available.find((t) => t.type === type)) {
      return NextResponse.json(
        {
          error: `Unknown task: ${type}`,
          available: available.map((t) => t.type),
        },
        { status: 400 },
      );
    }

    // Dry run 模式只返回配置信息，不实际执行
    if (dryRun) {
      const task = available.find((t) => t.type === type)!;
      return NextResponse.json({
        dryRun: true,
        type,
        config: { ...task.defaultConfig, ...config },
        message: `Would execute: ${task.name}`,
      });
    }

    // 执行任务（带超时）
    const result = await Promise.race([
      executeTask(type, config),
      new Promise<Record<string, unknown>>((_, reject) =>
        setTimeout(() => reject(new Error("Task timeout (120s)")), 120000),
      ),
    ]);

    return NextResponse.json({
      ...result,
      type,
      executedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Task execution error:", error);
    return NextResponse.json(
      { error: "Task execution failed", details: (error as Error).message },
      { status: 500 },
    );
  }
}
