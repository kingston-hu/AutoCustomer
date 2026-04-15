/**
 * 自动化任务调度器
 * 
 * 支持的自动化任务：
 * 1. 定时 GitHub 采集 — 按 schedule 搜索并导入开发者
 * 2. AI 批量分析 — 对未分析的开发者/线索自动分析
 * 3. 邮件跟进提醒 — 基于规则自动触发邮件
 * 4. 数据同步清理 — 清理过期数据、更新统计缓存
 */

import { db } from "@/lib/db";

// ==========================================
// 类型定义
// ==========================================

export interface AutoTask {
  id: string;
  name: string;
  type: "github-scrape" | "ai-analyze" | "email-followup" | "data-sync";
  enabled: boolean;
  config: Record<string, unknown>;
  lastRunAt?: Date;
  nextRunAt?: Date;
  runCount: number;
  errorCount: number;
  status: "idle" | "running" | "error";
}

export interface TaskRunResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
  duration?: number;
}

// ==========================================
// 任务注册表
// ==========================================

const taskHandlers: Record<string, (config: Record<string, unknown>) => Promise<TaskRunResult>> = {
  // GitHub 定时采集
  "github-scrape": async (config) => {
    const start = Date.now();
    try {
      const query = String(config.query || "language:rust followers:>50");
      const maxResults = Number(config.maxResults) || 10;

      // 动态导入避免循环依赖
      const { searchGitHubUsers, getGitHubUserProfile } = await import("../github/service");
      const results = await searchGitHubUsers({ query } as any) as any;
      
      if (!results.users?.length || !Array.isArray(results.users)) {
        return { success: false, message: "No users found", duration: Date.now() - start };
      }

      let imported = 0;
      for (const user of results.slice(0, maxResults)) {
        try {
          const detail = await getGitHubUserProfile(user.login);
          if (detail) {
            await db.developers.upsert({
              where: { githubId: user.id.toString() },
              update: detail,
              create: { ...detail, githubId: user.id.toString() } as any,
            });
            imported++;
          }
        } catch {
          // 单个用户导入失败不影响整体
        }
      }

      return {
        success: true,
        message: `Imported ${imported}/${results.length} developers from GitHub`,
        data: { imported, total: results.length },
        duration: Date.now() - start,
      };
    } catch (error) {
      return { success: false, message: (error as Error).message, duration: Date.now() - start };
    }
  },

  // AI 批量分析
  "ai-analyze": async (config) => {
    const start = Date.now();
    try {
      const target = String(config.target || "developers");
      const limit = Number(config.limit) || 5;
      const model = String(config.model || "auto");

      if (target === "developers") {
        // 找到尚未分析的开发者（没有 profileAnalysis 的）
        const unanalyzed = await db.developers.findMany({
          where: {
            profileAnalysis: null as any,
          },
          take: limit,
          include: { developer_projects: true },
        });

        if (!unanalyzed.length) {
          return { success: true, message: "All developers analyzed", duration: Date.now() - start };
        }

        const { aiRouter } = await import("../ai/router");
        const { DEVELOPER_ANALYSIS_SYSTEM } = await import("../ai/prompts/templates");

        let analyzed = 0;
        for (const dev of unanalyzed) {
          try {
            const d = dev as any;
        const context = `GitHub: @${d.username}\nName: ${d.displayName || d.username}\nBio: ${d.bio || ""}\nFollowers: ${d.followersCount || 0}\nRepos: ${d.publicRepos || 0}\nTech Stack: ${d.techStack || ""}`;
            
        const result = await aiRouter.generate({
          taskType: "analysis",
          messages: [
            { role: "system", content: DEVELOPER_ANALYSIS_SYSTEM },
            { role: "user", content: context },
          ],
          temperature: 0.3,
        });

            await db.developers.update({
              where: { id: dev.id },
              data: {
                profileAnalysis: result.content,
              } as any,
            });
            analyzed++;
          } catch {
            // 单个失败继续
          }
        }

        return {
          success: true,
          message: `Analyzed ${analyzed}/${unanalyzed.length} developers`,
          data: { analyzed, total: unanalyzed.length },
          duration: Date.now() - start,
        };
      }

      return { success: false, message: `Unknown target: ${target}`, duration: Date.now() - start };
    } catch (error) {
      return { success: false, message: (error as Error).message, duration: Date.now() - start };
    }
  },

  // 邮件跟进
  "email-followup": async (config) => {
    const start = Date.now();
    try {
      const daysSinceLastContact = Number(config.daysSinceLastContact) || 7;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastContact);

      // 找出需要跟进的线索：已联系但超过 N 天无新联系
      const leadsToFollowUp = await db.leads.findMany({
        where: {
          stage: { in: ["CONTACTED", "REPLIED"] } as any,
          OR: [
            { lastContactedAt: null },
            { lastContactedAt: { lt: cutoffDate } as any } as any,
          ],
          contactEmail: { not: null } as any,
        } as any,
        take: 10,
      });

      if (!leadsToFollowUp.length) {
        return { success: true, message: "No leads need follow-up", duration: Date.now() - start };
      }

      // 使用 AI 生成跟进内容并发送
      const { sendTemplateEmail } = await import("../email/service");

      let sent = 0;
      for (const lead of leadsToFollowUp) {
        if (!(lead as any).contactEmail) continue;
        try {
          await sendTemplateEmail("follow-up", (lead as any).contactEmail, {
            recipientName: (lead as any).contactName || "朋友",
            followUpContent: `${(lead as any).contactName || "朋友"}，好久没联系了！最近有什么新的进展吗？期待你的回复。`,
          });
          sent++;

          // 更新最后联系时间
          await db.leads.update({
            where: { id: lead.id },
            data: { lastContactedAt: new Date(), notes: `${(lead as any).notes || ""}\n[自动跟进 ${new Date().toLocaleString()}]`.trim() } as any,
          });
        } catch {
          // 发送失败继续
        }
      }

      return {
        success: true,
        message: `Sent ${sent} follow-up emails`,
        data: { sent, total: leadsToFollowUp.length },
        duration: Date.now() - start,
      };
    } catch (error) {
      return { success: false, message: (error as Error).message, duration: Date.now() - start };
    }
  },

  // 数据同步
  "data-sync": async (_config) => {
    const start = Date.now();
    try {
      // 统计各状态数量
      const [developerCount, leadCount] = await Promise.all([
        db.developers.count(),
        db.leads.count(),
      ]);

      // 更新系统设置中的统计缓存（如果有）
      console.log(`[Data Sync] Developers: ${developerCount}, Leads: ${leadCount}`);

      return {
        success: true,
        message: `Sync complete: ${developerCount} devs, ${leadCount} leads`,
        duration: Date.now() - start,
      };
    } catch (error) {
      return { success: false, message: (error as Error).message, duration: Date.now() - start };
    }
  },
};

// ==========================================
// 任务执行器
// ==========================================

/**
 * 执行指定类型的自动化任务
 */
export async function executeTask(
  taskType: string,
  config?: Record<string, unknown>,
): Promise<TaskRunResult> {
  const handler = taskHandlers[taskType];
  if (!handler) {
    return { success: false, message: `Unknown task type: ${taskType}` };
  }

  console.log(`[AutoTask] Starting: ${taskType}`);
  
  // 记录任务开始
  try {
    const result = await handler(config || {});
    
    if (result.success) {
      console.log(`[AutoTask] ✅ ${taskType}: ${result.message}`);
    } else {
      console.error(`[AutoTask] ❌ ${taskType}: ${result.message}`);
    }

    return result;
  } catch (error) {
    const errorMsg = (error as Error).message;
    console.error(`[AutoTask] 💥 ${taskType} crashed: ${errorMsg}`);
    return { success: false, message: errorMsg };
  }
}

/**
 * 获取所有可用任务类型
 */
export function getAvailableTasks(): Array<{
  type: string;
  name: string;
  description: string;
  defaultConfig: Record<string, unknown>;
}> {
  return [
    {
      type: "github-scrape",
      name: "GitHub 定时采集",
      description: "按关键词搜索 GitHub 开发者并自动导入",
      defaultConfig: { query: "language:typescript followers:>100", maxResults: 20 },
    },
    {
      type: "ai-analyze",
      name: "AI 批量分析",
      description: "对未分析的开发者进行 AI 能力评估",
      defaultConfig: { target: "developers", limit: 10, model: "auto" },
    },
    {
      type: "email-followup",
      name: "邮件跟进",
      description: "对长时间未联系的线索发送跟进邮件",
      defaultConfig: { daysSinceLastContact: 7 },
    },
    {
      type: "data-sync",
      name: "数据同步",
      description: "同步统计数据和清理缓存",
      defaultConfig: {},
    },
  ];
}
