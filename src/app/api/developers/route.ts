import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/developers — List developers with filtering & pagination
 * Query params: page, pageSize, status, search, sortBy
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(50, Math.max(5, parseInt(searchParams.get("pageSize") || "20")));
    const status = searchParams.get("status");
    const search = searchParams.get("search")?.trim();
    const priority = searchParams.get("priority");
    const minScore = searchParams.get("minScore");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Build where clause
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (minScore) where.overallScore = { gte: Number(minScore) };
    if (search) {
      where.OR = [
        { display_name: { contains: search } },
        { username: { contains: search } },
        { email: { contains: search } },
        { bio: { contains: search } },
        { skillTags: { contains: search } },
      ];
    }

    // Build order
    const orderMap: Record<string, string> = {
      createdAt: "createdAt",
      overallScore: "overallScore",
      username: "username",
      activityScore: "activityScore",
    };
    const orderBy = { [orderMap[sortBy] || "createdAt"]: sortOrder };

    const [developers, total] = await Promise.all([
      prisma.developers.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          developer_projects: {
            select: { name: true, stars: true, language: true },
            take: 3,
            orderBy: { stars: "desc" },
          },
          _count: { select: { developer_projects: true } },
        },
      }),
      prisma.developers.count({ where }),
    ]);

    return NextResponse.json({
      data: developers,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("[GET /api/developers] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch developers" },
      { status: 500 }
    );
  }
}
