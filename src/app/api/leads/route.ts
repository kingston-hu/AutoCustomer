import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { LeadSource, LeadCategory, SalesStage } from "@/lib/constants";

// GET /api/leads — 列表（分页/搜索/筛选/排序）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, parseInt(searchParams.get("limit") || "20"));
    const search = searchParams.get("search")?.trim() || "";
    const stage = searchParams.get("stage");
    const category = searchParams.get("category");
    const source = searchParams.get("source");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";

    const where: Record<string, unknown> = {};
    
    if (search) {
      where.OR = [
        { contact_name: { contains: search } },
        { contact_email: { contains: search } },
        { company_name: { contains: search } },
      ];
    }
    if (stage && Object.values(SalesStage).includes(stage as any)) {
      where.stage = stage;
    }
    if (category && Object.values(LeadCategory).includes(category as any)) {
      where.ai_category = category;
    }
    if (source && Object.values(LeadSource).includes(source as any)) {
      where.source_type = source;
    }

    const [leads, total] = await Promise.all([
      db.leads.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { campaign_leads: true } },
        },
      }),
      db.leads.count({ where }),
    ]);

    // 转换字段名为前端友好格式
    const data = leads.map((lead) => ({
      ...lead,
      // 兼容前端期望的字段名
      name: lead.contact_name,
      email: lead.contact_email,
      company: lead.company_name,
      title: lead.contact_title,
      status: lead.stage,
      category: lead.ai_category,
      source: lead.source_type,
      potentialValue: lead.potential_value,
      lastContactAt: lead.contacted_at,
    }));

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Leads list error:", error);
    return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
  }
}

// POST /api/leads — 新建线索
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company, title, source, developerId } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // 检查重复
    if (email) {
      const existing = await db.leads.findFirst({ where: { contact_email: email } });
      if (existing) {
        return NextResponse.json(
          { error: "Lead with this email already exists" },
          { status: 409 }
        );
      }
    }

    const lead = await db.leads.create({
      data: {
        id: crypto.randomUUID(),
        contact_name: name,
        contact_email: email || null,
        company_name: company || null,
        contact_title: title || null,
        source_type: (source && Object.values(LeadSource).includes(source as any))
          ? source
          : LeadSource.MANUAL_IMPORT,
        stage: SalesStage.NEW as any,
        ai_category: LeadCategory.OTHER as any,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      ...lead,
      name: lead.contact_name,
      email: lead.contact_email,
      status: lead.stage,
      category: lead.ai_category,
      source: lead.source_type,
    }, { status: 201 });
  } catch (error) {
    console.error("Create lead error:", error);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}
