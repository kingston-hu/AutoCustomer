"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  GitBranch as GithubIcon,
  MoreHorizontal,
  Star,
  User,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Brain,
  Mail,
  CheckCircle2,
  Clock,
  AlertCircle,
  Zap,
  XCircle,
  ExternalLink,
  Download,
  Sparkles,
  Globe,
  Code2,
  MapPin,
  Building2,
  Link,
  FileText,
  Wand2,
  Send,
  BarChart3,
  Trophy,
  PieChart,
  Target,
  PackageCheck,
  TrendingUp,
  Activity,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

// ============================================================
// Types
// ============================================================

interface Developer {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  location: string | null;
  company: string | null;
  // Legacy scoring (保留兼容)
  overallScore: number;
  activityScore: number;
  expertiseScore: number;
  fitScore: number;
  // CafeScraper 7-Dimension scoring
  technicalFit: number | null;
  useCaseFit: number | null;
  listingReadiness: number | null;
  commercializationFit: number | null;
  reliabilityActivity: number | null;
  platformBonus: number | null;
  riskPenalty: number | null;
  fitGrade: string | null;          // "S"|"A"|"B"|"C"|"D"
  listingEligibility: string | null; // "Qualified"|"Borderline"|"Not Ready"
  targetCategories: string | null;   // comma-separated
  recommendedAction: string | null;   // "Priority Outreach"|...
  status: string;
  priority: string;
  skillTags: string;
  techStack: string;
  email: string | null;
  contactLinks: string | null;
  profileAnalysis: any;         // JSON object — 完整 AI 分析结果
  projects: { name: string; stars: number; language: string | null }[];
  _count?: { interactions: number };
  createdAt: string;
}

interface GitHubSearchResult {
  login: string;
  avatar_url: string;
  bio: string | null;
  location: string | null;
  company: string | null;
  name: string | null;
  followers: number;
  public_repos: number;
}

// ============================================================
// Constants
// ============================================================

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; bgGradient: string }> = {
  NEW:           { label: "新导入",   color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",    icon: <Clock className="w-3 h-3" />, bgGradient: "" },
  ANALYZING:     { label: "分析中",   color: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",      icon: <Brain className="w-3 h-3" />, bgGradient: "from-blue-500/10 to-indigo-500/10" },
  ANALYZED:      { label: "已分析",   color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",  icon: <CheckCircle2 className="w-3 h-3" />, bgGradient: "from-indigo-500/10 to-purple-500/10" },
  APPROVED:      { label: "已批准",   color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",icon: <Zap className="w-3 h-3" />, bgGradient: "from-emerald-500/10 to-green-500/10" },
  CONTACTED:     { label: "已触达",   color: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",  icon: <Mail className="w-3 h-3" />, bgGradient: "from-violet-500/10 to-purple-500/10" },
  REPLIED:       { label: "已回复",   color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",     icon: <AlertCircle className="w-3 h-3" />, bgGradient: "from-cyan-500/10 to-sky-500/10" },
  INTERESTED:    { label: "有兴趣",   color: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",    icon: <Star className="w-3 h-3" />, bgGradient: "from-green-500/10 to-emerald-500/10" },
  CONVERTED:     { label: "已转化",   color: "bg-yellow-400 text-yellow-900 dark:bg-yellow-900/40 dark:text-yellow-300",  icon: <CheckCircle2 className="w-3 h-3" />, bgGradient: "from-yellow-500/15 to-orange-500/15" },
  NOT_INTERESTED:{ label: "不感兴趣", color: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300", icon: <XCircle className="w-3 h-3" />, bgGradient: "from-orange-500/10 to-red-500/10" },
  DISQUALIFIED:  { label: "不合格",   color: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",       icon: <XCircle className="w-3 h-3" />, bgGradient: "from-red-500/10 to-rose-500/10" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; dotColor: string }> = {
  LOW:    { label: "低",   color: "text-slate-500", dotColor: "bg-slate-400" },
  MEDIUM: { label: "中",   color: "text-blue-600", dotColor: "bg-blue-500" },
  HIGH:   { label: "高",   color: "text-orange-600", dotColor: "bg-orange-500" },
  URGENT: { label: "紧急", color: "text-red-600", dotColor: "bg-red-500" },
};

// ============================================================
// Search Mode & Presets
// ============================================================

type SearchMode = "keyword" | "repo" | "advanced";

// Repository search presets (popular tech domains as repo search examples)
const REPO_SEARCH_PRESETS = [
  { label: "🤖 AI/ML 项目", query: "AI machine learning model", language: "Python", desc: "搜索 AI/机器学习相关项目" },
  { label: "⚛️ React 全栈", query: "react nextjs full-stack app", language: "TypeScript", desc: "React/Next.js 应用项目" },
  { label: "🕷️ 爬虫/数据", query: "crawler scraper data mining", language: "Python", desc: "爬虫/数据采集项目" },
  { label: "☁️ 云原生/K8s", query: "kubernetes docker operator", language: "Go", desc: "K8s/Docker 基础设施项目" },
  { label: "🔗 Web3/区块链", query: "blockchain smart contract DeFi", language: "", desc: "Web3/区块链项目" },
  { label: "📱 移动端", query: "mobile iOS android flutter app", language: "", desc: "跨平台移动应用项目" },
];

// Language options for keyword search
const LANGUAGE_OPTIONS = [
  { value: "", label: "全部语言" },
  { value: "TypeScript", label: "⚛️ TypeScript" },
  { value: "JavaScript", label: "🟨 JavaScript" },
  { value: "Python", label: "🐍 Python" },
  { value: "Rust", label: "🦀 Rust" },
  { value: "Go", label: "🔧 Go" },
  { value: "Java", label: "☕ Java" },
  { value: "Kotlin", label: "📱 Kotlin" },
  { value: "C++", label: "⚡ C++" },
  { value: "Ruby", label: "💎 Ruby" },
  { value: "PHP", label: "🐘 PHP" },
  { value: "Swift", label: "🍎 Swift" },
  { value: "Dart", label: "🎯 Dart" },
  { value: "C#", label: "🔷 C#" },
];

// Location presets
const LOCATION_PRESETS = [
  { value: "", label: "不限地区" },
  { value: "China", label: "🇨🇳 中国" },
  { value: "Beijing", label: "北京" },
  { value: "Shanghai", label: "上海" },
  { value: "Shenzhen", label: "深圳" },
  { value: "Hangzhou", label: "杭州" },
  { value: "Remote", label: "🌍 远程" },
  { value: "USA", label: "🇺🇸 美国" },
  { value: "San Francisco", label: "旧金山" },
  { value: "Singapore", label: "🇸🇬 新加坡" },
  { value: "Tokyo", label: "🇯🇵 东京" },
  { value: "Berlin", label: "🇩🇪 柏林" },
  { value: "London", label: "🇬🇧 伦敦" },
  { value: "Canada", label: "🇨🇦 加拿大" },
  { value: "Australia", label: "🇦🇺 澳大利亚" },
];

// Sort options
const SORT_OPTIONS = [
  { value: "", label: "最佳匹配" },
  { value: "stars-desc", label: "星级数 ↓" },
  { value: "stars-asc", label: "星级数 ↑" },
  { value: "followers-desc", label: "粉丝数 ↓" },
  { value: "followers-asc", label: "粉丝数 ↑" },
  { value: "repositories-desc", label: "仓库数 ↓" },
  { value: "repositories-asc", label: "仓库数 ↑" },
  { value: "joined-desc", label: "最新加入 ↓" },
  { value: "joined-asc", label: "最早加入 ↑" },
];

// Keyword-based search presets (by tech domain)
const KEYWORD_PRESETS = [
  { label: "🤖 AI/ML 工程师", keywords: "machine learning deep learning AI LLM transformer", language: "Python", desc: "人工智能与机器学习方向" },
  { label: "⚛️ React 前端专家", keywords: "react nextjs frontend component", language: "TypeScript", desc: "React 生态前端开发" },
  { label: "🔒 安全工程师", keywords: "security vulnerability penetration cryptography", language: "", desc: "网络安全 / 密码学" },
  { label: "☁️ 云原生架构师", keywords: "kubernetes docker microservice cloud infrastructure", language: "Go", desc: "K8s / 容器化 / 微服务" },
  { label: "📱 移动开发者", keywords: "mobile iOS android flutter react native cross-platform", language: "", desc: "跨平台移动开发" },
  { label: "🔗 区块链开发", keywords: "blockchain web3 smart contract solidity defi", language: "", desc: "Web3 / 链上开发" },
  { label: "🎮 游戏开发者", keywords: "game engine unreal unity graphics rendering", language: "C++", desc: "游戏引擎 / 图形渲染" },
  { label: "📊 数据工程师", keywords: "data pipeline etl analytics spark kafka big data", language: "Python", desc: "大数据处理与分析" },
  { label: "🛡️ DevOps/SRE", keywords: "devops sre monitoring CI/CD terraform ansible automation", language: "Go", desc: "运维自动化 / 可靠性工程" },
  { label: "💰 Fintech 开发", keywords: "fintech payment trading blockchain crypto exchange", language: "", desc: "金融科技 / 支付交易" },
];

// Advanced syntax presets (original)
const ADVANCED_PRESETS = [
  { label: "🦀 Rust 高影响力", query: "language:rust followers:>200" },
  { label: "⚛️ TS 高活跃", query: "language:typescript followers:>100 repos:>20" },
  { label: "🐍 Python 数据科学", query: "language:python followers:>50 location:Remote" },
  { label: "🔧 Go 后端开发", query: "language:go followers:>80 repos:>15" },
  { label: "☕ Java 全栈", query: "language:java followers:>50 company:*", desc: "(公司任职)" },
  { label: "🎨 JS 专家", query: "language:javascript followers:>100 repos:>30" },
];

// ============================================================
// Component
// ============================================================

export default function DevelopersPage() {
  const [developers, setDevelopers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [scoreFilter, setScoreFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // GitHub search state
  const [ghSearchOpen, setGhSearchOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>("keyword");
  // Keyword mode fields
  const [keywords, setKeywords] = useState("");
  const [matchMode, setMatchMode] = useState<"smart" | "exact" | "broad">("smart");
  // Repo search mode fields
  const [repoQuery, setRepoQuery] = useState("");
  const [repoLanguage, setRepoLanguage] = useState("");
  const [minStars, setMinStars] = useState<string>("");
  // Keyword mode filter fields (language/location/followers etc.)
  const [selLanguage, setSelLanguage] = useState("");
  const [selLocation, setSelLocation] = useState("");
  const [minFollowers, setMinFollowers] = useState<string>("");
  const [minRepos, setMinRepos] = useState<string>("");
  const [sortOption, setSortOption] = useState("");
  // Advanced mode field
  const [ghQuery, setGhQuery] = useState("language:rust followers:>50");
  // Results
  const [ghResults, setGhResults] = useState<GitHubSearchResult[]>([]);
  const [ghTotal, setGhTotal] = useState(0);
  const [ghSearching, setGhSearching] = useState(false);
  const [ghPage, setGhPage] = useState(1);
  const [ghLoadingMore, setGhLoadingMore] = useState(false);
  const [ghHasMore, setGhHasMore] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);

  // Selection (for GitHub search results)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  // Selection for candidate list table
  const [selectedDevIds, setSelectedDevIds] = useState<Set<string>>(new Set());
  const [batchActionOpen, setBatchActionOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Contact scraping state
  const [scrapingContacts, setScrapingContacts] = useState(false);
  const [scrapeProgress, setScrapeProgress] = useState<{ done: number; total: number } | null>(null);

  // Analysis dialog
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<Record<string, any> | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [selectedDevForAnalysis, setSelectedDevForAnalysis] = useState<any | null>(null);

  // Score detail dialog (查看已保存的评分明细)
  const [scoreDetailOpen, setScoreDetailOpen] = useState(false);
  const [selectedDevForScore, setSelectedDevForScore] = useState<any | null>(null);

  // Batch analysis state
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);
  const [batchAnalyzeProgress, setBatchAnalyzeProgress] = useState<{ done: number; total: number } | null>(null);
  const [batchAnalyzeResults, setBatchAnalyzeResults] = useState<Array<{
    developerId: string;
    success: boolean;
    analysis?: any;
    model?: string;
    error?: string;
  }>>([]);
  const [batchAnalyzeOpen, setBatchAnalyzeOpen] = useState(false);

  // Outreach copywriting dialog state
  const [generatingOutreachId, setGeneratingOutreachId] = useState<string | null>(null);
  const [outreachResult, setOutreachResult] = useState<{ subject: string; body: string; personalizationNote?: string } | null>(null);
  const [outreachOpen, setOutreachOpen] = useState(false);
  const [selectedDevForOutreach, setSelectedDevForOutreach] = useState<any | null>(null);
  // Custom outline dialog state (pre-generation)
  const [outlineDialogOpen, setOutlineDialogOpen] = useState(false);
  const [customOutline, setCustomOutline] = useState("");
  const [pendingOutreachDev, setPendingOutreachDev] = useState<any | null>(null);
  // Batch outreach state
  const [batchGeneratingOutreach, setBatchGeneratingOutreach] = useState(false);
  const [batchOutreachResults, setBatchOutreachResults] = useState<Array<{ id: string; name: string; subject: string; body: string }>>([]);
  const [batchOutreachOpen, setBatchOutreachOpen] = useState(false);
  const [batchCustomOutline, setBatchCustomOutline] = useState("");

  // Batch send email state
  const [batchSendingEmail, setBatchSendingEmail] = useState(false);
  const [batchSendProgress, setBatchSendProgress] = useState<{ done: number; total: number; succeeded: number; failed: number } | null>(null);
  const [batchSendOpen, setBatchSendOpen] = useState(false);

  // Fetch developers
  const fetchDevelopers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
        ...(search && { search }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(priorityFilter !== "all" && { priority: priorityFilter }),
        ...(scoreFilter !== "all" && { minScore: scoreFilter === "high" ? "80" : scoreFilter === "medium" ? "60" : "0" }),
      });
      const res = await fetch(`/api/developers?${params}`);
      if (res.ok) {
        const data = await res.json();
        setDevelopers(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, priorityFilter, scoreFilter]);

  useEffect(() => {
    fetchDevelopers();
  }, [fetchDevelopers]);

  // Build search body based on current mode
  const getSearchBody = (): Record<string, any> => {
    if (searchMode === "keyword") {
      return {
        keywords: keywords.trim(),
        exactMatch: matchMode === "exact" ? true : matchMode === "broad" ? false : undefined, // undefined = smart
        language: selLanguage || undefined,
        location: selLocation || undefined,
        minFollowers: minFollowers ? Number(minFollowers) : undefined,
        minRepos: minRepos ? Number(minRepos) : undefined,
        sort: sortOption ? sortOption.split("-")[0] as any : undefined,
        order: sortOption ? (sortOption.split("-")[1] as "asc" | "desc") : undefined,
      };
    }
    if (searchMode === "repo") {
      return {
        query: repoQuery.trim(),
        language: repoLanguage || undefined,
        minStars: minStars ? Number(minStars) : undefined,
        sort: sortOption ? sortOption.split("-")[0] as any : undefined,
        order: sortOption ? (sortOption.split("-")[1] as "asc" | "desc") : undefined,
      };
    }
    return { query: ghQuery };
  };

  // Get the API endpoint for current search mode
  const getSearchEndpoint = () => {
    if (searchMode === "repo") return "/api/developers/github/search-repos";
    return "/api/developers/github/search";
  };

  // GitHub / Repo search — first page
  const handleGitHubSearch = async () => {
    setGhSearching(true);
    setGhResults([]);
    setGhPage(1);
    setGhHasMore(false);
    try {
      const body = { ...getSearchBody(), page: 1, perPage: 100 };
      const res = await fetch(getSearchEndpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setGhResults(data.items || []);
        // For repo search, show owner count; for user/search show total
        setGhTotal(searchMode === "repo" ? (data.totalOwners || data.total || 0) : (data.total || 0));
        setGhHasMore(data.hasMore || false);
      } else {
        const err = await res.json();
        alert(`搜索失败: ${err.error || "未知错误"}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGhSearching(false);
    }
  };

  // Load more results (pagination)
  const handleLoadMore = async () => {
    const nextPage = ghPage + 1;
    setGhLoadingMore(true);
    try {
      const body = { ...getSearchBody(), page: nextPage, perPage: 100 };
      const res = await fetch(getSearchEndpoint(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const data = await res.json();
        setGhResults((prev) => [...prev, ...(data.items || [])]);
        setGhPage(nextPage);
        setGhHasMore(data.hasMore || false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGhLoadingMore(false);
    }
  };

  // Apply a keyword preset
  const applyKeywordPreset = (preset: typeof KEYWORD_PRESETS[0]) => {
    setSearchMode("keyword");
    setKeywords(preset.keywords);
    setSelLanguage(preset.language);
    setSelLocation("");
    setMinFollowers("");
    setMinRepos("");
    setSortOption("");
  };

  // Apply an advanced preset
  const applyAdvancedPreset = (preset: typeof ADVANCED_PRESETS[0]) => {
    setSearchMode("advanced");
    setGhQuery(preset.query);
  };

  // Apply a repo search preset
  const applyRepoPreset = (preset: typeof REPO_SEARCH_PRESETS[0]) => {
    setSearchMode("repo");
    setRepoQuery(preset.query);
    setRepoLanguage(preset.language);
    setMinStars("");
    setSortOption("stars-desc");
  };

  // Toggle selection
  const toggleSelection = (login: string) => {
    setSelectedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(login)) next.delete(login); else next.add(login);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedUsers(new Set(ghResults.map((u) => u.login)));
  };

  const clearSelection = () => {
    setSelectedUsers(new Set());
  };

  // Import selected developers with SSE real-time progress
  const handleImport = async (usernames: string[]) => {
    setImporting(true);
    setImportProgress({ done: 0, total: usernames.length });
    try {
      // Use SSE for real-time progress when importing multiple users
      const useSse = usernames.length > 1;
      const url = `/api/developers/github/import${useSse ? "?sse=1" : ""}`;

      if (useSse) {
        // SSE streaming mode
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernames }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let finalData: any = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              const eventType = line.slice(7).trim();
              continue; // Next line will be data
            }
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6);
              try {
                const data = JSON.parse(dataStr);
                if (typeof data === "object" && data !== null) {
                  if (data.done !== undefined && data.total !== undefined) {
                    setImportProgress({ done: data.done, total: data.total });
                  }
                  if (data.summary) {
                    finalData = data;
                  }
                  if (data.error) {
                    alert(`❌ 导入失败: ${data.error}`);
                    return;
                  }
                }
              } catch {
                // Ignore parse errors for partial chunks
              }
            }
          }
        }

        if (finalData?.summary) {
          const { imported, skipped, errors } = finalData.summary;
          const existed = skipped || 0;
          alert(`✅ 导入完成！\n新导入：${imported} 人\n已存在：${existed} 人${errors ? `\n失败：${errors} 人` : ""}`);
          setSelectedUsers(new Set());
          setGhResults([]);
          setGhSearchOpen(false);
          fetchDevelopers();
        }
      } else {
        // Legacy single import
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernames }),
        });

        if (res.ok) {
          const data = await res.json();
          const imported = data.created ? 1 : 0;
          alert(`✅ 导入完成！\n新导入：${imported} 人`);
          setSelectedUsers(new Set());
          setGhResults([]);
          setGhSearchOpen(false);
          fetchDevelopers();
        } else {
          const err = await res.json();
          alert(`❌ 导入失败: ${err.error}`);
        }
      }
    } catch (e) {
      console.error("Import error:", e);
      alert("❌ 网络错误：导入失败");
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  };

  // AI analyze (single)
  const handleAnalyze = async (developerId: string) => {
    setAnalyzingId(developerId);
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ developerId }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysisResult(data.analysis || data);
        const dev = developers.find((d) => d.id === developerId);
        setSelectedDevForAnalysis(dev || null);
        setAnalysisOpen(true);
        fetchDevelopers();
      } else {
        const err = await res.json();
        alert(`分析失败: ${err.error}`);
      }
    } catch (e) {
      alert("AI 分析失败，请检查 API Key 配置");
    } finally {
      setAnalyzingId(null);
    }
  };

  // Batch AI analyze (SSE streaming — results arrive in real-time)
  const handleBatchAnalyze = async () => {
    const ids = Array.from(selectedDevIds);
    if (ids.length === 0) return;

    setBatchAnalyzing(true);
    setBatchAnalyzeProgress({ done: 0, total: ids.length });
    setBatchAnalyzeResults([]);
    setBatchAnalyzeOpen(true); // 立即打开弹窗，用户可以看到实时进度

    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ developerIds: ids }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "批量分析请求失败");
        return;
      }

      if (!res.body) {
        alert("无法获取响应流");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE messages (one per line, format: data: {...}\n\n)
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            switch (data.type) {
              case "status":
                // 初始状态消息
                break;

              case "progress":
              case "result":
                // 单个结果到达 — 追加到结果列表
                setBatchAnalyzeResults(prev => {
                  // 避免重复添加（progress 和 result 可能都有 success:false）
                  const exists = prev.some(r => r.developerId === data.developerId);
                  if (exists) return prev;
                  return [...prev, {
                    developerId: data.developerId,
                    success: data.success || false,
                    analysis: data.analysis,
                    model: data.model,
                    error: data.error,
                  }];
                });
                // 更新进度
                setBatchAnalyzeProgress(prev =>
                  prev ? { ...prev, done: prev.done + 1 } : null
                );
                // 每收到一个结果就刷新一次开发者列表
                fetchDevelopers();
                break;

              case "done":
                // 全部完成
                console.log(`[批量AI分析] 完成: ${data.succeeded}/${data.total} 成功`);
                break;

              case "error":
                console.error("[批量AI分析] SSE error:", data.error);
                alert(data.error || "批量分析出错");
                break;
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (e) {
      console.error("[handleBatchAnalyze] error:", e);
      alert("批量 AI 分析失败，请检查 API Key 配置或网络连接");
    } finally {
      setBatchAnalyzing(false);
      setBatchAnalyzeProgress(null);
    }
  };

  // === Open Outline Dialog for Single Developer ===
  const handleOpenOutlineDialog = (dev: Developer) => {
    setPendingOutreachDev(dev);
    setCustomOutline("");
    setOutlineDialogOpen(true);
  };

  // === Execute Outreach Generation (with optional custom outline) ===
  const executeGenerateOutreach = async (dev: any, outline?: string) => {
    setGeneratingOutreachId(dev.id);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "outreach",
          data: {
            developerName: dev.display_name || dev.username,
            highlights: [
              dev.bio && `简介: ${dev.bio}`,
              dev.skillTags && `技能: ${dev.skillTags}`,
              dev.techStack && `技术栈: ${dev.techStack}`,
              dev.projects?.length && `热门项目: ${dev.projects.slice(0,3).map((p: any) => `${p.name} (⭐${p.stars})`).join(", ")}`,
              dev.location && `地区: ${dev.location}`,
              dev.company && `公司: ${dev.company}`,
            ].filter(Boolean).join("\n"),
            callToAction: "期待你的回复，我们可以进一步交流合作可能性",
            tone: "professional",
            ...(outline ? { customOutline: outline } : {}),
          },
        }),
      });
      if (res.ok) {
        let data = await res.json();
        const content = data.content || data;
        // If custom outline was used, the response might not be JSON — wrap it
        if (outline && !content.subject) {
          setOutreachResult({ subject: "自定义大纲生成", body: typeof content === "string" ? content : content.raw || JSON.stringify(content, null, 2), personalizationNote: "基于您提供的自定义大纲生成" });
        } else {
          setOutreachResult(content);
        }
        setSelectedDevForOutreach(dev);
        setOutlineDialogOpen(false);
        setOutreachOpen(true);
      } else {
        const err = await res.json();
        alert(`生成邀约文案失败: ${err.error}`);
      }
    } catch (e) {
      alert("AI 生成失败，请检查 API Key 配置");
    } finally {
      setGeneratingOutreachId(null);
    }
  };

  // === Batch Generate Outreach Messages ===
  const handleBatchGenerateOutreach = async () => {
    if (selectedDevIds.size === 0) return;
    const selectedDevs = developers.filter(d => selectedDevIds.has(d.id));
    if (selectedDevs.length === 0) return;

    setBatchGeneratingOutreach(true);
    setBatchOutreachResults([]);
    const outline = batchCustomOutline.trim();

    try {
      // Process sequentially to avoid rate limiting
      const results: Array<{ id: string; name: string; subject: string; body: string }> = [];
      for (const dev of selectedDevs) {
        const d: any = dev;
        try {
          const res = await fetch("/api/ai/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "outreach",
              data: {
                developerName: d.display_name || d.username,
                highlights: [
                  d.bio && `简介: ${d.bio}`,
                  d.skillTags && `技能: ${d.skillTags}`,
                  d.techStack && `技术栈: ${d.techStack}`,
                  d.projects?.length && `项目: ${d.projects.slice(0,2).map((p: any) => `${p.name}`).join(", ")}`,
                  d.location && `地区: ${d.location}`,
                ].filter(Boolean).join("\n"),
                tone: "professional",
                ...(outline ? { customOutline: outline } : {}),
              },
            }),
          });
          if (res.ok) {
            let data = await res.json();
            const content = data.content || data;

            // 智能解析：处理各种返回格式
            let subject = content.subject || "";
            let body = content.body || "";

            // 情况1: 有标准字段 → 直接用（包括空字符串）
            if ("subject" in content && "body" in content) {
              subject = content.subject || (outline ? "自定义大纲生成" : "无主题");
              body = content.body || "";
              // 如果 body 是空的但 raw 存在
              if (!body && content.raw) body = typeof content.raw === "string" ? content.raw : JSON.stringify(content.raw);
              // 如果 body 仍然为空且整体是字符串
              if (!body && typeof content === "string") body = content;
            }
            // 情况2: 纯文本返回（自定义大纲模式常见）
            else if (typeof content === "string" && content.trim()) {
              // 尝试从文本中拆分主题和正文
              const lines = content.split(/\n/).filter(l => l.trim());
              // 找第一行作为主题候选
              if (lines.length > 0) {
                // 第一行可能是主题行（如 "邮件主题：xxx" 或 "**Subject**: xxx"）
                const firstLine = lines[0].trim();
                const subjectMatch = firstLine.match(/(?:邮件主题|主题|Subject|\*{0,2}\s*Subject)\s*[：:]\s*(.+)/i);
                if (subjectMatch) {
                  subject = subjectMatch[1].trim();
                  body = lines.slice(1).join("\n").trim();
                } else {
                  // 无法区分时，第一行当主题，其余当正文
                  subject = outline ? "自定义大纲生成" : firstLine.substring(0, 50) + (firstLine.length > 50 ? "..." : "");
                  body = content;
                }
              } else {
                subject = "自定义大纲";
                body = content;
              }
            }
            // 情况3: 其他格式 → fallback
            else {
              subject = "自定义大纲";
              body = typeof content === "string" ? content : (content.raw ? (typeof content.raw === "string" ? content.raw : JSON.stringify(content.raw)) : JSON.stringify(content));
            }

            results.push({
              id: d.id,
              name: d.display_name || d.username,
              subject: subject,
              body: body,
            });
          } else {
            results.push({
              id: d.id,
              name: d.display_name || d.username,
              subject: "⚠️ 生成失败",
              body: `无法为 @${d.username} 生成邀约文案`,
            });
          }
        } catch {
          results.push({
            id: d.id,
            name: d.display_name || d.username,
            subject: "⚠️ 生成失败",
            body: `@${d.username}: 网络错误或 API 不可用`,
          });
        }
        // Small delay between requests to avoid rate limiting
        await new Promise(r => setTimeout(r, 300));
      }
      setBatchOutreachResults(results);
      setBatchOutreachOpen(true);
    } catch (e) {
      alert("批量生成过程中出现错误");
    } finally {
      setBatchGeneratingOutreach(false);
    }
  };

  // === Batch Send Emails using AI-generated outreach messages ===
  const handleBatchSendEmails = async () => {
    // Filter results that have valid email (from batchOutreachResults, cross-reference with developers)
    const sendable = batchOutreachResults
      .filter(r => r.subject && !r.subject.startsWith("⚠️") && r.body)
      .map(r => {
        const dev = developers.find(d => d.id === r.id);
        return { ...r, dev, email: dev?.email || null };
      })
      .filter(r => r.email);

    if (sendable.length === 0) {
      alert("没有可发送的邀约（所有开发者都没有邮箱或生成失败）");
      return;
    }

    // Confirm before sending
    const confirmMsg = `即将向 ${sendable.length} 位开发者发送邮件：\n\n${sendable.map((r, i) => `${i + 1}. ${r.name} <${r.email}>\n   主题: ${r.subject}`).join("\n\n")}`;
    if (!confirm(confirmMsg)) return;

    setBatchSendingEmail(true);
    setBatchSendProgress({ done: 0, total: sendable.length, succeeded: 0, failed: 0 });
    setBatchSendOpen(true);

    const results: Array<{ name: string; email: string; success: boolean; error?: string }> = [];

    for (const item of sendable) {
      try {
        const res = await fetch("/api/outreach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetType: "DEVELOPER",
            targetId: item.id,
            channel: "EMAIL",
            subject: item.subject,
            body: item.body,
            aiGenerated: true,
          }),
        });

        if (res.ok) {
          results.push({ name: item.name, email: item.email!, success: true });
        } else {
          const err = await res.json();
          results.push({ name: item.name, email: item.email!, success: false, error: err.error || "发送失败" });
        }
      } catch (e) {
        results.push({ name: item.name, email: item.email!, success: false, error: "网络错误" });
      }

      setBatchSendProgress(prev =>
        prev ? { ...prev, done: prev.done + 1, succeeded: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length } : null
      );

      // Small delay between sends
      await new Promise(r => setTimeout(r, 500));
    }

    setBatchSendingEmail(false);
    fetchDevelopers(); // 刷新状态
  };

  // Update status
  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await fetch(`/api/developers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchDevelopers();
    } catch (e) {
      console.error(e);
    }
  };

  // Batch update status for selected developers
  const handleBatchStatusUpdate = async (newStatus: string) => {
    if (selectedDevIds.size === 0) return;
    try {
      const res = await fetch("/api/developers/batch", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedDevIds), status: newStatus }),
      });
      if (res.ok) {
        setSelectedDevIds(new Set());
        setBatchActionOpen(false);
        fetchDevelopers();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Toggle single dev selection
  const toggleDevSelection = (id: string) => {
    setSelectedDevIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Select / deselect all on current page
  const toggleSelectAllPage = () => {
    if (selectedDevIds.size === developers.length && developers.length > 0) {
      setSelectedDevIds(new Set());
    } else {
      setSelectedDevIds(new Set(developers.map((d) => d.id)));
    }
  };

  // Export function
  const handleExport = async (mode: "selected" | "filtered" | "all", format: "csv" | "json" = "csv") => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ format });
      if (mode === "selected") {
        params.set("ids", Array.from(selectedDevIds).join(","));
      } else if (mode === "filtered") {
        if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
        if (priorityFilter && priorityFilter !== "all") params.set("priority", priorityFilter);
        if (scoreFilter && scoreFilter !== "all") params.set("minScore", scoreFilter);
        if (search) params.set("search", search);
      }
      // mode "all": no filters → exports everything

      const exportUrl = `/api/developers/export?${params.toString()}`;
      const response = await fetch(exportUrl, { method: "GET" });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const matchedName = disposition.match(/filename="?([^";]+)"?/i);
      const fallbackName = `developers-${new Date().toISOString().slice(0, 10)}.${format}`;
      const fileName = matchedName?.[1] || fallbackName;

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error("Export error:", e);
      alert("导出失败，请重试");
    } finally {
      setExporting(false);
    }
  };

  // Scrape contacts from GitHub profile pages
  // target: "empty" = 全部无邮箱者 | "empty-selected" = 选中项中无邮箱的 | "selected" = 选中项(全部) | "current-page" = 当前页
  const handleScrapeContacts = async (target: "empty" | "empty-selected" | "selected" | "current-page") => {
    setScrapingContacts(true);
    setScrapeProgress({ done: 0, total: 0 });

    try {
      let usernames: string[] = [];

      if (target === "selected") {
        usernames = developers.filter(d => selectedDevIds.has(d.id)).map(d => d.username);
      } else if (target === "current-page") {
        usernames = developers.map(d => d.username);
      } else if (target === "empty-selected") {
        // 仅处理选中项中无邮箱的开发者 — 走 SSE 模式
        const selectedDevs = developers.filter(d => selectedDevIds.has(d.id));
        const selectedIds = Array.from(selectedDevIds).join(",");
        const res = await fetch(`/api/developers/scrape-contacts?mode=empty&selectedIds=${encodeURIComponent(selectedIds)}`, { method: "POST" });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        
        let sourceDetail = '';
        if (data.sources && Object.keys(data.sources).length > 0) {
          const sourceLabels: Record<string, string> = { html: '🌐 主页公开', commit: '📝 Commit 记录', readme: '📄 README 文件', blog: '🏠 个人博客' };
          sourceDetail = '\n📊 邮箱来源：' + Object.entries(data.sources).map(([k, v]) => `${sourceLabels[k] || k}: ${v}人`).join(' | ');
        }
        
        alert(`✅ 选中项补抓完成！\n📧 更新：${data.updated ?? 0} 人\n⏭️ 无公开信息跳过：${data.skipped ?? 0} 人\n📊 总计检查：${data.total ?? 0} 人（仅处理选中项中无邮箱的）${sourceDetail}`);
        fetchDevelopers();
        return;
      } else {
        // target === "empty": scrape ALL devs without email — use non-SSE mode so backend queries DB
        const res = await fetch("/api/developers/scrape-contacts?mode=empty", { method: "POST" });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${res.status}`);
        }

        const data = await res.json();
        
        // 构建详细的来源统计
        let sourceDetail = '';
        if (data.sources && Object.keys(data.sources).length > 0) {
          const sourceLabels: Record<string, string> = {
            html: '🌐 主页公开',
            commit: '📝 Commit 记录',
            readme: '📄 README 文件',
            blog: '🏠 个人博客',
          };
          const parts = Object.entries(data.sources)
            .map(([k, v]) => `${sourceLabels[k] || k}: ${v}人`);
          sourceDetail = '\n📊 邮箱来源：' + parts.join(' | ');
        }
        
        alert(`✅ 联系方式抓取完成！\n📧 更新：${data.updated ?? 0} 人\n⏭️ 无公开信息跳过：${data.skipped ?? 0} 人\n📊 总计处理：${data.total ?? 0} 人${sourceDetail}`);
        fetchDevelopers();
        return; // empty path ends here
      }

      if (usernames.length === 0) {
        alert("没有需要抓取的开发者");
        return;
      }

      // Use SSE streaming for batch scrape
      setScrapeProgress({ done: 0, total: usernames.length });
      const res = await fetch("/api/developers/scrape-contacts?sse=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalData: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done !== undefined && data.total !== undefined) {
                setScrapeProgress({ done: data.done, total: data.total });
              }
              if (data.summary) finalData = data;
            } catch {}
          }
        }
      }

      if (finalData?.summary) {
        const { updated, skipped, total, sources } = finalData.summary;
        let sourceDetail = '';
        if (sources && Object.keys(sources).length > 0) {
          const sourceLabels: Record<string, string> = { html: '🌐 主页', commit: '📝 Commit', readme: '📄 README', blog: '🏠 博客' };
          sourceDetail = '\n📊 来源：' + Object.entries(sources).map(([k, v]) => `${sourceLabels[k] || k}: ${v}人`).join(' | ');
        }
        alert(`✅ 联系方式抓取完成！\n📧 更新：${updated ?? 0} 人\n⏭️ 无公开信息跳过：${skipped ?? 0} 人\n📊 总计处理：${total ?? 0} 人${sourceDetail}\n\n💡 提示：四级抓取策略（主页→Commit→README→博客）`);
        fetchDevelopers();
      }
    } catch (e) {
      console.error("Scrape error:", e);
      alert("❌ 联系方式抓取失败：" + (e as Error).message);
    } finally {
      setScrapingContacts(false);
      setScrapeProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with brand gradient */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gray-700 via-gray-800 to-black flex items-center justify-center shadow-lg shadow-gray-900/25 border border-white/5">
              <GithubIcon className="w-5 h-5 text-white" />
            </div>
            <span>
              开发者<span className="gradient-text">招募</span>
            </span>
          </h1>
          <p className="text-muted-foreground mt-1 ml-[44px]">
            从 GitHub 发现、分析和招募优秀候选人 · 共{" "}
            <span className="font-semibold tabular-nums text-foreground">{total}</span> 位
          </p>
        </div>

        <Dialog open={ghSearchOpen} onOpenChange={(open) => { setGhSearchOpen(open); if (!open) { setSelectedUsers(new Set()); setGhResults([]); } }}>
          <DialogTrigger className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-transparent bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white shadow-lg shadow-gray-900/20 px-4 cursor-pointer outline-none">
              <GithubIcon className="w-4 h-4 mr-2" />
              从 GitHub 搜索
              <Badge variant="secondary" className="ml-2 text-[10px] bg-white/10 text-white/70 border-0">API</Badge>
          </DialogTrigger>
          {/* Search Dialog Content — Premium Dual-Mode Design */}
          <DialogContent className="max-w-7xl w-[97vw] max-h-[93vh] overflow-hidden flex flex-col">
            <DialogHeader className="shrink-0 pb-2">
              <DialogTitle className="flex items-center gap-2.5 text-lg">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                  <GithubIcon className="w-3.5 h-3.5 text-white" />
                </div>
                GitHub 开发者搜索
                <Badge variant="outline" className="ml-auto text-xs font-mono">Token ✅</Badge>
              </DialogTitle>
              <DialogDescription className="text-xs">使用关键词或 GitHub 语法搜索开发者候选者</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1 min-h-0">
              <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 w-fit flex-wrap shrink-0">
                <button
                  onClick={() => {
                    setSearchMode("keyword");
                    setSortOption("");
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    searchMode === "keyword"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Search className="w-3.5 h-3.5" /> 关键词搜索
                  <Badge className="text-[9px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-0">推荐</Badge>
                </button>
                <button
                  onClick={() => {
                    setSearchMode("repo");
                    setSortOption((prev) => prev || "stars-desc");
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    searchMode === "repo"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" /> 项目搜索
                  <Badge className="text-[9px] px-1.5 py-0 h-4 bg-emerald-10 text-emerald-600 border-0 bg-emerald-50 text-emerald-700">新</Badge>
                </button>
                <button
                  onClick={() => setSearchMode("advanced")}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                    searchMode === "advanced"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" /> 高级语法
                </button>
              </div>

              {/* ====== KEYWORD SEARCH MODE ====== */}
              {searchMode === "keyword" && (
                <>
                  {/* Keywords input — main search bar */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> 搜索关键词
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder='例如: machine learning, react frontend, kubernetes cloud...'
                          value={keywords}
                          onChange={(e) => setKeywords(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleGitHubSearch()}
                          className="pl-10 text-sm h-10 rounded-xl border-2 focus:border-primary/50 transition-colors"
                        />
                      </div>
                      <Button
                        onClick={handleGitHubSearch}
                        disabled={ghSearching || !keywords.trim()}
                        className="h-10 px-6 rounded-xl bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white shadow-lg shadow-gray-900/20 font-medium"
                      >
                        {ghSearching ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                        搜索开发者
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground/70 flex items-center gap-2">
                      输入技术关键词（如 AI, React, Rust, facebook crawl），空格分隔多个
                      <span className="inline-flex items-center gap-1 ml-auto">
                        <span className="text-[11px] font-medium text-muted-foreground mr-1">匹配模式:</span>
                        {(["smart", "exact", "broad"] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => setMatchMode(mode)}
                            className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-all ${
                              matchMode === mode
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-muted/50 text-muted-foreground border-transparent hover:border-muted-foreground/30"
                            }`}
                          >
                            {mode === "smart" ? "🧠 智能" : mode === "exact" ? "🎯 精确" : "🌐 宽松"}
                          </button>
                        ))}
                        <span
                          className="text-[10px] text-muted-foreground/60 cursor-help underline decoration-dotted"
                          title={
                            matchMode === "smart"
                              ? "智能模式：短词组自动引号，长词组拆分搜索（推荐）"
                              : matchMode === "exact"
                              ? "精确模式：所有词组加引号，要求完整匹配"
                              : "宽松模式：不加引号+通配符，结果最多但精度低"
                                  }
                        >
                          ?
                        </span>
                      </span>
                    </p>

                    {/* Search preview — show the actual GitHub query that will be sent */}
                    {keywords.trim() && (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800">
                        <Code2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-[10px] text-muted-foreground shrink-0">GitHub Query:</span>
                        <code className="text-xs font-mono font-medium text-foreground bg-background px-2 py-0.5 rounded break-all">
                          {(() => {
                            // Simulate what parseKeywordsToGitHubQuery will do based on matchMode
                            const tokens = keywords.trim().split(/\s+/).filter(Boolean);
                            const parts = tokens.map(t => {
                              if (matchMode === "broad") return `${t}*`;
                              if (matchMode === "exact" && t.includes(" ")) return `"${t}"`;
                              // smart mode: only quote if it looks like a short phrase
                              // (simplified: just show unquoted for preview clarity)
                              return t;
                            });
                            let q = parts.join(" ");
                            if (selLanguage) q += ` language:${selLanguage}`;
                            if (selLocation) q += ` location:${selLocation}`;
                            if (minFollowers) q += ` followers:>${minFollowers}`;
                            if (minRepos) q += ` repos:>${minRepos}`;
                            return q || "(空)";
                          })()}
                        </code>
                      </div>
                    )}
                  </div>

                  {/* Search tips — help users understand why results may be empty */}
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-2 space-y-1">
                    <p className="text-[10px] font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      💡 GitHub 搜索提示
                    </p>
                    <ul className="text-[9px] text-amber-700/80 dark:text-amber-400/70 space-y-0 ml-3 list-disc">
                      <li>GitHub 只搜索 <strong>用户名、姓名、简介、公开邮箱</strong>，不搜索仓库内容或代码</li>
                      <li>如果搜不到结果，试试：减少关键词、切换宽松模式、或使用高级语法</li>
                    </ul>
                  </div>

                  {/* Filter row: Language | Location | Followers | Repos | Sort */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {/* Language */}
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">语言</label>
                      <Select value={selLanguage} onValueChange={(v) => setSelLanguage(v || "")}>
                        <SelectTrigger className="h-8 text-xs rounded-lg">
                          <SelectValue placeholder="全部" />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Location */}
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">地区</label>
                      <Select value={selLocation} onValueChange={(v) => setSelLocation(v || "")}>
                        <SelectTrigger className="h-8 text-xs rounded-lg">
                          <SelectValue placeholder="不限" />
                        </SelectTrigger>
                        <SelectContent>
                          {LOCATION_PRESETS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Min followers */}
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">最低粉丝</label>
                      <Input
                        type="number"
                        placeholder="如: 50"
                        value={minFollowers}
                        onChange={(e) => setMinFollowers(e.target.value)}
                        min="0"
                        className="h-8 text-xs rounded-lg font-mono"
                      />
                    </div>

                    {/* Min repos */}
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">最低仓库</label>
                      <Input
                        type="number"
                        placeholder="如: 10"
                        value={minRepos}
                        onChange={(e) => setMinRepos(e.target.value)}
                        min="0"
                        className="h-8 text-xs rounded-lg font-mono"
                      />
                    </div>

                    {/* Sort */}
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">排序</label>
                      <Select value={sortOption} onValueChange={(v) => setSortOption(v || "")}>
                        <SelectTrigger className="h-8 text-xs rounded-lg">
                          <SelectValue placeholder="最佳匹配" />
                        </SelectTrigger>
                        <SelectContent>
                          {SORT_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Active filters summary */}
                  {(selLanguage || selLocation || minFollowers || minRepos || sortOption) && (
                    <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-lg bg-muted/30 border border-dashed">
                      <span className="text-[11px] font-medium text-muted-foreground mr-1">已选筛选：</span>
                      {selLanguage && (
                        <Badge variant="secondary" className="text-[10px] gap-1 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                          语言: {LANGUAGE_OPTIONS.find(l => l.value === selLanguage)?.label.split(" ")[1] || selLanguage}
                          <XCircle className="w-2.5 h-2.5 cursor-pointer hover:text-red-500" onClick={() => setSelLanguage("")} />
                        </Badge>
                      )}
                      {selLocation && (
                        <Badge variant="secondary" className="text-[10px] gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                          地区: {LOCATION_PRESETS.find(l => l.value === selLocation)?.label || selLocation}
                          <XCircle className="w-2.5 h-2.5 cursor-pointer hover:text-red-500" onClick={() => setSelLocation("")} />
                        </Badge>
                      )}
                      {minFollowers && (
                        <Badge variant="secondary" className="text-[10px] gap-1 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                          粉丝 ≥{minFollowers}
                          <XCircle className="w-2.5 h-2.5 cursor-pointer hover:text-red-500" onClick={() => setMinFollowers("")} />
                        </Badge>
                      )}
                      {minRepos && (
                        <Badge variant="secondary" className="text-[10px] gap-1 bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                          仓库 ≥{minRepos}
                          <XCircle className="w-2.5 h-2.5 cursor-pointer hover:text-red-500" onClick={() => setMinRepos("")} />
                        </Badge>
                      )}
                      {sortOption && (
                        <Badge variant="secondary" className="text-[10px] gap-1 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {SORT_OPTIONS.find(s => s.value === sortOption)?.label || sortOption}
                          <XCircle className="w-2.5 h-2.5 cursor-pointer hover:text-red-500" onClick={() => setSortOption("")} />
                        </Badge>
                      )}
                      <button
                        onClick={() => { setSelLanguage(""); setSelLocation(""); setMinFollowers(""); setMinRepos(""); setSortOption(""); }}
                        className="text-[10px] text-red-500 hover:text-red-600 font-medium ml-auto"
                      >
                        清除全部
                      </button>
                    </div>
                  )}

                  {/* Keyword presets by domain */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3 h-3" /> 热门领域预设 · 一键填充关键词+筛选条件
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                      {KEYWORD_PRESETS.map((preset) => {
                        const isActive =
                          keywords.includes(preset.keywords.split(" ")[0]) &&
                          (preset.language ? selLanguage === preset.language : !selLanguage);
                        return (
                          <button
                            key={preset.label}
                            onClick={() => applyKeywordPreset(preset)}
                            className={`text-left p-2 rounded-lg border transition-all duration-200 group ${
                              isActive
                                ? "border-primary/40 bg-primary/5 shadow-sm ring-1 ring-primary/15"
                                : "hover:bg-muted/60 hover:border-primary/20 hover:shadow-sm"
                            }`}
                          >
                            <span className="font-medium text-xs block">{preset.label}</span>
                            <code className="text-[10px] text-muted-foreground block mt-0.5 truncate font-mono">
                              {preset.keywords}
                            </code>
                            {preset.desc && (
                              <span className="text-[9px] text-muted-foreground/60 block mt-0.5">{preset.desc}</span>
                            )}
                            {preset.language && (
                              <span className="inline-block mt-1 text-[9px] px-1.5 py-0 rounded bg-muted text-muted-foreground font-sans">
                                {LANGUAGE_OPTIONS.find(l => l.value === preset.language)?.label?.split(" ")[1]}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* ====== REPO SEARCH MODE (search by project title/description/topic) ====== */}
              {searchMode === "repo" && (
                <>
                  {/* Repo search — main input */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> 项目关键词
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          placeholder='例如: facebook crawler, AI chatbot, kubernetes operator...'
                          value={repoQuery}
                          onChange={(e) => setRepoQuery(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleGitHubSearch()}
                          className="pl-10 text-sm h-10 rounded-xl border-2 focus:border-emerald-500/50 transition-colors"
                        />
                      </div>
                      <Button
                        onClick={handleGitHubSearch}
                        disabled={ghSearching || !repoQuery.trim()}
                        className="h-10 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg shadow-emerald-500/20 font-medium"
                      >
                        {ghSearching ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        搜索项目
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground/70 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-medium">
                        📦 搜索项目标题、描述、README → 自动提取项目作者作为开发者
                      </span>
                      比搜用户 bio 范围更广！
                    </p>

                    {/* Repo search query preview */}
                    {repoQuery.trim() && (
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-dashed border-emerald-200 dark:border-emerald-800">
                        <Code2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="text-[10px] text-muted-foreground shrink-0">Repo Query:</span>
                        <code className="text-xs font-mono font-medium text-foreground bg-background px-2 py-0.5 rounded break-all">
                          {[repoQuery.trim(), repoLanguage && `language:${repoLanguage}`, minStars && `stars:>=${minStars}`].filter(Boolean).join(" ") || "(空)"}
                        </code>
                      </div>
                    )}
                  </div>

                  {/* Repo filter row: Language | Min Stars | Sort | Search scope */}
                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-0.5">
                      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">项目语言</label>
                      <Select value={repoLanguage} onValueChange={(v) => setRepoLanguage(v || "") }>
                        <SelectTrigger className="h-9 text-xs rounded-lg">
                          <SelectValue placeholder="全部语言" />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">最低 Stars</label>
                      <Input
                        type="number"
                        placeholder="如: 50"
                        value={minStars}
                        onChange={(e) => setMinStars(e.target.value)}
                        min="0"
                        className="h-8 text-xs rounded-lg font-mono"
                      />
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">排序</label>
                      <Select value={sortOption} onValueChange={(v) => setSortOption(v || "") }>
                        <SelectTrigger className="h-9 text-xs rounded-lg">
                          <SelectValue placeholder="最佳匹配" />
                        </SelectTrigger>
                        <SelectContent>
                          {SORT_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value || "default"} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">搜索范围</label>
                      <div className="h-8 flex items-center text-[10px] text-muted-foreground bg-muted/50 rounded-lg px-3 border border-dashed">
                        📝 标题 + 📄 描述 + 📖 README + 🏷️ Topics
                      </div>
                    </div>
                  </div>

                  {/* Active repo filters summary */}
                  {(repoLanguage || minStars || sortOption) && (
                    <div className="flex flex-wrap items-center gap-1.5 p-2.5 rounded-lg bg-muted/30 border border-dashed">
                      <span className="text-[11px] font-medium text-muted-foreground mr-1">已选筛选：</span>
                      {repoLanguage && (
                        <Badge variant="secondary" className="text-[10px] gap-1 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                          语言: {LANGUAGE_OPTIONS.find(l => l.value === repoLanguage)?.label.split(" ")[1] || repoLanguage}
                          <XCircle className="w-2.5 h-2.5 cursor-pointer hover:text-red-500" onClick={() => setRepoLanguage("")} />
                        </Badge>
                      )}
                      {minStars && (
                        <Badge variant="secondary" className="text-[10px] gap-1 bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
                          ⭐ ≥{minStars}
                          <XCircle className="w-2.5 h-2.5 cursor-pointer hover:text-red-500" onClick={() => setMinStars("")} />
                        </Badge>
                      )}
                      {sortOption && (
                        <Badge variant="secondary" className="text-[10px] gap-1 bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                          {SORT_OPTIONS.find(s => s.value === sortOption)?.label || sortOption}
                          <XCircle className="w-2.5 h-2.5 cursor-pointer hover:text-red-500" onClick={() => setSortOption("")} />
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Repo search presets by domain */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Zap className="w-3 h-3" /> 热门领域 · 一键填充项目关键词
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
                      {REPO_SEARCH_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => applyRepoPreset(preset)}
                          className={`text-left p-2 rounded-lg border transition-all duration-200 group ${
                            repoQuery === preset.query && repoLanguage === preset.language
                              ? "border-emerald-400 bg-emerald-50 shadow-sm ring-1 ring-emerald-200 dark:bg-emerald-950 dark:ring-emerald-800"
                              : "hover:bg-muted/60 hover:border-emerald-300 hover:shadow-sm"
                          }`}
                        >
                          <span className="font-medium text-xs block">{preset.label}</span>
                          <code className="text-[10px] text-muted-foreground block mt-0.5 truncate font-mono">
                            {preset.query}
                          </code>
                          {preset.desc && (
                            <span className="text-[9px] text-muted-foreground/60 block mt-0.5">{preset.desc}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* ====== ADVANCED SYNTAX MODE ====== */}
              {searchMode === "advanced" && (
                <>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder='language:rust followers:>200'
                        value={ghQuery}
                        onChange={(e) => setGhQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleGitHubSearch()}
                        className="pl-10 font-mono text-sm h-10 rounded-xl border-2 focus:border-primary/50 transition-colors"
                      />
                    </div>
                    <Button
                      onClick={handleGitHubSearch}
                      disabled={ghSearching || !ghQuery.trim()}
                      className="h-10 px-6 rounded-xl bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white shadow-lg shadow-gray-900/20 font-medium"
                    >
                      {ghSearching ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                      搜索
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground/70">
                    使用 GitHub 高级搜索语法。示例：<code className="bg-muted px-1 rounded text-[10px]">language:rust followers:&gt;100 location:China</code>
                  </p>

                  {/* Advanced presets */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Code2 className="w-3 h-3" /> 语法预设
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {ADVANCED_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          onClick={() => applyAdvancedPreset(preset)}
                            className={`text-left p-2 rounded-lg border transition-all duration-200 ${
                            ghQuery === preset.query
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "hover:bg-muted/60 hover:border-primary/20"
                          }`}
                        >
                          <span className="font-medium block text-xs">{preset.label}</span>
                          <code className="text-[11px] text-muted-foreground block mt-0.5 truncate font-mono">{preset.query}</code>
                          {preset.desc && <span className="text-[10px] text-muted-foreground block">{preset.desc}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Results header */}
              {ghResults.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">
                        找到 <span className={`font-bold tabular-nums ${searchMode === "repo" ? "text-emerald-600 dark:text-emerald-400" : "text-primary"}`}>{ghTotal}</span>
                        {searchMode === "repo" ? " 位项目作者 (从仓库搜索提取)" : " 位开发者"}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        已加载 {ghResults.length} / {Math.min(ghTotal, 1000)} 条
                        {ghTotal > 1000 && <span className="ml-1 text-orange-500">(API上限1000)</span>}
                      </Badge>
                      {/* Repo search: show repo sample hint */}
                      {searchMode === "repo" && ghResults.length > 0 && (ghResults[0] as any)._bestRepo && (
                        <span className="text-[10px] text-emerald-600/70 flex items-center gap-1 hidden sm:flex">
                          <Sparkles className="w-3 h-3" />
                          每位作者显示其最热门项目
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedUsers.size > 0 ? (
                        <>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={clearSelection}>
                            取消选择 ({selectedUsers.size})
                          </Button>
                          <Button
                            size="sm"
                            disabled={importing}
                            onClick={() => handleImport(Array.from(selectedUsers))}
                            className="h-7 text-xs bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white"
                          >
                            {importing ? <RefreshCw className="w-3 h-3 animate-spin mr-1" /> : <Download className="w-3 h-3 mr-1" />}
                            导入选中 ({selectedUsers.size})
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={selectAllVisible}
                        >
                          全选此页
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Results list */}
                  <div className="border rounded-xl divide-y overflow-hidden flex-1 min-h-[200px] max-h-[45vh] overflow-y-auto">
                    {ghResults.map((u) => {
                      const isSelected = selectedUsers.has(u.login);
                      return (
                        <div
                          key={u.login}
                          className={`flex items-center gap-3 p-3 transition-colors cursor-pointer group/item ${
                            isSelected ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/50"
                          }`}
                          onClick={() => toggleSelection(u.login)}
                        >
                          {/* Checkbox */}
                          <div
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                              isSelected
                                ? "bg-primary border-primary text-white"
                                : "border-muted-foreground/30 group-hover/item:border-primary/50"
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="w-3 h-3" />}
                          </div>

                          {/* Avatar */}
                          <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full shrink-0 ring-2 ring-background" />

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm truncate">{u.name || u.login}</p>
                              <span className="text-xs text-muted-foreground truncate">@{u.login}</span>
                              {isSelected && (
                                <Badge className="text-[9px] px-1 py-0 h-4 bg-primary/10 text-primary border-primary/20">
                                  已选
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                              {u.location && (
                                <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{u.location}</span>
                              )}
                              {u.company && (
                                <span className="flex items-center gap-0.5"><Building2 className="w-2.5 h-2.5" />{u.company}</span>
                              )}
                              <span><Star className="w-2.5 h-2.5 inline mr-0.5 fill-yellow-400 text-yellow-400"/>{u.followers}</span>
                              <span><Code2 className="w-2.5 h-2.5 inline mr-0.5"/>{u.public_repos} repos</span>
                              {/* Repo mode: show best project info */}
                              {searchMode === "repo" && (u as any)._bestRepo && (
                                <>
                                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 max-w-[180px] truncate" title={(u as any)._bestRepo?.full_name}>
                                    📦 {(u as any)._bestRepo?.name}
                                  </span>
                                  <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-0.5">
                                    ⭐{(u as any)._bestRepo?.stars || 0}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Quick import */}
                          <Button
                            size="sm"
                            variant="outline"
                            className="shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity h-8 rounded-lg text-xs"
                            onClick={(e) => { e.stopPropagation(); handleImport([u.login]); }}
                            disabled={importing}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            导入
                          </Button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Batch import */}
                  <Button
                    className="w-full h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-md shadow-emerald-500/20 font-medium"
                    disabled={importing || ghResults.length === 0}
                    onClick={() => handleImport(ghResults.map((u) => u.login))}
                  >
                    {importing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                        正在导入...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        批量导入全部 ({ghResults.length} 位开发者)
                      </>
                    )}
                  </Button>

                  {/* Load more button */}
                  {ghHasMore && ghResults.length > 0 && (
                    <div className="pt-3">
                      <Button
                        variant="outline"
                        className="w-full h-9 rounded-xl text-sm border-dashed hover:bg-muted/50"
                        onClick={handleLoadMore}
                        disabled={ghLoadingMore}
                      >
                        {ghLoadingMore ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" />
                            加载中...
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3.5 h-3.5 mr-2" />
                            加载更多（还有约 {Math.min(ghTotal - ghResults.length, 100)} 条）
                          </>
                        )}
                      </Button>
                      <p className="text-[10px] text-center text-muted-foreground/50 mt-1.5">
                        GitHub API 每次最多返回 100 条 · 已加载第 {ghPage} 页
                      </p>
                    </div>
                  )}

                  {/* No more results indicator */}
                  {!ghHasMore && ghResults.length > 0 && ghResults.length >= ghTotal && (
                    <div className="flex items-center justify-center pt-2 text-xs text-muted-foreground/50 gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      已加载全部 {ghResults.length} 条结果
                    </div>
                  )}
                </div>
              )}

              {/* Searching indicator */}
              {ghSearching && (
                <div className="flex items-center justify-center py-12 space-x-3">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-muted-foreground">正在从 GitHub 搜索...</span>
                </div>
              )}

              {/* Empty state (after search opened but no results yet) */}
              {!ghSearching && ghResults.length === 0 && !ghTotal && (
                <div className="text-center py-10 border border-dashed rounded-xl">
                  <Globe className="mx-auto w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">输入关键词或选择预设开始搜索</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">使用 GitHub 搜索语法，支持语言、地区、粉丝数等筛选条件</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card className="overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索用户名、邮箱、简介、技能..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-lg"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v || "all"); setPage(1); }}>
              <SelectTrigger className="w-[130px] rounded-lg">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="NEW">新导入</SelectItem>
                <SelectItem value="ANALYZING">分析中</SelectItem>
                <SelectItem value="ANALYZED">已分析</SelectItem>
                <SelectItem value="APPROVED">已批准</SelectItem>
                <SelectItem value="CONTACTED">已触达</SelectItem>
                <SelectItem value="INTERESTED">有兴趣</SelectItem>
                <SelectItem value="CONVERTED">已转化</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v || "all"); setPage(1); }}>
              <SelectTrigger className="w-[120px] rounded-lg">
                <SelectValue placeholder="优先级" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部优先级</SelectItem>
                <SelectItem value="URGENT">🔴 紧急</SelectItem>
                <SelectItem value="HIGH">🟠 高</SelectItem>
                <SelectItem value="MEDIUM">🔵 中</SelectItem>
                <SelectItem value="LOW">⚪ 低</SelectItem>
              </SelectContent>
            </Select>

            <Select value={scoreFilter} onValueChange={(v) => { setScoreFilter(v || "all"); setPage(1); }}>
              <SelectTrigger className="w-[120px] rounded-lg">
                <Star className="w-4 h-4 mr-2 text-amber-500" />
                <SelectValue placeholder="评分" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部评分</SelectItem>
                <SelectItem value="high">🟢 ≥80 高分</SelectItem>
                <SelectItem value="medium">🟡 ≥60 中等</SelectItem>
                <SelectItem value="low">⚪ &lt;60 待提升</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={fetchDevelopers} disabled={loading} className="rounded-lg">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Developer Table */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                候选人列表
                <Badge variant="secondary" className="text-[10px] font-normal ml-1">{total} 条</Badge>
              </CardTitle>
              <CardDescription>
                第 {page}/{totalPages} 页 · 每页显示 20 条
              </CardDescription>
            </div>

            {/* Batch Actions Bar — shows when items selected */}
            <div className="flex items-center gap-2">
              {selectedDevIds.size > 0 && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
                  <Badge variant="default" className="bg-primary text-primary-foreground px-3 py-1 rounded-lg text-sm font-medium gap-1.5 shadow-sm">
                    已选 {selectedDevIds.size} 项
                    <button
                      onClick={() => setSelectedDevIds(new Set())}
                      className="ml-0.5 hover:bg-primary-foreground/20 rounded-full p-0.5 transition-colors"
                      aria-label="清除选择"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </Badge>

                  {/* Batch Status Change Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-lg h-8 gap-1.5 px-2.5 border border-dashed border-border hover:bg-muted hover:text-foreground cursor-pointer outline-none text-xs">
                        批量改状态
                        <ChevronDown className="w-3 h-3" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <p className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">修改选中 {selectedDevIds.size} 人状态</p>
                      {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                        <DropdownMenuItem key={key} onClick={() => handleBatchStatusUpdate(key)} className="gap-2 text-xs py-1.5">
                          <span className={`inline-flex w-4 h-4 rounded items-center justify-center ${val.color.split(" ").find((c: string) => c.startsWith("bg-")) || "bg-gray-100"}`}>
                            {val.icon}
                          </span>
                          {val.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Export Selected */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400"
                    disabled={exporting}
                    onClick={() => handleExport("selected", "csv")}
                  >
                    <Download className="w-3.5 h-3.5" />
                    导出选中
                  </Button>

                  {/* Batch Generate Outreach */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg text-xs gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400"
                    disabled={batchGeneratingOutreach || selectedDevIds.size === 0}
                    onClick={() => {
                      setPendingOutreachDev(null); // null = batch mode
                      setCustomOutline(batchCustomOutline);
                      setOutlineDialogOpen(true);
                    }}
                  >
                    {batchGeneratingOutreach ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {batchGeneratingOutreach ? `生成中 ${batchOutreachResults.length}/${selectedDevIds.size}` : "批量生成文案"}
                  </Button>

                  {/* Batch AI Analyze */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-lg text-xs gap-1.5 border-violet-200 text-violet-700 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-400"
                    disabled={batchAnalyzing || selectedDevIds.size === 0}
                    onClick={handleBatchAnalyze}
                  >
                    {batchAnalyzing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Brain className="w-3.5 h-3.5" />
                    )}
                    {batchAnalyzing
                      ? `分析中 ${batchAnalyzeProgress?.done ?? 0}/${batchAnalyzeProgress?.total ?? 0}`
                      : `批量 AI 分析`}
                  </Button>
                </div>
              )}

              {/* Export All / Filtered (always visible) */}
              <DropdownMenu>
                <DropdownMenuTrigger className={`inline-flex items-center justify-center rounded-lg h-8 gap-1.5 px-2.5 cursor-pointer outline-none text-xs ${selectedDevIds.size === 0 ? "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-sm border border-transparent" : "border-border bg-background hover:bg-muted hover:text-foreground"}`} disabled={exporting}>
                    <Download className="w-3.5 h-3.5" />
                    导出
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <p className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">导出数据</p>
                  <DropdownMenuItem onClick={() => handleExport("all", "csv")} className="gap-2 text-xs py-2">
                    <Download className="w-4 h-4 text-blue-500" />
                    导出全部 (CSV)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("filtered", "csv")} className="gap-2 text-xs py-2">
                    <Filter className="w-4 h-4 text-violet-500" />
                    导出筛选结果 (CSV)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("all", "json")} className="gap-2 text-xs py-2">
                    <Download className="w-4 h-4 text-orange-500" />
                    导出全部 (JSON)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("filtered", "json")} className="gap-2 text-xs py-2">
                    <Filter className="w-4 h-4 text-pink-500" />
                    导出筛选结果 (JSON)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Scrape Contacts Button */}
              <DropdownMenu>
                <DropdownMenuTrigger className={`inline-flex items-center justify-center rounded-lg h-8 gap-1.5 px-2.5 cursor-pointer outline-none text-xs border border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 ${scrapingContacts ? "animate-pulse bg-blue-50 dark:bg-blue-950" : ""}`} disabled={scrapingContacts}>
                    {scrapingContacts && scrapeProgress ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        {scrapeProgress.done}/{scrapeProgress.total}
                      </>
                    ) : (
                      <>
                        <Link className="w-3.5 h-3.5" />
                        抓取联系
                      </>
                    )}
                  </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <p className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">从 GitHub 主页抓取</p>
                  <DropdownMenuItem onClick={() => handleScrapeContacts("empty")} disabled={scrapingContacts} className="gap-2 text-xs py-2">
                    <Globe className="w-4 h-4 text-blue-500" />
                    补抓无邮箱者
                    <Badge variant="secondary" className="ml-auto text-[9px]">全部</Badge>
                  </DropdownMenuItem>
                  {selectedDevIds.size > 0 && (
                    <>
                      <DropdownMenuItem onClick={() => handleScrapeContacts("empty-selected")} disabled={scrapingContacts} className="gap-2 text-xs py-2">
                        <Globe className="w-4 h-4 text-emerald-500" />
                        补抓选中中无邮箱的
                        <Badge variant="secondary" className="ml-auto text-[9px]">{selectedDevIds.size}</Badge>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleScrapeContacts("selected")} disabled={scrapingContacts} className="gap-2 text-xs py-2">
                        <Link className="w-4 h-4 text-violet-500" />
                        抓取选中项
                        <Badge variant="secondary" className="ml-auto text-[9px]">{selectedDevIds.size}</Badge>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={() => handleScrapeContacts("current-page")} disabled={scrapingContacts} className="gap-2 text-xs py-2">
                    <RefreshCw className="w-4 h-4 text-orange-500" />
                    当前页 ({developers.length})
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-4 p-4 rounded-xl border">
                  <div className="w-10 h-10 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : developers.length === 0 ? (
            /* Empty State */
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl mx-auto bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center mb-4">
                <User className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <h3 className="font-medium text-lg mb-1">暂无开发者数据</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                点击右上角「从 GitHub 搜索」按钮，搜索并导入优秀的开发者候选者
              </p>
              <Button variant="outline" className="rounded-xl" onClick={() => setGhSearchOpen(true)}>
                <GithubIcon className="w-4 h-4 mr-2" />
                开始从 GitHub 搜索
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[48px]">
                      <Checkbox
                        checked={developers.length > 0 && selectedDevIds.size === developers.length}
                        onCheckedChange={toggleSelectAllPage}
                        aria-label="全选此页"
                      />
                    </TableHead>
                    <TableHead className="w-[260px]">开发者</TableHead>
                    <TableHead>技能 / 技术栈</TableHead>
                    <TableHead className="text-center">适配分</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>优先级</TableHead>
                    <TableHead className="min-w-[180px]">联系方式</TableHead>
                    <TableHead>项目</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {developers.map((dev) => {
                    const sc = STATUS_CONFIG[dev.status] || STATUS_CONFIG.NEW;
                    const pc = PRIORITY_CONFIG[dev.priority] || PRIORITY_CONFIG.MEDIUM;
                    return (
                      <TableRow key={dev.id} className={`group hover:bg-muted/30 transition-colors ${selectedDevIds.has(dev.id) ? "bg-primary/5" : ""}`}>
                        <TableCell className="w-[48px]">
                          <Checkbox
                            checked={selectedDevIds.has(dev.id)}
                            onCheckedChange={() => toggleDevSelection(dev.id)}
                            aria-label={`选择 ${dev.display_name || dev.username}`}
                          />
                        </TableCell>
                        <TableCell>
                          <a
                            href={`https://github.com/${dev.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 hover:text-primary transition-colors no-underline"
                          >
                            <img
                              src={dev.avatarUrl || `https://github.com/${dev.username}.png`}
                              alt=""
                              className="w-10 h-10 rounded-full bg-muted ring-2 ring-background shrink-0"
                              onError={(e) => {(e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(dev.display_name || dev.username)}&background=6366f1&color=fff&size=80`}}
                            />
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{dev.display_name || dev.username}</p>
                              <p className="text-xs text-muted-foreground truncate">@{dev.username}</p>
                            </div>
                          </a>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {(() => {
                              // 优先用 skillTags / techStack（AI 分析写入）
                              // fallback 到 languageStats（GitHub 原始语言统计）
                              const rawTags = dev.skillTags || dev.techStack || "";
                              let tags: string[] = [];
                              if (rawTags && typeof rawTags === "string") {
                                tags = rawTags.split(",").filter(Boolean).map(s => s.trim()).filter(Boolean);
                              }
                              // Fallback: 从 languageStats JSON 提取语言名
                              if (tags.length === 0 && (dev as any).languageStats) {
                                try {
                                  const rawLs = (dev as any).languageStats;
                                  const ls = typeof rawLs === "string" ? JSON.parse(rawLs) : rawLs;
                                  if (ls && typeof ls === "object" && !Array.isArray(ls)) {
                                    tags = Object.entries(ls)
                                      .sort((a: [string, unknown], b: [string, unknown]) => Number(b[1]) - Number(a[1]))
                                      .slice(0, 4)
                                      .map(([lang, count]) => `${lang} (${count})`);
                                  }
                                } catch { /* ignore */ }
                              }
                              return tags.length > 0
                                ? tags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0 rounded-md">{tag}</Badge>
                                  ))
                                : (
                                    <span className="text-xs text-muted-foreground italic">待 AI 分析</span>
                                  );
                            })()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            {/* 可点击的评分徽章 → 打开评分明细弹窗 */}
                            <button
                              onClick={() => { setSelectedDevForScore(dev); setScoreDetailOpen(true); }}
                              className={`group inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold tabular-nums shadow-sm transition-all duration-200 hover:scale-110 hover:shadow-md cursor-pointer ${
                                dev.overallScore >= 80 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 shadow-emerald-500/10 hover:bg-emerald-200 dark:hover:bg-emerald-900" :
                                dev.overallScore >= 60 ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400 shadow-amber-500/10 hover:bg-amber-200 dark:hover:bg-amber-900" :
                                dev.overallScore > 0 ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700" :
                                "bg-muted text-muted-foreground hover:bg-muted/80"
                              }`}
                              title={dev.overallScore > 0 ? "查看评分明细" : "暂无评分"}
                            >
                              {dev.overallScore > 0 ? Math.round(dev.overallScore) : "-"}
                            </button>
                            {/* CafeScraper grade & eligibility badges */}
                            {dev.fit_grade && (
                              <span className={`inline-block text-[9px] font-bold mt-0.5 px-1.5 rounded cursor-pointer hover:opacity-80 transition-opacity ${
                                dev.fit_grade === "S" ? "bg-violet-100 text-violet-700" :
                                dev.fit_grade === "A" ? "bg-blue-100 text-blue-700" :
                                dev.fit_grade === "B" ? "bg-emerald-100 text-emerald-700" :
                                dev.fit_grade === "C" ? "bg-amber-100 text-amber-700" :
                                "bg-slate-100 text-slate-600"
                              }}`}
                              onClick={() => { setSelectedDevForScore(dev); setScoreDetailOpen(true); }}
                              title="查看评分明细"
                              >
                                {dev.fit_grade}
                              </span>
                            )}
                            {dev.listing_eligibility && dev.listing_eligibility !== "Not Ready" && (
                              <div className={`text-[8px] font-medium cursor-help ${
                                dev.listing_eligibility === "Qualified" ? "text-emerald-600" : "text-amber-600"
                              }`}
                              title={dev.listing_eligibility === "Qualified" ? "满足上架条件" : "接近上架标准，需进一步评估"}
                              >
                                {dev.listing_eligibility === "Qualified" ? "✓可上架" : "○待观察"}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={dev.status}
                            onValueChange={(v) => { if (v) handleStatusUpdate(dev.id, v); }}
                          >
                            <SelectTrigger className={`h-7 text-xs w-[90px] rounded-md ${sc.color}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                                <SelectItem key={key} value={key}>{val.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${pc.dotColor}`} />
                            <span className={`text-sm font-medium ${pc.color}`}>{pc.label}</span>
                          </div>
                        </TableCell>
                        {/* Contact Info */}
                        <TableCell>
                          <div className="flex flex-col gap-1 min-w-[180px]">
                            {/* Email */}
                            {dev.email ? (
                              <a
                                href={`mailto:${dev.email}`}
                                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 truncate max-w-[200px]"
                                title={dev.email}
                              >
                                <Mail className="w-3 h-3 shrink-0" />
                                <span className="truncate">{dev.email}</span>
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground/50 italic flex items-center gap-1">
                                <Mail className="w-3 h-3" />无
                              </span>
                            )}
                            {/* Other contact links */}
                            {dev.contactLinks ? (
                              <div className="flex flex-wrap items-center gap-1">
                                {dev.contactLinks.split(",").filter(Boolean).slice(0, 3).map((link: any, idx: number) => {
                                  const trimmed = link.trim();
                                  const isUrl = trimmed.startsWith("http") || trimmed.includes(".");
                                  return (
                                    <a
                                      key={idx}
                                      href={isUrl ? (trimmed.startsWith("http") ? trimmed : `https://${trimmed}`) : undefined}
                                      target={isUrl ? "_blank" : undefined}
                                      rel={isUrl ? "noopener noreferrer" : undefined}
                                      className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors max-w-[140px] truncate"
                                      title={trimmed}
                                    >
                                      <Globe className="w-2.5 h-2.5 shrink-0" />
                                      <span className="truncate">{trimmed.replace(/^https?:\/\//, "").split("/")[0]}</span>
                                    </a>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground/50 italic flex items-center gap-1">
                                <Globe className="w-3 h-3" />无
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            {/* developer_projects 是 Prisma 关联返回的 snake_case */}
                            {(() => {
                              const projList = dev.developer_projects || dev.projects || [];
                              const totalStars = Array.isArray(projList)
                                ? projList.reduce((s: number, p: any) => s + (p.stars || 0), 0)
                                : 0;
                              const count = Array.isArray(projList) ? projList.length : 0;
                              return (
                                <>
                                  <span className="tabular-nums font-medium">{totalStars}</span>
                                  <span className="text-border mx-0.5">·</span>
                                  <span className="tabular-nums">{count} 项目</span>
                                </>
                              );
                            })()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!dev.skillTags && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 rounded-md bg-violet-500/5 border-violet-200 hover:bg-violet-500/10 hover:border-violet-300 text-violet-700 dark:text-violet-300"
                                onClick={() => handleAnalyze(dev.id)}
                                disabled={analyzingId === dev.id}
                              >
                                {analyzingId === dev.id ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Brain className="w-3 h-3" />
                                )}
                                AI 分析
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md size-7 hover:bg-muted cursor-pointer outline-none">
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => handleAnalyze(dev.id)}>
                                  <Brain className="w-4 h-4 mr-2 text-violet-500" />
                                  AI 分析能力
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleOpenOutlineDialog(dev)}
                                  disabled={generatingOutreachId === dev.id}
                                >
                                  <Mail className={`w-4 h-4 mr-2 text-blue-500 ${generatingOutreachId === dev.id ? "animate-pulse" : ""}`} />
                                  {generatingOutreachId === dev.id ? "生成中..." : "生成邀约文案"}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => window.open(`https://github.com/${dev.username}`, "_blank")}>
                                  <ExternalLink className="w-4 h-4 mr-2" />
                                  查看 GitHub 主页
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <p className="text-sm text-muted-foreground">
                    显示 {(page - 1) * 20 + 1}-{Math.min(page * 20, total)} / <span className="tabular-nums font-medium">{total}</span>
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-lg">
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      上一页
                    </Button>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="rounded-lg">
                      下一页
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* AI Analysis Dialog — Premium Design */}
      <Dialog open={analysisOpen} onOpenChange={setAnalysisOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {analysisResult && selectedDevForAnalysis && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3.5">
                  <img
                    src={selectedDevForAnalysis.avatarUrl || `https://github.com/${selectedDevForAnalysis.username}.png`}
                    alt=""
                    className="w-14 h-14 rounded-2xl ring-2 ring-primary/20"
                    onError={(e) => {(e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedDevForAnalysis.display_name || selectedDevForAnalysis.username)}&background=6366f1&color=fff`}}
                  />
                  <div>
                    <DialogTitle className="flex items-center gap-2">
                      AI 分析报告
                      <Badge className="text-[9px] bg-gradient-to-r from-violet-500 to-purple-500 text-white border-0">GLM-4</Badge>
                    </DialogTitle>
                    <DialogDescription className="mt-1 flex items-center gap-2">
                      <span className="font-medium text-foreground">{selectedDevForAnalysis.display_name || selectedDevForAnalysis.username}</span>
                      <span className="text-muted-foreground">@{selectedDevForAnalysis.username}</span>
                      {selectedDevForAnalysis.location && <><MapPin className="w-3 h-3" />{selectedDevForAnalysis.location}</>}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 pt-2">
                {/* Score Card */}
                {analysisResult.score !== undefined && (
                  <div className="rounded-2xl border bg-gradient-to-br from-violet-50/50 to-purple-50/30 dark:from-violet-950/20 dark:to-purple-950/10 p-5 space-y-4">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" /> 综合评估
                    </h4>
                    <div className="flex items-center gap-5">
                      <div className="text-5xl font-black gradient-text tabular-nums">
                        {Number(analysisResult.score).toFixed(1)}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="h-3 rounded-full bg-muted/60 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-blue-500 to-violet-500 transition-all duration-700 ease-out shadow-sm"
                            style={{ width: `${(Number(analysisResult.score) / 10) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider">
                          <span>Poor</span><span>Avg</span><span>Good</span><span>Excellent</span>
                        </div>
                      </div>
                    </div>
                    {analysisResult.recommendationLevel && (
                      <div className="flex items-center gap-3 pt-1">
                        <Badge
                          className={
                            analysisResult.recommendationLevel === "HIGH"
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                              : analysisResult.recommendationLevel === "MEDIUM"
                              ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                              : "bg-red-500/15 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                          }
                        >
                          {analysisResult.recommendationLevel === "HIGH" ? "🌟 强烈推荐" : analysisResult.recommendationLevel === "MEDIUM" ? "👍 可以考虑" : "⚠️ 暂不推荐"}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                {/* Skill Tags */}
                {(analysisResult.skillTags || analysisResult.skills) && (
                  <div className="space-y-2.5">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-500" /> 核心技能
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {(Array.isArray(analysisResult.skillTags)
                        ? analysisResult.skillTags
                        : (analysisResult.skillTags as string)?.split(",")
                      )
                        ?.map((tag: string, i: number) =>
                          tag && tag.trim() ? (
                            <Badge key={i} variant="secondary" className="text-xs px-2.5 py-1 rounded-lg hover:bg-secondary/80 transition-colors">
                              {tag.trim()}
                            </Badge>
                          ) : null
                        )}
                    </div>
                  </div>
                )}

                {/* Tech Stack Analysis */}
                {analysisResult.techStack && (
                  <div className="space-y-2.5">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-blue-500" /> 技术栈分析
                    </h4>
                    <div className="text-sm text-muted-foreground bg-muted/40 rounded-xl p-4 leading-relaxed">
                      {typeof analysisResult.techStack === "string" ? analysisResult.techStack : JSON.stringify(analysisResult.techStack, null, 2)}
                    </div>
                  </div>
                )}

                {/* AI Summary */}
                {analysisResult.summary && (
                  <div className="rounded-2xl bg-gradient-to-br from-violet-500/5 to-purple-500/5 border border-violet-200/50 dark:border-violet-800/30 p-5 space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Brain className="w-4 h-4 text-violet-500" /> AI 摘要评价
                    </h4>
                    <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-foreground/90">
                      {analysisResult.summary}
                    </pre>
                  </div>
                )}

                {/* Full Report */}
                {analysisResult.rawText && (
                  <details className="group rounded-2xl border">
                    <summary className="px-5 py-3.5 cursor-pointer text-sm font-medium hover:bg-muted/30 transition-colors flex items-center gap-2 rounded-t-2xl">
                      📋 查看完整分析报告
                      <ChevronRight className="w-4 h-4 group-open:rotate-90 transition-transform text-muted-foreground" />
                    </summary>
                    <pre className="px-5 pb-4 text-xs whitespace-pre-wrap font-sans text-muted-foreground leading-relaxed">
                      {analysisResult.rawText}
                    </pre>
                  </details>
                )}

                {/* Model info footer */}
                <div className="text-[11px] text-muted-foreground pt-3 border-t flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    模型：<span className="font-mono font-medium">{String(analysisResult.model || "GLM-4 Plus")}</span>
                    <span className="mx-1">|</span>
                    Provider：<span className="font-medium">{String(analysisResult.provider || "智谱AI")}</span>
                  </span>
                  <span>{new Date().toLocaleString("zh-CN")}</span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== Score Detail Dialog (查看已保存的评分明细) ===== */}
      <Dialog open={scoreDetailOpen} onOpenChange={setScoreDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
          {selectedDevForScore && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3.5">
                  <img
                    src={selectedDevForScore.avatarUrl || `https://github.com/${selectedDevForScore.username}.png`}
                    alt=""
                    className="w-14 h-14 rounded-2xl ring-2 ring-primary/20"
                    onError={(e) => {(e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedDevForScore.display_name || selectedDevForScore.username)}&background=6366f1&color=fff`}}
                  />
                  <div className="flex-1">
                    <DialogTitle className="flex items-center gap-2.5">
                      <BarChart3 className="w-5 h-5 text-violet-500" />
                      评分明细
                      {selectedDevForScore.fit_grade && (
                        <span className={`text-sm font-black px-2.5 py-0.5 rounded-lg ${
                          selectedDevForScore.fit_grade === "S" ? "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300" :
                          selectedDevForScore.fit_grade === "A" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" :
                          selectedDevForScore.fit_grade === "B" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300" :
                          selectedDevForScore.fit_grade === "C" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300" :
                          "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                        }`}>
                          {selectedDevForScore.fit_grade} 级
                        </span>
                      )}
                    </DialogTitle>
                    <DialogDescription className="mt-1 flex items-center gap-2 text-xs">
                      <span className="font-medium text-foreground">{selectedDevForScore.display_name || selectedDevForScore.username}</span>
                      <span className="text-muted-foreground">@{selectedDevForScore.username}</span>
                      {selectedDevForScore.location && <><MapPin className="w-3 h-3" />{selectedDevForScore.location}</>}
                      {selectedDevForScore.company && <><Building2 className="w-3 h-3 ml-1" />{selectedDevForScore.company}</>}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 pt-1">
                {/* ===== 综合分数卡片 ===== */}
                <div className="rounded-2xl border bg-gradient-to-br from-violet-50/60 via-white to-purple-50/40 dark:from-violet-950/30 dark:via-slate-900 dark:to-purple-950/15 p-5 space-y-4">
                  <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                    <Trophy className="w-[18px] h-[18px] text-yellow-500" /> 综合评估
                  </h4>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className={`text-5xl font-black tabular-nums tracking-tight ${
                        selectedDevForScore.overallScore >= 80 ? "text-emerald-600 dark:text-emerald-400" :
                        selectedDevForScore.overallScore >= 60 ? "text-amber-600 dark:text-amber-400" :
                        selectedDevForScore.overallScore >= 40 ? "text-blue-600 dark:text-blue-400" :
                        selectedDevForScore.overallScore > 0 ? "text-slate-600 dark:text-slate-400" :
                        "text-muted-foreground"
                      }`}>
                        {selectedDevForScore.overallScore > 0 ? Math.round(selectedDevForScore.overallScore) : "-"}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">综合分</div>
                    </div>
                    <div className="flex-1 space-y-2.5">
                      <div className="h-4 rounded-full bg-muted/70 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-red-500 via-amber-500 via-emerald-500 to-blue-500 transition-all duration-700 ease-out shadow-inner"
                          style={{ width: `${Math.min(100, (selectedDevForScore.overallScore || 0))}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                        <span>D</span><span>C</span><span>B</span><span>A</span><span>S</span>
                      </div>
                    </div>
                  </div>

                  {/* 状态标签行 */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    {selectedDevForScore.listing_eligibility && (
                      <Badge variant="outline" className={
                        selectedDevForScore.listing_eligibility === "Qualified"
                          ? "border-emerald-400 text-emerald-700 bg-emerald-50 dark:border-emerald-600 dark:text-emerald-400 dark:bg-emerald-950/40"
                          : selectedDevForScore.listing_eligibility === "Borderline"
                          ? "border-amber-400 text-amber-700 bg-amber-50 dark:border-amber-600 dark:text-amber-400 dark:bg-amber-950/40"
                          : "border-slate-300 text-slate-500 bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:bg-slate-800/40"
                      }>
                        {selectedDevForScore.listing_eligibility === "Qualified" ? "✓ 可上架" :
                         selectedDevForScore.listing_eligibility === "Borderline" ? "○ 待观察" : "✗ 未就绪"}
                      </Badge>
                    )}
                    {selectedDevForScore.recommended_action && (
                      <Badge variant="outline" className={
                        selectedDevForScore.recommended_action.includes("Priority") ? "border-violet-400 text-violet-700 bg-violet-50 dark:border-violet-500 dark:text-violet-400 dark:bg-violet-950/40" :
                        selectedDevForScore.recommended_action.includes("Standard") ? "border-blue-400 text-blue-700 bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:bg-blue-950/40" :
                        selectedDevForScore.recommended_action.includes("Nurture") ? "border-cyan-400 text-cyan-700 bg-cyan-50 dark:border-cyan-500 dark:text-cyan-400 dark:bg-cyan-950/40" :
                        selectedDevForScore.recommended_action.includes("Reject") ? "border-red-400 text-red-700 bg-red-50 dark:border-red-500 dark:text-red-400 dark:bg-red-950/40" :
                        "border-slate-300 text-slate-600 bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:bg-slate-800/40"
                      }>
                        {selectedDevForScore.recommended_action === "Priority Outreach" ? "🎯 优先招募" :
                         selectedDevForScore.recommended_action === "Standard Outreach" ? "📬 标准触达" :
                         selectedDevForScore.recommended_action === "Manual Review" ? "🔍 人工评估" :
                         selectedDevForScore.recommended_action === "Nurture Pool" ? "🌱 培育池" :
                         selectedDevForScore.recommended_action === "Reject for Now" ? "❌ 暂不招" :
                         selectedDevForScore.recommended_action}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* ===== 7 维评分网格 ===== */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                    <PieChart className="w-4 h-4 text-indigo-500" />
                    7 维评分明细
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {[
                      // Prisma DB 字段名是 snake_case（如 technical_fit），不是 camelCase
                      { key: "technical_fit", label: "技术匹配度", max: 25, icon: <Code2 className="w-3.5 h-3.5" />, color: "blue", value: selectedDevForScore.technical_fit ?? null },
                      { key: "use_case_fit", label: "场景匹配度", max: 20, icon: <Target className="w-3.5 h-3.5" />, color: "indigo", value: selectedDevForScore.use_case_fit ?? null },
                      { key: "listing_readiness", label: "上架就绪度", max: 20, icon: <PackageCheck className="w-3.5 h-3.5" />, color: "emerald", value: selectedDevForScore.listing_readiness ?? null },
                      { key: "commercialization_fit", label: "商业化潜力", max: 15, icon: <TrendingUp className="w-3.5 h-3.5" />, color: "amber", value: selectedDevForScore.commercialization_fit ?? null },
                      { key: "reliability_activity", label: "可靠性活跃度", max: 10, icon: <Activity className="w-3.5 h-3.5" />, color: "cyan", value: selectedDevForScore.reliability_activity ?? null },
                      { key: "platform_bonus", label: "平台专项加分", max: 10, icon: <Sparkles className="w-3.5 h-3.5" />, color: "violet", value: selectedDevForScore.platform_bonus ?? null, isBonus: true },
                      { key: "risk_penalty", label: "风险扣分", max: 15, icon: <ShieldAlert className="w-3.5 h-3.5" />, color: "red", value: selectedDevForScore.risk_penalty ?? null, isPenalty: true },
                    ].map((dim) => {
                      const val = dim.value ?? null;
                      const pct = val !== null ? Math.abs(val) / dim.max * 100 : 0;
                      const colorClasses: Record<string, string> = {
                        blue: "from-blue-500 to-blue-400",
                        indigo: "from-indigo-500 to-indigo-400",
                        emerald: "from-emerald-500 to-emerald-400",
                        amber: "from-amber-500 to-amber-400",
                        cyan: "from-cyan-500 to-cyan-400",
                        violet: "from-violet-500 to-violet-400",
                        red: "from-red-500 to-red-400",
                      };
                      const bgMuted: Record<string, string> = {
                        blue: "bg-blue-50 dark:bg-blue-950/30",
                        indigo: "bg-indigo-50 dark:bg-indigo-950/30",
                        emerald: "bg-emerald-50 dark:bg-emerald-950/30",
                        amber: "bg-amber-50 dark:bg-amber-950/30",
                        cyan: "bg-cyan-50 dark:bg-cyan-950/30",
                        violet: "bg-violet-50 dark:bg-violet-950/30",
                        red: "bg-red-50 dark:bg-red-950/30",
                      };
                      return (
                        <div key={dim.key} className={`rounded-xl ${bgMuted[dim.color]} p-3 space-y-2`}>
                          <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                            {dim.icon}
                            <span className="truncate">{dim.label}</span>
                            <span className="ml-auto tabular-nums text-[10px]">/{dim.max}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-lg font-bold tabular-nums ${
                              dim.isPenalty
                                ? (val !== null && val < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground")
                                : dim.isBonus
                                  ? (val !== null && val > 0 ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground")
                                  : "text-foreground"
                            }`}>
                              {val !== null ? (dim.isPenalty ? val : `+${val}`) : "-"}
                            </span>
                            <div className="flex-1 h-1.5 rounded-full bg-black/5 dark:bg-white/5 overflow-hidden">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${colorClasses[dim.color]} transition-all duration-500 ease-out`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ===== 核心优势 & 主要差距 & 类目 & 风险 ===== */}
                {(() => {
                  let analysisData: Record<string, any> | null = null;
                  try {
                    if (typeof selectedDevForScore.profileAnalysis === "string" && selectedDevForScore.profileAnalysis) {
                      analysisData = JSON.parse(selectedDevForScore.profileAnalysis);
                    } else if (typeof selectedDevForScore.profileAnalysis === "object" && selectedDevForScore.profileAnalysis) {
                      analysisData = selectedDevForScore.profileAnalysis as Record<string, any>;
                    }
                  } catch { /* ignore */ }

                  const strengths = analysisData?.top_strengths || analysisData?.topStrengths || [];
                  const gaps = analysisData?.main_gaps || analysisData?.mainGaps || [];
                  
                  // 智能解析推荐类目：支持数组 / 编号长字符串 / 逗号分隔字符串
                  const rawCategories = analysisData?.target_categories || analysisData?.targetCategories || selectedDevForScore.targetCategories || [];
                  const categories: string[] = (() => {
                    if (Array.isArray(rawCategories)) return rawCategories.map(String);
                    if (typeof rawCategories === 'string' && rawCategories.trim()) {
                      const s = rawCategories.trim();
                      // 尝试按编号拆分："1. xxx 2. xxx 3. xxx" 或 "1、xxx 2、xxx"
                      const numberedSplit = s.split(/(?:(?:^|\s)(?:\d+[\.\、\)]\s*))/).filter(Boolean).map(x => x.trim()).filter(Boolean);
                      if (numberedSplit.length > 1) return numberedSplit;
                      // 逗号/分号拆分
                      const commaSplit = s.split(/[,;，；]/).map(x => x.trim()).filter(Boolean);
                      if (commaSplit.length > 1) return commaSplit;
                      // 单条也包在数组里
                      return [s];
                    }
                    return [];
                  })();

                  const risks = analysisData?.risk_flags || analysisData?.riskFlags || [];
                  const confidenceNote = analysisData?.confidence_note || analysisData?.confidenceNote || null;

                  // 通用面板样式：统一高度 + 溢出滚动
                  const panelBase = "rounded-xl border p-4 space-y-2.5 min-h-[200px] max-h-[280px] flex flex-col";
                  const listScroll = "overflow-y-auto flex-1 -mr-1 pr-1 space-y-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:bg-foreground/10 hover:[&::-webkit-scrollbar-thumb]:bg-foreground/20";

                  return (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        {/* 核心优势 */}
                        <div className={`${panelBase} border-emerald-200/60 bg-gradient-to-br from-emerald-50/70 to-emerald-50/30 dark:from-emerald-950/25 dark:to-emerald-950/10 dark:border-emerald-800/30`}>
                          <h4 className="font-semibold text-xs flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 shrink-0">
                            <span className="flex items-center justify-center w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400">
                              <ShieldCheck className="w-3 h-3" />
                            </span>
                            核心优势
                            {strengths.length > 0 && (
                              <span className="ml-auto text-[10px] font-normal tabular-nums bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 px-1.5 py-0 rounded-full">{strengths.length}</span>
                            )}
                          </h4>
                          {Array.isArray(strengths) && strengths.length > 0 ? (
                            <ul className={listScroll}>
                              {strengths.map((s: string, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-foreground/85 leading-relaxed group">
                                  <span className="flex items-center justify-center w-[18px] h-[18px] rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold shrink-0 mt-0.2">{i + 1}</span>
                                  <span className="break-words">{String(s)}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-muted-foreground/60 italic flex-1 flex items-center justify-center">暂无数据</p>
                          )}
                        </div>

                        {/* 主要差距 */}
                        <div className={`${panelBase} border-rose-200/60 bg-gradient-to-br from-rose-50/70 to-rose-50/30 dark:from-rose-950/25 dark:to-rose-950/10 dark:border-rose-800/30`}>
                          <h4 className="font-semibold text-xs flex items-center gap-1.5 text-rose-700 dark:text-rose-400 shrink-0">
                            <span className="flex items-center justify-center w-5 h-5 rounded-md bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400">
                              <AlertTriangle className="w-3 h-3" />
                            </span>
                            主要差距
                            {gaps.length > 0 && (
                              <span className="ml-auto text-[10px] font-normal tabular-nums bg-rose-100/80 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 px-1.5 py-0 rounded-full">{gaps.length}</span>
                            )}
                          </h4>
                          {Array.isArray(gaps) && gaps.length > 0 ? (
                            <ul className={listScroll}>
                              {gaps.map((g: string, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-foreground/85 leading-relaxed group">
                                  <span className="flex items-center justify-center w-[18px] h-[18px] rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 text-[10px] font-bold shrink-0 mt-0.2">{i + 1}</span>
                                  <span className="break-words">{String(g)}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs text-muted-foreground/60 italic flex-1 flex items-center justify-center">暂无数据</p>
                          )}
                        </div>
                      </div>

                      {(categories.length > 0 || risks.length > 0) && (
                        <div className="grid grid-cols-2 gap-3 mt-1">
                          {categories.length > 0 && (
                            <div className={`${panelBase} border-violet-200/60 bg-gradient-to-br from-violet-50/70 to-violet-50/30 dark:from-violet-950/25 dark:to-violet-950/10 dark:border-violet-800/30`}>
                              <h4 className="font-semibold text-xs flex items-center gap-1.5 text-violet-700 dark:text-violet-400 shrink-0">
                                <span className="flex items-center justify-center w-5 h-5 rounded-md bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-400">
                                  <Tag className="w-3 h-3" />
                                </span>
                                推荐类目
                                <span className="ml-auto text-[10px] font-normal tabular-nums bg-violet-100/80 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 px-1.5 py-0 rounded-full">{categories.length}</span>
                              </h4>
                              <ul className={listScroll}>
                                {categories.map((c: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-foreground/85 leading-relaxed group">
                                    <span className="flex items-center justify-center w-[18px] h-[18px] rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400 text-[10px] font-bold shrink-0 mt-0.2">{i + 1}</span>
                                    <span className="break-words">{String(c).trim()}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {risks.length > 0 && (
                            <div className={`${panelBase} border-orange-200/60 bg-gradient-to-br from-orange-50/70 to-orange-50/30 dark:from-orange-950/25 dark:to-orange-950/10 dark:border-orange-800/30`}>
                              <h4 className="font-semibold text-xs flex items-center gap-1.5 text-orange-700 dark:text-orange-400 shrink-0">
                                <span className="flex items-center justify-center w-5 h-5 rounded-md bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400">
                                  <AlertCircle className="w-3 h-3" />
                                </span>
                                风险标志
                                <span className="ml-auto text-[10px] font-normal tabular-nums bg-orange-100/80 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 px-1.5 py-0 rounded-full">{risks.length}</span>
                              </h4>
                              <ul className={listScroll}>
                                {risks.map((r: string, i: number) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-foreground/85 leading-relaxed group">
<span className="flex items-center justify-center w-[18px] h-[18px] rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 text-[10px] shrink-0 mt-0.2">⚠</span>
                                  <span className="break-words">{String(r)}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* AI confidence note */}
                      {confidenceNote && (
                        <details className="group rounded-xl border mt-1">
                          <summary className="px-4 py-3 cursor-pointer text-xs font-medium hover:bg-muted/30 transition-colors flex items-center gap-2 rounded-t-xl">
                            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                            AI 评价详情（原始输出摘要）
                            <ChevronRight className="w-3.5 h-3.5 group-open:rotate-90 transition-transform text-muted-foreground" />
                          </summary>
                          <div className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                            {String(confidenceNote)}
                          </div>
                        </details>
                      )}
                    </>
                  );
                })()}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== Custom Outline Input Dialog (Pre-Generation) ===== */}
      <Dialog open={outlineDialogOpen} onOpenChange={setOutlineDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/40 dark:to-indigo-900/40 flex items-center justify-center">
                <FileText className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <DialogTitle>自定义邀约大纲</DialogTitle>
                <DialogDescription>
                  {pendingOutreachDev ? (
                    <span>为 <span className="font-medium text-foreground">{pendingOutreachDev.display_name || pendingOutreachDev.username}</span> (@{pendingOutreachDev.username}) 定义文案结构</span>
                  ) : "定义批量生成的文案结构"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Template Quick Buttons */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">快捷模板</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "正式邀请", template: "1. 开场（称呼+对方项目赞美）\n2. 自我介绍（我是谁、做什么项目）\n3. 邀请理由（为什么选择TA）\n4. 价值说明（参与能获得什么）\n5. 行动号召（下一步怎么做）" },
                  { label: "开源合作", template: "1. 关注到对方的XX项目\n2. 表达对其技术能力的认可\n3. 介绍我们的开源计划\n4. 说明协作方式和贡献形式\n5. 提供联系方式和进一步沟通" },
                  { label: "技术交流", template: "1. 从共同的技术兴趣点切入\n2. 分享相关经验或观察\n3. 提出潜在的合作方向\n4. 简单介绍我们的项目背景\n5. 邀请线上/线下交流" },
                  { label: "简洁直接", template: "• 一句话表明来意\n• 一个具体理由\n• 一个明确请求\n• 控制在100字以内" },
                  { label: "🔍 爬虫用户建联", template: `请扮演一个"爬虫/数据采集脚本的潜在使用者"，用GitHub主页的对应语言（中英文），写给 GitHub 项目作者第一封建联邮件。
目标是与开发者进行初步建联：邮件要短、自然、像真人，不要模板腔。

邮件主题：可以跟你交流下GitHub项目吗？

写作要求：
100-160 字左右
以"建立联系 + 表达兴趣 + 希望交流"为主
不要提到AutoCustomer` },
                ].map((tpl) => (
                  <Button
                    key={tpl.label}
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs border-border hover:border-violet-300 hover:bg-violet-50 dark:hover:border-violet-700 dark:hover:bg-violet-950/30"
                    onClick={() => setCustomOutline(tpl.template)}
                  >
                    {tpl.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Custom Outline Textarea */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5" />
                自定义文案大纲
              </label>
              <Textarea
                placeholder={"输入你希望的文案结构，例如：\n\n1. 开场白（友好称呼）\n2. 项目介绍（我们做什么）\n3. 个性化内容（结合对方特点）\n4. 价值主张（为什么要加入）\n5. 行动号召（期待回复）\n\n留空将使用默认的AI生成模式"}
                value={customOutline}
                onChange={(e) => setCustomOutline(e.target.value)}
                className="min-h-[160px] text-sm resize-y border-violet-200/50 focus:border-violet-400 dark:border-violet-800/30 dark:focus:border-violet-500 bg-violet-50/30 dark:bg-violet-950/10"
              />
              <p className="text-[11px] text-muted-foreground mt-1.5">
                {customOutline.length > 0
                  ? `已输入 ${customOutline.length} 字 — AI 将严格按照此大纲生成文案`
                  : "留空 = 使用默认 AI 智能生成模式"}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setOutlineDialogOpen(false)}>
              取消
            </Button>
            <Button
              className="gap-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
              onClick={() => {
                if (pendingOutreachDev) {
                  // Single developer generation
                  executeGenerateOutreach(pendingOutreachDev, customOutline.trim() || undefined);
                } else {
                  // Batch generation - just close dialog, outline is stored in batchCustomOutline
                  setBatchCustomOutline(customOutline);
                  setOutlineDialogOpen(false);
                  handleBatchGenerateOutreach();
                }
              }}
            >
              <Sparkles className="w-4 h-4" />
              {customOutline.trim() ? "按大纲生成" : "默认智能生成"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Outreach Copywriting Dialog (Single) ===== */}
      <Dialog open={outreachOpen} onOpenChange={setOutreachOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {outreachResult && selectedDevForOutreach && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3.5">
                  <img
                    src={selectedDevForOutreach.avatarUrl || `https://github.com/${selectedDevForOutreach.username}.png`}
                    alt=""
                    className="w-14 h-14 rounded-2xl ring-2 ring-blue-500/20"
                    onError={(e) => {(e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedDevForOutreach.display_name || selectedDevForOutreach.username)}&background=3b82f6&color=fff`}}
                  />
                  <div>
                    <DialogTitle className="flex items-center gap-2">
                      ✉️ 邀约文案
                      <Badge className="text-[9px] bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">GPT-5.4</Badge>
                    </DialogTitle>
                    <DialogDescription className="mt-1 flex items-center gap-2">
                      <span className="font-medium text-foreground">{selectedDevForOutreach.display_name || selectedDevForOutreach.username}</span>
                      <span className="text-muted-foreground">@{selectedDevForOutreach.username}</span>
                      {selectedDevForOutreach.email && (
                        <>
                          <span className="text-border mx-1">·</span>
                          <Mail className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-600 dark:text-emerald-400 text-xs truncate max-w-[150px]">{selectedDevForOutreach.email}</span>
                        </>
                      )}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 pt-2">
                {/* Subject Line */}
                <div className="rounded-xl border border-blue-200/50 dark:border-blue-800/30 bg-gradient-to-br from-blue-50/50 to-cyan-50/30 dark:from-blue-950/10 dark:to-cyan-950/5 p-4 space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    📧 邮件主题
                  </label>
                  <p className="text-sm font-medium text-foreground leading-relaxed">
                    {outreachResult.subject}
                  </p>
                </div>

                {/* Body Content */}
                <div className="rounded-xl border border-border/50 p-4 space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    📝 邀约正文
                  </label>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                    {outreachResult.body}
                  </div>
                </div>

                {/* Personalization Note */}
                {outreachResult.personalizationNote && (
                  <div className="rounded-xl border border-amber-200/50 dark:border-amber-800/30 bg-amber-50/40 dark:bg-amber-950/10 p-3.5 space-y-1">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        个性化说明
                      </label>
                      <p className="text-xs text-amber-800/80 dark:text-amber-300/80 leading-relaxed">{outreachResult.personalizationNote}</p>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    className="gap-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                    onClick={async () => {
                      // Copy subject + body to clipboard
                      const fullText = `主题：${outreachResult?.subject}\n\n${outreachResult?.body}`;
                      await navigator.clipboard.writeText(fullText);
                    }}
                  >
                    复制全文
                  </Button>
                  {selectedDevForOutreach.email ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => window.open(`mailto:${selectedDevForOutreach.email}?subject=${encodeURIComponent(outreachResult?.subject || "")}`, "_blank")}
                    >
                      发送邮件
                    </Button>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== Batch AI Analysis Results Dialog ===== */}
      <Dialog open={batchAnalyzeOpen} onOpenChange={setBatchAnalyzeOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900 dark:to-purple-900 flex items-center justify-center">
                <Brain className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <DialogTitle className="flex items-center gap-2">
                  批量 AI 分析结果
                  <Badge className={`
                    text-[10px]
                    ${batchAnalyzeResults.filter(r => r.success).length === batchAnalyzeResults.length
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 border-transparent"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 border-transparent"}
                  `}>
                    {batchAnalyzeResults.filter((r) => r.success).length}/{batchAnalyzeResults.length} 成功
                  </Badge>
                </DialogTitle>
                <DialogDescription>选中开发者的 AI 能力分析报告</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {batchAnalyzeResults.map((result, idx) => {
              const dev = developers.find((d) => d.id === result.developerId);
              const analysis = result.analysis;
              return (
                <div
                  key={result.developerId}
                  className={`rounded-xl border p-4 space-y-3 transition-colors ${
                    result.success
                      ? "border-border/50 hover:border-violet-200/50 dark:hover:border-violet-800/30 hover:shadow-sm"
                      : "border-red-200/50 bg-red-50/20 dark:bg-red-950/10"
                  }`}
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`inline-flex w-7 h-7 rounded-full items-center justify-center text-[11px] font-bold shrink-0 ${
                        result.success
                          ? "bg-violet-100 text-violet-700 dark:bg-violet-900/40"
                          : "bg-red-100 text-red-700 dark:bg-red-900/40"
                      }`}>
                        {idx + 1}
                      </span>
                      {dev && (
                        <img
                          src={dev.avatarUrl || `https://github.com/${dev.username}.png`}
                          alt=""
                          className="w-8 h-8 rounded-full bg-muted ring-1 ring-background shrink-0"
                          onError={(e) => {(e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(dev.display_name || dev.username)}&background=8b5cf6&color=fff`;}}
                        />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {dev?.displayName || dev?.username || result.developerId.substring(0, 8)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">@{dev?.username || "?"}</p>
                      </div>
                      {!result.success && (
                        <Badge variant="destructive" className="text-[9px] px-1.5 py-0">失败</Badge>
                      )}
                    </div>
                    {result.success && analysis && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`inline-flex w-9 h-9 rounded-full items-center justify-center text-xs font-bold tabular-nums ${
                          (analysis.fit_score ?? 0) >= 80
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40"
                            : (analysis.fit_score ?? 0) >= 60
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800/40"
                        }`}>
                          {Math.round(analysis.fit_score ?? 0)}
                        </span>
                        {/* Fit Grade Badge */}
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-bold ${
                            analysis.fit_grade === "S" ? "border-violet-300 text-violet-700 bg-violet-50" :
                            analysis.fit_grade === "A" ? "border-blue-300 text-blue-700 bg-blue-50" :
                            analysis.fit_grade === "B" ? "border-emerald-300 text-emerald-700 bg-emerald-50" :
                            analysis.fit_grade === "C" ? "border-amber-300 text-amber-700 bg-amber-50" :
                            "border-slate-300 text-slate-600 bg-slate-50"
                          }`}
                        >
                          {analysis.fit_grade || "-"} 级
                        </Badge>
                        {/* Listing Eligibility */}
                        {analysis.listing_eligibility && (
                          <Badge variant="outline" className={`text-[9px] ${
                            analysis.listing_eligibility === "Qualified"
                              ? "border-emerald-300 text-emerald-600 bg-emerald-50/50"
                              : "border-amber-300 text-amber-600 bg-amber-50/50"
                          }`}>
                            {analysis.listing_eligibility === "Qualified" ? "✓ 可上架" : "○ 待观察"}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Content: success → show analysis details; failed → show error */}
                  {result.success && analysis ? (
                    <div className="pl-12 space-y-3">
                      {/* Summary */}
                      {analysis.confidence_note && (
                        <div className="text-sm text-foreground/80 leading-relaxed border-l-2 border-violet-200 pl-3 italic max-h-28 overflow-y-auto whitespace-pre-wrap break-words rounded-r-lg bg-muted/20 pr-2 py-1">
                          {analysis.confidence_note}
                        </div>
                      )}

                      {/* 7-Dimension Score Breakdown */}
                      <div className="grid grid-cols-4 gap-2 text-[11px]">
                        {[
                          { label: "技术匹配", value: analysis.technical_fit, max: 25, color: "text-blue-600" },
                          { label: "场景匹配", value: analysis.use_case_fit, max: 20, color: "text-indigo-600" },
                          { label: "上架就绪", value: analysis.listing_readiness, max: 20, color: "text-violet-600" },
                          { label: "商业化", value: analysis.commercialization_fit, max: 15, color: "text-emerald-600" },
                          { label: "活跃度", value: analysis.reliability_activity, max: 10, color: "text-cyan-600" },
                          { label: "平台加分", value: analysis.platform_bonus, max: 10, color: "text-amber-600" },
                          { label: "风险扣分", value: analysis.risk_penalty, max: 0, color: "text-red-600", isPenalty: true },
                        ].map((dim) => dim.value != null && (
                          <div key={dim.label} className={`rounded-lg border px-2 py-1.5 ${dim.isPenalty ? "border-red-200 bg-red-50/30 dark:bg-red-950/10" : "border-border/60 bg-muted/30"}`}>
                            <div className="text-muted-foreground">{dim.label}</div>
                            <div className={`font-bold tabular-nums ${dim.color} ${dim.isPenalty && (dim.value as number) < 0 ? "" : ""}`}>
                              {dim.isPenalty ? (dim.value as number) : `${dim.value}/${dim.max}`}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Strengths & Gaps */}
                      <div className="flex gap-3">
                        {Array.isArray(analysis.top_strengths) && analysis.top_strengths.length > 0 && (
                          <div className="flex-1 rounded-lg border border-emerald-200/50 bg-emerald-50/20 dark:bg-emerald-950/10 p-2">
                            <div className="text-[10px] font-medium text-emerald-700 mb-1">✅ 核心优势</div>
                            <ul className="space-y-0.5">
                              {analysis.top_strengths.map((s: string, i: number) => (
                                <li key={i} className="text-[11px] text-foreground/80">· {s}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {Array.isArray(analysis.main_gaps) && analysis.main_gaps.length > 0 && (
                          <div className="flex-1 rounded-lg border border-amber-200/50 bg-amber-50/20 dark:bg-amber-950/10 p-2">
                            <div className="text-[10px] font-medium text-amber-700 mb-1">⚠️ 主要差距</div>
                            <ul className="space-y-0.5">
                              {analysis.main_gaps.map((g: string, i: number) => (
                                <li key={i} className="text-[11px] text-foreground/80">· {g}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* Target Categories */}
                      {Array.isArray(analysis.target_categories) && analysis.target_categories.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {analysis.target_categories.map((cat: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-[10px] px-2 py-0 rounded-md border-violet-200 text-violet-600 bg-violet-50/30">
                              📦 {cat}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Risk Flags */}
                      {Array.isArray(analysis.risk_flags) && analysis.risk_flags.length > 0 && (
                        <div className="rounded-lg border border-red-200/50 bg-red-50/20 dark:bg-red-950/10 p-2">
                          <div className="text-[10px] font-medium text-red-700 mb-1">🚨 风险标志</div>
                          <ul className="space-y-0.5">
                            {analysis.risk_flags.map((rf: string, i: number) => (
                              <li key={i} className="text-[11px] text-red-600/80">· {rf}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommended Action */}
                      {analysis.recommended_action && (
                        <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                          <span className="text-[10px] text-muted-foreground">建议行动:</span>
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              (analysis.recommended_action as string).includes("Priority") ? "border-violet-300 text-violet-700 bg-violet-50" :
                              (analysis.recommended_action as string).includes("Standard") ? "border-blue-300 text-blue-700 bg-blue-50" :
                              (analysis.recommended_action as string).includes("Manual") ? "border-amber-300 text-amber-700 bg-amber-50" :
                              (analysis.recommended_action as string).includes("Nurture") ? "border-slate-300 text-slate-600 bg-slate-50" :
                              "border-red-300 text-red-600 bg-red-50"
                            }`}
                          >
                            {(analysis.recommended_action as string).replace(/_/g, " ")}
                          </Badge>
                        </div>
                      )}

                      {/* Skill Tags */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {Array.isArray(analysis.skillTags)
                          ? analysis.skillTags.map((tag: string, i: number) =>
                              tag && tag.trim() ? (
                                <Badge key={i} variant="secondary" className="text-xs px-2 py-0.5 rounded-md">{tag.trim()}</Badge>
                              ) : null
                            )
                          : (analysis.skillTags as string)?.split(",").filter(Boolean).map((tag, i) => (
                              <Badge key={i} variant="secondary" className="text-xs px-2 py-0.5 rounded-md">{tag.trim()}</Badge>
                            ))
                        }
                      </div>

                      {/* Tech Stack */}
                      {analysis.techStack && (
                        <p className="text-[11px] text-muted-foreground truncate font-mono">
                          栈: {Array.isArray(analysis.techStack) ? analysis.techStack.join(", ") : String(analysis.techStack)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="pl-12">
                      <p className="text-sm text-red-600 dark:text-red-400">{result.error || "分析失败"}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              variant="outline"
              onClick={() => setBatchAnalyzeOpen(false)}
            >
              关闭
            </Button>
            <span className="text-[11px] text-muted-foreground ml-auto">
              使用模型：{batchAnalyzeResults[0]?.model || "—"} · 耗时约 {Math.round(batchAnalyzeResults.length * 5)}s
            </span>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Batch Outreach Results Dialog ===== */}
      <Dialog open={batchOutreachOpen} onOpenChange={setBatchOutreachOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900 dark:to-cyan-900 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <DialogTitle className="flex items-center gap-2">
                  批量邀约文案
                  <Badge className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 border-transparent">
                    {batchOutreachResults.length} 条
                  </Badge>
                </DialogTitle>
                <DialogDescription>为选中的开发者生成的个性化邀约文案</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            {batchOutreachResults.map((result, idx) => (
              <div key={result.id} className="rounded-xl border border-border/50 p-4 space-y-2 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="inline-flex w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/40 items-center justify-center text-[11px] font-bold text-blue-700 dark:text-blue-400 shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-sm truncate">{result.name}</span>
                    {result.subject.startsWith("⚠️") && (
                      <Badge variant="destructive" className="text-[9px] px-1.5 py-0">失败</Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs gap-1 shrink-0"
                    onClick={() => navigator.clipboard.writeText(`主题：${result.subject}\n\n${result.body}`)}
                  >
                    复制
                  </Button>
                </div>
                <div className="pl-8 space-y-1.5 min-w-0 flex-1">
                  {/* 📧 邮件主题 — 明确区分 */}
                  <div className="rounded-lg border border-amber-200/60 dark:border-amber-700/30 bg-gradient-to-r from-amber-50/80 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/10 px-3 py-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-0.5">
                      <Mail className="w-3 h-3" /> 邮件主题
                    </label>
                    <p className="text-[13px] font-semibold text-foreground leading-snug truncate" title={result.subject}>
                      {result.subject}
                    </p>
                  </div>

                  {/* 📝 正文内容 */}
                  <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 mb-1">
                      <FileText className="w-3 h-3" /> 邀约正文
                    </label>
                    <div
                      className="text-[13px] leading-relaxed text-foreground/85 whitespace-pre-wrap max-h-28 overflow-y-auto"
                    >
                      {result.body}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              onClick={async () => {
                const allText = batchOutreachResults.map((r, i) =>
                  `[${i + 1}] ${r.name}\n主题：${r.subject}\n${r.body}\n${"─".repeat(40)}`
                ).join("\n\n");
                await navigator.clipboard.writeText(allText);
              }}
              className="gap-1.5"
            >
              复制全部文案
            </Button>
            <Button
              onClick={handleBatchSendEmails}
              disabled={batchSendingEmail || batchOutreachResults.length === 0 || batchOutreachResults.every(r => r.subject.startsWith("⚠️"))}
              className="gap-1.5 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white"
            >
              {batchSendingEmail ? (
                <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> 发送中 {batchSendProgress?.done ?? 0}/{batchSendProgress?.total ?? 0}</>
              ) : (
                <><Send className="w-3.5 h-3.5" /> 一键发送邮件</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Batch Send Email Results Dialog ===== */}
      <Dialog open={batchSendOpen} onOpenChange={(v) => { setBatchSendOpen(v); if (!v) { setBatchSendProgress(null); }}}>
        <DialogContent className="max-w-2xl max-h-[70vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900 dark:to-green-900 flex items-center justify-center">
                <Send className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <DialogTitle>邮件发送结果</DialogTitle>
                <DialogDescription>
                  {batchSendProgress
                    ? `进度: ${batchSendProgress.succeeded} 成功 / ${batchSendProgress.failed} 失败`
                    : "发送完成"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-2 pt-1 max-h-[400px] overflow-y-auto">
            {batchOutreachResults
              .filter(r => r.subject && !r.subject.startsWith("⚠️") && r.body)
              .map((r) => {
                const dev = developers.find(d => d.id === r.id);
                const email = dev?.email || null;
                const isSent = batchSendProgress
                  ? batchSendProgress.done > (batchSendProgress.total - batchOutreachResults.filter(x => x.subject && !x.subject.startsWith("⚠")).length + (batchSendProgress.succeeded + batchSendProgress.failed))
                    : false;
                // Simplified: show all with email as pending/sent based on progress
                return (
                  <div key={r.id} className={`flex items-center justify-between gap-3 p-2.5 rounded-lg border ${email ? "border-border/50" : "border-red-200/30 bg-red-50/10"}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      {email ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.name}</p>
                        <p className={`text-xs truncate ${email ? "text-muted-foreground" : "text-red-400 italic"}`}>{email || "无邮箱，已跳过"}</p>
                      </div>
                    </div>
                    {!email && (
                      <Badge variant="destructive" className="text-[9px]">跳过</Badge>
                    )}
                  </div>
                );
              })}
          </div>

          {batchSendProgress && (
            <div className="mt-3 p-3 rounded-lg bg-muted/30 border border-border/50">
              <p className="text-xs text-center font-medium">
                ✅ {batchSendProgress.succeeded} 发送成功 · ❌ {batchSendProgress.failed} 失败 · 共 {batchSendProgress.total} 封
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => { setBatchSendOpen(false); setBatchSendProgress(null); }}>
              关闭
            </Button>
            {batchSendProgress?.failed === 0 && batchSendProgress.succeeded > 0 && (
              <Button onClick={() => fetchDevelopers()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                更新状态
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
