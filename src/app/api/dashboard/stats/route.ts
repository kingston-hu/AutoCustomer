import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/dashboard/stats — Dashboard statistics
 */
export async function GET() {
  try {
    // Run all counts in parallel
    const [
      totalDevelopers,
      newDevs,
      analyzedDevs,
      contactedDevs,
      convertedDevs,
      totalLeads,
      qualifiedLeads,
      contactedLeads,
      wonLeads,
      recentInteractions,
      recentOutreach,
    ] = await Promise.all([
    prisma.developers.count(),
    prisma.developers.count({ where: { status: "NEW" } }),
    prisma.developers.count({ where: { status: "ANALYZED" } }),
    prisma.developers.count({ where: { status: { in: ["CONTACTED", "REPLIED", "INTERESTED"] } } }),
    prisma.developers.count({ where: { status: "CONVERTED" } }),
    prisma.leads.count(),
    prisma.leads.count({ where: { stage: { in: ["QUALIFIED", "CONTACTED"] } } }),
    prisma.leads.count({ where: { stage: { in: ["CONTACTED", "MEETING_SCHEDULED", "TRIAL_STARTED", "NEGOTIATING"] } } }),
    prisma.leads.count({ where: { stage: "WON" } }),
    prisma.interactions.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true, target_type: true, target_id: true,
          type: true, direction: true, content: true, createdAt: true,
          sentiment: true,
        },
      }),
      prisma.outreach_logs.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true, target_type: true, channel: true,
          subject: true, status: true, sent_at: true, createdAt: true,
        },
      }),
    ]);

    // Calculate conversion rates
    const devConversionRate = totalDevelopers > 0
      ? Math.round((convertedDevs / totalDevelopers) * 100)
      : 0;
    const leadConversionRate = totalLeads > 0
      ? Math.round((wonLeads / totalLeads) * 100)
      : 0;

    return NextResponse.json({
      developers: {
        total: totalDevelopers,
        new: newDevs,
        analyzed: analyzedDevs,
        contacted: contactedDevs,
        converted: convertedDevs,
        conversionRate: devConversionRate,
      },
      leads: {
        total: totalLeads,
        qualified: qualifiedLeads,
        contacted: contactedLeads,
        won: wonLeads,
        conversionRate: leadConversionRate,
      },
      funnel: {
        // Developer recruitment funnel
        developer: [
          { label: "新导入", value: newDevs },
          { label: "已分析", value: analyzedDevs },
          { label: "已触达", value: contactedDevs },
          { label: "已转化", value: convertedDevs },
        ],
        // Customer growth funnel
        customer: [
          { label: "线索总数", value: totalLeads },
          { label: "已验证", value: qualifiedLeads },
          { label: "跟进中", value: contactedLeads - wonLeads },
          { label: "成交", value: wonLeads },
        ],
      },
      recentActivity: [...recentInteractions.map((i) => ({
        ...i,
        activityType: "interaction",
      })), ...recentOutreach.map((o) => ({
        ...o,
        activityType: "outreach",
      }))].sort((a, b) =>
        b.createdAt.getTime() - (a.createdAt as Date).getTime()
      ).slice(0, 10),
    });
  } catch (error) {
    console.error("[GET /api/dashboard/stats] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
