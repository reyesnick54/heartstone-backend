import { type INestApplication } from '@nestjs/common';
import {
  DevelopmentAccessActorKind,
  FreeZoneCustomsCoordinationStatus,
  FunctionAuthorityLifecycleStatus,
  ImmigrationActorPersona,
  PublicSafetyServiceRequestKind,
  PublicSafetyServiceRequestStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { AbsezArticle9ServicePathMatrixService } from '../src/absez/s18f/article9/absez-article9-service-path-matrix.service';
import { FreeZoneCustomsService } from '../src/absez/s18f/customs/free-zone-customs.service';
import { FreeZoneCustomsBoundaryService } from '../src/absez/s18f/customs/free-zone-customs-boundary.service';
import { InvestorResidencyProgramService } from '../src/absez/s18f/immigration/investor-residency-program.service';
import { InvestorRelationsService } from '../src/absez/s18f/investor-relations/investor-relations.service';
import { ZoneLandLeaseService } from '../src/absez/s18f/land/zone-land-lease.service';
import { PrismaService } from '../src/database/prisma.service';
import { DevelopmentApplicationWorkflowService } from '../src/planning-construction/applications/development-application-workflow.service';
import { PublicSafetyServiceRequestMutationService } from '../src/public-safety/requests/public-safety-service-request-mutation.service';
import { AbsezSetupBootstrapService } from '../src/setup/bootstrap/absez-setup-bootstrap.service';
import { ABSEZ_ARTICLE9_DEPARTMENTS } from '../src/setup/data/absez-article9-departments.data';
import { ABSEZ_INSTITUTION_CODE, ANTIGUA_JURISDICTION_CODE } from '../src/setup/setup.constants';
import { seedBusinessExperienceFixture } from './helpers/business-experience-test-fixtures';
import { seedImmigrationFixture } from './helpers/immigration-test-fixtures';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Remediation S18F — ABSEZ Article 9 capability closure (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let bootstrap: AbsezSetupBootstrapService;
  let freeZoneCustoms: FreeZoneCustomsService;
  let investorResidency: InvestorResidencyProgramService;
  let zoneLandLease: ZoneLandLeaseService;
  let investorRelations: InvestorRelationsService;
  let article9Matrix: AbsezArticle9ServicePathMatrixService;
  let planningWorkflow: DevelopmentApplicationWorkflowService;
  let publicSafetyMutations: PublicSafetyServiceRequestMutationService;
  let customsBoundary: FreeZoneCustomsBoundaryService;

  beforeAll(async () => {
    ({ app } = await createIntegrationApp());
    prisma = app.get(PrismaService);
    bootstrap = app.get(AbsezSetupBootstrapService);
    freeZoneCustoms = app.get(FreeZoneCustomsService);
    investorResidency = app.get(InvestorResidencyProgramService);
    zoneLandLease = app.get(ZoneLandLeaseService);
    investorRelations = app.get(InvestorRelationsService);
    article9Matrix = app.get(AbsezArticle9ServicePathMatrixService);
    planningWorkflow = app.get(DevelopmentApplicationWorkflowService);
    publicSafetyMutations = app.get(PublicSafetyServiceRequestMutationService);
    customsBoundary = app.get(FreeZoneCustomsBoundaryService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
    await bootstrap.bootstrapAbsezConfiguration();
  });

  afterAll(async () => {
    await app.close();
  });

  async function resolveAbsezInstitution() {
    const jurisdiction = await prisma.jurisdiction.findUniqueOrThrow({
      where: { code: ANTIGUA_JURISDICTION_CODE },
    });
    const institution = await prisma.institution.findFirstOrThrow({
      where: { code: ABSEZ_INSTITUTION_CODE, jurisdictionId: jurisdiction.id },
    });
    return { jurisdiction, institution };
  }

  it('configures free-zone customs cases and halts when delegated customs authority is inactive', async () => {
    const { jurisdiction, institution } = await resolveAbsezInstitution();
    const customsCase = await freeZoneCustoms.configureCase({
      institutionId: institution.id,
      jurisdictionId: jurisdiction.id,
    });
    expect(customsCase.doesNotImplyCustomsClearance).toBe(true);

    const coordinated = await freeZoneCustoms.attemptConsequentialCoordination(customsCase.id);
    expect(coordinated.coordinationStatus).toBe(
      FreeZoneCustomsCoordinationStatus.HALTED_PENDING_AUTHORITY,
    );

    const authority = await prisma.functionAuthorityRecord.findUniqueOrThrow({
      where: { code: 'ABSEZ-FN-CUSTOMS-FACILITATION' },
    });
    expect(authority.lifecycleStatus).not.toBe(FunctionAuthorityLifecycleStatus.ACTIVE);
  });

  it('rejects spoofed national customs determination from non-official actors', () => {
    expect(() => {
      customsBoundary.rejectApplicantForgedNationalCustomsDetermination(
        { isAuthenticated: true, retainedNationalDeterminationId: 'fake' },
        false,
      );
    }).toThrow();
  });

  it('uses canonical immigration structures for investor residency without granting status on payment', async () => {
    const immigrationFixture = await seedImmigrationFixture(app, prisma);
    const { institution } = await resolveAbsezInstitution();

    const immigrationCase = await prisma.case.findUniqueOrThrow({
      where: { id: immigrationFixture.immigrationCaseId },
      select: { applicationId: true, applicantIdentityId: true },
    });

    const immigrationProfile = await prisma.immigrationProfile.create({
      data: {
        profileNumber: 'S18F-IMM-PROFILE',
        subjectIdentityId: immigrationCase.applicantIdentityId,
      },
    });

    await investorResidency.configureProgram({
      programCode: 'ABSEZ-INV-RES-TEST',
      programLabel: 'Configured investor residency programme (NON_PRODUCTION)',
      institutionId: institution.id,
    });

    const opened = await investorResidency.openInvestorResidencyApplication({
      programCode: 'ABSEZ-INV-RES-TEST',
      immigrationProfileId: immigrationProfile.id,
      caseId: immigrationFixture.immigrationCaseId,
      applicationId: immigrationCase.applicationId,
    });

    expect(opened.residencyApplicationProfile?.doesNotCreateResidency).toBe(true);
    expect(opened.paymentDoesNotGrantResidency).toBe(true);

    await expect(
      investorResidency.recordInvestmentPayment(
        ImmigrationActorPersona.PAYMENT_SYSTEM,
        opened.id,
      ),
    ).rejects.toThrow();
  });

  it('records zone land lease on canonical land parcel without implying planning approval', async () => {
    const { institution, jurisdiction } = await resolveAbsezInstitution();
    const businessFixture = await seedBusinessExperienceFixture(app, prisma);

    const landParcel = await prisma.landParcel.create({
      data: {
        parcelReference: 'S18F-PARCEL-001',
        jurisdictionId: jurisdiction.id,
        institutionId: institution.id,
      },
    });

    const result = await zoneLandLease.registerLeaseDraft({
      institutionId: institution.id,
      landParcelId: landParcel.id,
      organizationId: businessFixture.organizationId,
      useTypeCode: 'WAREHOUSE',
    });

    expect(result.lease.doesNotImplyPlanningPermission).toBe(true);
    expect(result.planningBoundaryDisclaimer).toMatch(/planning permission/i);
  });

  it('creates and submits planning applications through canonical development workflow', async () => {
    const businessFixture = await seedBusinessExperienceFixture(app, prisma);
    const project = await prisma.developmentProject.create({
      data: {
        jurisdictionId: businessFixture.phase11Base.jurisdictionId,
        projectReference: 'S18F-DEV-PROJ',
        title: 'S18F development project',
        primaryApplicantIdentityId: businessFixture.memberIdentityId,
        organizationId: businessFixture.organizationId,
      },
    });

    const application = await planningWorkflow.createApplication({
      developmentProjectId: project.id,
      serviceCode: 'TEMPLATE-PLANNING-APPLICATION',
      serviceName: 'Planning application',
      accessorIdentityId: businessFixture.memberIdentityId,
      actorKind: DevelopmentAccessActorKind.APPLICANT,
    });

    const submitted = await planningWorkflow.submitApplication({
      developmentApplicationId: application.id,
      accessorIdentityId: businessFixture.memberIdentityId,
      actorKind: DevelopmentAccessActorKind.APPLICANT,
    });

    expect(submitted.status).toBe('SUBMITTED');
  });

  it('denies public-safety mutations without institutional scope', async () => {
    const jurisdiction = await prisma.jurisdiction.findFirstOrThrow();
    const engagement = await prisma.publicSafetyEngagement.create({
      data: {
        jurisdictionId: jurisdiction.id,
        engagementReference: 'S18F-PS-ENG',
      },
    });

    await expect(
      publicSafetyMutations.createOfficialServiceRequest({
        engagementId: engagement.id,
        requestKind: PublicSafetyServiceRequestKind.SUBMIT_INCIDENT_REPORT,
        serviceTemplateCode: 'TEMPLATE-PS-INCIDENT',
        actorIdentityId: '00000000-0000-4000-8000-000000000001',
        institutionScopeVerified: false,
      }),
    ).rejects.toThrow();

    const created = await publicSafetyMutations.createOfficialServiceRequest({
      engagementId: engagement.id,
      requestKind: PublicSafetyServiceRequestKind.SUBMIT_INCIDENT_REPORT,
      serviceTemplateCode: 'TEMPLATE-PS-INCIDENT',
      actorIdentityId: '00000000-0000-4000-8000-000000000002',
      institutionScopeVerified: true,
    });

    const updated = await publicSafetyMutations.updateRequestStatus({
      serviceRequestId: created.id,
      status: PublicSafetyServiceRequestStatus.UNDER_REVIEW,
      actorIdentityId: '00000000-0000-4000-8000-000000000002',
      institutionScopeVerified: true,
    });
    expect(updated.status).toBe(PublicSafetyServiceRequestStatus.UNDER_REVIEW);
  });

  it('links investor inquiries to canonical organization records', async () => {
    const { institution } = await resolveAbsezInstitution();
    const businessFixture = await seedBusinessExperienceFixture(app, prisma);

    const inquiry = await investorRelations.createInquiry({
      institutionId: institution.id,
      organizationId: businessFixture.organizationId,
      subjectSummary: 'Zone investment feasibility',
      caseId: businessFixture.caseId,
      managerIdentityId: businessFixture.memberIdentityId,
    });

    expect(inquiry.investorRelationsProfile.organizationId).toBe(businessFixture.organizationId);
    expect(inquiry.caseLinks.length).toBe(1);
  });

  it('exposes configured service-path state for all 19 Article 9 department categories', async () => {
    await article9Matrix.syncPersistedStates();
    const matrix = await article9Matrix.buildMatrix();
    expect(matrix.rows.length).toBe(ABSEZ_ARTICLE9_DEPARTMENTS.length);
    expect(matrix.rows.every((row) => row.isConfigured)).toBe(true);
    expect(matrix.rows.some((row) => row.appearsOperational)).toBe(false);
  });

  it('denies cross-institution API access for ABSEZ capability closure routes without session', async () => {
    const { jurisdiction, institution } = await resolveAbsezInstitution();
    await request(app.getHttpServer())
      .post('/api/v1/absez/capability-closure/customs/cases')
      .send({ institutionId: institution.id, jurisdictionId: jurisdiction.id })
      .expect(401);
  });
});
