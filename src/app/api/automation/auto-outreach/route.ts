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
import { sendEmail } from "@/services/email/service";
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

export async function GET(request: NextRequest) {
  const workflowKey = getWorkflowKey(new URL(request.url).searchParams.get("workflowKey") || undefined);
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
}




// ===== POST — 启动 / 控制自动化工作流 =====
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const workflowKey = getWorkflowKey(body.workflowKey);
    const currentStatus = getRunStatus(workflowKey);
    const action = String(body.action || "start").trim();

    if (action === "pause") {
      if (!currentStatus?.running) {
        return NextResponse.json({ error: `${getWorkflowLabel(workflowKey)}当前没有运行中的任务` }, { status: 409 });
      }
      currentStatus.paused = true;
      return NextResponse.json({ status: "paused", workflowKey, message: "已暂停自动化工作流" });
    }

    if (action === "resume") {
      if (!currentStatus?.running) {
        return NextResponse.json({ error: `${getWorkflowLabel(workflowKey)}当前没有运行中的任务` }, { status: 409 });
      }
      currentStatus.paused = false;
      return NextResponse.json({ status: "running", workflowKey, message: "已继续自动化工作流" });
    }

    if (action === "stop") {
      if (!currentStatus?.running) {
        return NextResponse.json({ error: `${getWorkflowLabel(workflowKey)}当前没有运行中的任务` }, { status: 409 });
      }
      currentStatus.stopRequested = true;
      currentStatus.paused = false;
      return NextResponse.json({ status: "stopping", workflowKey, message: "已请求中止自动化工作流" });
    }

    if (currentStatus?.running) {
      return NextResponse.json(
        { error: `${getWorkflowLabel(workflowKey)}已有任务正在运行中，请等待完成或停止后再试`, status: currentStatus },
        { status: 409 },
      );
    }

    const {
      templateName = DEFAULT_TEMPLATE,
      limit = 9999,
      offset = 0,
      dryRun = false,
      delayMs = 2000,
      requireEmail = true,
      fixedSubject = "",
      fixedBody = "",
      resumeOnlyUnsent = false,
      selectedDeveloperIds = [],
      smtpOverride = null,
      batchId = null,
      batchEmails = [],
    } = body;

    const normalizedSmtpOverride = smtpOverride && typeof smtpOverride === "object"
      ? {
          host: String(smtpOverride.host || "").trim(),
          port: Number(smtpOverride.port || 0),
          user: String(smtpOverride.user || "").trim(),
          pass: String(smtpOverride.pass || "").trim(),
          from: String(smtpOverride.from || "").trim() || undefined,
        }
      : null;

    const normalizedSelectedDeveloperIds = Array.isArray(selectedDeveloperIds)
      ? selectedDeveloperIds.filter(Boolean)
      : [];
    const normalizedBatchId = batchId ? String(batchId).trim() : null;
    const normalizedBatchEmails = Array.isArray(batchEmails)
      ? batchEmails.filter((item: unknown) => typeof item === "string" && item.trim()).map((item: string) => item.trim())
      : [];

    const pureFixedMode = !!(fixedSubject && fixedBody);
    const outline = templateName in BUILTIN_TEMPLATES
      ? BUILTIN_TEMPLATES[templateName as keyof typeof BUILTIN_TEMPLATES]
      : (templateName as string);

    const runId = crypto.randomUUID();
    const newStatus: RuntimeBucket = {
      runId,
      running: true,
      paused: false,
      stopRequested: false,
      startedAt: new Date(),
      finishedAt: null,
      progress: { done: 0, total: 0, succeeded: 0, failed: 0, skipped: 0 },
      results: [],
      batchId: normalizedBatchId,
      batchEmails: normalizedBatchEmails,
    };

    setRunStatus(workflowKey, newStatus);
    const currentHistory = getRunHistory(workflowKey);
    const historyItem: RunHistoryItem = {
      id: runId,
      startedAt: newStatus.startedAt!,
      finishedAt: null,
      status: "running",
      durationMs: null,
      progress: { ...newStatus.progress },
      summary: `${getWorkflowLabel(workflowKey)}任务已启动，等待执行中`,
      batchId: normalizedBatchId,
    };
    setRunHistory(workflowKey, [
      historyItem,
      ...currentHistory,
    ].slice(0, 20));

    console.log(`\n🚀 [AUTO-OUTREACH] 启动自动化邀约工作流 (${getWorkflowLabel(workflowKey)})`);
    console.log(`   模式: ${pureFixedMode ? "纯固定模板" : "AI 生成"}`);
    console.log(`   恢复模式: ${resumeOnlyUnsent ? "仅未发送" : "全部候选人"}`);
    console.log(`   指定开发者: ${normalizedSelectedDeveloperIds.length > 0 ? normalizedSelectedDeveloperIds.length + " 人" : "未指定（按筛选结果）"}`);
    console.log(`   模板: "${templateName}" (${outline.length} 字符)`);
    console.log(`   参数: limit=${limit}, offset=${offset}, dryRun=${dryRun}, delay=${delayMs}ms, requireEmail=${requireEmail}\n`);

    executeWorkflow({ workflowKey, outline, limit, offset, dryRun, delayMs, requireEmail, pureFixedMode, fixedSubject, fixedBody, resumeOnlyUnsent, selectedDeveloperIds: normalizedSelectedDeveloperIds, smtpOverride: normalizedSmtpOverride, batchId: normalizedBatchId, batchEmails: normalizedBatchEmails });

    return NextResponse.json({
      status: "started",
      workflowKey,
      message: "自动化工作流已启动",
      templateName,
      dryRun,
      checkStatus: `/api/automation/auto-outreach?workflowKey=${workflowKey}`,
    });
  } catch (error) {
    console.error("[AUTO-OUTREACH] 启动失败:", error);
    return NextResponse.json(
      { error: `启动失败: ${(error as Error).message}` },
      { status: 500 },
    );
  }
}


// ============================================
// 工作流主逻辑（异步执行）
// ============================================
async function executeWorkflow(opts: {
  workflowKey: WorkflowKey;

  outline: string;
  limit: number;
  offset: number;
  dryRun: boolean;
  delayMs: number;
  requireEmail: boolean;
  pureFixedMode: boolean;
  fixedSubject: string;
  fixedBody: string;
  resumeOnlyUnsent: boolean;
  selectedDeveloperIds: string[];
  smtpOverride: { host: string; port: number; user: string; pass: string; from?: string } | null;
  batchId?: string | null;
  batchEmails?: string[];
}) {
  const { workflowKey, outline, limit, offset, dryRun, delayMs, requireEmail, pureFixedMode, fixedSubject, fixedBody, resumeOnlyUnsent, selectedDeveloperIds, smtpOverride, batchId, batchEmails } = opts;
  const getCurrentStatus = () => getRunStatus(workflowKey)!;
  const senderIdentity = smtpOverride?.user || smtpOverride?.from || process.env.EMAIL_FROM || process.env.SMTP_USER || null;



  try {

    // 1️⃣ 从数据库获取候选人列表（按 ID 升序 = 列表顺序）
    const whereClause: Record<string, unknown> = {};
    if (requireEmail) {
      // SQLite 用 IS NOT NULL AND != '' 过滤空邮箱
      whereClause.email = { notIn: [""] } as any; // Prisma SQLite 兼容写法
    }

    const allDevelopers = await db.developers.findMany({
      where: whereClause as any,
      orderBy: { createdAt: "asc" }, // 或按 id: "asc"
      select: {
        id: true,
        username: true,
        display_name: true,
        bio: true,
        skillTags: true,
        techStack: true,
        location: true,
        email: true,
        rawData: true,
      },
    });

    // 进一步过滤：确保有邮箱（Prisma 的 notIn 对空字符串可能不完全生效）
    let filteredDevs = requireEmail
      ? allDevelopers.filter((d: any) => d.email && d.email.trim() !== "")
      : allDevelopers;

    // 恢复模式：排除已经成功发送过邮件的候选人，避免重复打扰
    if (resumeOnlyUnsent) {
      const sentLogs = await db.outreach_logs.findMany({
        where: {
          channel: Channel.EMAIL as any,
          status: SendStatus.SENT as any,
          target_type: TargetType.DEVELOPER,
        },
        select: { target_id: true },
      });
      const sentIds = new Set(sentLogs.map((x: any) => x.target_id).filter(Boolean));
      filteredDevs = filteredDevs.filter((d: any) => !sentIds.has(d.id));
      console.log(`[AUTO-OUTREACH] 🔁 恢复模式启用：已过滤 ${sentIds.size} 个已成功发送候选人`);
    }

    // 邮箱清洗：排除 bot / noreply / 明显格式错误邮箱
    const beforeDeliverableFilter = filteredDevs.length;
    filteredDevs = filteredDevs.filter((d: any) => isDeliverableEmail(d.email));
    console.log(`[AUTO-OUTREACH] 🧹 邮箱清洗：已过滤 ${beforeDeliverableFilter - filteredDevs.length} 个无效/不适合发送邮箱`);

    // 页面手动勾选开发者：只处理指定 ID 列表
    if (selectedDeveloperIds.length > 0) {
      const selectedSet = new Set(selectedDeveloperIds);
      filteredDevs = filteredDevs.filter((d: any) => selectedSet.has(d.id));
      console.log(`[AUTO-OUTREACH] 🎯 手动选择模式：保留 ${filteredDevs.length} 位开发者`);
    }

    // 应用 offset + limit
    let candidates = filteredDevs.slice(offset, offset + limit);
    const totalCandidates = candidates.length;

    // 邮箱去重：同一邮箱被多个开发者持有时，跳过所有冲突记录（避免发错人）
    const emailToDevs = new Map<string, any[]>();
    for (const d of candidates) {
      if (!d.email) continue;
      const key = d.email.trim().toLowerCase();
      if (!emailToDevs.has(key)) emailToDevs.set(key, []);
      emailToDevs.get(key)!.push(d);
    }
    const conflictEmails = new Set<string>();
    for (const [email, devs] of emailToDevs) {
      if (devs.length > 1) {
        conflictEmails.add(email);
        console.log(`[AUTO-OUTREACH] ⚠️ 邮箱冲突跳过：${email} 被以下 ${devs.length} 位开发者共享 → ${devs.map((d: any) => `${d.display_name||d.username}(${d.id.substring(0,8)})`).join(" / ")}`);
      }
    }
    if (conflictEmails.size > 0) {
      const beforeDupFilter = candidates.length;
      candidates = candidates.filter((d: any) => !conflictEmails.has((d.email || "").trim().toLowerCase()));
      console.log(`[AUTO-OUTREACH] 🛡️ 已跳过 ${beforeDupFilter - candidates.length} 条邮箱冲突记录（${conflictEmails.size} 个重复邮箱）`);
    }

    if (totalCandidates === 0) {
      console.log("[AUTO-OUTREACH] ⚠️ 没有找到符合条件的候选人");
      getCurrentStatus().progress.total = 0;
      getCurrentStatus().running = false;
      return;
    }

    getCurrentStatus().progress.total = candidates.length;

    console.log(`[AUTO-OUTREACH] 📋 找到 ${totalCandidates} 位候选人，开始处理...\n`);

    // 2️⃣ 逐个处理
    for (let i = 0; i < candidates.length; i++) {
      const currentStatus = getCurrentStatus();
      if (currentStatus.stopRequested) {
        currentStatus.running = false;
        currentStatus.finishedAt = new Date();
        const stoppedSummary = `用户中止：完成 ${currentStatus.progress.done}/${currentStatus.progress.total}，成功 ${currentStatus.progress.succeeded}，失败 ${currentStatus.progress.failed}，跳过 ${currentStatus.progress.skipped}`;
        setRunHistory(workflowKey, getRunHistory(workflowKey).map((item) =>
          item.id === currentStatus.runId
            ? {
                ...item,
                finishedAt: currentStatus.finishedAt,
                status: "failed",
                durationMs: currentStatus.startedAt ? currentStatus.finishedAt!.getTime() - currentStatus.startedAt.getTime() : null,
                progress: { ...currentStatus.progress },
                summary: stoppedSummary,
              }
            : item,
        ));
        console.log(`[AUTO-OUTREACH] ⛔ 用户已中止任务 (${getWorkflowLabel(workflowKey)})`);
        return;
      }

      while (getCurrentStatus().paused) {
        await new Promise((r) => setTimeout(r, 1000));
        if (getCurrentStatus().stopRequested) break;
      }

      const dev = candidates[i] as any;
      const idx = offset + i + 1; // 全局序号（从1开始）

      console.log(`\n[${idx}/${totalCandidates}] 📧 处理 @${dev.username} (${dev.display_name || dev.username})`);

      const resultEntry: any = {
        id: dev.id,
        username: dev.username,
        name: dev.display_name || dev.username,
        email: dev.email || null,
        subject: "",
        body: "",
        success: false,
        stage: "generated" as string,
      };

      try {
        // ── Step A: 生成邀约文案 ──
        if (pureFixedMode) {
          const personName = dev.display_name || dev.username || "你好";
          const normalizedBody = fixedBody.trim();
          const personalizedBody = `${personName} 你好，\n${normalizedBody.replace(/^你好[，,]?\s*/u, "")}`;
          resultEntry.subject = fixedSubject.trim();
          resultEntry.body = personalizedBody;
          console.log(`   ✅ 纯固定模板已应用 | 主题: "${resultEntry.subject}"`);
        } else {
          // ── Step A: AI 生成邀约文案（通过内部 API 调用，复用已验证的解析逻辑）──
          let parsedContent: any;
          
          try {
            // 方式1：内部 fetch 调用 /api/ai/generate（最可靠，复用所有解析逻辑）
            const apiRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/ai/generate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "outreach",
                data: {
                  developerName: dev.display_name || dev.username,
                  developerHighlights: buildHighlights(dev),
                  callToAction: "期待你的回复",
                  tone: "professional",
                  customOutline: outline || undefined,
                },
              }),
            });
            
            if (apiRes.ok) {
              const apiData = await apiRes.json();
              parsedContent = apiData.content;
              console.log(`   📡 AI (internal fetch) OK | model: ${apiData.model}`);
            } else {
              throw new Error(`API returned ${apiRes.status}`);
            }
          } catch (fetchErr) {
            // 方式2：fallback 到直接调用 aiRouter（如果 internal fetch 失败）
            console.log(`   ⚠️ Internal fetch failed, fallback to aiRouter: ${(fetchErr as Error).message}`);
            const aiResult = await aiRouter.generate({
              taskType: "copywriting",
              messages: [
                { role: "system", content: OUTREACH_COPYWRITING_SYSTEM },
                {
                  role: "user",
                  content: outreachMessagePrompt({
                    developerName: dev.display_name || dev.username,
                    developerHighlights: buildHighlights(dev),
                    callToAction: "期待你的回复",
                    tone: "professional",
                    customOutline: outline,
                  }),
                },
              ],
              temperature: 0.8,
              jsonMode: !outline,
              preferStream: true,
              timeoutMs: 60000,
            });

            // 解析返回内容（使用与 /api/ai/generate 相同的 robust 解析）
            try {
              const cleaned = stripMarkdownFence(aiResult.content);
              parsedContent = JSON.parse(cleaned);
            } catch {
              const cleaned = stripMarkdownFence(aiResult.content);
              const match = cleaned.match(/\{[\s\S]*\}/);
              if (match) {
                try { parsedContent = JSON.parse(match[0]); }
                catch { parsedContent = { raw: cleaned }; }
              } else {
                parsedContent = { raw: cleaned };
              }
            }
          }

          const { subject, body } = parseAiResponse(parsedContent);
          resultEntry.subject = subject;
          resultEntry.body = body;
          console.log(`   ✅ 文案生成成功 | 主题: "${subject}"`);
        }

        const subject = resultEntry.subject;
        const body = resultEntry.body;

        // ── Step B: 发送邮件（非 dryRun 时）──
        if (!dryRun && dev.email) {
          await new Promise((r) => setTimeout(r, Math.min(delayMs, 500))); // 发送前短暂延迟

          const sendResult = await sendEmail({
            to: dev.email!,
            subject: subject,
            html: body.includes("<") ? body : `<p>${body.replace(/\n/g, "<br/>")}</p>`,
            text: body,
            providerOverride: smtpOverride ? "nodemailer" : undefined,
            smtpOverride: smtpOverride || undefined,
            from: smtpOverride?.from,
          });

          const logPayload = {
            id: crypto.randomUUID(),
            target_type: TargetType.DEVELOPER,
            target_id: dev.id,
            channel: Channel.EMAIL as any,
            subject: subject,
            body: body,
            template_id: null,
            ai_generated: !pureFixedMode,
            status: sendResult.success ? (SendStatus.SENT as any) : (SendStatus.FAILED as any),
            sent_at: new Date(),
            error: sendResult.success ? null : (sendResult.error || "发送失败"),
            sent_by: senderIdentity,
            campaign_id: null,
            ai_prompt: batchId ? JSON.stringify({ batchId, batchEmails, workflowKey }) : null,
            updatedAt: new Date(),
          };

          if (sendResult.success) {
            resultEntry.success = true;
            resultEntry.stage = "sent";
            getCurrentStatus().progress.succeeded++;
            console.log(`   ✅ 邮件已发送 → ${dev.email} [${sendResult.provider}]`);

            try {
              await db.outreach_logs.create({ data: logPayload });
            } catch (logErr) {
              console.warn(`   ⚠️ 日志记录失败: ${(logErr as Error).message}`);
            }

            try {
              await db.developers.update({
                where: { id: dev.id },
                data: { status: "CONTACTED", updatedAt: new Date() } as any,
              });
            } catch (statusErr) {
              console.warn(`   ⚠️ 状态更新失败: ${(statusErr as Error).message}`);
            }
          } else {
            resultEntry.stage = "failed";
            resultEntry.error = sendResult.error || "发送失败";
            getCurrentStatus().progress.failed++;
            console.log(`   ❌ 发送失败: ${resultEntry.error}`);

            try {
              await db.outreach_logs.create({ data: logPayload });
            } catch (logErr) {
              console.warn(`   ⚠️ 失败日志记录失败: ${(logErr as Error).message}`);
            }
          }
        } else if (dryRun) {
          // dryRun 模式：只记录为 generated
          resultEntry.success = true;
          resultEntry.stage = "generated";
          getCurrentStatus().progress.succeeded++;
          console.log(`   🔍 [DRY RUN] 仅预览，未发送`);
        } else {
          // 无邮箱
          resultEntry.stage = "skipped";
          resultEntry.error = "无邮箱地址";
          getCurrentStatus().progress.skipped++;
          console.log(`   ⏭️ 跳过（无邮箱）`);
        }
      } catch (genError) {
        resultEntry.stage = "failed";
        resultEntry.error = (genError as Error).message || "AI 生成异常";
        getCurrentStatus().progress.failed++;
        console.log(`   ❌ 处理异常: ${resultEntry.error}`);
      }

      getCurrentStatus().results.push(resultEntry);
      getCurrentStatus().progress.done++;

      // 请求间隔（防限流），最后一个不用等
      if (i < candidates.length - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    // 3️⃣ 完成
    getCurrentStatus().running = false;
    getCurrentStatus().finishedAt = new Date();

    const currentStatus = getCurrentStatus();
    const summary = `完成 ${currentStatus.progress.done}/${currentStatus.progress.total}，成功 ${currentStatus.progress.succeeded}，失败 ${currentStatus.progress.failed}，跳过 ${currentStatus.progress.skipped}`;
    setRunHistory(workflowKey, getRunHistory(workflowKey).map((item) =>
      item.id === currentStatus.runId
        ? {
            ...item,
            finishedAt: currentStatus.finishedAt,
            status: currentStatus.progress.failed > 0 ? "completed" : "completed",
            durationMs: currentStatus.startedAt ? currentStatus.finishedAt!.getTime() - currentStatus.startedAt.getTime() : null,
            progress: { ...currentStatus.progress },
            summary,
          }
        : item,
    ));

    console.log(`\n${"=".repeat(60)}`);
    console.log(`🏁 [AUTO-OUTREACH] 工作流完成！ (${getWorkflowLabel(workflowKey)})`);
    console.log(`   总计: ${currentStatus.progress.done}/${currentStatus.progress.total}`);
    console.log(`   成功: ${currentStatus.progress.succeeded}`);
    console.log(`   失败: ${currentStatus.progress.failed}`);
    console.log(`   跳过: ${currentStatus.progress.skipped}`);
    console.log(`${"=".repeat(60)}\n`);
  } catch (fatalError) {
    console.error("[AUTO-OUTREACH] 💥 致命错误:", fatalError);
    const currentStatus = getRunStatus(workflowKey);
    if (currentStatus) {
      currentStatus.running = false;
      currentStatus.finishedAt = new Date();
      currentStatus.results.push({
        id: "fatal",
        username: "_system_",
        name: "系统错误",
        email: null,
        subject: "",
        body: "",
        success: false,
        error: (fatalError as Error).message,
        stage: "failed",
      });
      setRunHistory(workflowKey, getRunHistory(workflowKey).map((item) =>
        item.id === currentStatus.runId
          ? {
              ...item,
              finishedAt: currentStatus.finishedAt,
              status: "failed",
              durationMs: currentStatus.startedAt ? currentStatus.finishedAt!.getTime() - currentStatus.startedAt.getTime() : null,
              progress: { ...currentStatus.progress },
              summary: `致命错误：${(fatalError as Error).message}`,
            }
          : item,
      ));
    }
  }
}

