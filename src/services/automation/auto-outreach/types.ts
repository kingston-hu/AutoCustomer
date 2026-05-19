export type WorkflowKey = "zoho-fixed" | "163-fixed";

export type SmtpOverride = {
  host: string;
  port: number;
  user: string;
  pass: string;
  from?: string;
};

export type AutoOutreachJobPayload = {
  workflowKey: WorkflowKey;
  templateName: string;
  outline: string;
  limit: number;
  offset: number;
  dryRun: boolean;
  delayMs: number;
  requireEmail: boolean;
  pureFixedMode: boolean;
  fixedSubject: string;
  fixedBody: string;
  resumeOnlyUnsent: boolean;
  selectedDeveloperIds: string[];
  smtpOverride: SmtpOverride | null;
  batchId: string | null;
  batchEmails: string[];
  requestedAt: string;
};

export type AutoOutreachCreateJobInput = {
  workflowKey?: string;
  templateName?: string;
  limit?: number;
  offset?: number;
  dryRun?: boolean;
  delayMs?: number;
  requireEmail?: boolean;
  fixedSubject?: string;
  fixedBody?: string;
  resumeOnlyUnsent?: boolean;
  selectedDeveloperIds?: string[];
  smtpOverride?: Partial<SmtpOverride> | null;
  batchId?: string | null;
  batchEmails?: string[];
};
