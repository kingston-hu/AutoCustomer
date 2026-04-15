/**
 * 邮件发送服务 — 支持 Resend / Nodemailer 双引擎
 *
 * 使用方法：
 * - 设置 EMAIL_PROVIDER=resend 或 nodemailer（默认 resend）
 * - Resend: 需要 RESEND_API_KEY
 * - Nodemailer: 需要 SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS
 */

import nodemailer from "nodemailer";
import { SocksClient } from "socks";

export interface SmtpOverrideConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  providerOverride?: "resend" | "nodemailer" | "log";
  smtpOverride?: SmtpOverrideConfig;
}


export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: "resend" | "nodemailer" | "log";
}

// 邮件模板类型
export type EmailTemplateType = 
  | "cold-outreach"
  | "follow-up"
  | "meeting-invitation"
  | "proposal"
  | "welcome"
  | "re-engagement";

// 模板数据
export interface ColdOutreachTemplateData {
  recipientName: string;
  recipientCompany?: string;
  senderName: string;
  senderTitle?: string;
  projectName?: string;
  personalNote: string; // AI 生成的个性化内容
  ctaLink?: string;
}

// ==========================================
// 邮件模板
// ==========================================

const emailTemplates: Record<EmailTemplateType, (data: Record<string, unknown>) => { subject: string; html: string; text: string }> = {
  // 冷启动触达邮件
  "cold-outreach": (data) => {
    const d = data as unknown as ColdOutreachTemplateData;
    const subject = `关于${d.recipientCompany || "合作"}的想法 — ${d.senderName}`;
    
    return {
      subject,
      text: `${d.recipientName}，你好！

我是${d.senderName}${d.senderTitle ? `（${d.senderTitle}）` : ""}。

${d.personalNote}

如果感兴趣，欢迎回复或点击以下链接预约交流：
${d.ctaLink || "https://cal.com/"}

祝好，
${d.senderName}`,
      html: `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a1a2e;">
<div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:16px 16px 0 0;padding:30px;text-align:center;">
  <h1 style="color:#fff;margin:0;font-size:24px;">👋 你好，${d.recipientName}！</h1>
</div>

<div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;padding:30px;">
  <p style="font-size:16px;line-height:1.6;color:#374151;">
    我是<strong>${d.senderName}</strong>${d.senderTitle ? `（${d.senderTitle}）` : ""}。
  </p>

  <div style="background:#f8fafc;border-left:4px solid #667eea;padding:16px;margin:20px 0;border-radius:0 8px 8px 0;">
    <p style="margin:0;font-size:15px;line-height:1.7;color:#4b5563;">
      ${d.personalNote}
    </p>
  </div>

  ${d.projectName ? `<p style="font-size:14px;color:#6b7280;background:#fef3c7;padding:12px;border-radius:8px;">
    💡 <strong>相关项目：</strong>${d.projectName}
  </p>` : ""}

  <table style="margin:24px 0;width:100%;">
    <tr>
      <td style="text-align:center;">
        <a href="${d.ctaLink || "#"}" style="display:inline-block;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;text-decoration:none;padding:14px 32px;border-radius:999px;font-weight:600;font-size:15px;">
          📅 预约 15 分钟快速交流 →
        </a>
      </td>
    </tr>
  </table>

  <p style="font-size:14px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:20px;margin-bottom:0;">
    此邮件由 AutoCustomer 自动发送 · <a href="#" style="color:#667eea;">取消订阅</a>
  </p>
</div>
</body></html>`,
    };
  },

  // 跟进邮件
  "follow-up": (data) => ({
    subject: `Re: 上次沟通的跟进 — ${String(data.senderName || "")}`,
    text: `你好 ${String(data.recipientName || "")}，

想跟进一下我们之前的沟通。${data.followUpContent || ""}

期待你的回复！`,
    html: `
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<div style="padding:30px;background:#fff;border-radius:16px;border:1px solid #e5e7eb;">
<h2 style="color:#1f2937;">📬 友情提醒</h2>
<p style="color:#4b5563;line-height:1.6;font-size:15px;">${String(data.followUpContent || "想跟进一下之前的沟通。")}</p>
<a href="${String(data.ctaLink || "#")}" style="display:inline-block;background:#10b981;color:#fff;padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:500;margin-top:16px;">回复此邮件</a>
</div>
</body>`,
  }),

  // 会议邀请
  "meeting-invitation": (data) => ({
    subject: `会议邀请：${String(data.meetingTopic || "项目讨论")} — ${new Date().toLocaleDateString()}`,
    text: `邀请您参加：${String(data.meetingTopic || "")}
时间：${String(data.meetingTime || "")}
地点：${String(data.meetingLocation || "线上")}`,
    html: `
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<div style="padding:30px;background:#fff;border-radius:16px;border:1px solid #e5e7eb;">
<div style="text-align:center;"><span style="font-size:48px;">📅</span></div>
<h2 style="text-align:center;color:#1f2937;">${String(data.meetingTopic || "会议邀请")}</h2>
<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-top:20px;">
<p style="margin:8px 0;color:#166534;"><strong>⏰ 时间：</strong>${String(data.meetingTime || "待定")}</p>
<p style="margin:8px 0;color:#166534;"><strong>📍 地点：</strong>${String(data.meetingLocation || "线上会议")}</p>
</div>
<table style="margin:24px 0;width:100%;"><tr><td style="text-align:center;">
<a href="${String(data.ctaLink || "#")}" style="display:inline-block;background:#059669;color:#fff;padding:12px 32px;border-radius:999px;text-decoration:none;font-weight:600;">✅ 确认参会</a>
</td></tr></table>
</div>
</body>`,
  }),

  // 项目提案
  "proposal": (data) => ({
    subject: `项目提案：${String(data.proposalTitle || "合作方案")}`,
    text: `尊敬的 ${String(data.recipientName || "")}，

以下是我们的项目提案详情...`,
    html: `<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;"><div style="padding:30px;background:#fff;border-radius:16px;border:1px solid #e5e7eb;"><h2 style="color:#1f2937;">📋 项目提案</h2>${String(data.proposalContent || "<p>提案详情...</p>")}</div></body>`,
  }),

  // 欢迎邮件
  "welcome": (data) => ({
    subject: `欢迎加入！— ${String(data.companyName || "AutoCustomer")}`,
    text: `亲爱的 ${String(data.recipientName || "")}，

欢迎！很高兴与你建立联系。`,
    html: `<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;"><div style="padding:30px;background:linear-gradient(135deg,#f0abfc,#c084fc);border-radius:16px;color:#fff;text-align:center;"><h1 style="margin:0;">🎉 欢迎！</h1></div><div style="padding:30px;background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 16px 16px;"><p style="font-size:16px;line-height:1.6;">亲爱的 ${String(data.recipientName || "")}，</p><p style="line-height:1.6;color:#4b5563;">很高兴与你建立联系！</p></div></body>`,
  }),

  // 重新激活
  "re-engagement": (data) => ({
    subject: `好久不见！— 有个想法想和你聊聊`,
    text: `你好 ${String(data.recipientName || "")}，

好久没联系了。最近在做一些有趣的事情，想和你分享一下。`,
    html: `<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;"><div style="padding:30px;background:#fff;border-radius:16px;border:1px solid #e5e7eb;"><h2 style="color:#1f2937;">🌱 好久不见！</h2><p style="color:#4b5563;line-height:1.6;font-size:15px;">${String(data.reEngagementContent || "好久没联系了，想和你重新连接。")}</p></div></body>`,
  }),
};

// ==========================================
// 发送引擎
// ==========================================

async function sendViaResend(message: EmailMessage): Promise<EmailSendResult> {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return { success: false, error: "RESEND_API_KEY not configured", provider: "resend" };
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: message.from || process.env.EMAIL_FROM || "onboarding@resend.dev",
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        replyTo: message.replyTo,
      }),
    });

    const data = await res.json();
    if (res.ok && data.id) {
      return { success: true, messageId: data.id, provider: "resend" };
    }
    return { success: false, error: data.message || "Resend API error", provider: "resend" };
  } catch (error) {
    return { success: false, error: (error as Error).message, provider: "resend" };
  }
}

// 缓存 transporter 实例（避免每次发送都重新创建连接）
const transporterCache = new Map<string, nodemailer.Transporter>();


/**
 * 通过 SOCKS5 代理创建 TCP 连接（用于 Nodemailer 的 socket 连接）
 */
async function createProxySocket(
  proxyHost: string,
  proxyPort: number,
  targetHost: string,
  targetPort: number,
): Promise<any> {
  const info = await SocksClient.createConnection({
    proxy: {
      host: proxyHost,
      port: proxyPort,
      type: 5, // SOCKS5
    },
    command: "connect",
    destination: { host: targetHost, port: targetPort },
  });
  return info.socket;
}

function getNodemailerTransporter(smtpOverride?: SmtpOverrideConfig): nodemailer.Transporter | null {
  const host = smtpOverride?.host || process.env.SMTP_HOST;
  const port = smtpOverride?.port || parseInt(process.env.SMTP_PORT || "587", 10);
  const user = smtpOverride?.user || process.env.SMTP_USER;
  const pass = smtpOverride?.pass || process.env.SMTP_PASS;
  const proxyHost = process.env.SOCKS_PROXY_HOST;
  const proxyPortStr = process.env.SOCKS_PROXY_PORT;

  if (!host || !user || !pass) {
    console.warn("[EMAIL] SMTP not fully configured. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS in .env");
    return null;
  }

  const cacheKey = `${host}:${port}:${user}`;
  const cached = transporterCache.get(cacheKey);
  if (cached) return cached;

  const secure = port === 465;
  let transporter: nodemailer.Transporter;

  if (proxyHost && proxyPortStr) {
    const proxyPort = parseInt(proxyPortStr, 10);
    console.log(`[EMAIL] Using SOCKS5 proxy ${proxyHost}:${proxyPort} for ${host}:${port}`);

    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      connection: {
        async getSocket(opts: any, cb: any) {
          try {
            const socket = await createProxySocket(proxyHost, proxyPort, opts.host, opts.port);
            cb(null, socket);
          } catch (err) {
            console.error("[EMAIL] Proxy connection failed:", err);
            cb(err as Error, null);
          }
        },
      },
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
      tls: {
        rejectUnauthorized: false,
      },
    } as any);

    transporter.verify((error) => {
      if (error) {
        console.error("[EMAIL] SMTP verification (via proxy) failed:", error.message);
        transporterCache.delete(cacheKey);
      } else {
        console.log(`[EMAIL] SMTP via SOCKS5 proxy ready ✅ (${cacheKey})`);
      }
    });
  } else {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
    });

    transporter.verify((error) => {
      if (error) {
        console.error("[EMAIL] SMTP verification failed:", error.message);
        transporterCache.delete(cacheKey);
      } else {
        console.log(`[EMAIL] SMTP direct connection ready ✅ (${cacheKey})`);
      }
    });
  }

  transporterCache.set(cacheKey, transporter);
  return transporter;
}


async function sendViaNodemailer(message: EmailMessage): Promise<EmailSendResult> {
  const transporter = getNodemailerTransporter(message.smtpOverride);
  if (!transporter) {
    // 配置不完整时降级到 log 模式
    console.warn("[EMAIL] Nodemailer not configured. Falling back to log mode. Set SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS in .env");
    return logEmail(message);
  }

  try {
    const info = await transporter.sendMail({
      from: message.from || message.smtpOverride?.from || process.env.EMAIL_FROM || `"AutoCustomer" <${message.smtpOverride?.user || process.env.SMTP_USER}>`,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      replyTo: message.replyTo,
    });

    return {
      success: true,
      messageId: info.messageId,
      provider: "nodemailer",
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      provider: "nodemailer",
    };
  }
}


function logEmail(message: EmailMessage): EmailSendResult {
  console.log("[EMAIL LOG]", JSON.stringify({
    to: message.to,
    subject: message.subject,
    timestamp: new Date().toISOString(),
  }));
  return { success: true, messageId: "log-mode", provider: "log" };
}

// ==========================================
// 公开 API
// ==========================================

/**
 * 发送邮件（自动选择提供商）
 */
export async function sendEmail(message: EmailMessage): Promise<EmailSendResult> {
  const provider = message.providerOverride || (process.env.EMAIL_PROVIDER as "resend" | "nodemailer" | "log") || "log";

  switch (provider) {
    case "resend":
      return await sendViaResend(message);
    case "nodemailer":
      return await sendViaNodemailer(message);
    default:
      // 开发环境默认只记录日志
      console.log("\n[📧 EMAIL PREVIEW]");
      console.log(`  To: ${message.to}`);
      console.log(`  Subject: ${message.subject}`);
      console.log(`  Provider: log mode`);
      console.log(`  Set EMAIL_PROVIDER=resend or nodemailer to actually send\n`);
      return logEmail(message);
  }
}


/**
 * 使用模板发送邮件
 */
export async function sendTemplateEmail(
  templateType: EmailTemplateType,
  to: string,
  templateData: Record<string, unknown>,
): Promise<EmailSendResult> {
  const template = emailTemplates[templateType];
  if (!template) {
    return { success: false, error: `Unknown template: ${templateType}`, provider: "log" };
  }

  const rendered = template(templateData);
  
  return sendEmail({
    to,
    ...rendered,
    from: process.env.EMAIL_FROM || undefined,
  });
}

/**
 * 批量发送（带限流）
 */
export async function batchSendEmails(
  messages: Array<{ to: string; templateType: EmailTemplateType; data: Record<string, unknown> }>,
  options?: { concurrency?: number; delayMs?: number },
): Promise<EmailSendResult[]> {
  const concurrency = options?.concurrency || 5;
  const delayMs = options?.delayMs || 1000;

  const results: EmailSendResult[] = [];
  
  for (let i = 0; i < messages.length; i += concurrency) {
    const batch = messages.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map((m) => sendTemplateEmail(m.templateType, m.to, m.data))
    );
    results.push(...batchResults);

    // 限流等待
    if (i + concurrency < messages.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  return results;
}

// 导出模板列表
export const TEMPLATES = emailTemplates;
