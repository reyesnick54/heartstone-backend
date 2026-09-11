import {
  type AuthorityClassification,
  type AuthorityLifecycleState,
  type ControlledFunctionClass,
  type FunctionSourceInterpretationStatus,
  type FunctionSourceRelationshipType,
  type GoverningSourceRelationshipType,
  type GoverningSourceStatus,
  type GoverningSourceType,
  type SourceAuthenticationStatus,
  type SourceFoundationValidity,
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

export interface GoverningSourceBody {
  id: string;
  sourceCode: string;
  title: string;
  sourceType: GoverningSourceType;
  issuer: string | null;
  jurisdictionId: string | null;
  instrumentDate: string | null;
  effectiveDate: string | null;
  commencementDate: string | null;
  expiryDate: string | null;
  authenticationStatus: SourceAuthenticationStatus;
  sourceStatus: GoverningSourceStatus;
  officialLocationRef: string | null;
  documentFingerprint: string | null;
  classificationMetadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface FunctionGoverningSourceBody {
  id: string;
  functionAuthorityRecordId: string;
  governingSourceId: string;
  provisionCitation: string | null;
  relationshipType: FunctionSourceRelationshipType;
  isPrimary: boolean;
  interpretationStatus: FunctionSourceInterpretationStatus;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoverningSourceRelationshipBody {
  id: string;
  sourceId: string;
  relatedSourceId: string;
  relationshipType: GoverningSourceRelationshipType;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  notes: string | null;
  createdAt: string;
}

export interface SourceFoundationEvaluationBody {
  validity: SourceFoundationValidity;
  reasons: string[];
  evaluatedAt: string;
  primarySourceIds: string[];
  blockingSourceIds: string[];
}

export function asGoverningSourceBody(body: unknown): GoverningSourceBody {
  return body as GoverningSourceBody;
}

export function asFunctionGoverningSourceBody(body: unknown): FunctionGoverningSourceBody {
  return body as FunctionGoverningSourceBody;
}

export function asFunctionGoverningSourceListBody(body: unknown): FunctionGoverningSourceBody[] {
  return body as FunctionGoverningSourceBody[];
}

export function asGoverningSourceRelationshipListBody(
  body: unknown,
): GoverningSourceRelationshipBody[] {
  return body as GoverningSourceRelationshipBody[];
}

export function asSourceFoundationEvaluationBody(body: unknown): SourceFoundationEvaluationBody {
  return body as SourceFoundationEvaluationBody;
}
