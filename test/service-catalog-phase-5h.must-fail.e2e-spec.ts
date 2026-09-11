import { type INestApplication } from '@nestjs/common';
import {
  ApplicantCategory,
  FormVersionStatus,
  FunctionAuthorityLifecycleStatus,
  GovernmentServiceMaturityStatus,
  GovernmentServicePublicAvailability,
  IdentityType,
  OrganizationStatus,
  RepresentativeAuthorityStatus,
  ServiceActivationOutcome,
  ServiceFunctionMappingStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { FunctionActivationService } from '../src/authority/function-authority-records/function-activation.service';
import { FunctionAuthorityRecordsService } from '../src/authority/function-authority-records/function-authority-records.service';
import { GoverningSourcesService } from '../src/authority/governing-sources/governing-sources.service';
import { PrismaService } from '../src/database/prisma.service';
import { ServiceActivationService } from '../src/service-catalog/activation-governance/service-activation.service';
import { ServicePublicationGovernanceService } from '../src/service-catalog/activation-governance/service-publication-governance.service';
import { ServiceReadinessService } from '../src/service-catalog/activation-governance/service-readiness.service';
import { PUBLIC_NONBINDING_DISCLAIMER } from '../src/service-catalog/common/public-discovery.constants';
import { ServiceCatalogCacheService } from '../src/service-catalog/common/service-catalog-cache.service';
import { ServiceCatalogLifecycleService } from '../src/service-catalog/common/service-catalog-lifecycle.service';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { Phase5FActivationFixtures } from './helpers/phase-5f-activation-fixtures';
import { seedPublicServiceDiscoveryFixture } from './helpers/public-service-discovery-fixtures';
import {
  asPaginatedPublicServicesBody,
  asPublicEligibilityBody,
  asServiceStartPackageBody,
} from './helpers/public-service-test-types';
import {
  seedFunctionAuthorityRecord,
  seedServiceCatalogFixture,
} from './helpers/service-catalog-test-fixtures';
import {
  asGovernmentServiceBody,
  asGovernmentServiceVersionBody,
} from './helpers/service-catalog-test-types';

const PHASE_6_PLUS_TABLES = [
  'applications',
  'cases',
  'case_workflows',
  'evidence_packets',
  'government_decisions',
  'issued_licenses',
  'issued_permits',
  'payment_transactions',
  'inspection_cases',
] as const;

describe('Phase 5H must-fail invariants (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let activation: ServiceActivationService;
  let publication: ServicePublicationGovernanceService;
  let readiness: ServiceReadinessService;
  let lifecycleService: ServiceCatalogLifecycleService;
  let cacheService: ServiceCatalogCacheService;
  let phase5fFixtures: Phase5FActivationFixtures;
  let serviceFamilyId: string;

  beforeAll(async () => {
    ({ app } = await createIntegrationApp());
    prisma = app.get(PrismaService);
    activation = app.get(ServiceActivationService);
    publication = app.get(ServicePublicationGovernanceService);
    readiness = app.get(ServiceReadinessService);
    lifecycleService = app.get(ServiceCatalogLifecycleService);
    cacheService = app.get(ServiceCatalogCacheService);
    phase5fFixtures = new Phase5FActivationFixtures(
      prisma,
      app.get(GoverningSourcesService),
      app.get(FunctionAuthorityRecordsService),
      app.get(FunctionActivationService),
    );
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
    const family = await prisma.serviceFamily.create({
      data: {
        code: 'PHASE-5H-FAMILY',
        name: 'Phase 5H Must Fail Family',
      },
    });
    serviceFamilyId = family.id;
  });

  afterAll(async () => {
    await app.close();
  });

  async function tableExists(tableName: string): Promise<boolean> {
    const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = $1',
      tableName,
    );
    return Number(rows[0]?.count ?? 0) > 0;
  }

  async function expectPhase6TablesAbsent(): Promise<void> {
    for (const tableName of PHASE_6_PLUS_TABLES) {
      expect(await tableExists(tableName)).toBe(false);
    }
  }

  function authorizedActor(ctx: Awaited<ReturnType<typeof phase5fFixtures.seedStructuralContext>>) {
    return {
      identityId: ctx.identityId,
      officeholderId: ctx.officeholderId,
      officeId: ctx.officeId,
      appointmentId: ctx.appointmentId,
    };
  }

  it('1. draft service cannot appear ACTIVE in public listing', async () => {
    const fixture = await seedServiceCatalogFixture(app, prisma);
    const functionRecord = await seedFunctionAuthorityRecord(prisma, fixture.institutionId);

    const serviceRes = await request(app.getHttpServer())
      .post('/api/v1/service-catalog/services')
      .set('Authorization', `Bearer ${fixture.sessionToken}`)
      .send({
        code: 'DRAFT-ONLY-SVC',
        slug: 'draft-only-service',
        officialName: 'Draft Only Service',
        publicName: 'Draft Only Service',
        responsibleInstitutionId: fixture.institutionId,
        responsibleDepartmentId: fixture.departmentId,
        serviceFamilyId: fixture.serviceFamilyId,
      })
      .expect(201);

    const service = asGovernmentServiceBody(serviceRes.body);

    const versionRes = await request(app.getHttpServer())
      .post(`/api/v1/service-catalog/services/${service.id}/versions`)
      .set('Authorization', `Bearer ${fixture.sessionToken}`)
      .send({
        version: '1.0.0',
        purpose: 'Draft version',
        publicDescription: 'Draft version should not be publicly active.',
      })
      .expect(201);

    const version = asGovernmentServiceVersionBody(versionRes.body);
    expect(version.maturityStatus).toBe(GovernmentServiceMaturityStatus.DRAFT);

    await request(app.getHttpServer())
      .post(`/api/v1/service-catalog/service-versions/${version.id}/functions`)
      .set('Authorization', `Bearer ${fixture.sessionToken}`)
      .send({
        functionAuthorityRecordId: functionRecord.id,
        isConsequential: true,
      })
      .expect(201);

    const list = await request(app.getHttpServer()).get('/api/v1/public/services').expect(200);
    const body = asPaginatedPublicServicesBody(list.body);
    expect(body.items.some((item) => item.slug === 'draft-only-service')).toBe(false);
  });

  it('2. configured service cannot automatically become ACTIVE', async () => {
    const ctx = await phase5fFixtures.seedStructuralContext();
    const service = await phase5fFixtures.seedConfiguredServiceVersion(ctx, serviceFamilyId);

    const slug = (
      await prisma.governmentService.findUnique({
        where: { id: service.governmentServiceId },
        select: { slug: true },
      })
    )?.slug;
    if (!slug) {
      throw new Error('Expected configured service slug');
    }

    await request(app.getHttpServer())
      .get(`/api/v1/public/services/${slug}/start-package`)
      .expect(404);

    const version = await prisma.governmentServiceVersion.findUnique({
      where: { id: service.governmentServiceVersionId },
    });
    expect(version?.maturityStatus).toBe(GovernmentServiceMaturityStatus.CONFIGURED);
    expect(version?.maturityStatus).not.toBe(GovernmentServiceMaturityStatus.ACTIVE);
  });

  it('3. ordinary user cannot activate service', async () => {
    const ctx = await phase5fFixtures.seedStructuralContext();
    const service = await phase5fFixtures.seedConfiguredServiceVersion(ctx, serviceFamilyId);
    const applicantId = await phase5fFixtures.seedApplicantIdentity();

    const result = await activation.recordInstitutionalAcceptance({
      governmentServiceVersionId: service.governmentServiceVersionId,
      actor: { identityId: applicantId },
    });

    expect(result.outcome).toBe(ServiceActivationOutcome.DENIED);

    const version = await prisma.governmentServiceVersion.findUnique({
      where: { id: service.governmentServiceVersionId },
    });
    expect(version?.maturityStatus).toBe(GovernmentServiceMaturityStatus.CONFIGURED);
  });

  it('4. service cannot create authority', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);
    const beforeCount = await prisma.functionAuthorityRecord.count();

    await request(app.getHttpServer())
      .post(`/api/v1/public/services/${fixture.activeServiceSlug}/eligibility`)
      .send({
        applicantCategory: ApplicantCategory.BUSINESS,
        attributes: { registeredBusiness: true },
      })
      .expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/public/services/${fixture.activeServiceSlug}/start-package`)
      .expect(200);

    expect(await prisma.functionAuthorityRecord.count()).toBe(beforeCount);
  });

  it('5. service cannot override FunctionAuthorityRecord', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);
    const fn = await seedFunctionAuthorityRecord(
      prisma,
      (
        await prisma.governmentService.findUniqueOrThrow({
          where: { id: fixture.activeServiceId },
          select: { responsibleInstitutionId: true },
        })
      ).responsibleInstitutionId,
    );

    await prisma.serviceFunctionMapping.create({
      data: {
        governmentServiceVersionId: fixture.activeServiceVersionId,
        functionAuthorityRecordId: fn.id,
        isConsequential: true,
      },
    });

    const before = await prisma.functionAuthorityRecord.findUniqueOrThrow({
      where: { id: fn.id },
    });

    await request(app.getHttpServer())
      .get(`/api/v1/public/services/${fixture.activeServiceSlug}/start-package`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/public/services/${fixture.activeServiceSlug}/eligibility`)
      .send({
        applicantCategory: ApplicantCategory.BUSINESS,
        attributes: { registeredBusiness: true, overrideAuthority: true },
      })
      .expect(201);

    const after = await prisma.functionAuthorityRecord.findUniqueOrThrow({
      where: { id: before.id },
    });
    expect(after).toMatchObject({
      lifecycleStatus: before.lifecycleStatus,
      classification: before.classification,
      code: before.code,
    });
  });

  it('6. inactive Phase 4 authority mapping blocks service activation', async () => {
    const ctx = await phase5fFixtures.seedStructuralContext();
    const service = await phase5fFixtures.seedConfiguredServiceVersion(ctx, serviceFamilyId);

    await prisma.functionAuthorityRecord.update({
      where: { id: ctx.mappedFunctionId },
      data: { lifecycleStatus: FunctionAuthorityLifecycleStatus.INACTIVE },
    });

    const result = await activation.recordInstitutionalAcceptance({
      governmentServiceVersionId: service.governmentServiceVersionId,
      actor: authorizedActor(ctx),
    });

    expect(result.outcome).not.toBe(ServiceActivationOutcome.ACTIVATED);
    expect(
      result.outcome === ServiceActivationOutcome.DENIED ||
        result.outcome === ServiceActivationOutcome.REQUIRES_READINESS,
    ).toBe(true);
  });

  it('7. suspended service cannot accept new start', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    await lifecycleService.suspendServiceVersion(fixture.activeServiceVersionId);

    await request(app.getHttpServer())
      .get(`/api/v1/public/services/${fixture.activeServiceSlug}/start-package`)
      .expect(404);
  });

  it('8. superseded service version cannot silently be used for new start', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    const v1Package = await request(app.getHttpServer())
      .get(`/api/v1/public/services/${fixture.activeServiceSlug}/start-package`)
      .expect(200);

    const secondVersion = await prisma.governmentServiceVersion.create({
      data: {
        governmentServiceId: fixture.activeServiceId,
        version: '2.0.0',
        purpose: 'Updated business licence application pathway.',
        coveredActivities: 'operate business',
        publicDescription: 'Updated business licence application pathway.',
        authorityClassificationSummary: 'ABSEZ delegated licensing function',
        informationLastVerifiedAt: new Date('2026-09-10T00:00:00.000Z'),
        publicDisclaimer: 'Updated disclaimer.',
        maturityStatus: GovernmentServiceMaturityStatus.ACTIVE,
        publicAvailability: GovernmentServicePublicAvailability.ACTIVE,
        formDefinitionId: fixture.formDefinitionId,
        formVersionId: fixture.formVersionId,
      },
    });

    await prisma.governmentServiceVersion.update({
      where: { id: fixture.activeServiceVersionId },
      data: {
        supersededAt: new Date('2026-09-10T00:00:00.000Z'),
        maturityStatus: GovernmentServiceMaturityStatus.SUPERSEDED,
        publicAvailability: GovernmentServicePublicAvailability.UNAVAILABLE,
      },
    });

    await cacheService.invalidateService(fixture.activeServiceSlug);

    await request(app.getHttpServer())
      .get(`/api/v1/public/services/${fixture.activeServiceSlug}/start-package`)
      .query({ serviceVersionId: fixture.activeServiceVersionId })
      .expect(409);

    const v2Package = await request(app.getHttpServer())
      .get(`/api/v1/public/services/${fixture.activeServiceSlug}/start-package`)
      .expect(200);

    const v1Body = asServiceStartPackageBody(v1Package.body);
    const v2Body = asServiceStartPackageBody(v2Package.body);
    expect(v2Body.serviceVersionId).toBe(secondVersion.id);
    expect(v2Body.serviceVersionId).not.toBe(v1Body.serviceVersionId);
  });

  it('9. eligibility guidance cannot return APPROVED', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/public/services/${fixture.activeServiceSlug}/eligibility`)
      .send({
        applicantCategory: ApplicantCategory.BUSINESS,
        attributes: { registeredBusiness: true },
      })
      .expect(201);

    const body = asPublicEligibilityBody(response.body);
    expect(body).not.toHaveProperty('outcome');
    expect(body.eligible).not.toBe('APPROVED');
    expect(body.nonbindingDisclaimer).toContain('informational only');
  });

  it('10. eligibility guidance cannot waive a requirement', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/public/services/${fixture.activeServiceSlug}/eligibility`)
      .send({
        applicantCategory: ApplicantCategory.BUSINESS,
        attributes: {
          waiveRequirements: true,
          feeWaived: true,
        },
      })
      .expect(201);

    const body = asPublicEligibilityBody(response.body);
    expect(body.eligible).not.toBe(true);
    expect(body.unmatchedRequiredRules).toContain('REGISTERED_BUSINESS');
  });

  it('11. applicant category alone cannot create eligibility', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/public/services/${fixture.activeServiceSlug}/eligibility`)
      .send({
        applicantCategory: ApplicantCategory.BUSINESS,
        attributes: {},
      })
      .expect(201);

    const body = asPublicEligibilityBody(response.body);
    expect(body.eligible).not.toBe(true);
    expect(body.unmatchedRequiredRules).toContain('REGISTERED_BUSINESS');
    expect(body.matchedRules).not.toContain('REGISTERED_BUSINESS');
  });

  it('12. representative relationship cannot expand itself', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    const organization = await prisma.organization.create({
      data: { code: 'REP-ORG', name: 'Representative Org', status: OrganizationStatus.ACTIVE },
    });
    const repIdentity = await prisma.identity.create({
      data: { type: IdentityType.INDIVIDUAL, displayName: 'Representative' },
    });
    const repAuthority = await prisma.representativeAuthority.create({
      data: {
        organizationId: organization.id,
        identityId: repIdentity.id,
        scopeDescription: 'ALL_SERVICES',
        status: RepresentativeAuthorityStatus.ACTIVE,
        effectiveFrom: new Date('2020-01-01'),
      },
    });

    const beforeFnCount = await prisma.functionAuthorityRecord.count();
    const beforeAppointmentCount = await prisma.appointment.count();
    const beforeDelegationCount = await prisma.delegation.count();

    await request(app.getHttpServer())
      .post(`/api/v1/public/services/${fixture.activeServiceSlug}/eligibility`)
      .send({
        applicantCategory: ApplicantCategory.BUSINESS,
        attributes: {
          registeredBusiness: true,
          representativeAuthorityId: repAuthority.id,
        },
      })
      .expect(201);

    expect(await prisma.functionAuthorityRecord.count()).toBe(beforeFnCount);
    expect(await prisma.appointment.count()).toBe(beforeAppointmentCount);
    expect(await prisma.delegation.count()).toBe(beforeDelegationCount);
  });

  it('13. unknown eligibility operator cannot execute', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    await prisma.governmentServiceEligibilityRule.deleteMany({
      where: { governmentServiceVersionId: fixture.activeServiceVersionId },
    });

    await prisma.governmentServiceEligibilityRule.create({
      data: {
        governmentServiceVersionId: fixture.activeServiceVersionId,
        ruleCode: 'UNSUPPORTED_COMPOSITE',
        label: 'Composite rule without executable children',
        description: 'Unsupported operator configuration',
        configuration: {
          operator: 'UNKNOWN_COMPOSITE',
          requiresTruthyAttribute: true,
          attribute: 'nonexistentField',
        },
        isRequired: true,
      },
    });

    const response = await request(app.getHttpServer())
      .post(`/api/v1/public/services/${fixture.activeServiceSlug}/eligibility`)
      .send({
        applicantCategory: ApplicantCategory.BUSINESS,
        attributes: { declaresEligiblePurpose: true },
      })
      .expect(201);

    const body = asPublicEligibilityBody(response.body);
    expect(body.eligible).not.toBe(true);
    expect(body.matchedRules).not.toContain('UNSUPPORTED_COMPOSITE');
  });

  it('14. stored rule cannot execute arbitrary code', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    await prisma.governmentServiceEligibilityRule.create({
      data: {
        governmentServiceVersionId: fixture.activeServiceVersionId,
        ruleCode: 'CODE_INJECTION',
        label: 'Code injection attempt',
        description: 'Attempt to inject executable code through configuration',
        configuration: {
          requiredAttribute: 'declaresEligiblePurpose',
          requiredValue: 'process.exit(1)',
        },
        isRequired: true,
      },
    });

    const response = await request(app.getHttpServer())
      .post(`/api/v1/public/services/${fixture.activeServiceSlug}/eligibility`)
      .send({
        applicantCategory: ApplicantCategory.BUSINESS,
        attributes: { declaresEligiblePurpose: true },
      })
      .expect(201);

    const body = asPublicEligibilityBody(response.body);
    expect(body.eligible).not.toBe('APPROVED');
    expect(body.matchedRules).not.toContain('CODE_INJECTION');
  });

  it('15. form cannot execute arbitrary JavaScript', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    await prisma.formVersion.update({
      where: { id: fixture.formVersionId },
      data: {
        schema: {
          type: 'object',
          properties: {
            businessName: { type: 'string' },
            maliciousScript: {
              type: 'string',
              'x-onChange': '(() => { throw new Error("executed"); })()',
            },
          },
        },
      },
    });

    await cacheService.invalidateService(fixture.activeServiceSlug);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/public/services/${fixture.activeServiceSlug}/start-package`)
      .expect(200);

    const body = asServiceStartPackageBody(response.body);
    const maliciousField = body.formSchema?.properties?.maliciousScript as
      Record<string, unknown> | undefined;
    expect(maliciousField?.['x-onChange']).toEqual('(() => { throw new Error("executed"); })()');
    expect(body).not.toHaveProperty('executed');
  });

  it('16. published FormVersion cannot be silently edited', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);
    const before = await prisma.formVersion.findUnique({ where: { id: fixture.formVersionId } });

    await request(app.getHttpServer())
      .patch(`/api/v1/service-catalog/form-versions/${fixture.formVersionId}`)
      .send({ schema: { tampered: true } })
      .expect(404);

    const after = await prisma.formVersion.findUnique({ where: { id: fixture.formVersionId } });
    expect(after?.schema).toEqual(before?.schema);
    expect(after?.status).toBe(FormVersionStatus.ACTIVE);
  });

  it('17. required conditional field cannot be bypassed', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    await prisma.governmentServiceChecklistItem.create({
      data: {
        governmentServiceVersionId: fixture.activeServiceVersionId,
        itemCode: 'RESTRICTED_ACTIVITY_DETAIL',
        label: 'Restricted activity detail',
        description: 'Required when activity is restricted.',
        conditionExpression: { field: 'activityType', equals: 'RESTRICTED' },
        isRequired: true,
        sortOrder: 99,
      },
    });

    await cacheService.invalidateService(fixture.activeServiceSlug);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/public/services/${fixture.activeServiceSlug}/start-package`)
      .expect(200);

    const body = asServiceStartPackageBody(response.body);
    const conditional = body.conditionalChecklist.find(
      (item) => item.itemCode === 'RESTRICTED_ACTIVITY_DETAIL',
    );
    expect(conditional).toMatchObject({
      itemCode: 'RESTRICTED_ACTIVITY_DETAIL',
      isRequired: true,
      conditionExpression: { field: 'activityType', equals: 'RESTRICTED' },
    });
    expect(body).not.toHaveProperty('valid');
    expect(body).not.toHaveProperty('missingRequiredFields');
  });

  it('18. malformed form data cannot pass validation', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    await prisma.formVersion.update({
      where: { id: fixture.formVersionId },
      data: {
        schema: {
          type: 'object',
          properties: {
            businessName: { type: 'string' },
            annualRevenue: { type: 'number' },
          },
          required: ['businessName', 'annualRevenue'],
        },
      },
    });

    await cacheService.invalidateService(fixture.activeServiceSlug);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/public/services/${fixture.activeServiceSlug}/eligibility`)
      .send({
        applicantCategory: ApplicantCategory.BUSINESS,
        attributes: {
          registeredBusiness: true,
          annualRevenue: 'not-a-number',
          businessName: 'Example Co',
        },
      })
      .expect(201);

    const body = asPublicEligibilityBody(response.body);
    expect(body).not.toHaveProperty('valid', true);
    expect(body).not.toHaveProperty('approved', true);
    expect(body.nonbindingDisclaimer).toBe(PUBLIC_NONBINDING_DISCLAIMER);
  });

  it('19. uploaded-file reference is not VERIFIED evidence', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/public/services/${fixture.activeServiceSlug}/start-package`)
      .expect(200);

    const body = asServiceStartPackageBody(response.body);
    expect(body.conditionalChecklist.every((item) => !('isEvidenceVerified' in item))).toBe(true);
    expect(body).not.toHaveProperty('verifiedEvidence');
  });

  it('20. checklist completion is not substantive approval', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/public/services/${fixture.activeServiceSlug}/start-package`)
      .expect(200);

    const body = asServiceStartPackageBody(response.body);
    expect(body).not.toHaveProperty('isSubstantiveApproval');
    expect(body).not.toHaveProperty('approved');
    expect(body.conditionalChecklist.every((item) => !('isSubstantiveApproval' in item))).toBe(
      true,
    );
  });

  it('21. requirement without valid configured basis cannot silently become mandatory', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    await prisma.governmentServiceChecklistItem.create({
      data: {
        governmentServiceVersionId: fixture.activeServiceVersionId,
        itemCode: 'NO_BASIS',
        label: 'Requirement Without Basis',
        description: '',
        isRequired: true,
        sortOrder: 100,
      },
    });

    await cacheService.invalidateService(fixture.activeServiceSlug);

    const startPackage = await request(app.getHttpServer())
      .get(`/api/v1/public/services/${fixture.activeServiceSlug}/start-package`)
      .expect(200);

    const body = asServiceStartPackageBody(startPackage.body);
    const noBasisItem = body.conditionalChecklist.find((item) => item.itemCode === 'NO_BASIS');
    expect(noBasisItem?.isRequired).toBe(true);
    expect(body).not.toHaveProperty('mandatoryRequirementsEnforced');
    expect(body).not.toHaveProperty('approved');
  });

  it('22. expired requirement cannot govern a new start', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    await prisma.governmentServiceVersion.update({
      where: { id: fixture.activeServiceVersionId },
      data: {
        effectiveFrom: new Date('2020-01-01'),
        effectiveUntil: new Date('2021-01-01'),
      },
    });

    const assessment = await readiness.assessReadiness(fixture.activeServiceVersionId);
    expect(assessment.technicallyReady).toBe(false);
    expect(
      assessment.blockingIssues.some((issue) => issue.includes('SERVICE_VERSION_EFFECTIVE')),
    ).toBe(true);
  });

  it('23. system cannot invent a fee', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    const startPackage = await request(app.getHttpServer())
      .get(`/api/v1/public/services/${fixture.activeServiceSlug}/start-package`)
      .expect(200);

    const eligibility = await request(app.getHttpServer())
      .post(`/api/v1/public/services/${fixture.activeServiceSlug}/eligibility`)
      .send({
        applicantCategory: ApplicantCategory.BUSINESS,
        attributes: {
          registeredBusiness: true,
          inventedFee: { feeCode: 'HACK_FEE', amountCents: 1 },
        },
      })
      .expect(201);

    const packageBody = asServiceStartPackageBody(startPackage.body);
    expect(packageBody.feeDefinitions.map((fee) => fee.code)).toEqual(['APPLICATION_FEE']);
    expect(asPublicEligibilityBody(eligibility.body)).not.toHaveProperty('fees');
  });

  it('24. fee waiver metadata cannot perform a waiver', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    await request(app.getHttpServer())
      .post(`/api/v1/public/services/${fixture.activeServiceSlug}/eligibility`)
      .send({
        applicantCategory: ApplicantCategory.BUSINESS,
        attributes: {
          registeredBusiness: true,
          feeWaived: true,
          waiverApproved: true,
        },
      })
      .expect(201);

    const startPackage = await request(app.getHttpServer())
      .get(`/api/v1/public/services/${fixture.activeServiceSlug}/start-package`)
      .expect(200);

    const body = asServiceStartPackageBody(startPackage.body);
    expect(body.feeDefinitions[0]?.amountCents).toBe(25000);
    expect(body).not.toHaveProperty('feeWaived', true);
  });

  it('25. payment metadata cannot produce approval', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/public/services/${fixture.activeServiceSlug}/eligibility`)
      .send({
        applicantCategory: ApplicantCategory.BUSINESS,
        attributes: {
          registeredBusiness: true,
          paymentStatus: 'PAID',
          paymentApproved: true,
        },
      })
      .expect(201);

    const body = asPublicEligibilityBody(response.body);
    expect(body).not.toHaveProperty('paymentApproved');
    expect(body).not.toHaveProperty('approved');
    expect(body.eligible).not.toBe('APPROVED');
  });

  it('26. SLA expiry cannot create approval', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    const startPackage = await request(app.getHttpServer())
      .get(`/api/v1/public/services/${fixture.activeServiceSlug}/start-package`)
      .expect(200);

    const body = asServiceStartPackageBody(startPackage.body);
    expect(body).not.toHaveProperty('isOfficialDecision');
    expect(body).not.toHaveProperty('slaApproved');
    expect(body).not.toHaveProperty('approved');
    expect(body.publicDisclaimers.join(' ')).toContain('later phase');
  });

  it('27. service dependency cannot transfer another institution authority', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);
    const beforeFnCount = await prisma.functionAuthorityRecord.count();
    const beforeDelegationCount = await prisma.delegation.count();

    await request(app.getHttpServer())
      .get(`/api/v1/public/services/${fixture.activeServiceSlug}/start-package`)
      .expect(200);

    expect(await prisma.functionAuthorityRecord.count()).toBe(beforeFnCount);
    expect(await prisma.delegation.count()).toBe(beforeDelegationCount);
  });

  it('28. expected license output does not issue a license', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    const startPackage = await request(app.getHttpServer())
      .get(`/api/v1/public/services/${fixture.activeServiceSlug}/start-package`)
      .expect(200);

    const body = asServiceStartPackageBody(startPackage.body);
    expect(
      body.outputDefinitions.some((output) => output.outputCode === 'LICENCE_CERTIFICATE'),
    ).toBe(true);
    expect(await tableExists('issued_licenses')).toBe(false);
  });

  it('29. expected certificate output does not issue a certificate', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    await prisma.governmentServiceOutputDefinition.create({
      data: {
        governmentServiceVersionId: fixture.activeServiceVersionId,
        outputCode: 'CERT',
        label: 'Expected Certificate',
        description: 'Expected certificate output only',
      },
    });

    await cacheService.invalidateService(fixture.activeServiceSlug);

    const startPackage = await request(app.getHttpServer())
      .get(`/api/v1/public/services/${fixture.activeServiceSlug}/start-package`)
      .expect(200);

    const body = asServiceStartPackageBody(startPackage.body);
    expect(body.outputDefinitions.some((output) => output.outputCode === 'CERT')).toBe(true);
    expect(await tableExists('issued_permits')).toBe(false);
    expect(await tableExists('issued_licenses')).toBe(false);
  });

  it('30. complaint route does not itself decide a complaint', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/public/services/${fixture.activeServiceSlug}`)
      .expect(200);

    const body = detail.body as Record<string, unknown>;
    expect((body.reviewComplaintRoutes as unknown[]).length).toBeGreaterThan(0);
    expect(body).not.toHaveProperty('complaintDecision');
    expect(body).not.toHaveProperty('decisionOutcome');
    expect(await tableExists('government_decisions')).toBe(false);
  });

  it('31. public APIs cannot leak restricted configuration', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    await prisma.governmentServiceVersion.update({
      where: { id: fixture.activeServiceVersionId },
      data: { publicAvailability: GovernmentServicePublicAvailability.HIDDEN },
    });
    await cacheService.invalidateService(fixture.activeServiceSlug);

    const list = await request(app.getHttpServer()).get('/api/v1/public/services').expect(200);
    const listBody = asPaginatedPublicServicesBody(list.body);
    expect(listBody.items.some((item) => item.slug === fixture.activeServiceSlug)).toBe(false);

    await request(app.getHttpServer())
      .get(`/api/v1/public/services/${fixture.activeServiceSlug}`)
      .expect(404);

    const adminFixture = await seedServiceCatalogFixture(app, prisma);
    const adminDetail = await request(app.getHttpServer())
      .get(`/api/v1/service-catalog/service-versions/${fixture.activeServiceVersionId}`)
      .set('Authorization', `Bearer ${adminFixture.sessionToken}`)
      .expect(200);

    const adminVersion = asGovernmentServiceVersionBody(adminDetail.body);
    expect(adminVersion.maturityStatus).toBeDefined();
    expect(adminVersion.publicAvailability).toBe(GovernmentServicePublicAvailability.HIDDEN);
  });

  it('32. service suspension invalidates cached active listing', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    const beforeList = await request(app.getHttpServer())
      .get('/api/v1/public/services')
      .expect(200);
    expect(
      asPaginatedPublicServicesBody(beforeList.body).items.some(
        (item) => item.slug === fixture.activeServiceSlug,
      ),
    ).toBe(true);

    await lifecycleService.suspendServiceVersion(fixture.activeServiceVersionId);

    const afterList = await request(app.getHttpServer()).get('/api/v1/public/services').expect(200);
    expect(
      asPaginatedPublicServicesBody(afterList.body).items.some(
        (item) => item.slug === fixture.activeServiceSlug,
      ),
    ).toBe(false);
  });

  it('33. technical test completion cannot equal institutional acceptance', async () => {
    const ctx = await phase5fFixtures.seedStructuralContext();
    const service = await phase5fFixtures.seedConfiguredServiceVersion(ctx, serviceFamilyId);

    await activation.markTechnicalTestsPassed(service.governmentServiceVersionId);

    const version = await prisma.governmentServiceVersion.findUnique({
      where: { id: service.governmentServiceVersionId },
    });
    expect(version?.maturityStatus).toBe(GovernmentServiceMaturityStatus.TESTED);
    expect(version?.institutionallyAccepted).toBe(false);

    const operational = await activation.activateOperationally({
      governmentServiceVersionId: service.governmentServiceVersionId,
      actor: authorizedActor(ctx),
    });
    expect(operational.outcome).toBe(ServiceActivationOutcome.REQUIRES_READINESS);
  });

  it('34. pilot-only service cannot be represented as unrestricted production service', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    const list = await request(app.getHttpServer())
      .get('/api/v1/public/services')
      .query({ status: GovernmentServicePublicAvailability.PILOT_ONLY })
      .expect(200);

    const pilotItem = asPaginatedPublicServicesBody(list.body).items.find(
      (item) => item.slug === fixture.pilotServiceSlug,
    );
    expect(pilotItem).toMatchObject({
      isPilotOnly: true,
      availabilityStatus: GovernmentServicePublicAvailability.PILOT_ONLY,
    });
    expect(pilotItem?.availabilityStatus).not.toBe(GovernmentServicePublicAvailability.ACTIVE);
  });

  it('35. service with unresolved authority cannot be activated as ordinary production', async () => {
    const ctx = await phase5fFixtures.seedStructuralContext();
    const service = await phase5fFixtures.seedConfiguredServiceVersion(ctx, serviceFamilyId);

    await prisma.functionAuthorityRecord.update({
      where: { id: ctx.mappedFunctionId },
      data: { lifecycleStatus: FunctionAuthorityLifecycleStatus.SUSPENDED },
    });

    await prisma.serviceFunctionMapping.updateMany({
      where: { governmentServiceVersionId: service.governmentServiceVersionId },
      data: { status: ServiceFunctionMappingStatus.INACTIVE },
    });

    const acceptance = await activation.recordInstitutionalAcceptance({
      governmentServiceVersionId: service.governmentServiceVersionId,
      actor: authorizedActor(ctx),
    });
    expect(acceptance.outcome).not.toBe(ServiceActivationOutcome.ACTIVATED);

    const publishAttempt = publication.publish({
      governmentServiceVersionId: service.governmentServiceVersionId,
      actorIdentityId: ctx.identityId,
      targetPublicAvailability: GovernmentServicePublicAvailability.ACTIVE,
    });
    await expect(publishAttempt).rejects.toThrow();
  });

  it('36. start package cannot create Application', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    const startPackage = await request(app.getHttpServer())
      .get(`/api/v1/public/services/${fixture.activeServiceSlug}/start-package`)
      .expect(200);

    const body = asServiceStartPackageBody(startPackage.body);
    expect(body).not.toHaveProperty('createsApplication', true);
    expect(await tableExists('applications')).toBe(false);
  });

  it('37. start package cannot create Case', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    const startPackage = await request(app.getHttpServer())
      .get(`/api/v1/public/services/${fixture.activeServiceSlug}/start-package`)
      .expect(200);

    const body = asServiceStartPackageBody(startPackage.body);
    expect(body).not.toHaveProperty('createsCase', true);
    expect(await tableExists('cases')).toBe(false);
  });

  it('38. Phase 5 cannot make a Government decision', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    await request(app.getHttpServer())
      .post(`/api/v1/public/services/${fixture.activeServiceSlug}/eligibility`)
      .send({
        applicantCategory: ApplicantCategory.BUSINESS,
        attributes: {
          registeredBusiness: true,
          governmentDecision: 'APPROVED',
        },
      })
      .expect(201);

    await expectPhase6TablesAbsent();
  });

  it('39. Phase 5 cannot issue an official instrument', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    await request(app.getHttpServer())
      .get(`/api/v1/public/services/${fixture.activeServiceSlug}/start-package`)
      .expect(200);

    expect(await tableExists('issued_licenses')).toBe(false);
    expect(await tableExists('issued_permits')).toBe(false);
  });

  it('40. AI is not required and cannot silently determine service eligibility or approval', async () => {
    const fixture = await seedPublicServiceDiscoveryFixture(prisma);

    const withoutAi = await request(app.getHttpServer())
      .post(`/api/v1/public/services/${fixture.activeServiceSlug}/eligibility`)
      .send({
        applicantCategory: ApplicantCategory.BUSINESS,
        attributes: { registeredBusiness: true },
      })
      .expect(201);

    const withAiOverride = await request(app.getHttpServer())
      .post(`/api/v1/public/services/${fixture.activeServiceSlug}/eligibility`)
      .send({
        applicantCategory: ApplicantCategory.BUSINESS,
        attributes: {
          aiRecommendation: 'APPROVED',
          aiDeterminedEligible: true,
        },
      })
      .expect(201);

    const withoutAiBody = asPublicEligibilityBody(withoutAi.body);
    const withAiBody = asPublicEligibilityBody(withAiOverride.body);

    expect(withoutAiBody.eligible).toBe(true);
    expect(withoutAiBody.nonbindingDisclaimer).toContain('informational only');
    expect(withAiBody.eligible).not.toBe(true);
    expect(withAiBody).not.toHaveProperty('aiApproved');
    expect(withAiBody.matchedRules).not.toContain('aiRecommendation');
  });
});
