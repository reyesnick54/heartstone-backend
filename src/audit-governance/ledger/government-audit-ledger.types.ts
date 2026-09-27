import { type GovernmentAuditActorType, type Prisma } from '@prisma/client';

export interface AppendGovernmentAuditLedgerInput {
  ledgerStreamKey?: string;
  eventType: string;
  occurredAt?: Date;
  actorType?: GovernmentAuditActorType;
  actorIdentityId?: string;
  actorOfficeholderId?: string;
  sessionId?: string;
  jurisdictionId?: string;
  institutionId?: string;
  departmentId?: string;
  officeId?: string;
  resourceType?: string;
  resourceId?: string;
  action: string;
  outcome?: string;
  authorityEvaluationRecordId?: string;
  permissionDecisionReference?: string;
  priorStateHash?: string;
  newStateHash?: string;
  metadata?: Record<string, unknown>;
  correlationId?: string;
  traceId?: string;
  sourceDomainEventType?: string;
  sourceDomainEventId?: string;
}

export interface LedgerVerificationRangeInput {
  ledgerStreamKey: string;
  fromSequence?: bigint;
  toSequence?: bigint;
}

export interface LedgerVerificationResult {
  ledgerStreamKey: string;
  intact: boolean;
  entriesVerified: number;
  firstBrokenSequence?: bigint;
  failureReason?: string;
}

export type GovernmentAuditLedgerClient = Pick<
  Prisma.TransactionClient,
  'governmentAuditLedgerEntry' | '$executeRaw' | '$queryRaw'
>;
