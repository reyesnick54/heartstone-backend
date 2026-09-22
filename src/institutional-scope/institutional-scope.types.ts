import { type IdentityType, type RepresentativeAuthorityStatus } from '@prisma/client';

import { type SessionContextDto } from '../identity/auth/dto/session-context.dto';

/** Canonical scoped resource types enforced by the institutional scope layer. */
export enum ScopedResourceType {
  INSTITUTION = 'institution',
  DEPARTMENT = 'department',
  OFFICE = 'office',
  IDENTITY = 'identity',
  ORGANIZATION = 'organization',
  CASE = 'case',
  APPLICATION = 'application',
  MASTER_ADMINISTRATIVE_FILE = 'master_administrative_file',
  EVIDENCE_PACKET = 'evidence_packet',
  EVIDENCE_RECORD = 'evidence_record',
  OFFICIAL_INSTRUMENT = 'official_instrument',
  COMPLIANCE_MATTER = 'compliance_matter',
  CORPORATE_REGISTRY_PROFILE = 'corporate_registry_profile',
  REDRESS_MATTER = 'redress_matter',
  DASHBOARD = 'dashboard',
  STRATEGIC_PROJECT = 'strategic_project',
  GOVERNMENT_DECISION = 'government_decision',
}

/** Distinguishes visibility, modification, and consequential government action intent. */
export enum ScopeAccessIntent {
  VISIBILITY = 'visibility',
  MODIFICATION = 'modification',
  CONSEQUENTIAL_ACTION = 'consequential_action',
}

export enum ScopeAccessPath {
  APPLICANT = 'applicant',
  REPRESENTATIVE = 'representative',
  ORGANIZATION_MEMBER = 'organization_member',
  OFFICIAL = 'official',
  SELF = 'self',
}

export enum ScopeDenialReason {
  RESOURCE_NOT_FOUND = 'resource_not_found',
  UNRESOLVED_OWNERSHIP = 'unresolved_ownership',
  AMBIGUOUS_SCOPE = 'ambiguous_scope',
  MISSING_INSTITUTIONAL_LINKAGE = 'missing_institutional_linkage',
  CROSS_INSTITUTION = 'cross_institution',
  CROSS_DEPARTMENT = 'cross_department',
  CROSS_ORGANIZATION = 'cross_organization',
  CROSS_CASE = 'cross_case',
  CROSS_APPLICANT = 'cross_applicant',
  REPRESENTATION_OUT_OF_SCOPE = 'representation_out_of_scope',
  INACTIVE_REPRESENTATIVE = 'inactive_representative',
  TECHNICAL_ADMIN_SUBSTANTIVE_DENIED = 'technical_admin_substantive_denied',
  SERVICE_IDENTITY_DENIED = 'service_identity_denied',
  RAW_UUID_INSUFFICIENT = 'raw_uuid_insufficient',
  MODIFICATION_NOT_PERMITTED = 'modification_not_permitted',
}

export interface InstitutionalOwnership {
  institutionId?: string;
  departmentId?: string;
  officeId?: string;
  caseId?: string;
  applicationId?: string;
  applicantIdentityId?: string;
  organizationId?: string;
  masterAdministrativeFileId?: string;
  holderIdentityId?: string;
  representativeAuthorityId?: string;
  isRestricted?: boolean;
}

export interface OfficialInstitutionalContext {
  officeholderId: string;
  officeIds: string[];
  departmentIds: string[];
  institutionIds: string[];
}

export interface ActorRepresentativeAuthority {
  id: string;
  organizationId: string;
  identityId: string;
  status: RepresentativeAuthorityStatus;
  effectiveFrom: Date;
  effectiveUntil: Date | null;
}

export interface ActorScopeContext {
  identityId: string;
  sessionId?: string;
  userAccountId?: string | null;
  identityType: IdentityType;
  officialContext: OfficialInstitutionalContext[];
  representativeAuthorities: ActorRepresentativeAuthority[];
  organizationMembershipIds: string[];
  isTechnicalAdministrator: boolean;
}

export interface ScopeEvaluationRequest {
  resourceType: ScopedResourceType;
  resourceId: string;
  intent: ScopeAccessIntent;
  actor: ActorScopeContext;
  /** When evaluating representative access against a specific application. */
  representativeAuthorityId?: string;
}

export interface ScopeEvaluationResult {
  allowed: boolean;
  reason: ScopeDenialReason | 'granted';
  accessPath?: ScopeAccessPath;
  ownership?: InstitutionalOwnership;
  /** Scope boundary passed; AuthorityEvaluationService must still evaluate consequential actions. */
  requiresAuthorityEvaluation?: boolean;
}

export interface BuildActorContextInput {
  session: SessionContextDto;
  isTechnicalAdministrator?: boolean;
}

/** Resources that require institutional linkage for non-applicant access. */
export const INSTITUTIONALLY_RESTRICTED_RESOURCE_TYPES = new Set<ScopedResourceType>([
  ScopedResourceType.CASE,
  ScopedResourceType.MASTER_ADMINISTRATIVE_FILE,
  ScopedResourceType.EVIDENCE_PACKET,
  ScopedResourceType.EVIDENCE_RECORD,
  ScopedResourceType.COMPLIANCE_MATTER,
  ScopedResourceType.REDRESS_MATTER,
  ScopedResourceType.GOVERNMENT_DECISION,
  ScopedResourceType.DASHBOARD,
  ScopedResourceType.STRATEGIC_PROJECT,
]);
