import { type IdentityType } from '@prisma/client';

export interface OfficialAppointmentContext {
  appointmentId: string;
  officeholderId: string;
  officeId: string;
  officeName: string;
  officeCode: string;
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  institutionId: string;
  institutionName: string;
  institutionCode: string;
  status: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
}

export interface OfficialDelegationContext {
  delegationId: string;
  institutionId: string;
  institutionName: string;
  scopeDescription: string;
  status: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  recipientOfficeholderId: string | null;
  recipientOfficeId: string | null;
}

export interface OfficialOfficeholderLinkContext {
  linkId: string;
  officeholderId: string;
  officeholderName: string;
  officeholderCode: string;
  status: string;
}

export interface OfficialInstitutionalContext {
  institutionIds: string[];
  departmentIds: string[];
  officeIds: string[];
  jurisdictionIds: string[];
}

export interface OfficialTechnicalCapabilities {
  canAccessOfficialWorkspace: boolean;
  hasActiveAppointment: boolean;
  hasOfficeholderLink: boolean;
  substantiveAccessAllowed: boolean;
  isServiceIdentity: boolean;
  isTechnicalAdminOnly: boolean;
}

export interface OfficialScope {
  identityId: string;
  officeholderIds: string[];
  institutionIds: string[];
  departmentIds: string[];
  officeIds: string[];
  appointmentIds: string[];
  activeDelegations: OfficialDelegationContext[];
  primaryAppointment: OfficialAppointmentContext | null;
}

export interface ResolvedOfficialContext {
  identityId: string;
  identityType: IdentityType;
  displayName: string;
  assuranceLevel: string;
  userAccountId: string | null;
  officeholderLinks: OfficialOfficeholderLinkContext[];
  activeAppointments: OfficialAppointmentContext[];
  activeDelegations: OfficialDelegationContext[];
  institutionalContext: OfficialInstitutionalContext;
  technicalCapabilities: OfficialTechnicalCapabilities;
  authorityDisclaimer: string;
  scope: OfficialScope;
}

export type CaseAccessKind = 'ASSIGNED' | 'CASE_MANAGER' | 'DEPARTMENT_POOL' | 'DENIED';

export interface CaseAccessEvaluation {
  allowed: boolean;
  accessKind: CaseAccessKind;
  reason: string;
}
