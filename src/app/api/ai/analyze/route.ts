import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { aiRouter } from "@/services/ai/router";
import {
  cafeScraperAnalysisPrompt,
  CAFESCRAPER_ANALYSIS_SYSTEM,
  developerAnalysisPrompt,
  DEVELOPER_ANALYSIS_SYSTEM,
} from "@/services/ai/prompts/templates";

// ============================================
// 并发控制：最多同时 N 个 LLM 调用
// ============================================
const BATCH_CONCURRENCY = 3;

/**
 * 并发限制执行器 — 类似 p-limit
 */
async function runConcurrent<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number
): Promise<Array<{ status: "fulfilled" | "rejected"; value?: T; reason?: Error }>> {
  const results: Array<{ status: "fulfilled" | "rejected"; value?: T; reason?: Error }> = [];
  const executing = new Set<Promise<void>>();

  for (const task of tasks) {
    const p = task()
      .then((value) => {
        results.push({ status: "fulfilled", value });
        executing.delete(p);
      })
      .catch((reason) => {
        results.push({ status: "rejected", reason });
        executing.delete(p);
      });

    executing.add(p);

    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * 预加载所有开发者数据（一次 DB 查询），避免循环中 N 次查询
 */
async function batchLoadDevelopers(ids: string[]) {
  const devs = await prisma.developers.findMany({
    where: { id: { in: ids } },
    include: { developer_projects: true },
  });

  // 批量更新状态为 ANALYZING
  await prisma.developers.updateMany({
    where: { id: { in: ids }, status: { notIn: ["ANALYZING", "ANALYZED"] } },
    data: { status: "ANALYZING" },
  });

  // Map for O(1) lookup
  const map = new Map(devs.map(d => [d.id, d]));
  return ids.map(id => map.get(id) || null);
}

/**
 * Strategy 7: 从自由文本中正则提取结构化字段
 * 支持多种格式: "fit_score: 72", "评级: A", "Technical Fit: 18/25" 等
 */
function extractFromFreeText(text: string): Record<string, any> | null {
  const result: Record<string, any> = {
    top_strengths: [],
    main_gaps: [],
    target_categories: [],
    risk_flags: [],
  };

  let extractedCount = 0;

  // 辅助函数：提取数字字段
  const extractNumber = (patterns: string[], key: string) => {
    for (const p of patterns) {
      const m = text.match(new RegExp(p, "i"));
      if (m && m[1] !== undefined) {
        result[key] = parseFloat(m[1]) || 0;
        extractedCount++;
        return;
      }
    }
  };

  // 辅助函数：提取字符串字段
  const extractString = (patterns: string[], key: string) => {
    for (const p of patterns) {
      const m = text.match(new RegExp(p, "i"));
      if (m && m[1]) {
        result[key] = m[1].trim();
        extractedCount++;
        return;
      }
    }
  };

  // 辅助函数：提取数组字段
  const extractArray = (patterns: string[], key: string) => {
    for (const p of patterns) {
      const m = text.match(new RegExp(p, "is"));
      if (m && m[1]) {
        result[key] = m[1].split(/[,;、]/).map(s => s.trim().replace(/^[\-\*•]\s*/, "")).filter(Boolean);
        if (result[key].length > 0) extractedCount++;
        return;
      }
    }
  };

  // === 提取 fit_score（数字评分）===
  extractNumber([
    "(?:fit_score|适配分数|总分|综合分|overall\\s*score)[:：]\\s*(\\d+(?:\\.\\d+)?)",
    "(?:适配?评分|fit.score)[:：]?\\s*(\\d+(?:\\.\\d+)?)",
  ], "fit_score");

  // === 提取 fit_grade（评级）===
  extractString([
    "(?:fit_grade|grade|评级|等级|级别)[:：]*\\s*([SABCDF])",
    "(?:评级|等级|级别|Grade)[:：]*\\s*([SABCDF])",
  ], "fit_grade");

  // === 提取各维度分数 ===
  extractNumber([
    "(?:technical_fit|技术匹配度|技术匹配)[:：]\\s*(\\d+(?:\\.\\d+)?)",
  ], "technical_fit");
  extractNumber([
    "(?:use_case_fit|场景匹配度|场景匹配|用例匹配)[:：]\\s*(\\d+(?:\\.\\d+)?)",
  ], "use_case_fit");
  extractNumber([
    "(?:listing_readiness|上架就绪度|上架就绪|listing.readiness)[:：]\\s*(\\d+(?:\\.\\d+)?)",
  ], "listing_readiness");
  extractNumber([
    "(?:commercialization_fit|商业化潜力|商业化|commercialization.fit)[:：]\\s*(\\d+(?:\\.\\d+)?)",
  ], "commercialization_fit");
  extractNumber([
    "(?:reliability_activity|可靠性活跃度|活跃度|reliability.activity)[:：]\\s*(\\d+(?:\\.\\d+)?)",
  ], "reliability_activity");
  extractNumber([
    "(?:platform_bonus|平台加分|平台专项|platform.bonus)[:：]\\s*(\\d+(?:\\.\\d+)?)",
  ], "platform_bonus");
  extractNumber([
    "(?:risk_penalty|风险扣分|风险|risk.penalty)[:：]\\s*([\\-–]?\\d+(?:\\.\\d+)?)",
  ], "risk_penalty");

  // === 提取 listing_eligibility ===
  extractString([
    "(?:listing_eligibility|上架资格|eligibility)[:：]*\\s*(Qualified|Borderline|Not Ready|合格|待定|未就绪)",
  ], "listing_eligibility");

  // === 提取 recommended_action ===
  extractString([
    "(?:recommended_action|推荐行动|建议行动|recommended.action)[:：]*\\s*(Priority Outreach|Standard Outreach|Manual Review|Nurture Pool|Reject for Now|优先招募|标准触达|人工评估|培育池|暂不招)",
  ], "recommended_action");

  // === 提取数组字段 ===
  extractArray([
    "(?:top_strengths|核心优势|优势|主要优势|strengths)[\\s：:]*([\\n\\r][^\\n]+(?:\\n[^\\n]+){0,5})",
    "(?:top_strengths|核心优势|优势|主要优势|strengths)[\\s：:]*([^\\n]+)",
  ], "top_strengths");
  extractArray([
    "(?:main_gaps|主要差距|差距|不足|gaps)[\\s：:]*([\\n\\r][^\\n]+(?:\\n[^\\n]+){0,3})",
    "(?:main_gaps|主要差距|差距|不足|gaps)[\\s：:]*([^\\n]+)",
  ], "main_gaps");
  extractArray([
    "(?:target_categories|目标类目|适合类目|推荐类目|categories)[\\s：:]*(.+?)(?=\\n(?:$|[a-zA-Z_]))",
    "(?:target_categories|目标类目|适合类目|推荐类目|categories)[\\s：:]*([^\\n]+)",
  ], "target_categories");
  extractArray([
    "(?:risk_flags|风险标志|风险|risk.flags)[\\s：:]*([\\n\\r][^\\n]+(?:\\n[^\\n]+){0,2})",
    "(?:risk_flags|风险标志|风险|risk.flags)[\\s：:]*([^\\n]+)",
  ], "risk_flags");

  // === 提取 confidence_note（剩余文字作为说明）===
  // 如果找到了足够多的结构化字段，把整段文字作为 confidence_note
  if (extractedCount >= 3) {
    result.confidence_note = text.replace(/\n{2,}/g, "\n").substring(0, 500);
  }

  // 确保必填字段有默认值
  if (!result.fit_score && result.fit_score !== 0) result.fit_score = null;
  if (!result.fit_grade) result.fit_grade = null;
  if (!result.listing_eligibility) result.listing_eligibility = null;
  if (!result.recommended_action) result.recommended_action = "Manual Review";

  // 至少提取到 2 个字段才算部分成功
  return extractedCount >= 2 ? result : null;
}

/**
 * 分析单个开发者 — 纯计算逻辑，不包含 DB 操作
 */
async function analyzeDevData(
  dev: NonNullable<Awaited<ReturnType<typeof batchLoadDevelopers>>[0]>
): Promise<any> {
  // Parse raw GitHub data
  let githubData: Record<string, unknown> = {};
  try {
    githubData = (typeof dev.rawData === "string" ? JSON.parse(dev.rawData) : dev.rawData) as Record<string, unknown>;
  } catch { /* use empty */ }

  const user = (githubData.user as Record<string, unknown>) || {};
  const repos = (githubData.repos as Array<Record<string, unknown>>) || [];
  const languages = (githubData.languages as Record<string, number>) || {};

  // Call AI for analysis (使用 CafeScraper.com 平台供给审核体系)
  const analysisResult = await aiRouter.generate({
    taskType: "reasoning",
    messages: [
      { role: "system", content: CAFESCRAPER_ANALYSIS_SYSTEM },
      {
        role: "user",
        content: cafeScraperAnalysisPrompt({
          username: dev.username,
          bio: dev.bio || undefined,
          location: dev.location || undefined,
          company: dev.company || undefined,
          repositories: (repos as Array<{ name?: string; description?: string; stars?: number; language?: string }>).map((r) => ({
            name: (r.name as string) || "",
            description: r.description as string | undefined,
            stars: r.stars as number || 0,
            language: r.language as string | undefined,
          })),
          languages: Object.keys(languages).length > 0 ? languages : undefined,
          totalStars: githubData.totalStars as number | undefined,
          followers: user.followers as number | undefined,
          following: user.following as number | undefined,
          contributions: undefined,
        }),
      },
    ],
    temperature: 0.3,
    jsonMode: false,  // ⚠️ 聚合平台的 GPT-5.4 不支持 response_format（会吞掉 content），关闭后靠 System Prompt + 解析策略保证 JSON
    maxTokens: 2048,  // 提升到 2048：7 维评分 + 数组字段需要足够空间避免截断
  });

  // Parse AI response — 增强解析：6 层策略应对各种 AI 返回格式
  let analysis;
  const rawContent = analysisResult.content;

  console.log(`[analyze] AI provider: ${analysisResult.provider}, model: ${analysisResult.model}`);
  console.log(`[analyze] AI raw response (first 500 chars):`, rawContent.substring(0, 500));
  console.log(`[analyze] Full response length: ${rawContent.length} chars`);

  // 空内容拦截 — 不再抛错！返回默认兜底对象，让系统继续运行
  if (!rawContent || rawContent.trim().length === 0) {
    console.error(`[analyze] ⚠️ EMPTY content from ${analysisResult.provider}/${analysisResult.model}. Using default fallback object.`);
    // 写入 debug 信息
    try {
      const fs = await import("fs");
      const path = await import("path");
      const debugDir = path.join(process.cwd(), "debug-ai-responses");
      if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
      const ts = new Date().toISOString().replace(/[:.]/g, "-");
      fs.writeFileSync(path.join(debugDir, `empty-content-${ts}.txt`),
        `Provider: ${analysisResult.provider}\nModel: ${analysisResult.model}\nTimestamp: ${new Date().toISOString()}\n\nThis provider returned empty/null content.\nUsing default fallback analysis object instead of throwing error.\n`, "utf-8");
    } catch {/* ignore */}
    // 返回默认兜底对象而不是抛异常 — 系统永不因 AI 空响应而崩溃
    return {
      analysis: {
        fit_score: 0,
        fit_grade: "D",
        listing_eligibility: "Not Ready",
        technical_fit: 0,
        use_case_fit: 0,
        listing_readiness: 0,
        commercialization_fit: 0,
        reliability_activity: 0,
        platform_bonus: 0,
        risk_penalty: 0,
        top_strengths: [],
        main_gaps: [],
        target_categories: [],
        recommended_action: "Manual Review",
        risk_flags: [`AI (${analysisResult.provider}/${analysisResult.model}) 返回空响应，需人工审核`],
        confidence_note: `AI model returned empty response at ${new Date().toISOString()}. Developer: ${dev?.username || "unknown"}`,
      },
      model: `${analysisResult.provider} / ${analysisResult.model} (empty response)`,
    };
  }

  /**
   * Strategy 1: 直接解析（最理想情况：纯 JSON）
   */
  try {
    analysis = JSON.parse(rawContent);
    console.log("[analyze] ✅ Strategy 1: Parsed via direct JSON.parse");
  } catch (e1) {
    console.log("[analyze] ❌ Strategy 1 failed:", (e1 as Error).message);

    /**
     * Strategy 2: 提取 markdown 代码块中的 JSON
     * 处理: ```json\n{...}\n``` 或 ```\n{...}\n```
     */
    const codeBlockMatch = rawContent.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      try {
        analysis = JSON.parse(codeBlockMatch[1].trim());
        console.log("[analyze] ✅ Strategy 2: Parsed from markdown code block");
      } catch (e2) {
        console.warn("[analyze] Strategy 2 code block parse failed:", (e2 as Error).message);
      }
    }

    /**
     * Strategy 3: 正则提取第一个 { ... } 对象
     * 处理: "以下是分析结果：{...}" 或带前缀文字的返回
     */
    if (!analysis) {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        let extracted = jsonMatch[0];
        try {
          analysis = JSON.parse(extracted);
          console.log("[analyze] ✅ Strategy 3: Parsed via regex extraction");
        } catch (e3) {
          console.warn("[analyze] Strategy 3 regex extract parse failed:", (e3 as Error).message);

          /**
           * Strategy 4: 截断修复 — JSON 因 maxTokens 不够被截断
           * 症状: 字符串以未闭合的引号、数组或对象结尾
           * 修复: 尝试补全闭合符号
           */
          const trimmed = extracted.trim();
          const openBraces = (trimmed.match(/\{/g) || []).length - (trimmed.match(/\}/g) || []).length;
          const openBrackets = (trimmed.match(/\[/g) || []).length - (trimmed.match(/\]/g) || []).length;
          const inString = (trimmed.match(/"/g) || []).length % 2 !== 0;

          console.log(`[analyze] Strategy 4 check: unclosed braces=${openBraces}, brackets=${openBrackets}, inString=${inString}`);

          if (openBraces > 0 || openBrackets > 0 || inString) {
            let fixed = trimmed;
            // 如果在字符串中间截断，先关闭字符串
            if (inString) fixed += '"';
            // 关闭所有未闭合的数组和对象（从内到外）
            fixed += "]".repeat(Math.max(0, openBrackets));
            fixed += "}".repeat(Math.max(0, openBraces));

            try {
              analysis = JSON.parse(fixed);
              console.log(`[analyze] ✅ Strategy 4: Fixed truncated JSON (added "${"}".repeat(Math.max(0, openBrackets))}${"{}".repeat(Math.max(0, openBraces))}")`);
            } catch (e4) {
              console.warn("[analyze] Strategy 4 truncation fix failed:", (e4 as Error).message);
              console.error("[analyze] Fixed string (first 300):", fixed.substring(0, 300));
            }
          }
        }
      }
    }

    /**
     * Strategy 5: 提取类 JSON 结构并尝试宽松解析
     * 某些模型可能返回带注释、尾逗号等非标准 JSON
     */
    if (!analysis) {
      try {
        // 移除常见非标准格式：单行注释、尾逗号
        const cleaned = rawContent
          .replace(/\/\/.*$/gm, "")       // 移除 //
          .replace(/\/\*[\s\S]*?\*\//g, "") // 移除 /* */
          .replace(/,\s*([}\]])/g, "$1")   // 移除尾逗号
          .replace(/\{[\s\S]*?\}/, (match) => match); // 尝试提取（用 [\s\S] 替代 dotAll s-flag 兼容低版本）

        const cleanMatch = cleaned.match(/\{[\s\S]*\}/);
        if (cleanMatch) {
          analysis = JSON.parse(cleanMatch[0]);
          console.log("[analyze] ✅ Strategy 5: Parsed after cleaning non-standard JSON");
        }
      } catch (e5) {
        console.warn("[analyze] Strategy 5 cleaning parse failed:", (e5 as Error).message);
      }
    }

    /**
     * Strategy 6: 终极兜底 — 逐字符修复
     * 某些模型返回的 JSON 内部有未转义的控制字符、特殊 Unicode 等
     */
    if (!analysis) {
      try {
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          let raw = jsonMatch[0];
          // 修复常见问题：
          // 1. 字符串值内部的未转义换行 → 替换为 \n
          // 2. 移除所有控制字符（保留 \n \t \r）
          raw = raw.replace(/[\x00-\x09\x0b-\x1f\x7f]/g, (ch) => {
            const code = ch.charCodeAt(0);
            if (code === 10) return "\\n";   // \n
            if (code === 13) return "\\r";   // \r
            if (code === 9) return "\\t";    // \t
            return "";                        // 其他控制字符删除
          });
          // 2. 修复字符串内未转义的引号（简单启发式：连续3个引号 → 中间加转义）
          raw = raw.replace(/"""/g, '"\\""');
          // 3. 修复 trailing comma 在 ] 或 } 前（更激进）
          raw = raw.replace(/,\s*([}\]])/g, "$1");

          analysis = JSON.parse(raw);
          console.log("[analyze] ✅ Strategy 6: Parsed after aggressive character-level fix");
        }
      } catch (e6) {
        console.warn("[analyze] Strategy 6 aggressive fix failed:", (e6 as Error).message);
      }
    }
  }

  if (!analysis) {
    /**
     * Strategy 7: 自由文本字段提取（终极兜底）
     * 当模型完全不返回 JSON 时，从自由文本中正则提取各字段值
     * 支持: "fit_score: 72", "评级: A", "Technical Fit: 18/25" 等多种格式
     */
    console.log("[analyze] 🔄 Strategy 7: Attempting free-text field extraction...");
    analysis = extractFromFreeText(rawContent);
    if (analysis) {
      console.log("[analyze] ✅ Strategy 7: Extracted fields from free text");
    } else {
      console.warn("[analyze] ⚠️ Strategy 7: Partial extraction, using defaults for missing fields");
    }
  }

  // 即使 Strategy 7 也完全失败，构造一个最小可用对象而不是报错
  if (!analysis) {
    console.error("[analyze] ❌ ALL strategies failed. Using raw text as summary.");
    // 将原始文字作为 confidence_note 保存，至少不丢失 AI 输出
    analysis = {
      fit_score: 0,
      fit_grade: "D",
      listing_eligibility: "Not Ready",
      technical_fit: 0,
      use_case_fit: 0,
      listing_readiness: 0,
      commercialization_fit: 0,
      reliability_activity: 0,
      platform_bonus: 0,
      risk_penalty: 0,
      top_strengths: [],
      main_gaps: [],
      target_categories: [],
      recommended_action: "Manual Review",
      risk_flags: ["AI 解析失败，需人工审核"],
      confidence_note: rawContent.substring(0, 1000), // 保存原始输出供人工参考
    };
  }

  // 验证关键字段存在（即使解析成功，也要确认结构正确）
  const requiredFields = ["fit_score", "fit_grade"];
  const missingFields = requiredFields.filter(f => !(f in analysis));
  if (missingFields.length > 0) {
    console.warn(`[analyze] ⚠️ Missing required fields: ${missingFields.join(", ")}. Analysis may be incomplete.`);
  }

  return { analysis, model: `${analysisResult.provider} / ${analysisResult.model}` };
}

/**
 * Map CafeScraper recommended_action to DB Priority
 */
function mapActionToPriority(action: string | undefined): "LOW" | "MEDIUM" | "HIGH" {
  if (!action) return "MEDIUM";
  const upper = action.toUpperCase();
  if (upper.includes("PRIORITY")) return "HIGH";
  if (upper.includes("REJECT")) return "LOW";
  if (upper.includes("NURTURE")) return "LOW";
  // Standard Outreach / Manual Review → MEDIUM
  return "MEDIUM";
}

/**
 * 批量保存分析结果到 DB
 */
async function batchSaveResults(results: Array<{
  developerId: string;
  analysis: any;
  model: string;
}>) {
  if (results.length === 0) return;

  // 使用 $executeRawUnsafe 或事务批量 update
  // Prisma 不支持原生批量 update with different values per row，
  // 用事务并行更新
  await prisma.$transaction(
    results.map(r =>
      prisma.developers.update({
        where: { id: r.developerId },
        data: {
          profileAnalysis: r.analysis,
          skillTags: Array.isArray(r.analysis.skillTags)
            ? r.analysis.skillTags.join(",")
            : (r.analysis.skillTags || ""),
          techStack: Array.isArray(r.analysis.techStack)
            ? r.analysis.techStack.join(",")
            : (r.analysis.techStack || ""),
          // ====== CafeScraper 7 维评分映射 ======
          overallScore: r.analysis.fit_score ?? 0,
          activityScore: r.analysis.reliability_activity ?? 0,
          expertiseScore: r.analysis.technical_fit ?? 0,
          fitScore: r.analysis.use_case_fit ?? 0,
          // ====== 新增维度字段（Prisma 字段名 = DB 列名，保持 snake_case）======
          technical_fit: r.analysis.technical_fit ?? null,
          use_case_fit: r.analysis.use_case_fit ?? null,
          listing_readiness: r.analysis.listing_readiness ?? null,
          commercialization_fit: r.analysis.commercialization_fit ?? null,
          reliability_activity: r.analysis.reliability_activity ?? null,
          platform_bonus: r.analysis.platform_bonus ?? null,
          risk_penalty: r.analysis.risk_penalty ?? null,
          fit_grade: r.analysis.fit_grade ?? null,
          listing_eligibility: r.analysis.listing_eligibility ?? null,
          target_categories: Array.isArray(r.analysis.target_categories)
            ? r.analysis.target_categories.join(",")
            : (r.analysis.target_categories || ""),
          recommended_action: r.analysis.recommended_action ?? null,
          priority: mapActionToPriority(r.analysis.recommended_action),
          status: "ANALYZED",
        },
      })
    )
  );
}

/**
 * POST /api/ai/analyze — AI analyze one or multiple developers
 *
 * Single mode:   Body: { developerId: string }
 * Batch mode:     Body: { developerIds: string[] }
 *
 * Batch mode uses SSE (Server-Sent Events) for real-time progress:
 * - Each completed result is sent immediately
 * - Final message contains the summary
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { developerId, developerIds } = body as { developerId?: string; developerIds?: string[] };

  // === Single mode (backward compatible, non-streaming) ===
  if (developerId && !developerIds) {
    try {
      const devs = await batchLoadDevelopers([developerId]);
      const dev = devs[0];
      if (!dev) {
        return NextResponse.json({ error: "Developer not found" }, { status: 404 });
      }

      const result = await analyzeDevData(dev);
      await batchSaveResults([{ developerId, ...result }]);

      const updated = await prisma.developers.findUnique({ where: { id: developerId } });
      return NextResponse.json({
        developer: updated,
        analysis: result.analysis,
        model: result.model,
      });
    } catch (error) {
      console.error("[POST /api/ai/analyze] single error:", error);
      try {
        await prisma.developers.update({ where: { id: developerId }, data: { status: "NEW" } });
      } catch { /* ignore */ }
      return NextResponse.json({ error: `AI analysis failed: ${(error as Error).message}` }, { status: 500 });
    }
  }

  // === Batch mode (SSE streaming) ===
  if (developerIds && Array.isArray(developerIds) && developerIds.length > 0) {
    if (developerIds.length > 20) {
      return NextResponse.json({ error: "Maximum 20 developers per batch analysis" }, { status: 400 });
    }

    // Create a TransformStream for SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendSSE = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          // Step 1: 预加载数据（1 次 DB 查询）
          const devs = await batchLoadDevelopers(developerIds);

          // Step 2: 创建并行任务（只针对存在的开发者）
          const validTasks: Array<{
            index: number;
            developerId: string;
            task: () => Promise<{ analysis: any; model: string }>;
          }> = [];

          devs.forEach((dev, idx) => {
            if (!dev) {
              sendSSE({
                type: "progress",
                developerId: developerIds[idx],
                success: false,
                error: "Developer not found",
              });
              return;
            }
            validTasks.push({
              index: idx,
              developerId: dev.id,
              task: () => analyzeDevData(dev),
            });
          });

          // Step 3: 并发执行（最多 3 个同时）
          sendSSE({ type: "status", message: `开始分析 ${validTasks.length} 个开发者...`, total: validTasks.length });

          const concurrentResults = await runConcurrent(
            validTasks.map(vt => vt.task),
            BATCH_CONCURRENCY
          );

          // Step 4: 收集结果并逐个推送
          const saveResults: Array<{ developerId: string; analysis: any; model: string }> = [];

          concurrentResults.forEach((r, i) => {
            const vt = validTasks[i];
            if (r.status === "fulfilled" && r.value) {
              sendSSE({
                type: "result",
                developerId: vt.developerId,
                success: true,
                analysis: r.value.analysis,
                model: r.value.model,
              });
              saveResults.push({ developerId: vt.developerId, ...r.value });
            } else {
              // 失败时回滚状态
              prisma.developers.update({
                where: { id: vt.developerId },
                data: { status: "NEW" },
              }).catch(() => {});

              sendSSE({
                type: "result",
                developerId: vt.developerId,
                success: false,
                error: r.reason?.message || "Analysis failed",
              });
            }
          });

          // Step 5: 批量保存所有成功结果
          if (saveResults.length > 0) {
            await batchSaveResults(saveResults);
          }

          // Step 6: 发送完成消息
          sendSSE({
            type: "done",
            total: developerIds.length,
            succeeded: saveResults.length,
            failed: developerIds.length - saveResults.length,
          });

          controller.close();

        } catch (error) {
          console.error("[POST /api/ai/analyze] batch error:", error);
          sendSSE({
            type: "error",
            error: `Batch analysis failed: ${(error as Error).message}`,
          });
          controller.close();
        }
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

  return NextResponse.json(
    { error: "Provide developerId (single) or developerIds (batch)" },
    { status: 400 }
  );
}
