import { type DashboardSensitivityLevel } from '@prisma/client';

import { type ActorContext } from '../../../identity/auth/context/actor-context.types';

export interface ExecutiveBriefingScope {
  dashboardDefinitionId: string;
  institutionId: string;
  sensitivityLevel: DashboardSensitivityLevel;
  dashboardCode: string;
  dashboardName: string;
}

export interface ResolvedExecutiveContext {
  actor: ActorContext;
  briefingScopes: ExecutiveBriefingScope[];
  primaryInstitutionId: string;
  institutionIds: string[];
  hasExecutiveBriefingAccess: boolean;
  isTechnicalAdminOnly: boolean;
  authorityDisclaimer: string;
  visibilityDoesNotCreateAuthority: true;
  executiveDashboardIsNotCommandAuthority: true;
}
