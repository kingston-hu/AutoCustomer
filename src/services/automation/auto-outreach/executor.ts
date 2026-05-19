import { db } from "@/lib/db";
import crypto from "crypto";
import { sendEmail } from "@/services/email/service";
import { aiRouter } from "@/services/ai/router";

import { Channel, SendStatus, TargetType } from "@/lib/constants";
import {
  outreachMessagePrompt,
  OUTREACH_COPYWRITING_SYSTEM,
} from "@/services/ai/prompts/templates";
import { updateWorkflowRunProgress, completeWorkflowRun, appendWorkflowRunItem } from "@/services/automation/workflow-runs";



function stripMarkdownFence(text: string): string {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```\w*\s*\n?/i, "");
  cleaned = cleaned.replace(/\n?```\s*$/i, "");
  const match = cleaned.match(/```\w*\s*\n?([\s\S]*?)\n?```\s*/i);
  if (match) cleaned = match[1];
  return cleaned.trim();
}

function parseAiResponse(content: any): { subject: string; body: string } {
  let textContent = "";

  if (typeof content === "string") {
    textContent = stripMarkdownFence(content);
  } else if (typeof content === "object" && content !== null) {
    if ("subject" in content && "body" in content) {
      let body = content.body || "";
      if (!body && content.raw) {
        body = typeof content.raw === "string" ? stripMarkdownFence(content.raw) : JSON.stringify(content.raw);
      }
      try {
        const inner = JSON.parse(body);
        if (inner.subject || inner.body) return { subject: inner.subject || content.subject || "AI 生成", body: inner.body || "" };
      } catch {}
      return { subject: content.subject || "AI 生成", body };
    }
    if ("raw" in content && typeof content.raw === "string") {
      textContent = stripMarkdownFence(content.raw);
      try {
        const inner = JSON.parse(textContent);
        if (inner.subject || inner.body) {
          return { subject: inner.subject || "AI 生成", body: inner.body || "" };
        }
      } catch {}
    } else {
      textContent = JSON.stringify(content);
    }
  }

  if (!textContent.trim()) {
    return { subject: "AI 生成", body: textContent };
  }

  const lines = textContent.split(/\n/).filter((l) => l.trim());
  if (lines.length === 0) {
    return { subject: "AI 生成", body: textContent };
  }

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

  const firstLine = lines[0].trim();
  return {
    subject: firstLine.length > 60 ? firstLine.substring(0, 57) + "..." : firstLine,
    body: textContent,
  };
}

function buildHighlights(dev: Record<string, unknown>): string {
  const parts: string[] = [];
  if (dev.bio) parts.push(`简介: ${dev.bio}`);
  if ((dev.skillTags as string)) parts.push(`技能: ${dev.skillTags as string}`);
  if ((dev.techStack as string)) parts.push(`技术栈: ${dev.techStack as string}`);

  const rawProjects = dev.rawData ? (JSON.parse(dev.rawData as string)?.repositories || []) : [];
  if (Array.isArray(rawProjects) && rawProjects.length > 0) {
    parts.push(`项目: ${rawProjects.slice(0, 2).map((p: any) => p.name || p).join(", ")}`);
  }
  if (dev.location) parts.push(`地区: ${dev.location as string}`);
  return parts.filter(Boolean).join("\n");
}

function isDeliverableEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const value = email.trim().toLowerCase();
  if (!value) return false;
  const parts = value.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || !domain || !domain.includes(".")) return false;
  const blockedPatterns = ["noreply", "no-reply", "dependabot", "renovate[bot]", "github-actions", "actions[bot]", "bot@", "[bot]"];
  if (blockedPatterns.some((p) => value.includes(p))) return false;
  if (/@[0-9a-f-]{12,}$/i.test(value)) return false;
  return true;
}

export async function executeAutoOutreachJob(task: { id: string; payload: unknown; useTaskQueue?: boolean }) {
  const payload = task.payload as AutoOutreachJobPayload;
  const useTaskQueue = task.useTaskQueue !== false;

  const senderIdentity = payload.smtpOverride?.user || payload.smtpOverride?.from || process.env.EMAIL_FROM || process.env.SMTP_USER || null;

  const resultItems: any[] = [];
  const progress = { done: 0, total: 0, succeeded: 0, failed: 0, skipped: 0 };

  try {
    const whereClause: Record<string, unknown> = {};
    if (payload.requireEmail) {
      whereClause.email = { notIn: [""] } as any;
    }

    console.log(`[executor] start task=${task.id} workflowKey=${payload.workflowKey} limit=${payload.limit} offset=${payload.offset} selected=${payload.selectedDeveloperIds.length}`);

    const allDevelopers = await db.developers.findMany({
      where: whereClause as any,
      orderBy: { createdAt: "asc" },
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

    console.log(`[executor] allDevelopers=${allDevelopers.length} task=${task.id}`);

    let filteredDevs = payload.requireEmail
      ? allDevelopers.filter((d: any) => d.email && d.email.trim() !== "")
      : allDevelopers;

    console.log(`[executor] after requireEmail filter=${filteredDevs.length} task=${task.id}`);

    const initiallySkippedItems: Array<{
      dev: any;
      status: "skipped";
      reasonCode: string;
      error: string;
    }> = [];

    if (payload.requireEmail) {
      const noEmailDevs = allDevelopers.filter((d: any) => !d.email || d.email.trim() === "");
      console.log(`[executor] noEmailDevs=${noEmailDevs.length} task=${task.id}`);
      for (const dev of noEmailDevs) {
        initiallySkippedItems.push({
          dev,
          status: "skipped",
          reasonCode: "SKIPPED_NO_EMAIL",
          error: "无邮箱地址",
        });
      }
    }

    if (payload.resumeOnlyUnsent) {
      const sentLogs = await db.outreach_logs.findMany({
        where: {
          channel: Channel.EMAIL as any,
          status: SendStatus.SENT as any,
          target_type: TargetType.DEVELOPER,
        },
        select: { target_id: true },
      });
      const sentIds = new Set(sentLogs.map((x: any) => x.target_id).filter(Boolean));
      const beforeResumeFilter = filteredDevs;
      filteredDevs = filteredDevs.filter((d: any) => !sentIds.has(d.id));
      console.log(`[executor] sentLogs=${sentLogs.length} after resumeOnlyUnsent=${filteredDevs.length} task=${task.id}`);
      for (const dev of beforeResumeFilter.filter((d: any) => sentIds.has(d.id))) {
        initiallySkippedItems.push({
          dev,
          status: "skipped",
          reasonCode: "SKIPPED_ALREADY_SENT",
          error: "已存在成功发送记录",
        });
      }
    }

    const beforeDeliverableFilter = filteredDevs;
    filteredDevs = filteredDevs.filter((d: any) => isDeliverableEmail(d.email));
    console.log(`[executor] after deliverable filter=${filteredDevs.length} removed=${beforeDeliverableFilter.length - filteredDevs.length} task=${task.id}`);
    for (const dev of beforeDeliverableFilter.filter((d: any) => !isDeliverableEmail(d.email))) {
      initiallySkippedItems.push({
        dev,
        status: "skipped",
        reasonCode: "SKIPPED_INVALID_EMAIL",
        error: "邮箱不可投递或命中黑名单规则",
      });
    }

    if (payload.selectedDeveloperIds.length > 0) {
      const selectedSet = new Set(payload.selectedDeveloperIds);
      const beforeSelectedFilter = filteredDevs;
      filteredDevs = filteredDevs.filter((d: any) => selectedSet.has(d.id));
      console.log(`[executor] after selectedDeveloperIds filter=${filteredDevs.length} removed=${beforeSelectedFilter.length - filteredDevs.length} task=${task.id}`);
      for (const dev of beforeSelectedFilter.filter((d: any) => !selectedSet.has(d.id))) {
        initiallySkippedItems.push({
          dev,
          status: "skipped",
          reasonCode: "SKIPPED_NOT_SELECTED",
          error: "不在本次手动选择名单中",
        });
      }
    }

    let candidates = filteredDevs.slice(payload.offset, payload.offset + payload.limit);
    console.log(`[executor] sliced candidates=${candidates.length} task=${task.id}`);
    const emailToDevs = new Map<string, any[]>();
    for (const d of candidates) {
      if (!d.email) continue;
      const key = d.email.trim().toLowerCase();
      if (!emailToDevs.has(key)) emailToDevs.set(key, []);
      emailToDevs.get(key)!.push(d);
    }
    const conflictEmails = new Set<string>();
    for (const [email, devs] of emailToDevs) {
      if (devs.length > 1) conflictEmails.add(email);
    }
    if (conflictEmails.size > 0) {
      const conflictedDevs = candidates.filter((d: any) => conflictEmails.has((d.email || "").trim().toLowerCase()));
      console.log(`[executor] duplicate email conflicts=${conflictedDevs.length} groups=${conflictEmails.size} task=${task.id}`);
      for (const dev of conflictedDevs) {
        initiallySkippedItems.push({
          dev,
          status: "skipped",
          reasonCode: "SKIPPED_DUPLICATE_EMAIL",
          error: "邮箱与其他开发者重复，已跳过冲突记录",
        });
      }
      candidates = candidates.filter((d: any) => !conflictEmails.has((d.email || "").trim().toLowerCase()));
    }

    console.log(`[executor] final candidates=${candidates.length} initialSkips=${initiallySkippedItems.length} task=${task.id}`);

    // 设置总进度：预过滤跳过项 + 实际候选处理项
    progress.total = initiallySkippedItems.length + candidates.length;

    console.log(`[executor] progress initialized total=${progress.total} task=${task.id}`);

    const skippedPreviewLimit = 50;
    const skippedPreviewItems = initiallySkippedItems.slice(0, skippedPreviewLimit);
    const skippedOverflow = Math.max(0, initiallySkippedItems.length - skippedPreviewItems.length);

    if (useTaskQueue) {
      await db.task_queue.update({
        where: { id: task.id },
        data: {
          result: {
            stage: "pre-filter-ready",
            workflowKey: payload.workflowKey,
            batchId: payload.batchId ?? null,
            progress,
            metrics: {
              allDevelopers: allDevelopers.length,
              filteredAfterEmail: payload.requireEmail ? allDevelopers.filter((d: any) => d.email && d.email.trim() !== "").length : allDevelopers.length,
              initialSkips: initiallySkippedItems.length,
              skippedPreviewCount: skippedPreviewItems.length,
              skippedOverflow,
              candidates: candidates.length,
            },
            updatedAt: new Date().toISOString(),
          } as any,
        } as any,
      });
    }

    for (const skipped of skippedPreviewItems) {
      await appendWorkflowRunItem({
        taskId: task.id,
        workflowKey: payload.workflowKey,
        batchId: payload.batchId,
        targetType: TargetType.DEVELOPER,
        targetId: skipped.dev.id,
        email: skipped.dev.email ?? null,
        status: skipped.status,
        reasonCode: skipped.reasonCode,
        error: skipped.error,
        meta: {
          username: skipped.dev.username,
          name: skipped.dev.display_name || skipped.dev.username,
          stage: "pre-filter-preview",
        },
      });
    }

    if (skippedOverflow > 0) {
      resultItems.push({
        id: `skipped-overflow-${task.id}`,
        username: "system",
        name: "system",
        email: null,
        subject: "",
        body: "",
        success: true,
        stage: "skipped",
        error: `还有 ${skippedOverflow} 条 pre-filter skipped 未逐条写入 workflow_run_items（已限量保留前 ${skippedPreviewItems.length} 条）`,
      });
      console.log(`[executor] skipped preview limited to ${skippedPreviewItems.length}, overflow=${skippedOverflow} task=${task.id}`);
    }

    await updateWorkflowRunProgress({
      taskId: task.id,
      progress,
      result: {
        progress,
        results: resultItems.slice(-20),
        batchId: payload.batchId ?? null,
        stage: "pre-filter-ready",
        metrics: {
          initialSkips: initiallySkippedItems.length,
          skippedPreviewCount: skippedPreviewItems.length,
          skippedOverflow,
          candidates: candidates.length,
        },
      },
      summary: `任务已初始化，待处理 ${progress.total} 项（pre-filter skipped ${initiallySkippedItems.length}，已预览写入 ${skippedPreviewItems.length}）`,
    });


    console.log(`[executor] entering candidate loop count=${candidates.length} task=${task.id}`);

    for (let i = 0; i < candidates.length; i++) {


      const dev = candidates[i] as any;
      const resultEntry: any = {
        id: dev.id,
        username: dev.username,
        name: dev.display_name || dev.username,
        email: dev.email || null,
        subject: "",
        body: "",
        success: false,
        stage: "generated",
      };
      let reasonCode: string | null = null;

      try {
        if (payload.pureFixedMode) {
          const personName = dev.display_name || dev.username || "你好";
          const normalizedBody = payload.fixedBody.trim();
          const personalizedBody = `${personName} 你好，\n${normalizedBody.replace(/^你好[，,]?\s*/u, "")}`;
          resultEntry.subject = payload.fixedSubject.trim();
          resultEntry.body = personalizedBody;
        } else {
          let parsedContent: any;
          try {
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
                  customOutline: payload.outline || undefined,
                },
              }),
            });
            if (apiRes.ok) {
              const apiData = await apiRes.json();
              parsedContent = apiData.content;
            } else {
              throw new Error(`API returned ${apiRes.status}`);
            }
          } catch {
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
                    customOutline: payload.outline,
                  }),
                },
              ],
              temperature: 0.8,
              jsonMode: !payload.outline,
              preferStream: true,
              timeoutMs: 60000,
            });
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
        }

        if (!payload.dryRun && dev.email) {
          await new Promise((r) => setTimeout(r, Math.min(payload.delayMs, 500)));
          const sendResult = await sendEmail({
            to: dev.email!,
            subject: resultEntry.subject,
            html: resultEntry.body.includes("<") ? resultEntry.body : `<p>${resultEntry.body.replace(/\n/g, "<br/>")}</p>`,
            text: resultEntry.body,
            providerOverride: payload.smtpOverride ? "nodemailer" : undefined,
            smtpOverride: payload.smtpOverride || undefined,
            from: payload.smtpOverride?.from,
          });

          const logPayload = {
            id: crypto.randomUUID(),
            target_type: TargetType.DEVELOPER,
            target_id: dev.id,
            channel: Channel.EMAIL as any,
            subject: resultEntry.subject,
            body: resultEntry.body,
            template_id: null,
            ai_generated: !payload.pureFixedMode,
            status: sendResult.success ? (SendStatus.SENT as any) : (SendStatus.FAILED as any),
            sent_at: new Date(),
            error: sendResult.success ? null : (sendResult.error || "发送失败"),
            sent_by: senderIdentity,
            campaign_id: null,
            ai_prompt: payload.batchId ? JSON.stringify({ batchId: payload.batchId, batchEmails: payload.batchEmails, workflowKey: payload.workflowKey }) : null,
            updatedAt: new Date(),
          };

          await db.outreach_logs.create({ data: logPayload as any });

          if (sendResult.success) {
            resultEntry.success = true;
            resultEntry.stage = "sent";
            reasonCode = "SENT";
            progress.succeeded++;
            try {
              await db.developers.update({ where: { id: dev.id }, data: { status: "CONTACTED", updatedAt: new Date() } as any });
            } catch {}
          } else {
            resultEntry.stage = "failed";
            resultEntry.error = sendResult.error || "发送失败";
            reasonCode = "FAILED_SEND";
            progress.failed++;
          }
        } else if (payload.dryRun) {
          resultEntry.success = true;
          resultEntry.stage = "generated";
          reasonCode = "GENERATED_DRY_RUN";
          progress.succeeded++;
        } else {
          resultEntry.stage = "skipped";
          resultEntry.error = "无邮箱地址";
          reasonCode = "SKIPPED_NO_EMAIL";
          progress.skipped++;
        }
      } catch (error) {
        resultEntry.stage = "failed";
        resultEntry.error = error instanceof Error ? error.message : String(error);
        reasonCode = resultEntry.subject || resultEntry.body ? "FAILED_SEND" : "FAILED_AI_GENERATION";
        progress.failed++;
      }



      await appendWorkflowRunItem({
        taskId: task.id,
        workflowKey: payload.workflowKey,
        batchId: payload.batchId,
        targetType: TargetType.DEVELOPER,
        targetId: dev.id,
        email: dev.email ?? null,
        status: resultEntry.stage,
        reasonCode,
        subject: resultEntry.subject || null,
        error: resultEntry.error || null,
        meta: {
          username: dev.username,
          name: dev.display_name || dev.username,
          dryRun: payload.dryRun,
          aiGenerated: !payload.pureFixedMode,
        },
      });

      // 递增已完成计数
      progress.done++;

      // 收集结果到结果列表
      resultItems.push(resultEntry);


      const partialResult = {
        taskId: task.id,
        workflowKey: payload.workflowKey,
        batchId: payload.batchId,
        progress,
        results: resultItems.slice(-20),
        requestedAt: payload.requestedAt,
        updatedAt: new Date().toISOString(),
      };

      await updateWorkflowRunProgress({
        taskId: task.id,
        progress,
        currentTargetId: dev.id,
        result: partialResult,
        summary: `已处理 ${progress.done}/${progress.total}，成功 ${progress.succeeded}，失败 ${progress.failed}，跳过 ${progress.skipped}`,
      });

      if (useTaskQueue) {
        await db.task_queue.update({
          where: { id: task.id },
          data: {
            result: partialResult as any,
          } as any,
        });
      }

      if (i < candidates.length - 1) {
        await new Promise((r) => setTimeout(r, payload.delayMs));
      }
    }

    const result = {
      taskId: task.id,
      workflowKey: payload.workflowKey,
      batchId: payload.batchId,
      progress,
      results: resultItems.slice(-50),
      requestedAt: payload.requestedAt,
      executedAt: new Date().toISOString(),
    };

    await completeWorkflowRun({
      taskId: task.id,
      status: "COMPLETED",
      progress,
      result,
      summary: `任务完成：成功 ${progress.succeeded}，失败 ${progress.failed}，跳过 ${progress.skipped}`,
    });

    if (useTaskQueue) {
      await db.task_queue.update({
        where: { id: task.id },
        data: {
          status: "COMPLETED",
          completed_at: new Date(),
          result: result as any,
        } as any,
      });
    }

    return result;
  } catch (error) {
    const failedResult = {
      workflowKey: payload.workflowKey,
      batchId: payload.batchId,
      progress,
      results: resultItems.slice(-20),
      requestedAt: payload.requestedAt,
      failedAt: new Date().toISOString(),
    };

    await completeWorkflowRun({
      taskId: task.id,
      status: "FAILED",
      progress,
      result: failedResult,
      error: error instanceof Error ? error.message : String(error),
      summary: `任务失败：${error instanceof Error ? error.message : String(error)}`,
    });

    if (useTaskQueue) {
      await db.task_queue.update({
        where: { id: task.id },
        data: {
          status: "FAILED",
          completed_at: new Date(),
          error: error instanceof Error ? error.message : String(error),
          result: failedResult as any,
        } as any,
      });
    }
    throw error;
  }
}

