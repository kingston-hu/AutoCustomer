import { db } from "@/lib/db";
import { executeAutoOutreachJob } from "@/services/automation/auto-outreach/executor";
import { ensureWorkflowRun, completeWorkflowRun } from "@/services/automation/workflow-runs";

async function appendTaskError(taskId: string, message: string, step: string) {
  try {
    const existing = await db.task_queue.findUnique({ where: { id: taskId } as any });
    const previous = existing?.error ? `${existing.error}\n` : "";
    await db.task_queue.update({
      where: { id: taskId },
      data: {
        error: `${previous}[${new Date().toISOString()}][${step}] ${message}`,
      } as any,
    });
  } catch (writeErr) {
    console.error("[auto-outreach-worker] failed to append task error:", writeErr);
  }
}

async function pickNextTask() {
  const task = await db.task_queue.findFirst({
    where: {
      status: "PENDING",
      type: "AUTO_OUTREACH",
      OR: [
        { scheduled_at: null },
        { scheduled_at: { lte: new Date() } },
      ],
    } as any,
    orderBy: [
      { priority: "asc" },
      { createdAt: "asc" },
    ],
  });

  if (!task) return null;

  const claimed = await db.task_queue.updateMany({
    where: { id: task.id, status: "PENDING" } as any,
    data: { status: "RUNNING", started_at: new Date() } as any,
  });

  if (claimed.count === 0) return null;
  console.log(`[auto-outreach-worker] claimed task ${task.id}`);
  return task;
}

async function workOnce() {
  const task = await pickNextTask();
  if (!task) return false;

  const payload = task.payload as any;
  console.log(`[auto-outreach-worker] entering ensureWorkflowRun for task ${task.id}`);

  try {
    await ensureWorkflowRun({
      taskId: task.id,
      workflowKey: String(payload.workflowKey || "163-fixed"),
      batchId: payload.batchId ? String(payload.batchId) : null,
      startedAt: task.started_at ?? new Date(),
    });
    console.log(`[auto-outreach-worker] ensureWorkflowRun ok for task ${task.id}`);
  } catch (error) {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    console.error(`[auto-outreach-worker] ensureWorkflowRun failed for ${task.id}:`, error);
    await appendTaskError(task.id, message, "ensureWorkflowRun");
    await db.task_queue.update({
      where: { id: task.id },
      data: {
        status: "FAILED",
        completed_at: new Date(),
        error: message,
      } as any,
    });
    throw error;
  }

  try {
    console.log(`[auto-outreach-worker] entering executeAutoOutreachJob for task ${task.id}`);
    await executeAutoOutreachJob({ id: task.id, payload: task.payload });
    console.log(`[auto-outreach-worker] executeAutoOutreachJob ok for task ${task.id}`);
  } catch (error) {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    console.error(`[auto-outreach-worker] executeAutoOutreachJob failed for ${task.id}:`, error);
    await appendTaskError(task.id, message, "executeAutoOutreachJob");
    await db.task_queue.update({
      where: { id: task.id },
      data: {
        status: "FAILED",
        completed_at: new Date(),
        error: message,
      } as any,
    });

    await completeWorkflowRun({
      taskId: task.id,
      status: "FAILED",
      progress: { done: 0, total: 0, succeeded: 0, failed: 0, skipped: 0 },
      error: message,
      summary: `Worker 执行失败：${message}`,
      result: { error: message },
    });
  }

  return true;
}

async function main() {
  console.log("[auto-outreach-worker] started");
  while (true) {
    const worked = await workOnce();
    if (!worked) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
}

main().catch((error) => {
  console.error("[auto-outreach-worker] fatal:", error);
  process.exit(1);
});

