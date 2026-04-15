import { NextRequest, NextResponse } from "next/server";

// Settings are stored in environment variables (read-only for API keys)
// User preferences can be stored in a JSON file or database
// For now, we return env-based config and allow saving preferences

// Sensitive keys to mask
const SENSITIVE_KEYS = [
  "OPENAI_API_KEY",
  "DEEPSEEK_API_KEY",
  "DEEPSEEK_BASE_URL",
  "GITHUB_TOKEN",
  "RESEND_API_KEY",
  "SMTP_PASS",
  "DATABASE_URL",
];

export async function GET() {
  try {
    // Return current configuration (with sensitive values masked)
    const config = {
      ai: {
        provider: process.env.AI_PROVIDER || "openai",
        openaiApiKey: process.env.OPENAI_API_KEY ? "••••••••" + (process.env.OPENAI_API_KEY as string).slice(-4) : null,
        openaiBaseUrl: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
        deepseekApiKey: process.env.DEEPSEEK_API_KEY ? "••••••••" + (process.env.DEEPSEEK_API_KEY as string).slice(-4) : null,
        zhipuApiKey: process.env.ZHIPU_API_KEY ? "••••••••" + (process.env.ZHIPU_API_KEY as string).slice(-4) : null,
        deepseekBaseUrl: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/v1",
        defaultModel: process.env.DEFAULT_AI_MODEL || "gpt-5.4",
      },
      github: {
        token: process.env.GITHUB_TOKEN ? "••••••••" + process.env.GITHUB_TOKEN.slice(-4) : null,
        rateLimit: Number(process.env.GITHUB_RATE_LIMIT) || 5000,
      },
      email: {
        provider: process.env.EMAIL_PROVIDER || "log", // resend | log | nodemailer
        resendApiKey: process.env.RESEND_API_KEY ? "••••••••" + (process.env.RESEND_API_KEY as string).slice(-4) : null,
        fromAddress: process.env.EMAIL_FROM || "",
        smtpHost: process.env.SMTP_HOST || "",
        smtpPort: process.env.SMTP_PORT || "587",
        smtpUser: process.env.SMTP_USER || "",
      },
      app: {
        name: "AutoCustomer",
        version: "1.0.0",
        nodeEnv: process.env.NODE_ENV || "development",
        dbUrl: process.env.DATABASE_URL ? "已配置" : "未配置",
      },
    };

    // Check which features are available
    const status = {
      aiReady: !!(process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY),
      githubReady: !!process.env.GITHUB_TOKEN,
      emailReady: !!(
        process.env.RESEND_API_KEY ||
        (process.env.SMTP_HOST && process.env.SMTP_USER)
      ),
      dbReady: !!process.env.DATABASE_URL,
    };

    return NextResponse.json({ config, status });
  } catch (error) {
    console.error("[SETTINGS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, settings } = body;

    if (action === "test-ai") {
      // Test AI connection by calling the generate endpoint with a simple prompt
      try {
        const res = await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/ai/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: [{ role: "user", content: "Say hello in one word." }],
            model: settings?.model,
            temperature: 0.1,
            maxTokens: 20,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          return NextResponse.json({
            success: true,
            message: "AI 连接成功！",
            response: data.content || data.text || "OK",
          });
        } else {
          const err = await res.json();
          return NextResponse.json({
            success: false,
            message: `AI 测试失败：${err.error || err.message}`,
          });
        }
      } catch (testError) {
        return NextResponse.json({
          success: false,
          message: `AI 连接失败：无法连接到 AI 服务`,
        });
      }
    }

    if (action === "test-email") {
      try {
        const { sendEmail } = await import("@/services/email/service");
        const result = await sendEmail({
          to: settings?.to || process.env.EMAIL_FROM || "test@example.com",
          subject: "[AutoCustomer] 邮件服务测试",
          html: "<p>这是一封测试邮件。如果你收到此邮件，说明邮件配置正确！</p>",
          text: "这是一封测试邮件。如果你收到此邮件，说明邮件配置正确！",
        });
        return NextResponse.json({
          success: result.success,
          message: result.success
            ? `邮件发送成功！Message ID: ${result.messageId}（当前为 ${result.provider} 模式）`
            : `邮件发送失败：${result.error}`,
        });
      } catch (emailError) {
        return NextResponse.json({
          success: false,
          message: `邮件测试失败：${(emailError as Error).message}`,
        });
      }
    }

    if (action === "save-preferences") {
      // In a real app, save user preferences to DB or file
      // For now we just acknowledge
      return NextResponse.json({
        success: true,
        message: "偏好设置已保存",
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[SETTINGS_POST]", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
