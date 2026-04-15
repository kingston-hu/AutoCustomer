import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CampaignType, CampaignStatus } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 10));
    const status = searchParams.get("status");
    const type = searchParams.get("type") as string | null;
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};
    if (status) where.status = status.toUpperCase();
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" as const } },
        { description: { contains: search, mode: "insensitive" as const } },
      ];
    }

    const [campaignsList, total] = await Promise.all([
      db.campaigns.findMany({
        where: where as any,
        include: {
          _count: { select: { campaign_leads: true, outreach_logs: true } },
          users: { select: { id: true, name: true, email: true } },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.campaigns.count({ where: where as any }),
    ]);

    // Stats summary
    const stats = await db.campaigns.groupBy({
      by: ["status"],
      _count: { id: true },
    });

    return NextResponse.json({ campaigns: campaignsList, total, page, limit, stats });
  } catch (error) {
    console.error("[CAMPAIGNS_GET]", error);
    return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, type = "DEVELOPER_RECRUIT", config = {}, scheduledAt, targetCount = 0 } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Campaign name is required" }, { status: 400 });
    }

    // Use first user as creator for now
    const creatorUser = await db.users.findFirst();
    if (!creatorUser) {
      return NextResponse.json({ error: "No user found. Please create a user account first." }, { status: 400 });
    }

    const campaign = await db.campaigns.create({
      data: {
        id: crypto.randomUUID(),
        name: name.trim(),
        description: description?.trim() || null,
        type: type as any,
        config: config ? JSON.stringify(config) : "{}",
        target_count: Number(targetCount) || 0,
        status: (scheduledAt ? CampaignStatus.SCHEDULED : CampaignStatus.DRAFT) as any,
        scheduled_at: scheduledAt ? new Date(scheduledAt) : null,
        creator_id: creatorUser.id,
        updatedAt: new Date(),
      },
      include: {
        users: { select: { id: true, name: true, email: true } },
        _count: { select: { campaign_leads: true, outreach_logs: true } },
      },
    });

    return NextResponse.json(campaign, { status: 201 });
  } catch (error) {
    console.error("[CAMPAIGNS_POST]", error);
    return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
  }
}
