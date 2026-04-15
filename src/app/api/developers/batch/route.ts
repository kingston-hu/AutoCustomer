import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * PATCH /api/developers/batch — Batch update developer records
 *
 * Body: { ids: string[], status?: string, priority?: string }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, status, priority } = body as { ids?: string[]; status?: string; priority?: string };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids (string[]) is required" },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "At least one field to update is required (status/priority)" },
        { status: 400 }
      );
    }

    const result = await prisma.developers.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      updated: result.count,
      message: `已更新 ${result.count} 条记录`,
    });
  } catch (error) {
    console.error("[PATCH /api/developers/batch] error:", error);
    return NextResponse.json(
      { error: "批量操作失败: " + (error as Error).message },
      { status: 500 }
    );
  }
}
