import { db } from "@/lib/db";
import { randomUUID } from "crypto";
import { AutoOutreachCreateJobInput, AutoOutreachJobPayload, WorkflowKey } from "./types";

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
    "请扮演一个\"爬虫/数据采集脚本的潜在使用者\"，用GitHub主页的对应语言（中英文），写给 GitHub 项目作者第一封建联邮件。",
    "",
    "目标是与开发者进行初步建联：邮件要短、自然、像真人，不要模板腔。",
    "",
    "邮件主题：可以跟你交流下GitHub项目吗？",
    "",
    "写作要求：",
    "100-160 字左右",
    "以\"建立联系 + 表达兴趣 + 希望交流\"为主",
    "不要提到AutoCustomer",
  ].join("\n"),
};

const DEFAULT_TEMPLATE = "爬虫用户建联";

export function getWorkflowKey(input?: string): WorkflowKey {
  return input === "163-fixed" ? "163-fixed" : "zoho-fixed";
}

export function normalizeAutoOutreachJobInput(input: AutoOutreachCreateJobInput) {

  const workflowKey = getWorkflowKey(input.workflowKey);
  const templateName = String(input.templateName || DEFAULT_TEMPLATE).trim() || DEFAULT_TEMPLATE;
  const normalizedSelectedDeveloperIds = Array.isArray(input.selectedDeveloperIds)
    ? input.selectedDeveloperIds.filter(Boolean)
    : [];
  const normalizedBatchId = input.batchId ? String(input.batchId).trim() : null;
  const normalizedBatchEmails = Array.isArray(input.batchEmails)
    ? input.batchEmails.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : [];
  const normalizedSmtpOverride = input.smtpOverride && typeof input.smtpOverride === "object"
    ? {
        host: String(input.smtpOverride.host || "").trim(),
        port: Number(input.smtpOverride.port || 0),
        user: String(input.smtpOverride.user || "").trim(),
        pass: String(input.smtpOverride.pass || "").trim(),
        from: String(input.smtpOverride.from || "").trim() || undefined,
      }
    : null;
  const fixedSubject = String(input.fixedSubject || "").trim();
  const fixedBody = String(input.fixedBody || "").trim();
  const pureFixedMode = Boolean(fixedSubject && fixedBody);
  const outline = BUILTIN_TEMPLATES[templateName] || templateName;

  return {
    workflowKey,
    templateName,
    outline,
    limit: Number(input.limit || 9999),
    offset: Number(input.offset || 0),
    dryRun: Boolean(input.dryRun),
    delayMs: Number(input.delayMs || 2000),
    requireEmail: input.requireEmail !== false,
    fixedSubject,
    fixedBody,
    pureFixedMode,
    resumeOnlyUnsent: Boolean(input.resumeOnlyUnsent),
    selectedDeveloperIds: normalizedSelectedDeveloperIds,
    smtpOverride: normalizedSmtpOverride,
    batchId: normalizedBatchId,
    batchEmails: normalizedBatchEmails,
  };
}

export async function createAutoOutreachJob(input: AutoOutreachCreateJobInput) {
  const normalized = normalizeAutoOutreachJobInput(input);
  const taskId = randomUUID();

  const payload: AutoOutreachJobPayload = {
    ...normalized,
    requestedAt: new Date().toISOString(),
  };

  await db.task_queue.create({

    data: {
      id: taskId,
      type: "AUTO_OUTREACH",
      payload: payload as any,
      status: "PENDING",
      priority: 5,
      max_retries: 3,
      scheduled_at: new Date(),
    } as any,
  });

  return {
    taskId,
    workflowKey: normalized.workflowKey,
    batchId: normalized.batchId,
    payload,
  };
}
