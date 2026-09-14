import { type RedressRouteCategory } from '@prisma/client';

import { type Phase8FixtureContext } from './phase-8-test-fixtures';

export interface Phase10RouteFixture {
  routeDefinitionId: string;
  routeVersionId: string;
  category: RedressRouteCategory;
  code: string;
}

export interface Phase10ReviewerContext {
  reviewerIdentityId: string;
  reviewerOfficeholderId: string;
  reviewerSessionToken: string;
  reviewerAppointmentId: string;
}

export interface Phase10FixtureContext extends Phase8FixtureContext, Phase10ReviewerContext {
  reviewFunctionAuthorityRecordId: string;
  routes: Record<string, Phase10RouteFixture>;
  governmentDecisionId: string;
}

export interface RedressMatterResponse {
  id: string;
  matterNumber: string;
  status: string;
}

export interface RedressFilingResponse {
  id: string;
  filingNumber: string;
  status: string;
  matterId: string;
}

export interface RedressDecisionResponse {
  id: string;
  decisionNumber: string;
  outcome: string;
  isFinalDisposition: boolean;
  isRecommendation: boolean;
}

export interface AdministrativeCorrectionResponse {
  altersSubstantiveOutcome: boolean;
  originalPreserved: boolean;
}

export interface ComplaintClassificationResponse {
  id: string;
}

export interface ComplaintInvestigationResponse {
  id: string;
}

export interface ReviewSnapshotResponse {
  id: string;
  isImmutable: boolean;
}

export interface ReconsiderationProceedingResponse {
  originalPreserved: boolean;
}

export interface ReviewAssignmentResponse {
  id: string;
}

export interface ReviewIndependenceResponse {
  outcome: string;
}

export interface DeadlineExtensionResponse {
  id: string;
  outcome?: string;
}

export interface InterimReliefResponse {
  id: string;
  outcome?: string;
  request?: { outcome?: string };
}

export interface ExternalReferralResponse {
  id: string;
}

export interface AutomationChallengeResponse {
  id: string;
}

export interface AutomationChallengeDispositionResponse {
  outcome: string;
}

export function asAdministrativeCorrectionResponse(
  body: unknown,
): AdministrativeCorrectionResponse {
  return body as AdministrativeCorrectionResponse;
}

export function asComplaintClassificationResponse(body: unknown): ComplaintClassificationResponse {
  return body as ComplaintClassificationResponse;
}

export function asComplaintInvestigationResponse(body: unknown): ComplaintInvestigationResponse {
  return body as ComplaintInvestigationResponse;
}

export function asReviewSnapshotResponse(body: unknown): ReviewSnapshotResponse {
  return body as ReviewSnapshotResponse;
}

export function asReconsiderationProceedingResponse(
  body: unknown,
): ReconsiderationProceedingResponse {
  return body as ReconsiderationProceedingResponse;
}

export function asReviewAssignmentResponse(body: unknown): ReviewAssignmentResponse {
  return body as ReviewAssignmentResponse;
}

export function asReviewIndependenceResponse(body: unknown): ReviewIndependenceResponse {
  return body as ReviewIndependenceResponse;
}

export function asDeadlineExtensionResponse(body: unknown): DeadlineExtensionResponse {
  return body as DeadlineExtensionResponse;
}

export function asInterimReliefResponse(body: unknown): InterimReliefResponse {
  return body as InterimReliefResponse;
}

export function asExternalReferralResponse(body: unknown): ExternalReferralResponse {
  return body as ExternalReferralResponse;
}

export function asAutomationChallengeResponse(body: unknown): AutomationChallengeResponse {
  return body as AutomationChallengeResponse;
}

export function asAutomationChallengeDispositionResponse(
  body: unknown,
): AutomationChallengeDispositionResponse {
  return body as AutomationChallengeDispositionResponse;
}
