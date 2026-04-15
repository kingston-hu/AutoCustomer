-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatar_url" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "preferences" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "developers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "githubId" TEXT,
    "username" TEXT NOT NULL,
    "display_name" TEXT,
    "bio" TEXT,
    "avatar_url" TEXT,
    "location" TEXT,
    "company" TEXT,
    "blog" TEXT,
    "profileAnalysis" JSONB,
    "skillTags" TEXT NOT NULL DEFAULT '',
    "techStack" TEXT NOT NULL DEFAULT '',
    "languageStats" JSONB,
    "overallScore" REAL NOT NULL DEFAULT 0,
    "activityScore" REAL NOT NULL DEFAULT 0,
    "expertiseScore" REAL NOT NULL DEFAULT 0,
    "fitScore" REAL NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "notes" TEXT,
    "assigned_to" TEXT,
    "last_sync_at" DATETIME,
    "rawData" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "developer_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "developer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "language" TEXT,
    "topics" TEXT DEFAULT '',
    "is_fork" BOOLEAN NOT NULL DEFAULT false,
    "primary_language" TEXT,
    "updated_at" TEXT,
    CONSTRAINT "developer_projects_developer_id_fkey" FOREIGN KEY ("developer_id") REFERENCES "developers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT,
    "source_url" TEXT,
    "company_name" TEXT,
    "contact_name" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "contact_title" TEXT,
    "website" TEXT,
    "linkedin_url" TEXT,
    "industry" TEXT,
    "company_size" TEXT,
    "annual_revenue" TEXT,
    "ai_category" TEXT,
    "aiAnalysis" JSONB,
    "painPoints" TEXT DEFAULT '',
    "potential_value" INTEGER,
    "stage" TEXT NOT NULL DEFAULT 'NEW',
    "assigned_to" TEXT,
    "contacted_at" DATETIME,
    "followup_at" DATETIME,
    "warm_score" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "tags" TEXT DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "target_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduled_at" DATETIME,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "total_sent" INTEGER NOT NULL DEFAULT 0,
    "total_replied" INTEGER NOT NULL DEFAULT 0,
    "total_converted" INTEGER NOT NULL DEFAULT 0,
    "creator_id" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "campaigns_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "campaign_leads" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaign_id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    CONSTRAINT "campaign_leads_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "campaign_leads_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "outreach_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "subject" TEXT,
    "body" TEXT,
    "template_id" TEXT,
    "ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "ai_prompt" TEXT,
    "ai_model_used" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sent_at" DATETIME,
    "delivered_at" DATETIME,
    "opened_at" DATETIME,
    "replied_at" DATETIME,
    "bounced_at" DATETIME,
    "error" TEXT,
    "campaign_id" TEXT,
    "sent_by" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "outreach_logs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "interactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "metadata" JSONB,
    "ai_suggestion" TEXT,
    "sentiment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "workflow_definitions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "definition" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "workflow_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workflow_id" TEXT NOT NULL,
    "campaign_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "current_step" TEXT,
    "context" JSONB,
    "result" JSONB,
    "error" TEXT,
    "logs" JSONB,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    CONSTRAINT "workflow_runs_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflow_definitions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "workflow_runs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ai_model_configs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "api_key_encrypted" TEXT NOT NULL,
    "capabilities" TEXT DEFAULT '',
    "default_for" TEXT,
    "maxTokens" INTEGER NOT NULL DEFAULT 4096,
    "temperature" REAL NOT NULL DEFAULT 0.7,
    "cost_per_1k_tokens" REAL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "usage_stats" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "task_queue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "scheduled_at" DATETIME,
    "started_at" DATETIME,
    "completed_at" DATETIME,
    "error" TEXT,
    "result" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "developers_githubId_key" ON "developers"("githubId");

-- CreateIndex
CREATE UNIQUE INDEX "developers_username_key" ON "developers"("username");

-- CreateIndex
CREATE INDEX "leads_source_type_source_id_idx" ON "leads"("source_type", "source_id");

-- CreateIndex
CREATE INDEX "leads_ai_category_idx" ON "leads"("ai_category");

-- CreateIndex
CREATE INDEX "leads_stage_idx" ON "leads"("stage");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_leads_campaign_id_lead_id_key" ON "campaign_leads"("campaign_id", "lead_id");

-- CreateIndex
CREATE INDEX "outreach_logs_target_type_target_id_idx" ON "outreach_logs"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "outreach_logs_status_idx" ON "outreach_logs"("status");

-- CreateIndex
CREATE INDEX "interactions_target_type_target_id_idx" ON "interactions"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "workflow_runs_status_idx" ON "workflow_runs"("status");

-- CreateIndex
CREATE INDEX "task_queue_status_type_scheduled_at_idx" ON "task_queue"("status", "type", "scheduled_at");
