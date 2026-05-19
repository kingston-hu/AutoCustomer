/**
 * POST /api/automation/auto-outreach
 *
 * 全自动邀约工作流：
 * 1. 按列表顺序遍历候选人（支持分页、过滤）
 * 2. 逐个调用 AI 生成邀约文案（使用"爬虫用户建联"模板）
 * 3. 自动发送邮件（跳过无邮箱的，记录失败）
 *
 * 支持参数：
 * - template?: string        — 模板名或自定义大纲文本（默认=爬虫用户建联模板）
 * - limit?: number           — 最多处理多少个（默认全部）
 * - offset?: number          — 从第几个开始（默认0，用于断点续跑）
 * - dryRun?: boolean         — 只生成不发送（默认false）
 * - delayMs?: number         — 每次请求间隔毫秒（默认2000，防限流）
 * - requireEmail?: boolean   — 是否只处理有邮箱的（默认true）
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createAutoOutreachJob, normalizeAutoOutreachJobInput } from "@/services/automation/auto-outreach/create-job";
import { executeAutoOutreachJob } from "@/services/automation/auto-outreach/executor";
import { ensureWorkflowRun } from "@/services/automation/workflow-runs";


import { Channel, SendStatus, TargetType } from "@/lib/constants";
import {
  outreachMessagePrompt,
  OUTREACH_COPYWRITING_SYSTEM,
} from "@/services/ai/prompts/templates";
import { aiRouter } from "@/services/ai/router";

// ============================================
// 内置快捷模板
// ============================================
const BUILTIN_TEMPLATES: Record<string, string> = {
  "正式邀请": [
    "1. 开场（称呼+对方项目赞美）",
    "2. 自我介绍（我是谁、做什么项目）",
    "3. 邀请理由（为什么选择TA）",
    "4. 价值说明（参与能获得什么）",
    "5. 行动号召（下一步怎么做）",
  ].join("\n"),
  "开源合作": [
    "1. 关注到对方的XX项目",
    "2. 表达对其技术能力的认可",
    "3. 介绍我们的开源计划",
    "4. 说明协作方式和贡献形式",
    "5. 提供联系方式和进一步沟通",
  ].join("\n"),
  "技术交流": [
    "1. 从共同的技术兴趣点切入",
    "2. 分享相关经验或观察",
    "3. 提出潜在的合作方向",
    "4. 简单介绍我们的项目背景",
    "5. 邀请线上/线下交流",
  ].join("\n"),
  "简洁直接": [
    "• 一句话表明来意",
    "• 一个具体理由",
    "• 一个明确请求",
    "• 控制在100字以内",
  ].join("\n"),
  "爬虫用户建联": [
    `请扮演一个"爬虫/数据采集脚本的潜在使用者"，用GitHub主页的对应语言（中英文），写给 GitHub 项目作者第一封建联邮件。`,
    ``,
    `目标是与开发者进行初步建联：邮件要短、自然、像真人，不要模板腔。`,
    ``,
    `邮件主题：可以跟你交流下GitHub项目吗？`,
    ``,
    `写作要求：`,
    `100-160 字左右`,
    `以"建立联系 + 表达兴趣 + 希望交流"为主`,
    `不要提到AutoCustomer`,
  ].join("\n"),
};

// 默认使用"爬虫用户建联"
const DEFAULT_TEMPLATE = "爬虫用户建联";

type RunProgress = { done: number; total: number; succeeded: number; failed: number; skipped: number };
type RunResultItem = {
  id: string;
  username: string;
  name: string;
  email: string | null;
  subject: string;
  body: string;
  success: boolean;
  error?: string;
  stage: "generated" | "sent" | "failed" | "skipped";
};
type RunHistoryItem = {
  id: string;
  startedAt: Date;
  finishedAt: Date | null;
  status: "running" | "completed" | "failed";
  durationMs: number | null;
  progress: RunProgress;
  summary: string;
  batchId?: string | null;
};

type WorkflowKey = "zoho-fixed" | "163-fixed";

type RuntimeBucket = {
  runId: string;
  running: boolean;
  paused: boolean;
  stopRequested: boolean;
  startedAt: Date | null;
  finishedAt: Date | null;
  progress: RunProgress;
  results: RunResultItem[];
  batchId?: string | null;
  batchEmails?: string[];
};

const runStatusMap: Partial<Record<WorkflowKey, RuntimeBucket>> = {};
const runHistoryMap: Partial<Record<WorkflowKey, RunHistoryItem[]>> = {};

function getWorkflowKey(input?: string): WorkflowKey {
  return input === "163-fixed" ? "163-fixed" : "zoho-fixed";
}

function getWorkflowLabel(key: WorkflowKey): string {
  return key === "163-fixed" ? "163固定模板邀约" : "Zoho固定模板邀约";
}

function getRunStatus(key: WorkflowKey) {
  return runStatusMap[key] || null;
}

function setRunStatus(key: WorkflowKey, value: RuntimeBucket | null) {
  if (value) runStatusMap[key] = value;
  else delete runStatusMap[key];
}

function getRunHistory(key: WorkflowKey) {
  return runHistoryMap[key] || [];
}

function setRunHistory(key: WorkflowKey, items: RunHistoryItem[]) {
  runHistoryMap[key] = items;
}




/**
 * Strip markdown code fence wrapping (```json ... ```)
 */
function stripMarkdownFence(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```\w*\s*\n?/i, "");
  cleaned = cleaned.replace(/\n?```\s*$/i, "");
  const match = cleaned.match(/```\w*\s*\n?([\s\S]*?)\n?```\s*/i);
  if (match) cleaned = match[1];
  return cleaned.trim();
}

/**
 * 解析 AI 返回的文案内容（兼容多种格式）
 *
 * AI 可能返回：
 *   1. { subject: "...", body: "..." }     — 标准模式
 *   2. { raw: "完整邮件文本..." }           — 自定义大纲模式常见
 *   3. { raw: "```json\n{...}\n```" }       — GLM-5 带代码块包裹
 *   4. "纯文本字符串"                       — 直接文本
 */
function parseAiResponse(content: any): { subject: string; body: string } {
  // 先提取实际文本内容
  let textContent = "";

  if (typeof content === "string") {
    textContent = stripMarkdownFence(content);
  } else if (typeof content === "object" && content !== null) {
    // 标准格式：有 subject + body
    if ("subject" in content && "body" in content) {
      let body = content.body || "";
      if (!body && content.raw) {
        body = typeof content.raw === "string" ? stripMarkdownFence(content.raw) : JSON.stringify(content.raw);
      }
      // If body still looks like JSON with subject/body, parse it
      try {
        const inner = JSON.parse(body);
        if (inner.subject || inner.body) return { subject: inner.subject || content.subject || "AI 生成", body: inner.body || "" };
      } catch { /* not json */ }
      return { subject: content.subject || "AI 生成", body };
    }
    // raw 格式：{ raw: "..." }
    if ("raw" in content && typeof content.raw === "string") {
      textContent = stripMarkdownFence(content.raw);
      // Try to parse as JSON (GLM-5 sometimes puts JSON inside code fences)
      try {
        const inner = JSON.parse(textContent);
        if (inner.subject || inner.body) {
          return { subject: inner.subject || "AI 生成", body: inner.body || "" };
        }
      } catch { /* not json, use as plain text */ }
    } else {
      // 其他对象 → 尝试序列化
      textContent = JSON.stringify(content);
    }
  }

  // 从纯文本中提取主题和正文
  if (!textContent.trim()) {
    return { subject: "AI 生成", body: textContent };
  }

  const lines = textContent.split(/\n/).filter((l) => l.trim());
  if (lines.length === 0) {
    return { subject: "AI 生成", body: textContent };
  }

  // 扫描所有行找"邮件主题"标记
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(/(?:邮件主题|主题|Subject)\s*[：:]\s*(.+)/i);
    if (match) {
      return {
        subject: match[1].trim(),
        body: lines.slice(i + 1).join("\n").trim(),
      };
    }
  }

  // 没有明确主题行 → 第一行作为主题，其余为正文
  const firstLine = lines[0].trim();
  return {
    subject: firstLine.length > 60 ? firstLine.substring(0, 57) + "..." : firstLine,
    body: textContent,
  };
}

/**
 * 获取开发者亮点信息（复用前端逻辑）
 */
function buildHighlights(dev: Record<string, unknown>): string {
  const parts: string[] = [];

  if (dev.bio) parts.push(`简介: ${dev.bio}`);
  if ((dev.skillTags as string)) parts.push(`技能: ${dev.skillTags as string}`);
  if ((dev.techStack as string)) parts.push(`技术栈: ${dev.techStack as string}`);

  // projects 可能是 JSON 字符串也可能是对象数组
  const rawProjects = dev.rawData ? (JSON.parse(dev.rawData as string)?.repositories || []) : [];
  if (Array.isArray(rawProjects) && rawProjects.length > 0) {
    parts.push(
      `项目: ${rawProjects.slice(0, 2).map((p: any) => p.name || p).join(", ")}`,
    );
  }

  if (dev.location) parts.push(`地区: ${dev.location as string}`);

  return parts.filter(Boolean).join("\n");
}

/**
 * 邮箱白名单级过滤：排除 bot / noreply / 明显脏邮箱
 */
function isDeliverableEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const value = email.trim().toLowerCase();
  if (!value) return false;

  // 基础格式：只允许一个 @，并且域名里至少有一个点
  const parts = value.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || !domain || !domain.includes(".")) return false;

  // 排除明显 bot / noreply / actions / dependabot / renovate 等地址
  const blockedPatterns = [
    "noreply",
    "no-reply",
    "dependabot",
    "renovate[bot]",
    "github-actions",
    "actions[bot]",
    "bot@",
    "[bot]",
  ];
  if (blockedPatterns.some((p) => value.includes(p))) return false;

  // 排除明显脏邮箱：例如 local@domain@uuid 这类多 @ 情况上面已拦；
  // 这里额外过滤 GitHub 隐私邮箱里带明显占位后缀的异常值
  if (/@[0-9a-f-]{12,}$/i.test(value)) return false;

  return true;
}


/**
 * 从 outreach_logs 表重建最近一次运行的状态摘要（内存状态丢失时的降级方案）
 * 直接使用 better-sqlite3 查询，避免 Prisma + Turbopack 兼容问题
 */
function rebuildStatusFromDB(workflowKey: WorkflowKey): {
  status: RuntimeBucket | null;
  history: RunHistoryItem[];
} {
  try {
    const Database = require("better-sqlite3") as any;
    const db = new Database("prisma/dev.db", { readonly: true });

    const logs = db.prepare(`
      SELECT id, target_id, subject, status, error, sent_at, createdAt
      FROM outreach_logs
      WHERE status IN ('SENT', 'DELIVERED', 'FAILED', 'OPENED', 'REPLIED', 'PENDING')
      ORDER BY createdAt DESC
      LIMIT 500
    `).all();

    db.close();

    if (!Array.isArray(logs) || logs.length === 0) {
      return { status: null, history: [] };
    }

    // 用 target_id 集合批量查开发者信息
    const targetIds = [...new Set(logs.map((l: any) => l.target_id).filter(Boolean))];
    const devMap = new Map<string, { username?: string | null; name?: string | null; email?: string | null }>();
    
    if (targetIds.length > 0) {
      try {
        const db2 = new Database("prisma/dev.db", { readonly: true });
        const placeholders = targetIds.map(() => "?").join(",");
        const devs = db2.prepare(`SELECT id, username, display_name as displayName, email FROM developers WHERE id IN (${placeholders})`).all(...(targetIds as any[]));
        db2.close();
        for (const d of devs as any[]) {
          devMap.set(d.id, { username: d.username, name: d.displayName, email: d.email });
        }
      } catch { /* ignore */ }
    }

    let succeeded = 0;
    let failed = 0;
    let skipped = 0;
    const results: RunResultItem[] = [];

    for (const log of (logs as any[])) {
      const devInfo = devMap.get(log.target_id || "") || {};
      const result: RunResultItem = {
        id: log.id,
        username: devInfo.username || devInfo.name || (log.target_id || "").substring(0, 8) || "unknown",
        name: devInfo.name || "",
        email: devInfo.email || null,
        subject: log.subject || "",
        body: "",
        success: log.status === "SENT" || log.status === "DELIVERED",
        error: log.error || undefined,
        stage: (log.status === "SENT" || log.status === "DELIVERED") ? "sent"
          : (log.status === "FAILED") ? "failed"
            : "skipped",
      };
      results.push(result);

      if (log.status === "SENT" || log.status === "DELIVERED") succeeded++;
      else if (log.status === "FAILED") failed++;
      else skipped++;
    }

    const earliestLog = logs[(logs as any[]).length - 1] as any;
    const latestLog = logs[0] as any;
    const startedAt = new Date(earliestLog.createdAt);
    const finishedAt = new Date(latestLog.createdAt);
    const total = succeeded + failed + skipped;

    const rebuiltStatus: RuntimeBucket = {
      runId: `db-rebuild-${workflowKey}`,
      running: false,
      paused: false,
      stopRequested: false,
      startedAt,
      finishedAt,
      progress: { done: total, total, succeeded, failed, skipped },
      results,
    };

    const historyItem: RunHistoryItem = {
      id: rebuiltStatus.runId,
      startedAt,
      finishedAt,
      status: "completed",
      durationMs: finishedAt.getTime() - startedAt.getTime(),
      progress: { done: total, total, succeeded, failed, skipped },
      summary: `${getWorkflowLabel(workflowKey)} — 从数据库重建历史：完成 ${total} 条记录（成功 ${succeeded}，失败 ${failed}，其他 ${skipped}）`,
    };

    return { status: rebuiltStatus, history: [historyItem] };
  } catch (err) {
    console.error(`[AUTO-OUTREACH] DB 回填失败 (${getWorkflowLabel(workflowKey)}):`, err);
    return { status: null, history: [] };
  }
}


async function getLatestTaskRuntime(workflowKey: WorkflowKey) {
  const latestTask = await db.task_queue.findFirst({
    where: {
      type: "AUTO_OUTREACH",
      payload: {
        path: "workflowKey",
        equals: workflowKey,
      } as any,
    },
    orderBy: [
      { completed_at: "desc" },
      { started_at: "desc" },
      { createdAt: "desc" },
    ],
  });

  if (!latestTask) return null;

  const result = latestTask.result && typeof latestTask.result === "object"
    ? (latestTask.result as Record<string, any>)
    : {};

  const progress = {
    done: Number(result?.progress?.done ?? 0),
    total: Number(result?.progress?.total ?? 0),
    succeeded: Number(result?.progress?.succeeded ?? 0),
    failed: Number(result?.progress?.failed ?? 0),
    skipped: Number(result?.progress?.skipped ?? 0),
  };

  const startedAt = latestTask.started_at ?? latestTask.createdAt ?? null;
  const finishedAt = latestTask.completed_at ?? null;
  const durationMs = startedAt ? ((finishedAt ?? new Date()).getTime() - startedAt.getTime()) : 0;
  const status = latestTask.status === "RUNNING"
    ? "running"
    : latestTask.status === "FAILED"
      ? "failed"
      : latestTask.status === "COMPLETED"
        ? "completed"
        : latestTask.status === "PENDING"
          ? "queued"
          : "idle";

  return {
    status,
    workflowKey,
    runId: latestTask.id,
    startedAt: startedAt?.toISOString() ?? null,
    finishedAt: finishedAt?.toISOString() ?? null,
    durationMs,
    progress,
    controls: {
      paused: false,
      stopRequested: false,
      canPause: status === "running",
      canResume: false,
      canStop: status === "running" || status === "queued",
    },
    results: Array.isArray(result.results)
      ? result.results.map((r) => ({
          ...r,
          body: undefined,
          bodyPreview: r.body && r.body.length > 0 ? r.body.substring(0, 80) + (r.body.length > 80 ? "..." : "") : (r.bodyPreview || ""),
        }))
      : [],
    history: [
      {
        id: latestTask.id,
        startedAt: startedAt?.toISOString() ?? null,
        finishedAt: finishedAt?.toISOString() ?? null,
        status,
        durationMs: finishedAt ? durationMs : null,
        progress,
        summary: String(result.summary || `任务状态：${status}`),
        batchId: (result.batchId as string | null) ?? null,
      },
    ],
  };
}


async function getLatestWorkflowRunRuntime(workflowKey: WorkflowKey) {
  const latestRun = await db.workflow_runs.findFirst({
    where: { workflow_key: workflowKey } as any,
    orderBy: [
      { completed_at: "desc" },
      { started_at: "desc" },
      { createdAt: "desc" },
    ],
  });

  if (!latestRun) return null;

  const latestItems = await db.workflow_run_items.findMany({
    where: { run_id: latestRun.id } as any,
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const result = latestRun.result && typeof latestRun.result === "object"
    ? (latestRun.result as Record<string, any>)
    : {};

  const progress = {
    done: Number(latestRun.progress_done ?? 0),
    total: Number(latestRun.progress_total ?? 0),
    succeeded: Number(latestRun.progress_succeeded ?? 0),
    failed: Number(latestRun.progress_failed ?? 0),
    skipped: Number(latestRun.progress_skipped ?? 0),
  };

  const startedAt = latestRun.started_at ?? latestRun.createdAt ?? null;
  const finishedAt = latestRun.completed_at ?? null;
  const durationMs = startedAt ? ((finishedAt ?? new Date()).getTime() - startedAt.getTime()) : 0;
  const startedAtIso = startedAt && typeof (startedAt as any).toISOString === "function" ? startedAt.toISOString() : null;
  const finishedAtIso = finishedAt && typeof (finishedAt as any).toISOString === "function" ? finishedAt.toISOString() : null;
  const safeItemCreatedAt = (value: unknown) => {
    if (value && typeof (value as any).toISOString === "function") return (value as Date).toISOString();
    if (value) {
      const parsed = new Date(String(value));
      if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
    }
    return null;
  };
  const status = latestRun.status === "RUNNING"

    ? "running"
    : latestRun.status === "FAILED"
      ? "failed"
      : latestRun.status === "COMPLETED"
        ? "completed"
        : latestRun.status === "PENDING"
          ? "queued"
          : "idle";

  return {
    status,
    workflowKey,
    runId: latestRun.id,
    taskId: latestRun.task_id ?? null,
    batchId: latestRun.batch_id ?? null,
    startedAt: startedAtIso,
    finishedAt: finishedAtIso,
    durationMs,
    progress,
    controls: {
      paused: false,
      stopRequested: false,
      canPause: status === "running",
      canResume: false,
      canStop: status === "running" || status === "queued",
    },
    results: Array.isArray(result.results)
      ? result.results.map((r) => ({
          ...r,
          body: undefined,
          bodyPreview: r.body && r.body.length > 0 ? r.body.substring(0, 80) + (r.body.length > 80 ? "..." : "") : (r.bodyPreview || ""),
        }))
      : [],
    items: latestItems.map((item) => ({
      id: item.id,
      targetId: item.target_id,
      email: item.email,
      status: item.status,
      reasonCode: item.reason_code,
      subject: item.subject,
      error: item.error,
      createdAt: safeItemCreatedAt(item.createdAt),
      meta: item.meta,
    })),
    history: [
      {
        id: latestRun.id,
        startedAt: startedAtIso,
        finishedAt: finishedAtIso,
        status,
        durationMs: finishedAt ? durationMs : null,
        progress,
        summary: String(result.summary || latestRun.error || `任务状态：${status}`),
        batchId: latestRun.batch_id ?? null,
      },
    ],
  };
}


export async function GET(request: NextRequest) {
  try {
    const workflowKey = getWorkflowKey(new URL(request.url).searchParams.get("workflowKey") || undefined);

    const workflowRunRuntime = await getLatestWorkflowRunRuntime(workflowKey);
    if (workflowRunRuntime) {
      return NextResponse.json(workflowRunRuntime);
    }

    const taskRuntime = await getLatestTaskRuntime(workflowKey);
    if (taskRuntime) {
      return NextResponse.json(taskRuntime);
    }

    let runStatus = getRunStatus(workflowKey);
    let runHistory = getRunHistory(workflowKey);

    // 内存无状态时，尝试从数据库回填（解决服务重启后页面空白的问题）
    if (!runStatus && runHistory.length === 0) {
      const dbData = await rebuildStatusFromDB(workflowKey);
      if (dbData.status) {
        runStatus = dbData.status;
        runHistory = dbData.history;
      }
    }

    if (!runStatus) {
      return NextResponse.json({
        status: "idle",
        workflowKey,
        message: "没有正在运行的自动化任务",
        source: "workflow-runs",
        history: runHistory.map((item) => ({
          ...item,
          startedAt: item.startedAt.toISOString(),
          finishedAt: item.finishedAt?.toISOString() ?? null,
        })),
      });
    }


    const durationMs = runStatus.startedAt ? Date.now() - runStatus.startedAt.getTime() : 0;

    return NextResponse.json({
      status: runStatus.running ? (runStatus.paused ? "paused" : "running") : (runStatus.progress.failed > 0 ? "completed" : "completed"),
      workflowKey,
      runId: runStatus.runId,
      startedAt: runStatus.startedAt?.toISOString(),
      finishedAt: runStatus.finishedAt?.toISOString() ?? null,
      durationMs,
      progress: runStatus.progress,
      controls: {
        paused: runStatus.paused,
        stopRequested: runStatus.stopRequested,
        canPause: runStatus.running && !runStatus.paused,
        canResume: runStatus.running && runStatus.paused,
        canStop: runStatus.running,
      },
      results: runStatus.results.map((r) => ({
        ...r,
        body: r.body ? undefined : undefined,
        bodyPreview: r.body && r.body.length > 0 ? r.body.substring(0, 80) + (r.body.length > 80 ? "..." : "") : "",
      })).filter(Boolean),
      history: runHistory.map((item) => ({
        ...item,
        startedAt: item.startedAt.toISOString(),
        finishedAt: item.finishedAt?.toISOString() ?? null,
      })),
    });
  } catch (error) {
    console.error("[AUTO-OUTREACH][GET] failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : null,
      },
      { status: 500 },
    );
  }
}







// ===== POST — 启动 / 控制自动化工作流 =====
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const workflowKey = getWorkflowKey(body.workflowKey);
    const currentStatus = getRunStatus(workflowKey);
    const action = String(body.action || "start").trim();

    const latestWorkflowRunRuntime = await getLatestWorkflowRunRuntime(workflowKey);
    const latestTaskRuntime = latestWorkflowRunRuntime ? null : await getLatestTaskRuntime(workflowKey);
    const latestRuntime = latestWorkflowRunRuntime ?? latestTaskRuntime;
    const hasActiveRuntime = latestRuntime?.status === "running" || latestRuntime?.status === "queued";

    if (!hasActiveRuntime && currentStatus?.running) {
      setRunStatus(workflowKey, {
        ...currentStatus,
        running: false,
        paused: false,
        stopRequested: false,
        finishedAt: currentStatus.finishedAt ?? new Date(),
      });
    }

    if (action === "pause") {
      if (!currentStatus?.running && !hasActiveRuntime) {
        return NextResponse.json({ error: `${getWorkflowLabel(workflowKey)}当前没有运行中的任务` }, { status: 409 });
      }
      if (currentStatus?.running) currentStatus.paused = true;
      return NextResponse.json({ status: "paused", workflowKey, message: "已暂停自动化工作流" });
    }

    if (action === "resume") {
      if (!currentStatus?.running && !hasActiveRuntime) {
        return NextResponse.json({ error: `${getWorkflowLabel(workflowKey)}当前没有运行中的任务` }, { status: 409 });
      }
      if (currentStatus?.running) currentStatus.paused = false;
      return NextResponse.json({ status: "running", workflowKey, message: "已继续自动化工作流" });
    }

    if (action === "stop") {
      if (!currentStatus?.running && !hasActiveRuntime) {
        return NextResponse.json({ error: `${getWorkflowLabel(workflowKey)}当前没有运行中的任务` }, { status: 409 });
      }
      if (currentStatus?.running) {
        currentStatus.stopRequested = true;
        currentStatus.paused = false;
      }
      return NextResponse.json({ status: "stopping", workflowKey, message: "已请求中止自动化工作流" });
    }

    if (currentStatus?.running || hasActiveRuntime) {
      return NextResponse.json(
        { error: `${getWorkflowLabel(workflowKey)}已有任务正在运行中，请等待完成或停止后再试`, status: latestRuntime ?? currentStatus },
        { status: 409 },
      );
    }

    const normalized = normalizeAutoOutreachJobInput(body);
    const taskId = crypto.randomUUID();
    const payload = {
      ...normalized,
      requestedAt: new Date().toISOString(),
    };

    await ensureWorkflowRun({
      taskId,
      workflowKey: normalized.workflowKey,
      batchId: normalized.batchId,
      startedAt: new Date(),
    });

    const runtime: RuntimeBucket = {
      runId: taskId,
      running: true,
      paused: false,
      stopRequested: false,
      startedAt: new Date(),
      finishedAt: null,
      progress: { done: 0, total: 0, succeeded: 0, failed: 0, skipped: 0 },
      results: [],
      batchId: normalized.batchId ?? null,
      batchEmails: normalized.batchEmails,
    };
    setRunStatus(workflowKey, runtime);

    const result = await executeAutoOutreachJob({ id: taskId, payload, useTaskQueue: false });

    setRunStatus(workflowKey, {
      ...runtime,
      running: false,
      finishedAt: new Date(),
      progress: result.progress,
      results: result.results,
    });

    const existingHistory = getRunHistory(workflowKey);
    setRunHistory(workflowKey, [
      {
        id: taskId,
        startedAt: runtime.startedAt || new Date(),
        finishedAt: new Date(),
        status: "completed",
        durationMs: runtime.startedAt ? Date.now() - runtime.startedAt.getTime() : null,
        progress: result.progress,
        summary: `任务完成：成功 ${result.progress.succeeded}，失败 ${result.progress.failed}，跳过 ${result.progress.skipped}`,
        batchId: normalized.batchId ?? null,
      },
      ...existingHistory,
    ].slice(0, 10));

    return NextResponse.json({
      status: "completed",
      workflowKey: normalized.workflowKey,
      taskId,
      batchId: normalized.batchId,
      message: "自动化任务已启动并执行完成",
      checkStatus: `/api/automation/auto-outreach?workflowKey=${normalized.workflowKey}`,
      result,
    });
  } catch (error) {
    console.error("[AUTO-OUTREACH] 直执行失败:", error);
    return NextResponse.json(
      { error: `执行失败: ${(error as Error).message}` },
      { status: 500 },
    );
  }
}






