import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { LeadCategory, LeadSource, SalesStage } from "@/lib/constants";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

type ImportLeadItem = {
  name?: string;
  email?: string;
  company?: string;
  title?: string;
  notes?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const items = Array.isArray(body?.items) ? (body.items as ImportLeadItem[]) : [];

    if (items.length === 0) {
      return NextResponse.json({ error: "No import items provided" }, { status: 400 });
    }

    const normalized = items.map((item, index) => {
      const email = String(item.email || "").trim().toLowerCase();
      const name = String(item.name || "").trim();
      const company = String(item.company || "").trim();
      const title = String(item.title || "").trim();
      const notes = String(item.notes || "").trim();
      return {
        row: index + 1,
        email,
        name,
        company,
        title,
        notes,
      };
    });

    const invalidRows = normalized.filter((item) => !item.email || !EMAIL_REGEX.test(item.email));
    const validRows = normalized.filter((item) => item.email && EMAIL_REGEX.test(item.email));

    const seen = new Set<string>();
    const dedupedRows = validRows.filter((item) => {
      if (seen.has(item.email)) return false;
      seen.add(item.email);
      return true;
    });
    const duplicateCount = validRows.length - dedupedRows.length;

    const existingLeads = dedupedRows.length > 0
      ? await db.leads.findMany({
          where: {
            contact_email: { in: dedupedRows.map((item) => item.email) },
          } as any,
          select: { contact_email: true },
        })
      : [];

    const existingEmails = new Set(
      existingLeads
        .map((item) => String(item.contact_email || "").trim().toLowerCase())
        .filter(Boolean),
    );

    const rowsToCreate = dedupedRows.filter((item) => !existingEmails.has(item.email));
    const skippedExisting = dedupedRows.length - rowsToCreate.length;

    if (rowsToCreate.length > 0) {
      await db.leads.createMany({
        data: rowsToCreate.map((item) => ({
          id: crypto.randomUUID(),
          contact_name: item.name || item.email.split("@")[0],
          contact_email: item.email,
          company_name: item.company || null,
          contact_title: item.title || null,
          notes: item.notes || null,
          source_type: LeadSource.MANUAL_IMPORT,
          stage: SalesStage.NEW as any,
          ai_category: LeadCategory.OTHER as any,
          updatedAt: new Date(),
        })),
      });
    }

    return NextResponse.json({
      imported: rowsToCreate.length,
      skippedExisting,
      duplicateCount,
      invalidCount: invalidRows.length,
      invalidRows: invalidRows.slice(0, 20).map((item) => ({ row: item.row, email: item.email })),
      totalReceived: items.length,
    });
  } catch (error) {
    console.error("Lead import error:", error);
    return NextResponse.json({ error: "Failed to import leads" }, { status: 500 });
  }
}
