import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { aiRouter } from "@/services/ai/router";
import { LEAD_CLASSIFICATION_SYSTEM } from "@/services/ai/prompts/templates";
import { LeadCategory, SalesStage } from "@/lib/constants";

interface Params {
  params: Promise<{ id: string }>;
}

// POST /api/leads/[id]/ai-classify — AI 智能分类线索
export async function POST(request: NextRequest, context: Params) {
  try {
    const { id } = await context.params;

    const lead = await db.leads.findUnique({
      where: { id },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // 构建分析上下文
    const contextData = `线索名称：${lead.contact_name || "未知"}
邮箱：${lead.contact_email || "未知"}
公司：${lead.company_name || "未知"}
职位：${lead.contact_title || "未知"}
来源：${lead.source_type}
当前阶段：${lead.stage}
行业：${lead.industry || "未知"}
公司规模：${lead.company_size || "未知"}
备注：${lead.notes || "无"}
潜力评分：${lead.potential_value || "未评估"}
温暖度：${lead.warm_score}`;

    // 调用 AI 分类
    const result = await aiRouter.generate({
      taskType: "analysis",
      messages: [
        { role: "system", content: LEAD_CLASSIFICATION_SYSTEM },
        { role: "user", content: contextData },
      ],
      temperature: 0.3,
    });

    // 解析 AI 返回的分类结果
    let classification: Record<string, unknown> = {};
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        classification = JSON.parse(jsonMatch[0]);
      }
    } catch {
      classification = {
        category: "OTHER",
        potentialValue: 3,
        reasoning: result.content,
        suggestedAction: "手动审核",
      };
    }

    // 映射分类到实际 enum
    let mappedCategory: string = LeadCategory.OTHER;
    if (typeof classification.category === "string") {
      const upperCat = classification.category.toUpperCase().replace(/[-\s]/g, "_");
      const validCategories = Object.values(LeadCategory);
      if (validCategories.includes(upperCat as typeof LeadCategory[keyof typeof LeadCategory])) {
        mappedCategory = upperCat;
      }
    }

    // 更新数据库
    const updated = await db.leads.update({
      where: { id },
      data: {
        ai_category: mappedCategory,
        potential_value: classification.potentialValue ?? lead.potential_value,
        notes: `${lead.notes || ""}\n\n[AI 分析 ${new Date().toLocaleString()}]\n推理：${classification.reasoning || ""}\n建议：${classification.suggestedAction || ""}`.trim(),
      },
    });

    return NextResponse.json({
      lead: {
        ...updated,
        name: updated.contact_name,
        email: updated.contact_email,
        status: updated.stage,
        category: updated.ai_category,
      },
      analysis: {
        raw: result.content,
        parsed: classification,
        model: result.model,
        provider: result.provider,
      },
    });
  } catch (error) {
    console.error("AI classify error:", error);
    return NextResponse.json(
      { error: "AI classification failed", details: (error as Error).message },
      { status: 500 }
    );
  }
}
