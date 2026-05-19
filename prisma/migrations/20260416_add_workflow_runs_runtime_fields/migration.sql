-- AlterTable
ALTER TABLE "workflow_runs" ADD COLUMN "task_id" TEXT;
ALTER TABLE "workflow_runs" ADD COLUMN "workflow_key" TEXT;
ALTER TABLE "workflow_runs" ADD COLUMN "batch_id" TEXT;
ALTER TABLE "workflow_runs" ADD COLUMN "progress_done" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "workflow_runs" ADD COLUMN "progress_total" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "workflow_runs" ADD COLUMN "progress_succeeded" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "workflow_runs" ADD COLUMN "progress_failed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "workflow_runs" ADD COLUMN "progress_skipped" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "workflow_runs" ADD COLUMN "current_target_id" TEXT;
ALTER TABLE "workflow_runs" ADD COLUMN "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "workflow_runs" ADD COLUMN "updatedAt" DATETIME;

-- CreateIndex
CREATE INDEX "workflow_runs_workflow_key_createdAt_idx" ON "workflow_runs"("workflow_key", "createdAt");
CREATE INDEX "workflow_runs_task_id_idx" ON "workflow_runs"("task_id");
CREATE INDEX "workflow_runs_batch_id_idx" ON "workflow_runs"("batch_id");
