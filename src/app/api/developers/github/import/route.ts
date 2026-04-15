import { NextRequest } from "next/server";
import { batchImportDevelopers, importDeveloper } from "@/services/github/service";

/**
 * POST /api/developers/github/import — Import developer(s) from GitHub
 *
 * Body: { usernames: string[] } or { username: string }
 * Query: ?sse=1  → enables Server-Sent Events streaming for real-time progress
 *
 * SSE events emitted:
 *   progress: { done, total, current: "username" }
 *   complete: { results, summary }
 *   error:   { message }
 */
export async function POST(request: NextRequest) {
  const isSse = request.nextUrl.searchParams.get("sse") === "1";

  try {
    const body = await request.json();
    const usernames: string[] = body.usernames || (body.username ? [body.username] : []);
    const importedBy: string | undefined = body.importedBy ? String(body.importedBy) : undefined;

    if (usernames.length === 0) {
      if (isSse) {
        return new Response(`data: ${JSON.stringify({ error: "usernames (array) or username is required" })}\n\n`, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }
      return new Response(
        JSON.stringify({ error: "usernames (array) or username is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Single import — no SSE needed
    if (usernames.length === 1 && !isSse) {
      const result = await importDeveloper(usernames[0]);
      return new Response(JSON.stringify(result), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // ===== SSE Streaming mode =====
    if (isSse) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (event: string, data: any) => {
            controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
          };

          try {
            let completed = 0;
            const total = usernames.length;

            // Send initial progress
            send("progress", { done: 0, total });

            const results = await batchImportDevelopers(usernames, importedBy, (done) => {
              completed = done;
              send("progress", { done, total });
            });

            const created = results.filter((r: any) => r.created).length;
            const errors = results.filter((r: any) => "error" in r);

            send("complete", {
              results,
              summary: {
                total: results.length,
                imported: created,
                skipped: results.length - created - errors.length,
                errors: errors.length,
              },
            });
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Unknown error";
            send("error", { message });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no", // Disable nginx buffering
        },
      });
    }

    // ===== Legacy non-SSE batch mode (backward compatible) =====
    const results = await batchImportDevelopers(usernames, importedBy);
    const created = results.filter((r: any) => r.created).length;
    const errors = results.filter((r: any) => "error" in r);

    return new Response(JSON.stringify({
      results,
      summary: {
        total: results.length,
        imported: created,
        skipped: results.length - created - errors.length,
        errors: errors.length,
      },
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[POST /api/developers/github/import] error:", error);

    if (isSse) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(
            `event: error\ndata: ${JSON.stringify({ message: `Import failed: ${(error as Error).message}` })}\n\n`
          ));
          controller.close();
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    return new Response(
      JSON.stringify({ error: `Import failed: ${(error as Error).message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
