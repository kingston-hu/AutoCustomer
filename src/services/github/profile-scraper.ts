/**
 * GitHub Profile Scraper
 * 从 GitHub 个人主页 HTML 中提取邮箱和联系方式
 *
 * GitHub 个人主页包含以下可抓取信息：
 * - Email: <a class="u-email"> 或 data-email 属性（用户公开的邮箱）
 * - 社交链接: Twitter/X, LinkedIn, Mastodon 等在 .profile-social-links 中
 * - Blog/Website: user-profile-blog-url 或 <a class="u-url">
 *
 * 注意：GitHub API 不返回 email（隐私保护），但 HTML 主页可能包含用户公开的邮箱
 */

export interface ScrapedContactInfo {
  email: string | null;
  contactLinks: string[];  // ["twitter.com/xxx", "linkedin.com/in/xxx", ...]
  blog: string | null;     // 个人网站
}

/**
 * 解析 GitHub 个人主页 HTML，提取联系信息
 *
 * 支持两种 GitHub 页面结构：
 * - 传统结构（~2024前）：class 包含 social/profile/url/link 关键字
 * - 新版 React 结构（2025+）：vcard-detail + Link--primary + <svg><title>平台名</title></svg>
 */
export function parseGitHubProfileHtml(html: string): ScrapedContactInfo {
  const info: ScrapedContactInfo = {
    email: null,
    contactLinks: [],
    blog: null,
  };

  // ===== 1. 提取 Email（按精确度从高到低排序） =====

  // 方式 A (最精确): itemprop="email" + aria-label="Email: xxx" 的 <li> 块
  // GitHub 2025+ 新版结构：<li itemprop="email" aria-label="Email: xxx@yyy.com" class="vcard-detail ...">
  // 邮箱在 aria-label 中明文展示，同时 href 中的 mailto 是 HTML 实体编码
  const emailMatchItemprop = html.match(/itemprop="email"[^>]+aria-label="Email:\s*([^"]+)"/i);
  if (emailMatchItemprop) {
    const rawEmail = emailMatchItemprop[1].trim();
    if (rawEmail.includes('@')) {
      info.email = rawEmail;
      console.log(`[scrape] Email found via itemprop+aria-label: ${rawEmail}`);
    }
  }

  // 方式 B (新版 vcard-detail): vcard-detail 块内包含 mailto 链接（支持 HTML 实体编码）
  if (!info.email) {
    const emailMatchVcard = html.match(/vcard-detail[^>]*>[\s\S]*?<a[^>]+href="(mailto:[^"]+)"/i);
    if (emailMatchVcard) {
      const encoded = emailMatchVcard[1].replace('mailto:', '');
      // 解码 HTML 实体：&#x73; → s, &#x68; → h 等
      let decoded = encoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
      decoded = decoded.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
      if (decoded.includes('@')) {
        info.email = decoded;
        console.log(`[scrape] Email found via vcard-detail mailto (decoded): ${decoded}`);
      }
    }
  }

  // 方式 C: <a class="u-email Link--primary" href="mailto:xxx@yyy.com"> (旧版)
  if (!info.email) {
    const emailMatchA = html.match(/<a[^>]+class="[^"]*u-email[^"]*"[^>]*href="mailto:([^"]+)"/i);
    if (emailMatchA) {
      info.email = decodeURIComponent(emailMatchA[1]);
    }
  }

  // 方式 D: data-email 属性
  if (!info.email) {
    const dataEmailMatch = html.match(/data-email="([^"]+)"/i);
    if (dataEmailMatch) {
      const encoded = dataEmailMatch[1];
      if (encoded.includes('@')) {
        info.email = encoded;
      } else {
        try {
          const decoded = atob(encoded);
          if (decoded.includes('@')) info.email = decoded;
        } catch { /* ignore */ }
      }
    }
  }

  // 方式 E: 全文搜索 mailto 链接（最宽泛兜底）
  if (!info.email) {
    const mailtoMatch = html.match(/mailto:[^\s"<>]+@[^\s"<>]+\.[a-zA-Z]{2,}/i);
    if (mailtoMatch) {
      info.email = mailtoMatch[0].replace('mailto:', '');
    }
  }

  // ===== 2. 提取社交媒体链接 =====

  // 已知社交平台域名列表（用于 URL 匹配）
  const socialHostnames = [
    'twitter.com', 'x.com',              // X/Twitter
    'linkedin.com',                        // LinkedIn
    'mastodon.social', 'mastodon.online',  // Mastodon 实例
    'bsky.app',                           // Bluesky
    'discord.gg', 'discord.com',          // Discord
    'youtube.com',                        // YouTube
    'facebook.com',                       // Facebook
    'instagram.com',                      // Instagram
    't.me', 'telegram.org',              // Telegram
    'weibo.com',                          // Weibo
    'zhihu.com',                          // Zhihu
    'dribbble.com',                       // Dribbble
    'medium.com',                         // Medium
    'dev.to',                            // Dev.to
    'stackoverflow.com',                  // Stack Overflow
    'codepen.io',                         // CodePen
    'threads.net',                        // Threads
  ];

  const seenUrls = new Set<string>();

  /**
   * 从 URL 字符串中提取并规范化社交链接
   */
  function extractAndAddUrl(rawUrl: string): void {
    try {
      let url = rawUrl.trim().replace(/\/+$/, '');
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      const hostname = urlObj.hostname.replace(/^www\./, '');
      const pathname = urlObj.pathname.replace(/\/+$/, '');

      // 跳过 GitHub 内部链接
      if (hostname === 'github.com' || hostname === 'gist.github.com') return;

      // 检查是否是已知社交平台
      const isSocial = socialHostnames.some(h => hostname === h || hostname.endsWith('.' + h));
      if (!isSocial && !info.blog) return; // 非社交且不是 blog，跳过

      const result = `${hostname}${pathname}`;
      if (result.length < 8 || seenUrls.has(result)) return;

      seenUrls.add(result);
      info.contactLinks.push(result);
    } catch { /* 忽略无效 URL */ }
  }

  // --- 方式 A (新版 GitHub 2025+) ---
  // 结构：<li class="vcard-detail pt-1"><svg><title>Platform</title></svg><a class="Link--primary wb-break-all" href="URL">text</a></li>
  // 用 vcard-detail 块内的所有外链作为联系方式
  const vcardDetailBlocks = [...html.matchAll(/<li[^>]*class="[^"]*vcard-detail[^"]*"[^>]*>([\s\S]*?)<\/li>/gi)];
  for (const block of vcardDetailBlocks) {
    const blockHtml = block[1];
    // 提取块内所有 href
    const hrefMatches = [...blockHtml.matchAll(/<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>/gi)];
    for (const hm of hrefMatches) {
      extractAndAddUrl(hm[1]);
    }
  }

  // --- 方式 B (传统 GitHub) ---
  // class 中包含 social/profile/url/link 关键字的链接
  const legacyLinkPattern = /<a[^>]+(?:class="[^"]*(?:social|profile|url|link)[^"]*")[^>]+href="(https?:\/\/[^"]*)"[^>]*>/gi;
  let legacyMatch;
  while ((legacyMatch = legacyLinkPattern.exec(html)) !== null) {
    extractAndAddUrl(legacyMatch[1]);
  }

  // --- 方式 C (aria-label 备用) ---
  const ariaLabelPattern = /aria-label="(Twitter\/X?|LinkedIn|Mastodon|Discord|YouTube|Facebook|Instagram|Telegram|Weibo|Zhihu|Dribbble|Medium|Dev\.to|Stack Overflow|CodePen|Bluesky|Threads)\s+(username|URL|account)?[:\s]+([^"]+)"/gi;
  let ariaMatch;
  while ((ariaMatch = ariaLabelPattern.exec(html)) !== null) {
    const platform = ariaMatch[1].toLowerCase().replace(/\/x$/, '').replace(/\s+/g, '');
    const handleOrUrl = ariaMatch[3].trim();
    if (!handleOrUrl) continue;

    if (handleOrUrl.startsWith('http')) {
      extractAndAddUrl(handleOrUrl);
    } else {
      const domainMap: Record<string, string> = {
        twitter: 'twitter.com', 'twitter/x': 'x.com',
        linkedin: 'linkedin.com', mastodon: 'mastodon.social',
        discord: 'discord.gg', youtube: 'youtube.com',
        facebook: 'facebook.com', instagram: 'instagram.com',
        telegram: 't.me', weibo: 'weibo.com', zhihu: 'zhihu.com',
        dribbble: 'dribbble.com', medium: 'medium.com',
        'dev.to': 'dev.to', 'stack overflow': 'stackoverflow.com',
        codepen: 'codepen.io', bluesky: 'bsky.app', threads: 'threads.net',
      };
      const domain = domainMap[platform] || `${platform}.com`;
      extractAndAddUrl(`${domain}/${handleOrUrl}`);
    }
  }

  // ===== 3. 提取 Blog / Website =====
  // Blog 通常是 vcard-detail 中的第一个非社交链接（itemprop="url" data-test-selector="profile-website-url"）
  const websiteBlock = [...html.matchAll(/data-test-selector="profile-website-url"[^>]*>[\s\S]*?<a[^>]+href="(https?:\/\/[^"]+)"/gi)];
  if (websiteBlock.length > 0) {
    info.blog = websiteBlock[0][1];
  }
  // 备用：user-profile-blog-url 类
  if (!info.blog) {
    const blogClassMatch = html.match(/class="[^"]*user-profile-blog-url[^"]*"[^>]*href="([^"]+)"/i);
    if (blogClassMatch) info.blog = blogClassMatch[1];
  }
  // 备用：u-url class
  if (!info.blog) {
    const urlMatch = html.match(/<a[^>]+class="[^"]*\bu-url\b[^"]*"[^>]*href="([^"]+)"/i);
    if (urlMatch) info.blog = urlMatch[1];
  }

  // 将 blog 加入 contactLinks（如果还不是其中的成员）
  if (info.blog) {
    const normalized = info.blog.replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, '');
    if (!seenUrls.has(normalized) && normalized.length >= 8) {
      info.contactLinks.unshift(normalized); // Blog 放最前面
    }
  }

  // 去重
  info.contactLinks = [...new Set(info.contactLinks)];

  return info;
}

// ============================================
// 补充邮箱来源：GitHub API（profile email + commit email + README）：
// - REST API /users/{user} 的 email 字段是最高优先级数据源
// - 当主页 HTML 无公开邮箱时使用 commit email 和 README 扫描
// ============================================

/**
 * 从 GitHub REST API 获取用户公开的 profile email
 * 这是最高优先级的邮箱来源——稳定、快速、不受 JS 渲染影响
 */
async function fetchProfileApiEmail(username: string): Promise<string | null> {
  const ghToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_TOKEN;

  try {
    const res = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        ...(ghToken ? { Authorization: `Bearer ${ghToken}` } : {}),
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.warn(`[scrape] Profile API returned ${res.status} for @${username}`);
      return null;
    }

    const data: any = await res.json();

    // REST API 返回的 email 是用户在 profile 中公开设置的
    const apiEmail = data?.email;
    if (apiEmail && typeof apiEmail === 'string' && apiEmail.includes('@')) {
      console.log(`[scrape] ✅ Found profile API email for @${username}: ${apiEmail}`);
      return apiEmail;
    }

    return null;
  } catch (error) {
    console.warn(`[scrape] Profile API error for @${username}:`, error);
    return null;
  }
}

/**
 * 从 GitHub API 获取用户最新 commit 的 author email
 * 这是很多开发者的唯一可获取邮箱（即使他们不在主页公开）
 */
async function fetchCommitEmail(username: string): Promise<string | null> {
  const ghToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_TOKEN;
  
  // 详细日志：帮助诊断 token 是否被正确加载
  if (!ghToken) {
    console.warn(`[scrape] ⚠️ No GITHUB_TOKEN or GITHUB_PERSONAL_TOKEN found in env! commit email lookup skipped for @${username}`);
    console.warn(`[scrape]   GITHUB_TOKEN set: ${!!process.env.GITHUB_TOKEN}`);
    console.warn(`[scrape]   GITHUB_PERSONAL_TOKEN set: ${!!process.env.GITHUB_PERSONAL_TOKEN}`);
    return null;
  }
  console.log(`[scrape] ✅ GitHub token loaded (${ghToken.substring(0, 10)}...), looking up commits for @${username}`);

  try {
    // Step 1: 获取用户最新仓库
    const reposRes = await fetch(
      `https://api.github.com/users/${username}/repos?sort=updated&per_page=5&type=owner`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${ghToken}`,
        },
      }
    );

    if (!reposRes.ok) return null;
    const repos = await reposRes.json();
    if (!Array.isArray(repos) || repos.length === 0) return null;

    // Step 2: 遍历每个仓库的最新 commit，找 author email
    for (const repo of repos.slice(0, 3)) { // 最多查 3 个仓库
      try {
        const commitsRes = await fetch(
          `https://api.github.com/repos/${repo.full_name}/commits?per_page=3`,
          {
            headers: {
              Accept: "application/vnd.github+json",
              Authorization: `Bearer ${ghToken}`,
            },
          }
        );

        if (!commitsRes.ok) continue;
        const commits = await commitsRes.json();

        for (const commit of commits) {
          const email = commit?.commit?.author?.email;
          if (email && !email.includes('noreply@github.com') && email.includes('@')) {
            console.log(`[scrape] Found commit email for @${username}: ${email} (from ${repo.name})`);
            return email;
          }
        }
      } catch {
        continue; // 单个仓库失败不影响其他
      }
    }

    return null;
  } catch (error) {
    console.warn(`[scrape] Failed to fetch commit email for @${username}:`, error);
    return null;
  }
}

/**
 * 从用户 README.md 中搜索邮箱模式
 * 很多开发者会在 README 中留下 contact/邮箱信息
 */
async function fetchReadmeEmail(username: string): Promise<string | null> {
  const ghToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_TOKEN;

  try {
    // 尝试读取用户的 profile README（如果有的话）
    const readmeRes = await fetch(
      `https://api.github.com/repos/${username}/${username}/readme`,
      {
        headers: {
          Accept: "application/vnd.github.raw",
          ...(ghToken ? { Authorization: `Bearer ${ghToken}` } : {}),
        },
      }
    );

    if (readmeRes.ok) {
      const readmeText = await readmeRes.text();
      // 常见邮箱模式：email / contact / reach out 等
      const emailPatterns = [
        /[^\s,:;<>"']+[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      ];

      const matches = readmeText.match(emailPatterns[0]);
      if (matches?.length) {
        // 过滤掉 GitHub noreply 邮箱和明显不是个人邮箱的
        const personalEmails = matches.filter(e =>
          !e.includes('noreply@') &&
          !e.includes('users.noreply@') &&
          !e.includes('example.') &&
          e.match(/^[a-zA-Z0-9._%+-]+@/)
        );
        if (personalEmails.length > 0) {
          console.log(`[scrape] Found README email for @${username}: ${personalEmails[0]}`);
          return personalEmails[0];
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Level 4 Fallback：从用户博客/网站抓取联系页面的邮箱
 * 当 GitHub 上完全找不到邮箱时，尝试访问用户的 blog URL
 */
async function fetchBlogEmail(blogUrl: string | null): Promise<string | null> {
  if (!blogUrl) return null;

  try {
    console.log(`[scrape] Trying blog URL for email: ${blogUrl}`);
    
    // 常见的联系页面路径
    const contactPaths = ['', '/contact', '/about', '/about-me', '/connect', '/#/contact', '/page/contact'];
    
    for (const path of contactPaths) {
      try {
        const url = path === '' ? blogUrl : (blogUrl.endsWith('/') ? blogUrl + path : blogUrl + path);
        
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; AutoCustomer/1.0; +https://github.com)',
            Accept: 'text/html,application/xhtml+xml',
          },
          signal: AbortSignal.timeout(8000), // 每个页面最多等 8 秒
        });

        if (!res.ok) continue;
        const html = await res.text();
        
        // 在 HTML 中搜索邮箱
        const emails = [...html.matchAll(/(?:mailto:|)([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)]
          .map(m => m[1])
          .filter(e => 
            e.includes('@') && 
            e.length > 7 &&
            !e.includes('noreply@') && 
            !e.includes('example.com') &&
            !e.startsWith('img-') &&
            !e.startsWith('cdn-')
          )
          .filter((v, i, a) => a.indexOf(v) === i); // 去重
        
        if (emails.length > 0) {
          // 优先选择看起来像个人邮箱的（排除通用服务邮箱）
          const personalEmail = emails.find(e => {
            const domain = e.split('@')[1]?.toLowerCase() || '';
            return !['gmail.com', 'qq.com', '163.com', '126.com', 'outlook.com', 'hotmail.com', 'yahoo.com']
              .some(d => domain === d) ||
              emails.length <= 1; // 如果只有一种选择，也接受
          }) || emails[0];
          
          console.log(`[scrape] Found blog email at ${url}: ${personalEmail}`);
          return personalEmail;
        }
      } catch {
        continue; // 单个路径失败不影响其他
      }
      
      // 短暂延迟避免请求过快
      await new Promise(r => setTimeout(r, 500));
    }

    return null;
  } catch (error) {
    console.warn(`[scrape] Blog email lookup failed:`, error);
    return null;
  }
}

/**
 * 综合抓取联系信息——多级 fallback 策略
 *
 * 新的优先级顺序（v3）：
 * Step 0: GitHub REST API /users/{user} 的 email 字段（最稳定，不受 JS 渲染/网络限制影响）
 * Step 1: HTML 主页解析（vcard-detail 等）
 * Step 2: Commit email（最新提交的 author email）
 * Step 3: README 扫描
 * Step 4: 博客/网站爬取
 */
export async function scrapeGitHubContactWithFallback(
  username: string,
  blogUrl?: string | null,
): Promise<ScrapedContactInfo & { scrapedAt: string; source: string; fallbackSource?: string }> {

  // ====== Step 0 (NEW): GitHub REST API Profile Email — 最高优先级 ======
  console.log(`[scrape] Step 0: Checking REST API profile email for @${username}...`);
  const profileApiEmail = await fetchProfileApiEmail(username);
  if (profileApiEmail) {
    return {
      email: profileApiEmail,
      contactLinks: [],
      blog: null,
      scrapedAt: new Date().toISOString(),
      source: `api.github.com/users/${username}`,
      fallbackSource: 'profile-api',
    };
  }

  // ====== Step 1: HTML 主页抓取 ======
  let baseResult: ScrapedContactInfo & { scrapedAt: string; source: string };
  
  try {
    baseResult = await scrapeGitHubProfileContact(username);

    if (baseResult.email) {
      return baseResult;
    }
  } catch (error) {
    // 如果 github.com 不可达或返回错误，记录日志并继续 fallback
    const err = error as Error;
    console.warn(`[scrape] HTML fetch failed for @${username}: ${err.message}, falling back to API methods`);
    baseResult = {
      email: null,
      contactLinks: [],
      blog: null,
      scrapedAt: new Date().toISOString(),
      source: `github.com/${username}`,
    };
  }

  // ====== Step 2: Fallback — GitHub API commit email ======
  console.log(`[scrape] No public email for @${username}, trying commit email...`);
  const commitEmail = await fetchCommitEmail(username);
  if (commitEmail) {
    return {
      ...baseResult,
      email: commitEmail,
      source: `github.com/${username} (commit)`,
      scrapedAt: new Date().toISOString(),
      fallbackSource: 'commit',
    };
  }

  // Step 3: Fallback — README 扫描
  console.log(`[scrape] No commit email for @${username}, trying README...`);
  const readmeEmail = await fetchReadmeEmail(username);
  if (readmeEmail) {
    return {
      ...baseResult,
      email: readmeEmail,
      source: `github.com/${username} (readme)`,
      scrapedAt: new Date().toISOString(),
      fallbackSource: 'readme',
    };
  }

  // Step 4: Fallback — 博客/网站爬取
  const effectiveBlogUrl = blogUrl || baseResult.blog;
  if (effectiveBlogUrl) {
    console.log(`[scrape] No README email for @${username}, trying blog (${effectiveBlogUrl})...`);
    const blogEmail = await fetchBlogEmail(effectiveBlogUrl);
    if (blogEmail) {
      return {
        ...baseResult,
        email: blogEmail,
        source: effectiveBlogUrl,
        scrapedAt: new Date().toISOString(),
        fallbackSource: 'blog',
      };
    }
  }

  // 全部无结果
  console.log(`[scrape] ❌ All methods exhausted for @${username} — no email found`);
  return {
    ...baseResult,
    scrapedAt: new Date().toISOString(),
  };
}


/**
 * 规范化社交 URL，提取最有用的格式
 */
function normalizeSocialUrl(rawUrl: string): string | null {
  try {
    let url = rawUrl.trim();

    // 移除 trailing slash
    url = url.replace(/\/+$/, '');

    // 提取 hostname + pathname（去掉协议和 www）
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const hostname = urlObj.hostname.replace(/^www\./, '');
    const pathname = urlObj.pathname.replace(/\/+$/, '');

    // 跳过 GitHub 内部链接
    if (hostname === 'github.com' || hostname === 'gist.github.com') {
      return null;
    }

    const result = hostname + pathname;

    // 过滤掉太短或不合理的
    if (result.length < 8) return null;

    return result;
  } catch {
    return null;
  }
}

/**
 * 抓取 GitHub 用户个人主页的联系信息
 * 通过 fetch 获取页面 HTML 后解析
 */
export async function scrapeGitHubProfileContact(
  username: string
): Promise<ScrapedContactInfo & { scrapedAt: string; source: string }> {
  const url = `https://github.com/${username}`;

  const ghToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PERSONAL_TOKEN;
  
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'Mozilla/5.0 (compatible; AutoCustomer/1.0; +https://github.com)',
        'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8',
        ...(ghToken ? { Authorization: `Bearer ${ghToken}` } : {}),
      },
      // 不缓存 — 避免首次失败（如登录墙）被缓存 1 小时
      cache: 'no-store',
      // 超时控制：15 秒内必须完成
      signal: AbortSignal.timeout(15000),
    });
  } catch (networkError) {
    // 网络错误：github.com 不可达 / 连接重置 / DNS 失败等
    console.warn(`[scrape] Network error fetching GitHub profile for @${username}: ${(networkError as Error).message}`);
    throw networkError; // 让调用方 fallback 到 API 方法
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub profile for ${username}: ${response.status}`);
  }

  const html = await response.text();

  // 检测是否返回了登录墙 / captcha / challenge 页面
  if (
    html.includes('captcha') ||
    html.includes('challenge-platform') ||
    html.includes('data-challenge-url') ||
    (html.length < 500 && !html.includes('<title>'))
  ) {
    console.warn(`[scrape] GitHub returned challenge/login wall for @${username} (HTML length: ${html.length})`);
    // 返回空结果但不抛异常，让调用方知道是限流而非用户无邮箱
    return {
      email: null,
      contactLinks: [],
      blog: null,
      scrapedAt: new Date().toISOString(),
      source: `github.com/${username}`,
    };
  }

  const parsed = parseGitHubProfileHtml(html);

  return {
    ...parsed,
    scrapedAt: new Date().toISOString(),
    source: `github.com/${username}`,
  };
}

/**
 * 批量抓取（带并发控制和错误容忍 + fallback 补充邮箱）
 * 
 * 性能优化（v2）：
 * - 并发数默认提升到 5
 * - 批内延迟从 300-800ms 降至 100-300ms
 * - 首个请求不延迟，后续才错开
 */
export async function batchScrapeContacts(
  usernames: string[],
  options?: {
    concurrency?: number;
    onProgress?: (completed: number, total: number, result?: any) => void;
    blogUrlMap?: Record<string, string | null>; // username → blog URL
  }
): Promise<Map<string, ScrapedContactInfo & { fallbackSource?: string }>> {
  const results = new Map<string, ScrapedContactInfo & { fallbackSource?: string }>();
  const concurrency = options?.concurrency || 5; // 提升到 5 并发（v1 是 3）
  const blogUrlMap = options?.blogUrlMap || {};

  for (let i = 0; i < usernames.length; i += concurrency) {
    const batch = usernames.slice(i, i + concurrency);

    await Promise.allSettled(
      batch.map(async (username, idx) => {
        try {
          // 仅批内非首个请求加小延迟，避免触发 GitHub 反爬
          if (idx > 0) {
            await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));
          }

          // 使用带 fallback 的版本：HTML → commit email → README → 博客
          const blogUrl = blogUrlMap[username] || undefined;
          const result = await scrapeGitHubContactWithFallback(username, blogUrl);
          results.set(username, {
            email: result.email,
            contactLinks: result.contactLinks,
            blog: result.blog,
            fallbackSource: (result as any).fallbackSource || undefined,
          });
          options?.onProgress?.(results.size, usernames.length, {
            username,
            hasEmail: !!result.email,
            linksCount: result.contactLinks.length,
            fallbackSource: (result as any).fallbackSource || undefined,
          });
        } catch (error: unknown) {
          const err = error as Error;
          console.warn(`[scrape] Failed to scrape ${username}: ${err.message}`);
          // 存入空结果，标记为失败
          results.set(username, { email: null, contactLinks: [], blog: null });
          options?.onProgress?.(results.size, usernames.length, {
            username,
            error: err.message,
          });
        }
      })
    );
  }

  return results;
}
