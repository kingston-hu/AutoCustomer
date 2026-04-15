import { NextRequest, NextResponse } from "next/server";
import { searchGitHubUsers, DeveloperSearchOptions } from "@/services/github/service";

type MatchMode = "smart" | "exact" | "broad";

function parseKeywordsToGitHubQuery(keywords: string, matchMode: MatchMode = "smart"): string {
  const trimmed = keywords.trim();
  if (!trimmed) return "";

  const tokens: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of trimmed) {
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === " " && !inQuotes) {
      if (current) tokens.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current) tokens.push(current);

  const parts: string[] = [];

  for (const token of tokens) {
    const wasQuoted = token.startsWith('"') && token.endsWith('"');
    const clean = token.replace(/^"|"$/g, "");

    if (!clean) continue;

    if (clean.includes(" ")) {
      if (matchMode === "exact" || wasQuoted) {
        parts.push(`"${clean}"`);
      } else if (matchMode === "broad") {
        clean.split(/\s+/).forEach(word => {
          if (word) parts.push(`${word}*`);
        });
      } else {
        const wordCount = clean.split(/\s+/).length;
        if (wordCount <= 3) {
          parts.push(`"${clean}"`);
        } else {
          clean.split(/\s+/).forEach(word => {
            if (word) parts.push(word);
          });
        }
      }
    } else {
      if (matchMode === "broad") {
        parts.push(`${clean}*`);
      } else {
        parts.push(clean);
      }
    }
  }

  return parts.join(" ");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, keywords, exactMatch, language, location, minFollowers, minRepos, sort, order, page } = body;

    let searchOptions: DeveloperSearchOptions;

    if (keywords && !query) {
      const keywordQuery = keywords.trim();
      if (!keywordQuery && !language) {
        return NextResponse.json({ error: "请输入关键词或选择语言" }, { status: 400 });
      }

      let matchMode: MatchMode = "smart";
      if (exactMatch === true) matchMode = "exact";
      else if (exactMatch === false) matchMode = "broad";

      const parsedKeywordQuery = parseKeywordsToGitHubQuery(keywords, matchMode);
      const parts: string[] = [];
      if (parsedKeywordQuery) parts.push(parsedKeywordQuery);
      if (language) parts.push(`language:${language}`);
      if (location) parts.push(`location:${location}`);
      if (minFollowers) parts.push(`followers:>${Number(minFollowers)}`);
      if (minRepos) parts.push(`repos:>${Number(minRepos)}`);

      searchOptions = {
        query: parts.join(" "),
        sort: sort && sort !== "stars" ? sort : undefined,
        order: order || undefined,
        perPage: Math.min(body.perPage || 100, 100),
        page: page || 1,
      };
    } else {
      if (!query && !language) {
        return NextResponse.json({ error: "query or language is required" }, { status: 400 });
      }

      searchOptions = {
        query: query || "",
        language,
        location,
        minFollowers,
        minRepos,
        sort: sort && sort !== "stars" ? sort : undefined,
        order,
        perPage: Math.min(body.perPage || 100, 100),
        page: page || 1,
      };
    }

    const result = await searchGitHubUsers(searchOptions);
    const ghToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_TOKEN;
    const headers: Record<string, string> = {
      Accept: "application/vnd.github+json",
      ...(ghToken ? { Authorization: `Bearer ${ghToken}` } : {}),
    };

    const items = await Promise.all(result.items.map(async (user) => {
      let totalStars = 0;
      try {
        const reposRes = await fetch(`https://api.github.com/users/${user.login}/repos?sort=updated&per_page=100&type=owner`, {
          headers,
          next: { revalidate: 300 },
        });
        if (reposRes.ok) {
          const repos = await reposRes.json();
          totalStars = (repos || []).reduce((sum: number, repo: any) => sum + Number(repo.stargazers_count || 0), 0);
        }
      } catch {
        totalStars = 0;
      }

      return {
        login: user.login,
        avatar_url: user.avatar_url,
        bio: user.bio,
        location: user.location,
        company: user.company,
        name: user.name || user.login,
        followers: user.followers,
        public_repos: user.public_repos,
        _totalStars: totalStars,
      };
    }));

    let sortedItems = items;
    if (sort === "stars") {
      sortedItems = [...items].sort((a, b) => {
        const diff = (a._totalStars || 0) - (b._totalStars || 0);
        return order === "asc" ? diff : -diff;
      });
    }

    const actualPerPage = Math.min(body.perPage || 100, 100);
    return NextResponse.json({
      total: result.total_count,
      items: sortedItems,
      hasMore: (page || 1) * actualPerPage < result.total_count,
    });
  } catch (error) {
    console.error("[POST /api/developers/github/search] error:", error);
    return NextResponse.json(
      { error: `GitHub search failed: ${(error as Error).message}` },
      { status: 500 }
    );
  }
}

