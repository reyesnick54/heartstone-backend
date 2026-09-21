import { type AuthorityActionType } from '@prisma/client';

import { type PrismaService } from '../../database/prisma.service';
import { type SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { type FunctionAuthorityRecordsService } from '../function-authority-records/function-authority-records.service';

export interface ConsequentialActionRequest {
  body?: Record<string, unknown>;
  params?: Record<string, string>;
  query?: Record<string, string>;
}

export interface ConsequentialActionContext {
  session: SessionContextDto;
  request: ConsequentialActionRequest;
  prisma: PrismaService;
  functionRecords: FunctionAuthorityRecordsService;
}

export interface ConsequentialResourceScope {
  institutionId?: string;
  departmentId?: string;
  officeId?: string;
  scopeValue?: string;
}

export type ConsequentialFunctionResolver = (
  context: ConsequentialActionContext,
) => Promise<string | null>;

export type ConsequentialResourceScopeResolver = (
  context: ConsequentialActionContext,
) => Promise<ConsequentialResourceScope | null>;

export interface ConsequentialInstitutionalContext {
  officeholderId?: string;
  officeId?: string;
  appointmentId?: string;
  delegationId?: string;
}

export interface ConsequentialActionMetadata {
  action: AuthorityActionType;
  functionAuthorityRecordId?: string;
  functionCode?: string;
  functionResolver?: ConsequentialFunctionResolver;
  resourceResolver?: ConsequentialResourceScopeResolver;
  /** Body field prefixes for institutional actor fields (default includes decisionMaker, issuer, reviewer). */
  institutionalFieldPrefixes?: string[];
  /** When true (default for final-decision actions), non-human identities fail closed. */
  requireHumanActor?: boolean;
}

export interface ConsequentialActionDenial {
  message: string;
  outcome: string;
  status: string;
  explanationCodes: string[];
  evaluationId?: string;
  summary: string;
  safeHalt: boolean;
  requiresRevalidation: boolean;
}

export const DEFAULT_INSTITUTIONAL_FIELD_PREFIXES = [
  'decisionMaker',
  'issuer',
  'proposedDecisionMaker',
  'reviewer',
  'actor',
] as const;

export const FINAL_DECISION_ACTIONS: ReadonlySet<AuthorityActionType> = new Set([
  'APPROVE',
  'DECIDE',
  'SIGN',
  'ISSUE',
  'ENFORCE',
  'HEAR_REVIEW',
  'SUSPEND',
  'REVOKE',
] as AuthorityActionType[]);
