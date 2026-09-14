import { type INestApplication } from '@nestjs/common';
import {
  AccountStatus,
  AppointmentStatus,
  AuthenticationMethodType,
  AuthorityActionType,
  AuthorityClassification,
  ControlledFunctionClass,
  FunctionAssignmentStatus,
  FunctionAuthorityLifecycleStatus,
  IdentityOfficeholderLinkStatus,
  IdentityType,
  type RedressDecisionOutcome,
  RedressRouteCategory,
  type RedressStandingOutcome,
  type RedressTimelinessOutcome,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { type PrismaService } from '../../src/database/prisma.service';
import { RedressDecisionService } from '../../src/redress/decisions/redress-decision.service';
import { RedressFilingService } from '../../src/redress/filings/redress-filing.service';
import { RedressStandingService } from '../../src/redress/filings/redress-standing.service';
import { RedressTimelinessService } from '../../src/redress/filings/redress-timeliness.service';
import { RedressRouteCatalogService } from '../../src/redress/routing/redress-route-catalog.service';
import { asLoginResponseBody } from './identity-test-types';
import {
  executeGovernmentDecision,
  NON_PRODUCTION_PHASE_8_FIXTURE_MARKER,
  requirePreRecordedDecision,
  seedPhase8Fixture,
} from './phase-8-test-fixtures';
import {
  type Phase10FixtureContext,
  type Phase10RouteFixture,
  type RedressDecisionResponse,
  type RedressFilingResponse,
  type RedressMatterResponse,
} from './phase-10-test-types';

export const NON_PRODUCTION_PHASE_10_FIXTURE_MARKER = `${NON_PRODUCTION_PHASE_8_FIXTURE_MARKER}-P10`;

const ROUTE_DEFINITIONS: {
  key: string;
  code: string;
  name: string;
  category: RedressRouteCategory;
  permitsSubstantiveChange?: boolean;
  permitsNonSubstantiveCorrection?: boolean;
  permitsDeadlineExtension?: boolean;
  requiresIndependence?: boolean;
  automaticStayOnFiling?: boolean;
}[] = [
  {
    key: 'administrativeCorrection',
    code: 'ADMIN-CORRECTION',
    name: 'Administrative Correction',
    category: RedressRouteCategory.ADMINISTRATIVE_CORRECTION,
    permitsSubstantiveChange: false,
    permitsNonSubstantiveCorrection: true,
  },
  {
    key: 'serviceComplaint',
    code: 'SERVICE-COMPLAINT',
    name: 'Service Complaint',
    category: RedressRouteCategory.SERVICE_COMPLAINT,
    permitsSubstantiveChange: false,
  },
  {
    key: 'reconsideration',
    code: 'RECONSIDERATION',
    name: 'Reconsideration',
    category: RedressRouteCategory.RECONSIDERATION,
    requiresIndependence: true,
  },
  {
    key: 'internalReview',
    code: 'INTERNAL-REVIEW',
    name: 'Internal Administrative Review',
    category: RedressRouteCategory.INTERNAL_ADMINISTRATIVE_REVIEW,
    requiresIndependence: true,
  },
  {
    key: 'statutoryAppeal',
    code: 'STATUTORY-APPEAL',
    name: 'Statutory Appeal',
    category: RedressRouteCategory.STATUTORY_APPEAL,
    permitsDeadlineExtension: true,
  },
  {
    key: 'aiChallenge',
    code: 'AI-CHALLENGE',
    name: 'AI Automation Challenge',
    category: RedressRouteCategory.AI_AUTOMATION_CHALLENGE,
  },
];

async function createReviewerSession(
  app: INestApplication<App>,
  prisma: PrismaService,
  marker: string,
  officeId: string,
): Promise<{
  reviewerIdentityId: string;
  reviewerOfficeholderId: string;
  reviewerSessionToken: string;
  reviewerAppointmentId: string;
}> {
  const loginIdentifier = `${marker}-reviewer@test.gov`;
  const person = await prisma.person.create({
    data: { givenName: 'Phase10', familyName: 'Reviewer' },
  });

  const account = await prisma.userAccount.create({
    data: {
      loginIdentifier,
      personId: person.id,
      status: AccountStatus.ACTIVE,
    },
  });

  const identity = await prisma.identity.create({
    data: {
      type: IdentityType.INDIVIDUAL,
      displayName: 'NON_PRODUCTION Phase 10 reviewer',
      userAccountId: account.id,
      personId: person.id,
    },
  });

  const officeholder = await prisma.officeholder.create({
    data: {
      code: `${marker}-REVIEWER`,
      name: 'Phase 10 Reviewer',
    },
  });

  await prisma.identityOfficeholderLink.create({
    data: {
      identityId: identity.id,
      officeholderId: officeholder.id,
      status: IdentityOfficeholderLinkStatus.ACTIVE,
    },
  });

  const appointment = await prisma.appointment.create({
    data: {
      officeId,
      officeholderId: officeholder.id,
      status: AppointmentStatus.ACTIVE,
      effectiveFrom: new Date('2020-01-01'),
    },
  });

  await request(app.getHttpServer())
    .post('/api/v1/identity/credentials')
    .send({ identityId: identity.id, type: 'PASSWORD', password: 'Phase10123!' })
    .expect(201);

  await request(app.getHttpServer())
    .post('/api/v1/identity/authentication-methods')
    .send({ identityId: identity.id, type: AuthenticationMethodType.PASSWORD })
    .expect(201);

  const login = asLoginResponseBody(
    (
      await request(app.getHttpServer())
        .post('/api/v1/identity/auth/login')
        .send({ loginIdentifier, password: 'Phase10123!' })
        .expect(201)
    ).body,
  );

  return {
    reviewerIdentityId: identity.id,
    reviewerOfficeholderId: officeholder.id,
    reviewerSessionToken: login.sessionToken,
    reviewerAppointmentId: appointment.id,
  };
}

async function setupReviewAuthority(
  prisma: PrismaService,
  marker: string,
  institutionId: string,
  officeId: string,
  governingSourceId: string,
  reviewerOfficeholderId: string,
): Promise<string> {
  const reviewFunction = await prisma.functionAuthorityRecord.create({
    data: {
      code: `${marker}-HEAR-REVIEW`,
      name: 'Phase 10 Hear Review Function',
      classification: AuthorityClassification.ABSEZ_OWNED,
      functionClass: ControlledFunctionClass.LICENSING,
      lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
      institutionId,
      officeId,
      activatedAt: new Date('2020-01-01'),
      requiresAppointment: true,
      governingSources: {
        create: { governingSourceId, isPrimary: true },
      },
      actionRights: {
        create: [
          {
            action: AuthorityActionType.HEAR_REVIEW,
            permitted: true,
            requiresHumanActor: true,
          },
        ],
      },
      assignments: {
        create: [
          {
            officeholderId: reviewerOfficeholderId,
            officeId,
            institutionId,
            status: FunctionAssignmentStatus.ACTIVE,
            effectiveFrom: new Date('2020-01-01'),
          },
        ],
      },
    },
  });

  return reviewFunction.id;
}

async function seedRedressRoutes(
  routeCatalog: RedressRouteCatalogService,
  marker: string,
  institutionId: string,
  jurisdictionId: string,
  reviewFunctionAuthorityRecordId: string,
): Promise<Record<string, Phase10RouteFixture>> {
  const routes: Record<string, Phase10RouteFixture> = {};

  for (const def of ROUTE_DEFINITIONS) {
    const definition = await routeCatalog.createDefinition({
      code: `${marker}-${def.code}`,
      name: def.name,
      category: def.category,
      institutionId,
      jurisdictionId,
      description: `NON_PRODUCTION ${def.name}`,
    });

    const version = await routeCatalog.createVersion({
      routeDefinitionId: definition.id,
      versionNumber: 1,
      filingDeadlineDays: 30,
      permitsDeadlineExtension: def.permitsDeadlineExtension ?? false,
      requiresIndependence: def.requiresIndependence ?? false,
      automaticStayOnFiling: def.automaticStayOnFiling ?? false,
      permitsSubstantiveChange: def.permitsSubstantiveChange ?? true,
      permitsNonSubstantiveCorrection: def.permitsNonSubstantiveCorrection ?? false,
      reviewFunctionAuthorityRecordId,
      effectiveFrom: new Date('2020-01-01'),
    });

    await routeCatalog.addEligibleMatter(
      version.id,
      'LICENSE_APPLICATION',
      'License application matters',
    );
    await routeCatalog.addGround(version.id, 'ERROR', 'Procedural or factual error');
    const activated = await routeCatalog.activateVersion(version.id);

    routes[def.key] = {
      routeDefinitionId: definition.id,
      routeVersionId: activated.id,
      category: def.category,
      code: def.code,
    };
  }

  return routes;
}

export async function seedPhase10Fixture(
  app: INestApplication<App>,
  prisma: PrismaService,
  options?: { governmentDecisionOutcome?: string },
): Promise<Phase10FixtureContext> {
  const marker = NON_PRODUCTION_PHASE_10_FIXTURE_MARKER;
  const phase8 = await seedPhase8Fixture(app, prisma);

  let governmentDecisionId = phase8.governmentDecisionId;
  if (!governmentDecisionId) {
    const decision = await executeGovernmentDecision(
      app,
      phase8,
      options?.governmentDecisionOutcome ?? 'REFUSED',
      { matterDecided: 'Original decision for redress testing' },
    );
    governmentDecisionId = decision.id;
  }

  const decideFunction = await prisma.functionAuthorityRecord.findUniqueOrThrow({
    where: { id: phase8.functionAuthorityRecordId },
    include: { governingSources: true },
  });
  const governingSourceId = decideFunction.governingSources[0]?.governingSourceId;
  if (!governingSourceId) {
    throw new Error('Expected governing source on decision function in Phase 10 fixture');
  }

  const reviewer = await createReviewerSession(app, prisma, marker, phase8.officeId);

  const reviewFunctionAuthorityRecordId = await setupReviewAuthority(
    prisma,
    marker,
    phase8.institutionId,
    phase8.officeId,
    governingSourceId,
    reviewer.reviewerOfficeholderId,
  );

  await prisma.functionAuthorityAssignment.createMany({
    data: [
      {
        functionAuthorityRecordId: reviewFunctionAuthorityRecordId,
        officeholderId: phase8.officialOfficeholderId,
        officeId: phase8.officeId,
        institutionId: phase8.institutionId,
        status: FunctionAssignmentStatus.ACTIVE,
        effectiveFrom: new Date('2020-01-01'),
      },
    ],
  });

  const routeCatalog = app.get(RedressRouteCatalogService);
  const routes = await seedRedressRoutes(
    routeCatalog,
    marker,
    phase8.institutionId,
    phase8.jurisdictionId,
    reviewFunctionAuthorityRecordId,
  );

  return {
    ...phase8,
    ...reviewer,
    reviewFunctionAuthorityRecordId,
    routes,
    governmentDecisionId,
  };
}

export function requireRoute(fixture: Phase10FixtureContext, key: string): Phase10RouteFixture {
  const route = fixture.routes[key];
  if (!route) {
    throw new Error(`Route fixture key "${key}" not found`);
  }
  return route;
}

export async function openRedressMatter(
  app: INestApplication<App>,
  prisma: PrismaService,
  fixture: Phase10FixtureContext,
  options?: {
    routeKey?: string;
    sessionToken?: string;
  },
): Promise<RedressMatterResponse> {
  const route = options?.routeKey ? requireRoute(fixture, options.routeKey) : undefined;
  const response = await request(app.getHttpServer())
    .post('/api/v1/redress/matters')
    .set('Authorization', `Bearer ${options?.sessionToken ?? fixture.applicantSessionToken}`)
    .send({
      caseId: fixture.caseId,
      masterAdministrativeFileId: fixture.masterAdministrativeFileId,
      challengedDecisionId: fixture.governmentDecisionId,
    })
    .expect(201);

  if (route?.routeVersionId) {
    await prisma.redressMatter.update({
      where: { id: (response.body as RedressMatterResponse).id },
      data: { routeVersionId: route.routeVersionId },
    });
  }

  return response.body as RedressMatterResponse;
}

export async function createRedressFiling(
  app: INestApplication<App>,
  fixture: Phase10FixtureContext,
  matterId: string,
  routeKey: string,
  options?: { submit?: boolean },
): Promise<RedressFilingResponse> {
  const route = requireRoute(fixture, routeKey);
  const filings = app.get(RedressFilingService);

  const created = await filings.createDraft({
    matterId,
    routeVersionId: route.routeVersionId,
    filerIdentityId: fixture.applicantIdentityId,
    requestedRouteCategory: route.category,
    summary: `Filing for ${route.code}`,
    contentReference: `ref://${route.code}`,
    contentHash: `hash-${route.code}`,
  });

  const filing: RedressFilingResponse = {
    id: created.id,
    filingNumber: created.filingNumber,
    status: created.status,
    matterId: created.matterId,
  };

  if (options?.submit) {
    const submitted = await filings.submitFiling(filing.id);
    return {
      id: submitted.id,
      filingNumber: submitted.filingNumber,
      status: submitted.status,
      matterId: submitted.matterId,
    };
  }

  return filing;
}

export async function classifyFiling(
  app: INestApplication<App>,
  _fixture: Phase10FixtureContext,
  filingId: string,
  routeKey: string,
): Promise<RedressFilingResponse> {
  const route = requireRoute(_fixture, routeKey);
  const filings = app.get(RedressFilingService);
  const classified = await filings.classifyFiling({
    filingId,
    classifiedRouteCategory: route.category,
  });

  return {
    id: classified.id,
    filingNumber: classified.filingNumber,
    status: classified.status,
    matterId: classified.matterId,
  };
}

export async function assessStanding(
  app: INestApplication<App>,
  fixture: Phase10FixtureContext,
  matterId: string,
  outcome = 'STANDING_ESTABLISHED',
) {
  const standingService = app.get(RedressStandingService);
  return standingService.assessStanding({
    matterId,
    assessorIdentityId: fixture.reviewerIdentityId,
    assessorOfficeholderId: fixture.reviewerOfficeholderId,
    functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
    appointmentId: fixture.reviewerAppointmentId,
    outcome: outcome as RedressStandingOutcome,
    explanation: 'Standing assessed on merits',
  });
}

export async function assessTimeliness(
  app: INestApplication<App>,
  fixture: Phase10FixtureContext,
  matterId: string,
  options?: {
    filingDeadline?: string;
    actualFilingDate?: string;
    outcome?: string;
  },
) {
  const timelinessService = app.get(RedressTimelinessService);
  return timelinessService.assessTimeliness({
    matterId,
    assessorIdentityId: fixture.reviewerIdentityId,
    assessorOfficeholderId: fixture.reviewerOfficeholderId,
    functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
    appointmentId: fixture.reviewerAppointmentId,
    filingDeadline: new Date(options?.filingDeadline ?? '2026-02-01'),
    actualFilingDate: new Date(options?.actualFilingDate ?? '2026-01-15'),
    outcome: (options?.outcome ?? 'TIMELY') as RedressTimelinessOutcome,
    explanation: 'Timeliness assessed',
  });
}

export async function recordRedressDecision(
  app: INestApplication<App>,
  fixture: Phase10FixtureContext,
  matterId: string,
  outcome: string,
  options?: {
    isFinalDisposition?: boolean;
    isRecommendation?: boolean;
  },
): Promise<RedressDecisionResponse> {
  const decisions = app.get(RedressDecisionService);
  const recorded = await decisions.recordDecision({
    matterId,
    outcome: outcome as RedressDecisionOutcome,
    deciderIdentityId: fixture.reviewerIdentityId,
    deciderOfficeholderId: fixture.reviewerOfficeholderId,
    functionAuthorityRecordId: fixture.reviewFunctionAuthorityRecordId,
    appointmentId: fixture.reviewerAppointmentId,
    isFinalDisposition: options?.isFinalDisposition ?? false,
    isRecommendation: options?.isRecommendation ?? false,
  });

  return {
    id: recorded.id,
    decisionNumber: recorded.decisionNumber,
    outcome: recorded.outcome,
    isFinalDisposition: recorded.isFinalDisposition,
    isRecommendation: recorded.isRecommendation,
  };
}

export { requirePreRecordedDecision };
