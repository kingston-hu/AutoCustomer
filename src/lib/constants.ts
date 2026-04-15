/**
 * 共享常量 — 替代 Prisma 枚举（SQLite 不支持原生枚举）
 *
 * 所有需要引用"枚举值"的文件从此处导入字符串常量
 */

// ===== Developer =====
export const DevStatus = {
  NEW: "NEW",
  ANALYZING: "ANALYZING",
  ANALYZED: "ANALYZED",
  APPROVED: "APPROVED",
  CONTACTED: "CONTACTED",
  INTERESTED: "INTERESTED",
  REPLIED: "REPLIED",
  CONVERTED: "CONVERTED",
  DISQUALIFIED: "DISQUALIFIED",
} as const;

export const Priority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;

// ===== Lead =====
export const LeadSource = {
  GITHUB: "GITHUB",
  LINKEDIN: "LINKEDIN",
  INDUSTRY_DIRECTORY: "INDUSTRY_DIRECTORY",
  SOCIAL_MEDIA: "SOCIAL_MEDIA",
  FORUM: "FORUM",
  JOB_POSTING: "JOB_POSTING",
  WEB_SCRAPER: "WEB_SCRAPER",
  API_FEED: "API_FEED",
  MANUAL_IMPORT: "MANUAL_IMPORT",
} as const;

export const CompanySize = {
  STARTUP_1_10: "STARTUP_1_10",
  SMB_11_50: "SMB_11_50",
  MID_51_200: "MID_51_200",
  LARGE_201_1000: "LARGE_201_1000",
  ENTERPRISE_1000_PLUS: "ENTERPRISE_1000_PLUS",
} as const;

export const LeadCategory = {
  DATA_ANALYTICS: "DATA_ANALYTICS",
  ECOMMERCE_MONITORING: "ECOMMERCE_MONITORING",
  MARKET_RESEARCH: "MARKET_RESEARCH",
  SOCIAL_MARKETING: "SOCIAL_MARKETING",
  SALES_INTELLIGENCE: "SALES_INTELLIGENCE",
  OTHER: "OTHER",
} as const;

export const SalesStage = {
  NEW: "NEW",
  CONTACTED: "CONTACTED",
  QUALIFIED: "QUALIFIED",
  TRIAL_STARTED: "TRIAL_STARTED",
  MEETING_SCHEDULED: "MEETING_SCHEDULED",
  NEGOTIATING: "NEGOTIATING",
  WON: "WON",
  LOST: "LOST",
  CHURNED: "CHURNED",
} as const;

// ===== Campaign =====
export const CampaignType = {
  DEVELOPER_RECRUIT: "DEVELOPER_RECRUIT",
  CUSTOMER_GROWTH: "CUSTOMER_GROWTH",
} as const;

export const CampaignStatus = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  RUNNING: "RUNNING",
  PAUSED: "PAUSED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

// ===== Outreach =====
export const TargetType = {
  DEVELOPER: "DEVELOPER",
  LEAD: "LEAD",
} as const;

export const Channel = {
  EMAIL: "EMAIL",
  LINKEDIN_DM: "LINKEDIN_DM",
} as const;

export const SendStatus = {
  PENDING: "PENDING",
  SENT: "SENT",
  DELIVERED: "DELIVERED",
  OPENED: "OPENED",
  REPLIED: "REPLIED",
  BOUNCED: "BOUNCED",
  FAILED: "FAILED",
} as const;

// ===== Workflow / Task =====
export const RunStatus = {
  PENDING: "PENDING",
  RUNNING: "RUNNING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

// ===== AI =====
export const AiProvider = {
  DEEPSEEK: "DEEPSEEK",
  OPENAI: "OPENAI",
  QWEN: "QWEN",
} as const;

// ===== Interaction =====
export const Sentiment = {
  POSITIVE: "POSITIVE",
  NEUTRAL: "NEUTRAL",
  NEGATIVE: "NEGATIVE",
} as const;
