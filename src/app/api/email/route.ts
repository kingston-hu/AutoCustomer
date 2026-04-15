import { NextRequest, NextResponse } from "next/server";
import { sendEmail, sendTemplateEmail, batchSendEmails } from "@/services/email/service";
import { db } from "@/lib/db";
import { Channel, SendStatus, TargetType } from "@/lib/constants";

// POST /api/email/send — 发送邮件（原始内容）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, html, text, from, replyTo, template, templateData, batch } = body;

    // 批量发送模式
    if (batch && Array.isArray(batch)) {
      const results = await batchSendEmails(batch);
      const successCount = results.filter((r) => r.success).length;
      return NextResponse.json({
        success: true,
        sent: successCount,
        total: results.length,
        results: results.map((r) => ({ success: r.success, provider: r.provider, error: r.error })),
      });
    }

    // 模板发送模式
    if (template && to) {
      const VALID_TEMPLATES = ["cold-outreach", "follow-up", "meeting-invitation", "proposal", "welcome", "re-engagement"];
      if (!VALID_TEMPLATES.includes(template)) {
        return NextResponse.json({ error: "Invalid template. Valid: cold-outreach, follow-up, meeting-invitation, proposal, welcome, re-engagement" }, { status: 400 });
      }
      const result = await sendTemplateEmail(template as any, to, templateData || {});

      // 记录发送历史到数据库
      try {
        const targetType = body.targetType as string;
        const targetId = body.targetId as string | undefined;
        const campaignId = body.campaignId as string | undefined;

        await db.outreach_logs.create({
          data: {
            id: crypto.randomUUID(),
            target_type: targetType || TargetType.LEAD,
            target_id: targetId || "unknown",
            channel: Channel.EMAIL,
            subject: subject,
            body: html || JSON.stringify(templateData),
            template_id: template,
            ai_generated: false,
            status: result.success ? SendStatus.SENT : SendStatus.FAILED,
            sent_at: result.success ? new Date() : null,
            error: result.error ? String(result.error) : null,
            campaign_id: campaignId || null,
            updatedAt: new Date(),
          },
        });
      } catch (dbError) {
        // 入库失败不影响发送结果，只记录日志
        console.error("[EMAIL_DB] Failed to save send history:", dbError);
      }

      return NextResponse.json(result);
    }

    // 原始发送模式
    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, html" },
        { status: 400 },
      );
    }

    const result = await sendEmail({ to, subject, html, text, from, replyTo });

    // 记录发送历史到数据库
    try {
      const targetType = body.targetType as string;
      const targetId = body.targetId as string | undefined;
      const campaignId = body.campaignId as string | undefined;

        await db.outreach_logs.create({
          data: {
            id: crypto.randomUUID(),
            target_type: targetType || TargetType.LEAD,
            target_id: targetId || "unknown",
            channel: Channel.EMAIL,
            subject,
            body: html,
            template_id: null,
            ai_generated: false,
            status: result.success ? SendStatus.SENT : SendStatus.FAILED,
            sent_at: result.success ? new Date() : null,
            error: result.error ? String(result.error) : null,
            campaign_id: campaignId || null,
            updatedAt: new Date(),
        },
      });
    } catch (dbError) {
      console.error("[EMAIL_DB] Failed to save send history:", dbError);
    }

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json(
      { error: "Failed to send email", details: (error as Error).message },
      { status: 500 },
    );
  }
}

// GET /api/email/templates — 获取可用模板列表
export async function GET() {
  return NextResponse.json({
    templates: [
      { id: "cold-outreach", name: "Cold Outreach" },
      { id: "follow-up", name: "Follow Up" },
      { id: "meeting-invitation", name: "Meeting Invitation" },
      { id: "proposal", name: "Proposal" },
      { id: "welcome", name: "Welcome" },
      { id: "re-engagement", name: "Re-engagement" },
    ],
    config: {
      provider: process.env.EMAIL_PROVIDER || "log",
      hasResendKey: !!process.env.RESEND_API_KEY,
      hasSmtpConfig: !!(process.env.SMTP_HOST && process.env.SMTP_USER),
    },
  });
}
