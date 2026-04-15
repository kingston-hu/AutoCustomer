// Re-export Prisma types for convenience across the app
//
// NOTE: After `prisma db pull --force`, all models are plural and enums are gone (SQLite).
//       Model types are re-exported from @prisma/client with their NEW (plural) names.
//       Enum values are now plain strings — import from "@/lib/constants" for values.

// Prisma generates these as TypeScript types (not values), so we can re-export them.
// The actual type names in @prisma/client follow the model names from schema.prisma.

export type {
  users,
  developers,
  developer_projects,
  leads,
  campaigns,
  campaign_leads,
  outreach_logs,
  interactions,
  workflow_definitions,
  workflow_runs,
  ai_model_configs,
  task_queue,
} from "@prisma/client";

// Convenience aliases so existing code doesn't need to change everywhere
export type User = any; // users;
export type Developer = any; // developers;
export type DeveloperProject = any; // developer_projects;
export type Lead = any; // leads;
export type Campaign = any; // campaigns;
export type CampaignLead = any; // campaign_leads;
export type OutreachLog = any; // outreach_logs;
export type Interaction = any; // interactions;
export type WorkflowDefinition = any; // workflow_definitions;
export type WorkflowRun = any; // workflow_runs;
export type AiModelConfig = any; // ai_model_configs;
export type TaskQueue = any; // task_queue;

// Enum types are now string unions — import constants from "@/lib/constants" for values
export type UserRole = string;
export type DevStatus = string;
export type Priority = string;
export type LeadSource = string;
export type LeadCategory = string;
export type CompanySize = string;
export type SalesStage = string;
export type CampaignType = string;
export type CampaignStatus = string;
export type TargetType = string;
export type Channel = string;
export type SendStatus = string;
export type InteractionType = string;
export type Direction = string;
export type Sentiment = string;
export type RunStatus = string;
export type AiProvider = string;
export type TaskType = string;
export type TaskStatus = string;
