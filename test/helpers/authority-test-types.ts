import {
  type AuthorityClassification,
  type AuthorityLifecycleState,
  type ControlledFunctionClass,
} from '@prisma/client';

export interface FunctionAuthorityRecordBody {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  functionClass: ControlledFunctionClass;
  authorityClassification: AuthorityClassification;
  lifecycleState: AuthorityLifecycleState;
  institutionId: string;
  departmentId?: string | null;
  effectiveFrom?: string | null;
  effectiveUntil?: string | null;
  revalidationAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function asFunctionAuthorityRecordBody(body: unknown): FunctionAuthorityRecordBody {
  return body as FunctionAuthorityRecordBody;
}

export function asFunctionAuthorityRecordListBody(body: unknown): FunctionAuthorityRecordBody[] {
  return body as FunctionAuthorityRecordBody[];
}
