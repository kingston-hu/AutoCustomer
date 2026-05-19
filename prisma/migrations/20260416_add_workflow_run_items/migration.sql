-- CreateTable
CREATE TABLE "workflow_run_items" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "run_id" TEXT NOT NULL,
  "task_id" TEXT,
  "workflow_key" TEXT,
  "batch_id" TEXT,
  "target_type" TEXT NOT NULL,
  "target_id" TEXT NOT NULL,
  "email" TEXT,
  "status" TEXT NOT NULL,
  "reason_code" TEXT,
  "subject" TEXT,
  "error" TEXT,
  "meta" JSONB,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "workflow_run_items_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "workflow_runs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "workflow_run_items_run_id_createdAt_idx" ON "workflow_run_items"("run_id", "createdAt");
CREATE INDEX "workflow_run_items_task_id_idx" ON "workflow_run_items"("task_id");
CREATE INDEX "workflow_run_items_batch_id_idx" ON "workflow_run_items"("batch_id");
CREATE INDEX "workflow_run_items_status_reason_code_idx" ON "workflow_run_items"("status", "reason_code");
CREATE INDEX "workflow_run_items_target_type_target_id_idx" ON "workflow_run_items"("target_type", "target_id");
