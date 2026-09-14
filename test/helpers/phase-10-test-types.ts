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
