import { type PlatformAdministrativeAccessScope } from '@prisma/client';

export interface PlatformAdminPolicyCapabilities {
  permissionCode: string;
  scope: PlatformAdministrativeAccessScope;
  canConfigureServices: boolean;
  canConfigureForms: boolean;
  canConfigureWorkflows: boolean;
  canConfigureIntegrations: boolean;
  canConfigureCommunications: boolean;
  canViewSecurity: boolean;
  canViewReadiness: boolean;
  substantiveAccessDenied: boolean;
  institutionIds: string[];
  departmentIds: string[];
}

export interface ResolvedPlatformAdminContext {
  identityId: string;
  displayName: string;
  assuranceLevel: string;
  userAccountId: string | null;
  policy: PlatformAdminPolicyCapabilities;
  hasSubstantiveGovernmentAuthority: false;
  authorityDisclaimer: string;
  configurationDisclaimer: string;
}
