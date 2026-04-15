import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SalesStage, LeadCategory, LeadSource } from "@/lib/constants";

interface Params {
  params: Promise<{ id: string }>;
}

// GET /api/leads/[id] — 详情
export async function GET(request: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    const lead = await db.leads.findUnique({
      where: { id },
      include: {
        _count: { select: { campaign_leads: true } },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...lead,
      name: lead.contact_name,
      email: lead.contact_email,
      company: lead.company_name,
      title: lead.contact_title,
      status: lead.stage,
      category: lead.ai_category,
      source: lead.source_type,
      potentialValue: lead.potential_value,
      lastContactAt: lead.contacted_at,
    });
  } catch (error) {
    console.error("Lead detail error:", error);
    return NextResponse.json({ error: "Failed to fetch lead" }, { status: 500 });
  }
}

// PATCH /api/leads/[id] — 更新
export async function PATCH(request: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { name, email, company, title, status, category, potentialValue, notes, painPoints } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.contact_name = name;
    if (email !== undefined) updateData.contact_email = email || null;
    if (company !== undefined) updateData.company_name = company || null;
    if (title !== undefined) updateData.contact_title = title || null;
    if (status !== undefined && Object.values(SalesStage).includes(status)) {
      updateData.stage = status;
    }
    if (category !== undefined && Object.values(LeadCategory).includes(category)) {
      updateData.ai_category = category;
    }
    if (potentialValue !== undefined) updateData.potential_value = potentialValue;
    if (notes !== undefined) updateData.notes = notes || null;
    if (painPoints !== undefined) updateData.pain_points = painPoints || null;

    const lead = await db.leads.update({
      where: { id },
      data: updateData as any,
    });

    return NextResponse.json({
      ...lead,
      name: lead.contact_name,
      email: lead.contact_email,
      status: lead.stage,
      category: lead.ai_category,
    });
  } catch (error: unknown) {
    const err = error as { code?: string };
    console.error("Update lead error:", error);
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

// DELETE /api/leads/[id]
export async function DELETE(request: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    await db.leads.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err.code === "P2025") {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to delete lead" }, { status: 500 });
  }
}
