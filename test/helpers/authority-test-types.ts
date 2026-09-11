import type { AuthorityEvaluationOutcome, FunctionAuthorityLifecycleStatus } from '@prisma/client';

import type { AuthorityEvaluationStatus } from '../../src/authority/policy/authority-evaluation-status.enum';

export interface AuthorityEvaluationBody {
  evaluationId: string;
  outcome: AuthorityEvaluationOutcome;
  status: AuthorityEvaluationStatus;
  explanationCodes: string[];
  requiresRevalidation?: boolean;
}

export interface FunctionAuthorityRecordBody {
  id: string;
  lifecycleStatus: FunctionAuthorityLifecycleStatus;
  activatedAt: string | null;
}

export interface GoverningSourceBody {
  id: string;
}

export function asAuthorityEvaluationBody(body: unknown): AuthorityEvaluationBody {
  return body as AuthorityEvaluationBody;
}

export function asFunctionAuthorityRecordBody(body: unknown): FunctionAuthorityRecordBody {
  return body as FunctionAuthorityRecordBody;
}

export function asGoverningSourceBody(body: unknown): GoverningSourceBody {
  return body as GoverningSourceBody;
}
