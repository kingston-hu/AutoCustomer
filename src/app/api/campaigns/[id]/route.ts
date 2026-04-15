import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { CampaignStatus } from "@/lib/constants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const campaign = await db.campaigns.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, name: true, email: true } },
        campaign_leads: true,
        outreach_logs: { orderBy: { createdAt: "desc" }, take: 20 },
        _count: { select: { campaign_leads: true, outreach_logs: true, workflow_runs: true } },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("[CAMPAIGN_GET]", error);
    return NextResponse.json({ error: "Failed to fetch campaign" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, type, config, targetCount, status, scheduledAt } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (type !== undefined) data.type = type;
    if (config !== undefined) data.config = config;
    if (targetCount !== undefined) data.target_count = Number(targetCount);
    if (status !== undefined) {
      data.status = status.toUpperCase();
      // Auto-set timestamps based on status
      if (data.status === "RUNNING") data.started_at = new Date();
      if (data.status === "COMPLETED") data.completed_at = new Date();
    }
    if (scheduledAt !== undefined) data.scheduled_at = scheduledAt ? new Date(scheduledAt) : null;

    const campaign = await db.campaigns.update({
      where: { id },
      data: data as any,
      include: {
        users: { select: { id: true, name: true, email: true } },
        _count: { select: { campaign_leads: true, outreach_logs: true } },
      },
    });

    return NextResponse.json(campaign);
  } catch (error) {
    console.error("[CAMPAIGN_PATCH]", error);
    return NextResponse.json({ error: "Failed to update campaign" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.campaigns.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Campaign deleted" });
  } catch (error) {
    console.error("[CAMPAIGN_DELETE]", error);
    return NextResponse.json({ error: "Failed to delete campaign" }, { status: 500 });
  }
}
