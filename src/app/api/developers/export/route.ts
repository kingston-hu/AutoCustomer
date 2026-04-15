import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/developers/export — Export developers with filtering
 *
 * Query params:
 *   format: "csv" | "json" (default: csv)
 *   status: filter by status
 *   search: text search
 *   ids: comma-separated developer IDs (for selected export)
 *
 * CSV columns:
 *   用户名, 显示名, 简介, 地区, 公司, 技术栈, 技能标签,
 *   综合评分, 状态, 优先级, GitHub链接, 导入时间
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim();
    const idsParam = searchParams.get("ids");
    const priority = searchParams.get("priority");
    const minScore = searchParams.get("minScore");

    // Build where clause
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (minScore) where.overallScore = { gte: Number(minScore) };
    if (idsParam) {
      // Selected IDs export takes priority
      where.id = { in: idsParam.split(",").filter(Boolean) };
    } else if (search) {
      where.OR = [
        { display_name: { contains: search } },
        { username: { contains: search } },
        { email: { contains: search } },
        { bio: { contains: search } },
        { skillTags: { contains: search } },
        { techStack: { contains: search } },
      ];
    }

    // Fetch matching developers with projects
    const developers = await prisma.developers.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        developer_projects: {
          select: { name: true, stars: true, language: true, url: true },
          orderBy: { stars: "desc" },
        },
      },
      // Safety limit for exports
      take: 5000,
    });

    if (format === "json") {
      return new NextResponse(JSON.stringify(developers, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="developers-export-${new Date().toISOString().slice(0,10)}.json"`,
        },
      });
    }

    // ===== CSV Format =====
    const headers = [
      "用户名", "显示名", "开发者邮箱", "简介", "地区", "公司", "博客",
      "技术栈", "技能标签",
      "综合评分", "活跃度评分", "专业度评分", "匹配度评分",
      "状态", "优先级",
      "GitHub链接", "项目数", "总Star",
      "导入时间", "最后同步",
    ];

    const rows = developers.map((dev) => {
      const totalStars = dev.developer_projects.reduce((s: number, p: any) => s + p.stars, 0);
      return [
        dev.username,
        dev.display_name || "",
        dev.email || "",
        escapeCsv(dev.bio || ""),
        dev.location || "",
        dev.company || "",
        dev.blog || "",
        dev.techStack || "",
        dev.skillTags || "",
        dev.overallScore > 0 ? Math.round(dev.overallScore).toString() : "",
        dev.activityScore > 0 ? Math.round(dev.activityScore).toString() : "",
        dev.expertiseScore > 0 ? Math.round(dev.expertiseScore).toString() : "",
        dev.fitScore > 0 ? Math.round(dev.fitScore).toString() : "",
        STATUS_LABELS[dev.status] || dev.status,
        PRIORITY_LABELS[dev.priority] || dev.priority,
        `https://github.com/${dev.username}`,
        String(dev.developer_projects.length),
        totalStars > 0 ? String(totalStars) : "",
        formatDateTime(dev.createdAt),
        dev.last_sync_at ? formatDateTime(dev.last_sync_at) : "",
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    // Add BOM for Excel Chinese support
    const bom = "\uFEFF";

    return new NextResponse(bom + csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="developers-${new Date().toISOString().slice(0,10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/developers/export] error:", error);
    return NextResponse.json(
      { error: "导出失败: " + (error as Error).message },
      { status: 500 }
    );
  }
}

// ============================================================
// Helpers
// ============================================================

const STATUS_LABELS: Record<string, string> = {
  NEW: "新导入",
  ANALYZING: "分析中",
  ANALYZED: "已分析",
  APPROVED: "已批准",
  CONTACTED: "已触达",
  REPLIED: "已回复",
  INTERESTED: "有兴趣",
  CONVERTED: "已转化",
  NOT_INTERESTED: "不感兴趣",
  DISQUALIFIED: "不合格",
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: "低",
  MEDIUM: "中",
  HIGH: "高",
  URGENT: "紧急",
};

function escapeCsv(value: string): string {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatDateTime(dateStr: string | Date): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
