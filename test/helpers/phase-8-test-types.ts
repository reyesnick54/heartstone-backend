import { type DecisionOutcomeCode, type DecisionTypeLifecycleStatus } from '@prisma/client';

export interface DecisionTypeBody {
  id: string;
  code: string;
}

export interface DecisionTypeVersionBody {
  id: string;
  version: number;
  functionAuthorityRecordId: string;
  status: DecisionTypeLifecycleStatus;
  permissibleOutcomeCodes: DecisionOutcomeCode[];
}

export function asDecisionTypeBody(body: unknown): DecisionTypeBody {
  return body as DecisionTypeBody;
}

export function asDecisionTypeVersionBody(body: unknown): DecisionTypeVersionBody {
  return body as DecisionTypeVersionBody;
}

export function asDecisionTypeVersionList(body: unknown): DecisionTypeVersionBody[] {
  return body as DecisionTypeVersionBody[];
}
