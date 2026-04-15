/**
 * POST /api/developers/scrape-contacts
 *
 * 批量为已存在的开发者补抓联系方式（从 GitHub 个人主页）
 *
 * Query params:
 *   - mode: "all" | "empty" | "ids"
 *   - ids: 逗号分隔的 developer ID 列表（mode=ids 时必填）
 *
 * Body (optional, for SSE):
 *   - { usernames: string[], sse?: boolean }
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { batchScrapeContacts, scrapeGitHubContactWithFallback } from "@/services/github/profile-scraper";

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    // Check for SSE streaming request (for batch with progress)
    const useSse = url.searchParams.get("sse") === "1";

    if (!useSse) {
      // ===== Non-SSE: Simple scrape by DB IDs or mode =====
      const mode = url.searchParams.get("mode") || "empty"; // "all", "empty" (no email), "ids"
      const idsParam = url.searchParams.get("ids");

      // Build query to find developers to scrape
      let whereClause: Record<string, any> = {};

      if (mode === "ids" && idsParam) {
        whereClause.id = { in: idsParam.split(",").filter(Boolean) };
      } else if (mode === "empty") {
        // Support both: pure empty OR empty + selected IDs intersection
        const selectedIds = url.searchParams.get("selectedIds");
        if (selectedIds) {
          // Only among selected IDs, find those without email
          const idList = selectedIds.split(",").filter(Boolean);
          whereClause.AND = [
            { id: { in: idList } },
            { OR: [{ email: null }, { email: "" }, { email: "无" }] },
          ];
        } else {
          // Original behavior: all devs without email
          whereClause.OR = [
            { email: null },
            { email: "" },
            { email: "无" },
          ];
        }
      }
      // mode === "all": no filter

      const developers = await prisma.developers.findMany({
        where: whereClause,
        select: { id: true, username: true, blog: true },
        take: 100, // Safety limit per request
      });

      if (developers.length === 0) {
        return NextResponse.json({
          message: "没有需要抓取的开发者",
          updated: 0,
          total: 0,
          sources: {},
        });
      }

      const usernames = developers.map((d: any) => d.username);
      const usernameToId = new Map(developers.map((d: any) => [d.username, d.id]));
      const usernameToBlog = new Map(developers.map((d: any) => [d.username, d.blog]));

      // Scrape contacts (with fallback chain + blog URL)
      console.log(`[scrape-contacts] Starting non-SSE batch for ${usernames.length} devs (mode=${mode})`);
      const results = await batchScrapeContacts(usernames, {
        concurrency: 3,
        blogUrlMap: Object.fromEntries(developers.map((d: any) => [d.username, d.blog])),
      });

      // Update database records & collect source stats
      let updatedCount = 0;
      const sourceStats: Record<string, number> = {}; // fallbackSource → count
      for (const [username, contact] of results.entries()) {
        const devId = usernameToId.get(username);
        if (!devId) continue;

        const hasData = contact.email || contact.contactLinks.length > 0 || contact.blog;
        if (!hasData) continue;

        // Track source
        const source = (contact as any).fallbackSource || 'html';
        sourceStats[source] = (sourceStats[source] || 0) + 1;

        await prisma.developers.update({
          where: { id: devId },
          data: {
            email: contact.email || undefined,
            contactLinks: contact.contactLinks.join(",") || undefined,
            blog: contact.blog || undefined,
            last_sync_at: new Date(),
          },
        });
        updatedCount++;
      }

      return NextResponse.json({
        message: `成功更新 ${updatedCount} 位开发者的联系方式`,
        total: developers.length,
        updated: updatedCount,
        skipped: developers.length - updatedCount,
        sources: sourceStats,
      });
    } else {
      // ===== SSE Streaming Mode =====
      const body = await req.json();
      const usernames: string[] = body.usernames || [];

      if (usernames.length === 0) {
        return NextResponse.json({ error: "usernames is required" }, { status: 400 });
      }

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const sendEvent = (type: string, data: any) => {
            controller.enqueue(encoder.encode(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`));
          };

          sendEvent("progress", { done: 0, total: usernames.length });

      try {
        const results = await batchScrapeContacts(usernames, {
          concurrency: 3,
          onProgress: (completed, total, result) => {
            sendEvent("progress", { done: completed, total, ...result });
          },
        });

        // Update DB and count
        let updated = 0;
        let skipped = 0;

        for (const [username, contact] of results.entries()) {
          const hasData = contact.email || contact.contactLinks.length > 0 || contact.blog;
          if (!hasData) {
            skipped++;
            continue;
          }

          await prisma.developers.updateMany({
            where: { username },
            data: {
              email: contact.email || "",
              contactLinks: contact.contactLinks.join(","),
              blog: contact.blog,
              last_sync_at: new Date(),
            },
          });
          updated++;
        }

        sendEvent("complete", {
          summary: { total: usernames.length, updated, skipped },
        });
      } catch (error: unknown) {
        sendEvent("error", { error: (error as Error).message });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
  } catch (error: unknown) {
    console.error("[scrape-contacts] Error:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/developers/scrape-contacts
 * 查询当前联系信息统计（有多少人已有/缺少邮箱等）
 */
export async function GET() {
  try {
    const total = await prisma.developers.count();

    const hasEmail = await prisma.developers.count({
      where: {
        AND: [
          { email: { not: null } },
          { email: { notIn: ["", "无"] } },
        ],
      },
    });

    const hasContactLinks = await prisma.developers.count({
      where: {
        AND: [
          { contactLinks: { not: null } },
          { contactLinks: { notIn: [""] } },
        ],
      },
    });

    return NextResponse.json({
      total,
      withEmail: hasEmail,
      withoutEmail: total - hasEmail,
      withContactLinks: hasContactLinks,
      fillRate: total > 0 ? Math.round((hasEmail / total) * 100) : 0,
    });
  } catch (error: unknown) {
    console.error("[scrape-contacts GET] Error:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
