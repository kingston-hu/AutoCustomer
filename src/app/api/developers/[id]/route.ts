import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/developers/[id] — Single developer detail
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const developer = await prisma.developers.findUnique({
      where: { id },
      include: {
        developer_projects: { orderBy: { stars: "desc" } },
        _count: { select: { developer_projects: true } },
      },
    });

    if (!developer) {
      return NextResponse.json({ error: "Developer not found" }, { status: 404 });
    }

    return NextResponse.json(developer);
  } catch (error) {
    console.error("[GET /api/developers/:id] error:", error);
    return NextResponse.json({ error: "Failed to fetch developer" }, { status: 500 });
  }
}

// PATCH /api/developers/[id] — Update developer (status, notes, scores)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Allowed fields to update (using schema field names)
    const allowedFields = [
      "status", "priority", "notes", "assigned_to",
      "overallScore", "activityScore", "expertiseScore", "fitScore",
      "skillTags", "techStack", "profileAnalysis",
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    const developer = await prisma.developers.update({
      where: { id },
      data: updateData,
      include: { developer_projects: true },
    });

    return NextResponse.json(developer);
  } catch (error) {
    console.error("[PATCH /api/developers/:id] error:", error);
    return NextResponse.json({ error: "Failed to update developer" }, { status: 500 });
  }
}

// DELETE /api/developers/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.developers.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DELETE /api/developers/:id] error:", error);
    return NextResponse.json({ error: "Failed to delete developer" }, { status: 500 });
  }
}
