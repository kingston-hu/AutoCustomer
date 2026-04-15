import Database from "better-sqlite3";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Channel, SendStatus } from "@/lib/constants";
import { sendTemplateEmail, sendEmail } from "@/services/email/service";

function escapeCsv(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function buildDateRange(startDate?: string | null, endDate?: string | null) {
  const clauses: string[] = [];
  const params: Array<string | number> = [];

  if (startDate) {
    clauses.push("ol.createdAt >= ?");
    params.push(new Date(`${startDate}T00:00:00`).getTime());
  }
  if (endDate) {
    clauses.push("ol.createdAt <= ?");
    params.push(new Date(`${endDate}T23:59:59.999`).getTime());
  }

  return { clauses, params };
}

interface ParsedBatchMeta {
  batchId: string | null;
}

function parseBatchMeta(aiPrompt: unknown): ParsedBatchMeta {
  if (!aiPrompt || typeof aiPrompt !== "string") return { batchId: null };
  try {
    const parsed = JSON.parse(aiPrompt);
    return { batchId: parsed?.batchId ? String(parsed.batchId) : null };
  } catch {
    return { batchId: null };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(2000, Math.max(1, Number(searchParams.get("limit")) || 15));
    const channel = searchParams.get("channel")?.trim();
    const status = searchParams.get("status")?.trim();
    const targetType = searchParams.get("targetType")?.trim();
    const search = searchParams.get("search")?.trim();
    const sentBy = searchParams.get("sentBy")?.trim();
    const emailOnly = searchParams.get("emailOnly") === "true";
    const exportMode = searchParams.get("export") === "csv";
    const quickFilter = searchParams.get("quickFilter")?.trim();
    const startDate = searchParams.get("startDate")?.trim();
    const endDate = searchParams.get("endDate")?.trim();

    const sqlite = new Database("prisma/dev.db", { readonly: true });

    const whereClauses: string[] = [];
    const whereParams: Array<string | number> = [];

    if (emailOnly) {
      whereClauses.push("ol.channel = ?");
      whereParams.push(Channel.EMAIL);
    } else if (channel) {
      whereClauses.push("ol.channel = ?");
      whereParams.push(channel);
    }

    if (status) {
      whereClauses.push("ol.status = ?");
      whereParams.push(status);
    }

    if (targetType) {
      whereClauses.push("ol.target_type = ?");
      whereParams.push(targetType);
    }

    if (sentBy) {
      if (sentBy === "163") {
        whereClauses.push("LOWER(COALESCE(ol.sent_by, '')) LIKE ?");
        whereParams.push("%163.com%");
      } else if (sentBy === "zoho") {
        whereClauses.push("LOWER(COALESCE(ol.sent_by, '')) LIKE ?");
        whereParams.push("%zoho%");
      } else {
        whereClauses.push("LOWER(COALESCE(ol.sent_by, '')) LIKE ?");
        whereParams.push(`%${sentBy.toLowerCase()}%`);
      }
    }

    const { clauses: dateClauses, params: dateParams } = buildDateRange(startDate, endDate);
    whereClauses.push(...dateClauses);
    whereParams.push(...dateParams);

    if (quickFilter === "failed") {
      whereClauses.push("ol.status IN (?, ?)");
      whereParams.push(SendStatus.FAILED, SendStatus.BOUNCED);
    }

    if (quickFilter === "today") {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime() - 1;
      whereClauses.push("ol.createdAt >= ?");
      whereClauses.push("ol.createdAt <= ?");
      whereParams.push(start, end);
    }

    if (search) {
      whereClauses.push(`(
        LOWER(COALESCE(ol.subject, '')) LIKE ?
        OR LOWER(COALESCE(ol.body, '')) LIKE ?
        OR LOWER(COALESCE(ol.target_id, '')) LIKE ?
        OR LOWER(COALESCE(d.email, '')) LIKE ?
        OR LOWER(COALESCE(d.username, '')) LIKE ?
        OR LOWER(COALESCE(d.display_name, '')) LIKE ?
      )`);
      const keyword = `%${search.toLowerCase()}%`;
      whereParams.push(keyword, keyword, keyword, keyword, keyword, keyword);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    const baseSql = `
      FROM outreach_logs ol
      LEFT JOIN developers d ON ol.target_type = 'DEVELOPER' AND ol.target_id = d.id
      ${whereSql}
    `;

    const logsSql = `
      SELECT
        ol.id,
        ol.subject,
        ol.body,
        ol.status,
        ol.sent_at,
        ol.createdAt,
        ol.error,
        ol.ai_prompt,
        ol.sent_by AS senderEmail,
        d.email AS developerEmail,
        d.display_name AS developerName,
        d.username AS developerUsername,
        CASE WHEN d.username IS NOT NULL AND d.username <> '' THEN 'https://github.com/' || d.username ELSE NULL END AS githubUrl
      ${baseSql}
      ORDER BY ol.createdAt DESC
      ${exportMode ? "" : "LIMIT ? OFFSET ?"}
    `;

    const logsParams = exportMode ? whereParams : [...whereParams, limit, (page - 1) * limit];
    const logs = sqlite.prepare(logsSql).all(...logsParams).map((log: any) => ({
      ...log,
      ...parseBatchMeta(log.ai_prompt),
    }));

    if (exportMode) {
      const header = ["发送时间", "发信邮箱", "开发者邮箱", "开发者名称", "GitHub主页", "主题", "正文", "发送状态", "失败原因"];
      const rows = logs.map((log: any) => [
        log.sent_at || log.createdAt || "",
        log.senderEmail || "",
        log.developerEmail || "",
        log.developerName || log.developerUsername || "",
        log.githubUrl || "",
        log.subject || "",
        log.body || "",
        log.status || "",
        log.error || "",
      ]);
      const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
      sqlite.close();
      return new NextResponse(`\uFEFF${csv}`, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="mail-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    const totalRow = sqlite.prepare(`SELECT COUNT(*) as total ${baseSql}`).get(...whereParams) as { total: number };
    const channelStats = sqlite.prepare(`
      SELECT ol.channel, ol.status, COUNT(*) as count
      FROM outreach_logs ol
      ${emailOnly ? "WHERE ol.channel = 'EMAIL'" : ""}
      GROUP BY ol.channel, ol.status
      ORDER BY count DESC
    `).all();

    sqlite.close();
    return NextResponse.json({ logs, total: totalRow.total || 0, page, limit, channelStats });
  } catch (error) {
    console.error("[OUTREACH_GET]", error);
    return NextResponse.json({ error: "Failed to fetch outreach logs" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      targetType = "LEAD",
      targetId,
      channel = "EMAIL",
      subject,
      body: bodyText,
      templateId,
      aiGenerated = false,
      campaignId,
      manualEmail,
      manualName,
    } = body;

    if (!targetId) {
      return NextResponse.json({ error: "targetId is required" }, { status: 400 });
    }

    let toAddress = "";
    const isManualMode = targetId.startsWith("manual_") && manualEmail;

    if (isManualMode) {
      toAddress = manualEmail;
    } else if (targetType === "LEAD") {
      const lead = await db.leads.findUnique({ where: { id: targetId } });
      if (!lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      }
      toAddress = (lead as any).contact_email;
    } else if (targetType === "DEVELOPER") {
      const dev = await db.developers.findUnique({ where: { id: targetId } });
      if (!dev) {
        return NextResponse.json({ error: "Developer not found" }, { status: 404 });
      }
      toAddress = (dev as any).email || "";
    }

    if (!toAddress && channel === "EMAIL") {
      return NextResponse.json({ error: "Target has no email address" }, { status: 400 });
    }

    const log = await db.outreach_logs.create({
      data: {
        id: crypto.randomUUID(),
        target_type: targetType as string,
        target_id: isManualMode ? `manual:${manualEmail}` : targetId,
        channel: channel as any,
        subject: (isManualMode && manualName) ? `[手动] ${subject || ""}`.trim() : (subject || null),
        body: isManualMode ? `${bodyText || ""}\n\n---\n<em>收件人: ${manualName || ""} &lt;${manualEmail}&gt; (手动输入)</em>` : (bodyText || null),
        template_id: templateId || null,
        ai_generated: Boolean(aiGenerated),
        status: SendStatus.PENDING as any,
        campaign_id: campaignId || null,
        updatedAt: new Date(),
      },
    });

    let sendResult = null;
    if (channel === "EMAIL" && toAddress && bodyText) {
      try {
        if (templateId) {
          sendResult = await sendTemplateEmail(templateId, toAddress, body);
        } else {
          sendResult = await sendEmail({
            to: toAddress,
            subject: subject || "来自 AutoCustomer 的消息",
            html: bodyText.includes("<") ? bodyText : `<p>${bodyText.replace(/\n/g, "<br/>")}</p>`,
            text: bodyText,
          });
        }

        await db.outreach_logs.update({
          where: { id: log.id },
          data: {
            status: sendResult.success ? SendStatus.SENT : SendStatus.FAILED,
            sent_at: new Date(),
            error: sendResult.error ? String(sendResult.error) : null,
          },
        });
      } catch (sendError: unknown) {
        await db.outreach_logs.update({
          where: { id: log.id },
          data: {
            status: SendStatus.FAILED,
            error: String(sendError),
          },
        });
      }
    }

    if (targetType === "LEAD") {
      try {
        await db.leads.update({
          where: { id: targetId },
          data: { contacted_at: new Date() } as any,
        });
      } catch {}
    }

    const updatedLog = await db.outreach_logs.findUnique({
      where: { id: log.id },
      include: { campaigns: { select: { id: true, name: true } } },
    });

    return NextResponse.json(updatedLog, { status: 201 });
  } catch (error) {
    console.error("[OUTREACH_POST]", error);
    return NextResponse.json({ error: "Failed to create outreach log" }, { status: 500 });
  }
}
