import { type TechnicalAccessScopeType } from '@prisma/client';

export interface RequestPermissionScope {
  scopeType?: TechnicalAccessScopeType;
  jurisdictionId?: string;
  institutionId?: string;
  governmentBodyId?: string;
  departmentId?: string;
  officeId?: string;
}

export interface PermissionScopeBinding {
  institutionIdParam?: string;
  jurisdictionIdParam?: string;
  governmentBodyIdParam?: string;
  departmentIdParam?: string;
  officeIdParam?: string;
}
