import type { AuthorityEvaluationOutcome, FunctionAuthorityLifecycleStatus } from '@prisma/client';

export interface AuthorityEvaluationBody {
  evaluationId: string;
  outcome: AuthorityEvaluationOutcome;
  explanationCodes: string[];
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
