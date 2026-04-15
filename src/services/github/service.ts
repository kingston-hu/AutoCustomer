/**
 * GitHub Developer Search & Import Service
 * Uses GitHub REST API to find and import developer contacts from profile pages
 */

import { prisma } from "@/lib/db";
import { scrapeGitHubProfileContact, type ScrapedContactInfo } from "./profile-scraper";

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  bio: string | null;
  blog: string | null;
  company: string | null;
  location: string | null;
  name: string | null;
  public_repos: number;
  followers: number;
  following: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  pushed_at: string;
  updated_at: string;
  isFork: boolean;
}

export interface GitHubSearchResult {
  total_count: number;
  items: GitHubUser[];
  incomplete_results?: boolean;
}

export interface DeveloperSearchOptions {
  query: string;           // e.g. "language:typescript followers:>100"
  language?: string;        // e.g. "TypeScript", "Rust", "Go"
  location?: string;       // e.g. "China", "Remote"
  minFollowers?: number;   // minimum follower count
  minRepos?: number;       // minimum public repos
  sort?: "followers" | "repositories" | "joined";
  order?: "asc" | "desc";
  perPage?: number;        // default 30, max 100
  page?: number;
}

// ============================================================
// Repository Search (search by project title/description/topic)
// ============================================================

export interface RepoSearchOwner {
  login: string;
  id: number;
  avatar_url: string;
  type: string;             // "User" or "Organization"
  name: string | null;
}

export interface RepoSearchItem {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  pushed_at: string;
  owner: RepoSearchOwner;
  // We also track the best repo per owner for display
  _ownerBestStars?: number;
  _ownerRepoCount?: number;
}

export interface GitHubRepoSearchResult {
  total_count: number;
  items: RepoSearchItem[];
  incomplete_results?: boolean;
}

export interface RepoSearchOptions {
  query: string;           // search keywords for repos
  language?: string;        // e.g. "TypeScript", "Rust", "Go"
  minStars?: number;        // minimum stars
  sort?: "stars" | "forks" | "updated";
  order?: "asc" | "desc";
  perPage?: number;         // default 30, max 100
  page?: number;
}

/**
 * Search GitHub repositories by keyword, then extract unique owners as developers.
 * This searches repo name, description, README — much broader than user bio search.
 */
export async function searchGitHubRepos(
  options: RepoSearchOptions
): Promise<GitHubRepoSearchResult> {
  const parts: string[] = [];

  if (options.query) parts.push(options.query);
  if (options.language) parts.push(`language:${options.language}`);
  if (options.minStars) parts.push(`stars:>=${options.minStars}`);

  const query = parts.join(" ");
  const params = new URLSearchParams({
    q: query,
    per_page: String(Math.min(options.perPage || 30, 100)),
    page: String(options.page || 1),
  });

  if (options.sort) params.set("sort", options.sort);
  if (options.order) params.set("order", options.order || "desc");

  const ghToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_TOKEN;
  const response = await fetch(
    `https://api.github.com/search/repositories?${params}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        ...(ghToken ? { Authorization: `Bearer ${ghToken}` } : {}),
      },
      next: { revalidate: 300 },
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

/**
 * Build GitHub search query from options
 */
function buildSearchQuery(options: DeveloperSearchOptions): string {
  const parts: string[] = [];

  if (options.query) parts.push(options.query);
  if (options.language) parts.push(`language:${options.language}`);
  if (options.location) parts.push(`location:${options.location}`);
  if (options.minFollowers) parts.push(`followers:>${options.minFollowers}`);
  if (options.minRepos) parts.push(`repos:>${options.minRepos}`);

  return parts.join(" ");
}

/**
 * Search GitHub users via API
 */
export async function searchGitHubUsers(
  options: DeveloperSearchOptions
): Promise<GitHubSearchResult> {
  const query = buildSearchQuery(options);
  const params = new URLSearchParams({
    q: query,
    per_page: String(Math.min(options.perPage || 30, 100)),
    page: String(options.page || 1),
  });

  if (options.sort) params.set("sort", options.sort);
  if (options.order) params.set("order", options.order || "desc");

  const response = await fetch(
    `https://api.github.com/search/users?${params}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        ...(process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_TOKEN
          ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_TOKEN}` }
          : {}),
      },
      next: { revalidate: 300 }, // Cache 5 minutes
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

/**
 * Get detailed user profile with repositories
 */
export async function getGitHubUserProfile(username: string): Promise<{
  user: GitHubUser;
  repos: GitHubRepo[];
  languages: Record<string, number>;
  totalStars: number;
}> {
  const ghToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_TOKEN;
  const headers = {
    Accept: "application/vnd.github+json",
    ...(ghToken ? { Authorization: `Bearer ${ghToken}` } : {}),
  };

  // Fetch user + repos in parallel
  const [userRes, reposRes] = await Promise.all([
    fetch(`https://api.github.com/users/${username}`, { headers }),
    fetch(
      `https://api.github.com/users/${username}/repos?sort=updated&per_page=10&type=owner`,
      { headers }
    ),
  ]);

  if (!userRes.ok) throw new Error(`GitHub user not found: ${userRes.status}`);
  if (!reposRes.ok) throw new Error(`GitHub repos error: ${reposRes.status}`);

  const user: GitHubUser = await userRes.json();
  const repos: GitHubRepo[] = await reposRes.json();

  // Calculate language stats and total stars
  const languages: Record<string, number> = {};
  let totalStars = 0;

  for (const repo of repos) {
    totalStars += repo.stargazers_count;
    if (repo.language && !repo.isFork) {
      languages[repo.language] = (languages[repo.language] || 0) + 1;
    }
  }

  return { user, repos, languages, totalStars };
}

/**
 * Import a GitHub developer into the database (upsert)
 * Internal function - use batchImportDevelopers for bulk operations
 *
 * 流程：
 * 1. 通过 GitHub REST API 获取用户基本信息和仓库列表
 * 2. 爬取 GitHub 个人主页 HTML，提取 email 和社交链接
 * 3. 合并数据写入数据库
 */
async function importDeveloperInternal(
  username: string,
  importedBy?: string,
  existingUsernames?: Set<string>
) {
  // Step 0: Quick pre-check (optimization — avoids unnecessary API calls)
  if (existingUsernames?.has(username)) {
    const existing = await prisma.developers.findUnique({ where: { username } });
    if (existing) return { developer: existing, created: false };
  }

  // Step 1: Fetch from GitHub REST API (basic info + repos)
  const { user, repos, languages, totalStars } =
    await getGitHubUserProfile(username);

  // Step 2: Scrape profile page HTML for contact info (email, social links)
  let contactInfo: ScrapedContactInfo = { email: null, contactLinks: [], blog: null };
  try {
    contactInfo = await scrapeGitHubProfileContact(username);
    console.log(`[import] Scraped contact for @${username}: email=${!!contactInfo.email}, links=${contactInfo.contactLinks.length}`);
  } catch (scrapeErr: unknown) {
    console.warn(`[import] Contact scrape failed for @${username}: ${(scrapeErr as Error).message}`);
  }

  // Step 3: Upsert into database
  // 使用 upsert 解决并发/重复导入问题
  // 注意：githubId 是 @unique 字段，update 时不能包含它（否则与自身冲突）
  try {
    const developer = await prisma.developers.upsert({
      where: { username },
      update: {
        // 只更新可变字段，不碰 githubId（它是唯一的且不变）
        display_name: user.name || user.login,
        bio: user.bio ?? undefined,
        avatar_url: user.avatar_url,
        location: user.location ?? undefined,
        company: user.company ?? undefined,
        blog: user.blog || contactInfo.blog || undefined,
        techStack: Object.keys(languages).join(","),
        languageStats: JSON.stringify(languages),
        rawData: JSON.stringify({ user, repos, languages, totalStars, contactInfo }),
      },
      create: {
        id: crypto.randomUUID(),
        githubId: String(user.id),
        username: user.login,
        display_name: user.name || user.login,
        bio: user.bio,
        avatar_url: user.avatar_url,
        location: user.location,
        company: user.company,
        blog: user.blog || contactInfo.blog,
        skillTags: "",
        techStack: Object.keys(languages).join(","),
        languageStats: JSON.stringify(languages),
        overallScore: 0,
        status: "NEW" as const,
        email: contactInfo.email || "",
        contactLinks: contactInfo.contactLinks.join(","),
        rawData: JSON.stringify({ user, repos, languages, totalStars, contactInfo }),
        assigned_to: importedBy,
        developer_projects: {
          create: repos.map((r) => ({
            id: crypto.randomUUID(),
            name: r.name,
            description: r.description,
            url: r.html_url,
            stars: r.stargazers_count,
            language: r.language,
            topics: r.topics.join(","),
            is_fork: r.isFork,
            primary_language: r.language,
            updated_at: r.pushed_at,
          })),
        },
        updatedAt: new Date(),
      },
    });

    return { developer, created: true };
  } catch (upsertErr: unknown) {
    // 如果 upsert 仍然失败（极端情况），尝试查找已存在的记录
    const errMsg = (upsertErr as Error).message;
    if (errMsg.includes("Unique constraint") || errMsg.includes("unique")) {
      console.warn(`[import] Upsert conflict for @${username}, fallback to findExisting`);
      const existing = await prisma.developers.findUnique({ where: { username } });
      if (existing) return { developer: existing, created: false };
    }
    // 不是唯一约束冲突，重新抛出
    throw upsertErr;
  }
}

/**
 * Public single import wrapper (backward compatible)
 */
export async function importDeveloper(username: string, importedBy?: string) {
  return importDeveloperInternal(username, importedBy);
}

/**
 * Smart rate limiter - only waits when GitHub returns 429
 */
class GitHubRateLimiter {
  private last429Time = 0;
  private retryAfterMs = 1000;

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    const timeSince429 = now - this.last429Time;

    if (timeSince429 < this.retryAfterMs) {
      const waitMs = this.retryAfterMs - timeSince429;
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }

  onRateLimited(retryAfterSeconds?: number): void {
    this.last429Time = Date.now();
    this.retryAfterMs = (retryAfterSeconds || 1) * 1000 + 500; // +500ms buffer
  }

  clear(): void {
    this.last429Time = 0;
    this.retryAfterMs = 1000;
  }
}

const rateLimiter = new GitHubRateLimiter();

/**
 * Process a batch of usernames concurrently with rate limiting
 */
async function processBatch(
  batch: string[],
  importedBy: string | undefined,
  existingUsernames: Set<string>,
  onProgress: ((completed: number, total: number, result?: any) => void) | undefined,
  completedSoFar: number,
  totalUsers: number
): Promise<any[]> {
  const results = await Promise.allSettled(
    batch.map(async (username) => {
      await rateLimiter.waitForSlot();
      try {
        const result = await importDeveloperInternal(username, importedBy, existingUsernames);
        onProgress?.(completedSoFar + 1, totalUsers, { username, ...result });
        return result;
      } catch (error: unknown) {
        const err = error as Error & { status?: number };
        // Detect rate limiting from GitHub API
        if (err.status === 429 || err.message.includes("rate limit") || err.message.includes("API rate limit")) {
          const retryMatch = /retry after (\d+)/i.exec(err.message);
          rateLimiter.onRateLimited(retryMatch ? parseInt(retryMatch[1], 10) : undefined);
        }
        onProgress?.(completedSoFar + 1, totalUsers, { username, error: err.message, created: false });
        throw error; // rethrow for Promise.allSettled to catch
      }
    })
  );

  return results.map((r, idx) => {
    if (r.status === "fulfilled") return r.value;
    return {
      username: batch[idx],
      error: r.reason instanceof Error ? r.reason.message : "Unknown error",
      created: false,
    };
  });
}

/**
 * Batch import developers with concurrent processing and smart rate limiting.
 * Performance optimizations:
 * 1. Batch pre-check for existing users (single IN query instead of N findUnique)
 * 2. Concurrent processing with Promise.allSettled (5 parallel by default)
 * 3. Smart rate limiting - only delays when GitHub actually returns 429
 *
 * Expected speed improvement: ~150s → ~15-20s for 100 users (~8-10x faster)
 */
export async function batchImportDevelopers(
  usernames: string[],
  importedBy?: string,
  onProgress?: (completed: number, total: number) => void
) {
  if (usernames.length === 0) return [];

  // === Optimization 1: Bulk pre-check existing users ===
  // Single "WHERE IN" query instead of N individual findUnique calls
  const uniqueUsernames = [...new Set(usernames)];
  const existingDevs = await prisma.developers.findMany({
    where: { username: { in: uniqueUsernames } },
    select: { username: true },
  });

  const existingUsernameSet = new Set(existingDevs.map((d) => d.username));
  const newUsernames = uniqueUsernames.filter((u) => !existingUsernameSet.has(u));

  // Report pre-existing users as skipped immediately
  const results: any[] = [];
  let reportedCount = 0;

  for (const u of uniqueUsernames) {
    if (existingUsernameSet.has(u)) {
      // We need to fetch the full record to return it
      const existing = existingDevs.find((d) => d.username === u)!;
      results.push({ developer: existing, created: false });
      reportedCount++;
      onProgress?.(reportedCount, uniqueUsernames.length);
    }
  }

  // If all users already exist, return early
  if (newUsernames.length === 0) {
    return results;
  }

  // === Optimization 2: Concurrent processing in batches ===
  // Process CONCURRENCY_SIZE users at a time instead of one-by-one
  const CONCURRENCY_SIZE = 5;
  let completedSoFar = reportedCount;

  for (let i = 0; i < newUsernames.length; i += CONCURRENCY_SIZE) {
    const batch = newUsernames.slice(i, i + CONCURRENCY_SIZE);

    const batchResults = await processBatch(
      batch,
      importedBy,
      existingUsernameSet,
      (completed, total, result) => {
        onProgress?.(completed, total);
      },
      completedSoFar,
      uniqueUsernames.length
    );

    results.push(...batchResults);
    completedSoFar += batch.length;
  }

  // Sort results back to original order for predictable output
  const resultMap = new Map(results.map((r) => [r.username || r.developer?.username, r]));
  return uniqueUsernames.map((u) => resultMap.get(u)).filter(Boolean);
}
