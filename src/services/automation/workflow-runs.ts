import crypto from "crypto";
import { db } from "@/lib/db";

export type WorkflowRunProgress = {
  done: number;
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
};

export async function ensureWorkflowRun(params: {
  taskId: string;
  workflowKey: string;
  batchId?: string | null;
  startedAt?: Date | null;
}) {
  console.log(`[workflow-runs] ensureWorkflowRun start task=${params.taskId} workflowKey=${params.workflowKey}`);
  const existing = await db.workflow_runs.findFirst({
    where: { task_id: params.taskId } as any,
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    console.log(`[workflow-runs] ensureWorkflowRun reuse existing run=${existing.id} task=${params.taskId}`);
    return existing;
  }

  const workflow = await db.workflow_definitions.findFirst({
    where: {
      OR: [
        { name: params.workflowKey },
        {
          name:
            params.workflowKey === "163-fixed"
              ? "固定模板逐个邀约发送（163）"
              : params.workflowKey === "zoho-fixed"
                ? "固定模板逐个邀约发送（Zoho）"
                : params.workflowKey,
        },
        {
          definition: {
            path: "workflowKey",
            equals: params.workflowKey,
          } as any,
        },
      ],
    } as any,
    orderBy: { createdAt: "desc" },
  });

  if (!workflow) {
    console.error(`[workflow-runs] workflow definition not found for ${params.workflowKey}`);
    throw new Error(`workflow_definitions 中未找到工作流定义: ${params.workflowKey}`);
  }

  const created = await db.workflow_runs.create({
    data: {
      id: crypto.randomUUID(),
      workflow_id: workflow.id,
      task_id: params.taskId,
      workflow_key: params.workflowKey,
      batch_id: params.batchId ?? null,
      status: "RUNNING",
      progress_done: 0,
      progress_total: 0,
      progress_succeeded: 0,
      progress_failed: 0,
      progress_skipped: 0,
      started_at: params.startedAt ?? new Date(),
      updatedAt: new Date(),
      context: {},
      result: {},
      logs: [],
    } as any,
  });
  console.log(`[workflow-runs] ensureWorkflowRun created run=${created.id} task=${params.taskId}`);
  return created;
}

export async function updateWorkflowRunProgress(params: {
  taskId: string;
  progress: WorkflowRunProgress;
  currentTargetId?: string | null;
  result?: unknown;
  summary?: string | null;
}) {
  console.log(`[workflow-runs] updateWorkflowRunProgress task=${params.taskId} done=${params.progress.done}/${params.progress.total}`);
  const run = await db.workflow_runs.findFirst({
    where: { task_id: params.taskId } as any,
    orderBy: { createdAt: "desc" },
  });

  if (!run) {
    console.warn(`[workflow-runs] updateWorkflowRunProgress missing run for task=${params.taskId}`);
    return null;
  }

  return db.workflow_runs.update({
    where: { id: run.id },
    data: {
      progress_done: params.progress.done,
      progress_total: params.progress.total,
      progress_succeeded: params.progress.succeeded,
      progress_failed: params.progress.failed,
      progress_skipped: params.progress.skipped,
      current_target_id: params.currentTargetId ?? null,
      result: params.result as any,
      logs: params.summary
        ? ([
            ...(Array.isArray(run.logs) ? (run.logs as any[]) : []),
            { at: new Date().toISOString(), summary: params.summary },
          ].slice(-30) as any)
        : run.logs,
      updatedAt: new Date(),
    } as any,
  });
}

export async function appendWorkflowRunItem(params: {
  taskId: string;
  workflowKey: string;
  batchId?: string | null;
  targetType: string;
  targetId: string;
  email?: string | null;
  status: "sent" | "failed" | "skipped" | "generated";
  reasonCode?: string | null;
  subject?: string | null;
  error?: string | null;
  meta?: unknown;
}) {
  console.log(`[workflow-runs] appendWorkflowRunItem task=${params.taskId} target=${params.targetId} status=${params.status}`);
  const run = await db.workflow_runs.findFirst({
    where: { task_id: params.taskId } as any,
    orderBy: { createdAt: "desc" },
  });

  if (!run) {
    console.warn(`[workflow-runs] appendWorkflowRunItem missing run for task=${params.taskId}`);
    return null;
  }

  return db.workflow_run_items.create({
    data: {
      id: crypto.randomUUID(),
      run_id: run.id,
      task_id: params.taskId,
      workflow_key: params.workflowKey,
      batch_id: params.batchId ?? null,
      target_type: params.targetType,
      target_id: params.targetId,
      email: params.email ?? null,
      status: params.status,
      reason_code: params.reasonCode ?? null,
      subject: params.subject ?? null,
      error: params.error ?? null,
      meta: params.meta as any,
      updatedAt: new Date(),
    } as any,
  });
}

export async function completeWorkflowRun(params: {
  taskId: string;
  status: string;
  progress: WorkflowRunProgress;
  result?: unknown;
  error?: string | null;
  summary?: string;
}) {
  console.log(`[workflow-runs] completeWorkflowRun task=${params.taskId} status=${params.status}`);
  const run = await db.workflow_runs.findFirst({
    where: { task_id: params.taskId } as any,
    orderBy: { createdAt: "desc" },
  });

  if (!run) {
    console.warn(`[workflow-runs] completeWorkflowRun missing run for task=${params.taskId}`);
    return null;
  }

  const now = new Date();
  return db.workflow_runs.update({
    where: { id: run.id },
    data: {
      status: params.status,
      progress_done: params.progress.done,
      progress_total: params.progress.total,
      progress_succeeded: params.progress.succeeded,
      progress_failed: params.progress.failed,
      progress_skipped: params.progress.skipped,
      result: (params.result ?? run.result) as any,
      error: params.error ?? null,
      completed_at: now,
      updatedAt: now,
      logs: params.summary
        ? ([
            ...(Array.isArray(run.logs) ? (run.logs as any[]) : []),
            { at: now.toISOString(), summary: params.summary, status: params.status },
          ].slice(-50) as any)
        : run.logs,
    } as any,
  });
}
