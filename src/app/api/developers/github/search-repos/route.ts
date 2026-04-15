import { NextRequest, NextResponse } from "next/server";
import { searchGitHubRepos } from "@/services/github/service";

/**
 * POST /api/developers/github/search-repos
 *
 * Search GitHub repositories by project title/description/topic,
 * then extract unique owners (developers) from the results.
 *
 * This is MORE powerful than user search because it searches:
 * - Repository name
 * - Repository description
 * - README contents (in:readme)
 * - Topics
 *
 * Body params:
 *   query     — search keywords (e.g. "facebook crawler", "AI chatbot")
 *   language  — filter by language (e.g. "Python", "TypeScript")
 *   minStars  — minimum stars filter
 *   sort      — "stars" | "forks" | "updated"
 *   order     — "asc" | "desc"
 *   perPage   — results per page (max 100)
 *   page      — page number
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, language, minStars, sort, order, page, perPage } = body;

    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: "请输入项目搜索关键词" },
        { status: 400 }
      );
    }

    const result = await searchGitHubRepos({
      query: query.trim(),
      language: language || undefined,
      minStars: minStars ? Number(minStars) : undefined,
      sort: sort || undefined,
      order: order || undefined,
      perPage: Math.min(perPage || 100, 100),
      page: page || 1,
    });

    // Extract unique owners (developers) from repo search results
    // Deduplicate by login, keep the best (most starred) repo info per owner
    const ownerMap = new Map<string, {
      login: string;
      avatar_url: string;
      name: string | null;
      type: string;
      bio?: string | null;
      location?: string | null;
      company?: string | null;
      followers?: number;
      public_repos?: number;
      bestRepo: {
        name: string;
        full_name: string;
        description: string | null;
        html_url: string;
        stars: number;
        forks: number;
        language: string | null;
        topics: string[];
      };
      totalRepoCount: number;
      totalStars: number;
    }>();

    for (const repo of result.items) {
      const ownerLogin = repo.owner.login;
      const existing = ownerMap.get(ownerLogin);

      if (!existing) {
        ownerMap.set(ownerLogin, {
          login: ownerLogin,
          avatar_url: repo.owner.avatar_url,
          name: repo.owner.name,
          type: repo.owner.type,
          bestRepo: {
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description,
            html_url: repo.html_url,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            language: repo.language,
            topics: repo.topics || [],
          },
          totalRepoCount: 1,
          totalStars: repo.stargazers_count,
        });
      } else {
        // Update best repo if this one has more stars
        existing.totalRepoCount += 1;
        existing.totalStars += repo.stargazers_count;
        if (repo.stargazers_count > existing.bestRepo.stars) {
          existing.bestRepo = {
            name: repo.name,
            full_name: repo.full_name,
            description: repo.description,
            html_url: repo.html_url,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            language: repo.language,
            topics: repo.topics || [],
          };
        }
      }
    }

    // Convert map to array and enrich with basic user profile data
    // We batch-fetch user profiles to get bio/location/followers etc.
    const owners = Array.from(ownerMap.values());
    const actualPerPage = Math.min(perPage || 100, 100);

    // Batch fetch user details for enriched profiles (up to 30 to avoid rate limits)
    const usersToEnrich = owners.slice(0, 30);
    if (usersToEnrich.length > 0) {
      const ghToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_TOKEN;
      const headers: Record<string, string> = {
        Accept: "application/vnd.github+json",
        ...(ghToken ? { Authorization: `Bearer ${ghToken}` } : {}),
      };

      // Fetch user profiles in parallel (batch)
      const userPromises = usersToEnrich.map(async (owner) => {
        try {
          const res = await fetch(`https://api.github.com/users/${owner.login}`, {
            headers,
            next: { revalidate: 300 },
          });
          if (res.ok) {
            const userData = await res.json();
            owner.bio = userData.bio;
            owner.location = userData.location;
            owner.company = userData.company;
            owner.followers = userData.followers;
            owner.public_repos = userData.public_repos;
          }
        } catch {
          // Silently fail enrichment — base data is still usable
        }
      });

      await Promise.allSettled(userPromises);
    }

    const sortedOwners = [...owners].sort((a, b) => {
      if (sort === "stars") {
        const diff = (a.totalStars || 0) - (b.totalStars || 0);
        return order === "asc" ? diff : -diff;
      }
      return 0;
    });

    return NextResponse.json({
      total: result.total_count,           // Total repos found
      totalOwners: owners.length,          // Unique developers extracted
      items: sortedOwners.map((o) => ({
        login: o.login,
        avatar_url: o.avatar_url,
        bio: o.bio || null,
        location: o.location || null,
        company: o.company || null,
        name: o.name || o.login,
        followers: o.followers || 0,
        public_repos: o.public_repos || 0,
        // Best repo context (helpful for evaluating relevance)
        _bestRepo: o.bestRepo,
        _totalRepos: o.totalRepoCount,
        _totalStars: o.totalStars,
        _type: o.type,                     // "User" or "Organization"
      })),
      hasMore: (page || 1) * actualPerPage < result.total_count,
      repoSample: result.items.slice(0, 5).map((r) => ({
        full_name: r.full_name,
        description: r.description,
        stars: r.stargazers_count,
        language: r.language,
        owner: r.owner.login,
      })),
    });
  } catch (error) {
    console.error("[POST /api/developers/github/search-repos] error:", error);
    return NextResponse.json(
      { error: `GitHub repository search failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}
