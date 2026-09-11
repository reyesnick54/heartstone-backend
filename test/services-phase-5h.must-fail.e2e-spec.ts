import { type INestApplication } from '@nestjs/common';
import {
  EligibilityGuidanceOutcome,
  EligibilityOperator,
  FormFieldType,
  FormVersionStatus,
  FunctionAuthorityLifecycleStatus,
  GovernmentServiceLifecycleStatus,
  GovernmentServiceVersionStatus,
  IdentityType,
  OrganizationStatus,
  RepresentativeAuthorityStatus,
  ServiceOutputType,
  ServicePublicVisibility,
  ServiceRequirementBasisType,
  ServiceRequirementStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { hashToken } from '../src/identity/common/crypto.util';
import { ELIGIBILITY_GUIDANCE_OUTCOMES } from '../src/services/services.constants';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { seedServiceTestHarness } from './helpers/services-test-harness';

describe('Phase 5H must-fail invariants (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeAll(async () => {
    ({ app } = await createIntegrationApp());
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function createSession(
    identityId: string,
    userAccountId: string | null,
    token: string,
  ): Promise<void> {
    await prisma.session.create({
      data: {
        identityId,
        userAccountId,
        tokenHash: hashToken(token),
        status: 'ACTIVE',
        assuranceLevel: 'HIGH',
        expiresAt: new Date('2099-01-01'),
      },
    });
  }

  async function tableExists(tableName: string): Promise<boolean> {
    const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      'SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = $1',
      tableName,
    );
    return Number(rows[0]?.count ?? 0) > 0;
  }

  it('1. draft service cannot appear ACTIVE in public listing', async () => {
    const harness = await seedServiceTestHarness(prisma);

    const draft = await request(app.getHttpServer())
      .post('/api/v1/services')
      .send({
        code: 'DRAFT-ONLY-SVC',
        name: 'Draft Only Service',
        serviceFamilyId: harness.family.id,
        departmentId: harness.department.id,
        publicVisibility: ServicePublicVisibility.PUBLIC,
      })
      .expect(201);

    expect(draft.body.lifecycleStatus).toBe(GovernmentServiceLifecycleStatus.DRAFT);

    const list = await request(app.getHttpServer()).get('/api/v1/services').expect(200);
    const listed = list.body.find((s: { code: string }) => s.code === 'DRAFT-ONLY-SVC');
    expect(listed).toBeUndefined();
  });

  it('2. configured service cannot automatically become ACTIVE', async () => {
    const harness = await seedServiceTestHarness(prisma);

    await prisma.governmentService.update({
      where: { id: harness.service.id },
      data: { lifecycleStatus: GovernmentServiceLifecycleStatus.CONFIGURED },
    });

    await request(app.getHttpServer())
      .get('/api/v1/services/TEST-BUS-LIC/start-package')
      .expect(400);

    const refreshed = await prisma.governmentService.findUnique({ where: { id: harness.service.id } });
    expect(refreshed?.lifecycleStatus).toBe(GovernmentServiceLifecycleStatus.CONFIGURED);
    expect(refreshed?.lifecycleStatus).not.toBe(GovernmentServiceLifecycleStatus.ACTIVE);
  });

  it('3. ordinary user cannot activate service', async () => {
    const harness = await seedServiceTestHarness(prisma);

    await prisma.governmentService.update({
      where: { id: harness.service.id },
      data: {
        lifecycleStatus: GovernmentServiceLifecycleStatus.DRAFT,
        currentPublishedVersionId: null,
      },
    });

    const draftVersion = await prisma.governmentServiceVersion.create({
      data: {
        governmentServiceId: harness.service.id,
        versionNumber: 99,
        versionLabel: 'draft-activate',
        status: GovernmentServiceVersionStatus.DRAFT,
        publicTitle: 'Draft Activation',
        publicDescription: harness.version.publicDescription,
        applicantCategories: harness.version.applicantCategories,
        configurationFingerprint: 'draft-activate-fp',
      },
    });

    await createSession(harness.ordinaryIdentity.id, harness.ordinaryIdentity.userAccountId, 'ordinary-token');

    await request(app.getHttpServer())
      .post(`/api/v1/services/${harness.service.id}/activate`)
      .set('Authorization', 'Bearer ordinary-token')
      .send({
        versionId: draftVersion.id,
        actorIdentityId: harness.ordinaryIdentity.id,
      })
      .expect(403);
  });

  it('4. service cannot create authority', async () => {
    const harness = await seedServiceTestHarness(prisma);
    const beforeCount = await prisma.functionAuthorityRecord.count();

    await request(app.getHttpServer())
      .post('/api/v1/services')
      .send({
        code: 'NO-AUTH-CREATE',
        name: 'No Authority Create',
        serviceFamilyId: harness.family.id,
        departmentId: harness.department.id,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/services/TEST-BUS-LIC/eligibility/evaluate')
      .send({ answers: { declaresEligiblePurpose: true } })
      .expect(201);

    expect(await prisma.functionAuthorityRecord.count()).toBe(beforeCount);
  });

  it('5. service cannot override FunctionAuthorityRecord', async () => {
    const harness = await seedServiceTestHarness(prisma);
    const before = await prisma.functionAuthorityRecord.findUnique({ where: { id: harness.fn.id } });

    await request(app.getHttpServer())
      .get('/api/v1/services/TEST-BUS-LIC/start-package')
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/services/TEST-BUS-LIC/forms/validate')
      .send({
        payload: { activityType: 'GENERAL', restrictedActivityDetail: 'detail' },
      })
      .expect(201);

    const after = await prisma.functionAuthorityRecord.findUnique({ where: { id: harness.fn.id } });
    expect(after).toMatchObject({
      lifecycleStatus: before?.lifecycleStatus,
      classification: before?.classification,
      code: before?.code,
    });
  });

  it('6. inactive Phase 4 authority mapping blocks service activation', async () => {
    const harness = await seedServiceTestHarness(prisma);

    await prisma.governmentService.update({
      where: { id: harness.service.id },
      data: {
        lifecycleStatus: GovernmentServiceLifecycleStatus.DRAFT,
        currentPublishedVersionId: null,
      },
    });

    await prisma.functionAuthorityRecord.update({
      where: { id: harness.fn.id },
      data: { lifecycleStatus: FunctionAuthorityLifecycleStatus.INACTIVE },
    });

    const draftVersion = await prisma.governmentServiceVersion.create({
      data: {
        governmentServiceId: harness.service.id,
        versionNumber: 98,
        versionLabel: 'inactive-fn',
        status: GovernmentServiceVersionStatus.DRAFT,
        publicTitle: 'Inactive FN Version',
        publicDescription: harness.version.publicDescription,
        applicantCategories: harness.version.applicantCategories,
        configurationFingerprint: 'inactive-fn-fp',
      },
    });

    await prisma.serviceFunctionMapping.create({
      data: {
        serviceVersionId: draftVersion.id,
        functionAuthorityRecordId: harness.fn.id,
        isPrimary: true,
      },
    });

    await createSession(harness.adminIdentity.id, harness.adminIdentity.userAccountId, 'admin-token');

    const response = await request(app.getHttpServer())
      .post(`/api/v1/services/${harness.service.id}/activate`)
      .set('Authorization', 'Bearer admin-token')
      .send({
        versionId: draftVersion.id,
        actorIdentityId: harness.adminIdentity.id,
      })
      .expect(400);

    expect(response.body.message).toMatch(/not ACTIVE/i);
  });

  it('7. suspended service cannot accept new start', async () => {
    const harness = await seedServiceTestHarness(prisma);

    await createSession(harness.adminIdentity.id, harness.adminIdentity.userAccountId, 'admin-token');

    await request(app.getHttpServer())
      .post(`/api/v1/services/${harness.service.id}/suspend`)
      .set('Authorization', 'Bearer admin-token')
      .send({ actorIdentityId: harness.adminIdentity.id, reason: 'Maintenance' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/services/TEST-BUS-LIC/start-package')
      .expect(400);
  });

  it('8. superseded service version cannot silently be used for new start', async () => {
    const harness = await seedServiceTestHarness(prisma);

    const v1Package = await request(app.getHttpServer())
      .get('/api/v1/services/TEST-BUS-LIC/start-package')
      .expect(200);

    const version2 = await prisma.governmentServiceVersion.create({
      data: {
        governmentServiceId: harness.service.id,
        versionNumber: 2,
        versionLabel: 'v2',
        status: GovernmentServiceVersionStatus.PUBLISHED,
        publicTitle: 'Updated Business Licence',
        publicDescription: harness.version.publicDescription,
        applicantCategories: harness.version.applicantCategories,
        configurationFingerprint: 'v2-fingerprint',
        publishedAt: new Date(),
      },
    });

    await prisma.serviceFunctionMapping.create({
      data: {
        serviceVersionId: version2.id,
        functionAuthorityRecordId: harness.fn.id,
        isPrimary: true,
      },
    });

    await prisma.governmentServiceVersion.update({
      where: { id: harness.version.id },
      data: {
        status: GovernmentServiceVersionStatus.SUPERSEDED,
        supersededAt: new Date(),
      },
    });

    await prisma.governmentService.update({
      where: { id: harness.service.id },
      data: { currentPublishedVersionId: version2.id },
    });

    const v2Package = await request(app.getHttpServer())
      .get('/api/v1/services/TEST-BUS-LIC/start-package')
      .expect(200);

    expect(v2Package.body.versionNumber).toBe(2);
    expect(v2Package.body.versionNumber).not.toBe(v1Package.body.versionNumber);

    await request(app.getHttpServer())
      .post('/api/v1/services/TEST-BUS-LIC/forms/validate')
      .send({
        formVersionId: harness.formVersion.id,
        payload: { activityType: 'GENERAL' },
      })
      .expect(404);
  });

  it('9. eligibility guidance cannot return APPROVED', async () => {
    await seedServiceTestHarness(prisma);

    const response = await request(app.getHttpServer())
      .post('/api/v1/services/TEST-BUS-LIC/eligibility/evaluate')
      .send({ answers: { declaresEligiblePurpose: true } })
      .expect(201);

    expect(response.body.outcome).not.toBe('APPROVED');
    expect(ELIGIBILITY_GUIDANCE_OUTCOMES).toContain(response.body.outcome);
  });

  it('10. eligibility guidance cannot waive a requirement', async () => {
    await seedServiceTestHarness(prisma);

    const response = await request(app.getHttpServer())
      .post('/api/v1/services/TEST-BUS-LIC/forms/validate')
      .send({
        payload: {
          activityType: 'GENERAL',
          waiveRequirements: true,
          feeWaived: true,
        },
      })
      .expect(201);

    expect(response.body.waivesRequirements).toBe(false);
    expect(response.body.checklist.length).toBeGreaterThan(0);
  });

  it('11. applicant category alone cannot create eligibility', async () => {
    const harness = await seedServiceTestHarness(prisma);

    await prisma.serviceEligibilityRule.deleteMany({
      where: { serviceVersionId: harness.version.id },
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/services/TEST-BUS-LIC/eligibility/evaluate')
      .send({ answers: {}, applicantCategory: 'INDIVIDUAL' })
      .expect(201);

    expect(response.body.outcome).toBe(EligibilityGuidanceOutcome.INSUFFICIENT_INFORMATION);
    expect(response.body.outcome).not.toBe(EligibilityGuidanceOutcome.LIKELY_ELIGIBLE);
  });

  it('12. representative relationship cannot expand itself', async () => {
    const harness = await seedServiceTestHarness(prisma);

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
      .post('/api/v1/services/TEST-BUS-LIC/eligibility/evaluate')
      .send({
        answers: { declaresEligiblePurpose: true },
        representativeAuthorityId: repAuthority.id,
      })
      .expect(201);

    expect(await prisma.functionAuthorityRecord.count()).toBe(beforeFnCount);
    expect(await prisma.appointment.count()).toBe(beforeAppointmentCount);
    expect(await prisma.delegation.count()).toBe(beforeDelegationCount);
  });

  it('13. unknown eligibility operator cannot execute', async () => {
    const harness = await seedServiceTestHarness(prisma);

    await prisma.serviceEligibilityRule.deleteMany({
      where: { serviceVersionId: harness.version.id },
    });

    await prisma.serviceEligibilityRule.create({
      data: {
        serviceVersionId: harness.version.id,
        ruleCode: 'UNSUPPORTED_COMPOSITE',
        ruleLabel: 'Composite rule without executable children',
        operator: EligibilityOperator.AND,
      },
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/services/TEST-BUS-LIC/eligibility/evaluate')
      .send({ answers: { declaresEligiblePurpose: true } })
      .expect(400);

    expect(response.body.message).toMatch(/child rules|operator/i);
  });

  it('14. stored rule cannot execute arbitrary code', async () => {
    const harness = await seedServiceTestHarness(prisma);

    await prisma.serviceEligibilityRule.create({
      data: {
        serviceVersionId: harness.version.id,
        ruleCode: 'CODE_INJECTION',
        ruleLabel: 'Code injection attempt',
        operator: EligibilityOperator.EQUALS,
        fieldKey: 'declaresEligiblePurpose',
        expectedValue: 'process.exit(1)',
      },
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/services/TEST-BUS-LIC/eligibility/evaluate')
      .send({ answers: { declaresEligiblePurpose: true } })
      .expect(201);

    expect(response.body.outcome).not.toBe('APPROVED');
    expect(response.body.matchedRules).not.toContain('CODE_INJECTION');
  });

  it('15. form cannot execute arbitrary JavaScript', async () => {
    const harness = await seedServiceTestHarness(prisma);
    const section = await prisma.formSection.findFirst({
      where: { formVersionId: harness.formVersion.id },
    });
    if (!section) {
      throw new Error('Expected form section');
    }

    await prisma.formField.create({
      data: {
        formSectionId: section.id,
        fieldKey: 'maliciousScript',
        label: 'Malicious',
        fieldType: FormFieldType.TEXT,
        isRequired: false,
        sortOrder: 99,
        configuration: { onChange: '(() => { throw new Error("executed"); })()' },
      },
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/services/TEST-BUS-LIC/forms/validate')
      .send({
        payload: {
          activityType: 'GENERAL',
          maliciousScript: 'harmless',
        },
      })
      .expect(201);

    expect(response.body.valid).toBe(true);
  });

  it('16. published FormVersion cannot be silently edited', async () => {
    const harness = await seedServiceTestHarness(prisma);
    const beforeFingerprint = harness.formVersion.contentFingerprint;

    await request(app.getHttpServer())
      .patch(`/api/v1/services/forms/versions/${harness.formVersion.id}`)
      .send({ contentFingerprint: 'tampered' })
      .expect(404);

    const after = await prisma.formVersion.findUnique({ where: { id: harness.formVersion.id } });
    expect(after?.contentFingerprint).toBe(beforeFingerprint);
    expect(after?.status).toBe(FormVersionStatus.PUBLISHED);
  });

  it('17. required conditional field cannot be bypassed', async () => {
    await seedServiceTestHarness(prisma);

    const response = await request(app.getHttpServer())
      .post('/api/v1/services/TEST-BUS-LIC/forms/validate')
      .send({ payload: { activityType: 'RESTRICTED' } })
      .expect(201);

    expect(response.body.valid).toBe(false);
    expect(response.body.missingRequiredFields).toContain('restrictedActivityDetail');
  });

  it('18. malformed form data cannot pass validation', async () => {
    const harness = await seedServiceTestHarness(prisma);
    const section = await prisma.formSection.findFirst({
      where: { formVersionId: harness.formVersion.id },
    });
    if (!section) {
      throw new Error('Expected form section');
    }

    await prisma.formField.create({
      data: {
        formSectionId: section.id,
        fieldKey: 'annualRevenue',
        label: 'Annual Revenue',
        fieldType: FormFieldType.NUMBER,
        isRequired: true,
        sortOrder: 50,
      },
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/services/TEST-BUS-LIC/forms/validate')
      .send({
        payload: {
          activityType: 'GENERAL',
          annualRevenue: 'not-a-number',
        },
      })
      .expect(201);

    expect(response.body.valid).toBe(false);
    expect(response.body.errors.length).toBeGreaterThan(0);
  });

  it('19. uploaded-file reference is not VERIFIED evidence', async () => {
    const harness = await seedServiceTestHarness(prisma);
    const section = await prisma.formSection.findFirst({
      where: { formVersionId: harness.formVersion.id },
    });
    if (!section) {
      throw new Error('Expected form section');
    }

    await prisma.formField.create({
      data: {
        formSectionId: section.id,
        fieldKey: 'idDocument',
        label: 'ID Document',
        fieldType: FormFieldType.FILE_REFERENCE,
        isRequired: true,
        sortOrder: 51,
      },
    });

    const response = await request(app.getHttpServer())
      .post('/api/v1/services/TEST-BUS-LIC/forms/validate')
      .send({
        payload: {
          activityType: 'GENERAL',
          idDocument: { referenceId: 'upload-123', fileName: 'id.pdf' },
        },
      })
      .expect(201);

    expect(response.body.checklist.every((item: { isEvidenceVerified: boolean }) => !item.isEvidenceVerified)).toBe(
      true,
    );
  });

  it('20. checklist completion is not substantive approval', async () => {
    await seedServiceTestHarness(prisma);

    const response = await request(app.getHttpServer())
      .post('/api/v1/services/TEST-BUS-LIC/forms/validate')
      .send({
        payload: {
          activityType: 'RESTRICTED',
          restrictedActivityDetail: 'Provided detail',
        },
      })
      .expect(201);

    expect(response.body.valid).toBe(true);
    expect(response.body.isSubstantiveApproval).toBe(false);
    expect(response.body.checklist.every((item: { isSubstantiveApproval: boolean }) => !item.isSubstantiveApproval)).toBe(
      true,
    );
  });

  it('21. requirement without valid configured basis cannot silently become mandatory', async () => {
    const harness = await seedServiceTestHarness(prisma);

    await prisma.serviceRequirement.create({
      data: {
        serviceVersionId: harness.version.id,
        requirementCode: 'NO_BASIS',
        title: 'Requirement Without Basis',
        basisType: ServiceRequirementBasisType.MANUAL_REVIEW,
        basisReference: null,
        status: ServiceRequirementStatus.ACTIVE,
        isMandatory: true,
      },
    });

    const startPackage = await request(app.getHttpServer())
      .get('/api/v1/services/TEST-BUS-LIC/start-package')
      .expect(200);

    expect(startPackage.body.checklist.some((item: { requirementCode: string }) => item.requirementCode === 'NO_BASIS')).toBe(
      false,
    );
  });

  it('22. expired requirement cannot govern a new start', async () => {
    const harness = await seedServiceTestHarness(prisma);

    await prisma.serviceRequirement.create({
      data: {
        serviceVersionId: harness.version.id,
        requirementCode: 'EXPIRED_REQ',
        title: 'Expired Requirement',
        basisType: ServiceRequirementBasisType.MANUAL_REVIEW,
        basisReference: 'EXPIRED-BASIS',
        status: ServiceRequirementStatus.EXPIRED,
        isMandatory: true,
      },
    });

    const startPackage = await request(app.getHttpServer())
      .get('/api/v1/services/TEST-BUS-LIC/start-package')
      .expect(200);

    expect(
      startPackage.body.checklist.some((item: { requirementCode: string }) => item.requirementCode === 'EXPIRED_REQ'),
    ).toBe(false);
  });

  it('23. system cannot invent a fee', async () => {
    await seedServiceTestHarness(prisma);

    const startPackage = await request(app.getHttpServer())
      .get('/api/v1/services/TEST-BUS-LIC/start-package')
      .expect(200);

    const validation = await request(app.getHttpServer())
      .post('/api/v1/services/TEST-BUS-LIC/forms/validate')
      .send({
        payload: {
          activityType: 'GENERAL',
          inventedFee: { feeCode: 'HACK_FEE', amountCents: 1 },
        },
      })
      .expect(201);

    expect(startPackage.body.fees.map((fee: { feeCode: string }) => fee.feeCode)).toEqual(['BASE_FEE']);
    expect(validation.body).not.toHaveProperty('fees');
  });

  it('24. fee waiver metadata cannot perform a waiver', async () => {
    await seedServiceTestHarness(prisma);

    const response = await request(app.getHttpServer())
      .post('/api/v1/services/TEST-BUS-LIC/forms/validate')
      .send({
        payload: {
          activityType: 'GENERAL',
          feeWaived: true,
          waiverApproved: true,
        },
      })
      .expect(201);

    expect(response.body.waivesRequirements).toBe(false);

    const startPackage = await request(app.getHttpServer())
      .get('/api/v1/services/TEST-BUS-LIC/start-package')
      .expect(200);

    expect(startPackage.body.fees[0]?.amountCents).toBe(10000);
  });

  it('25. payment metadata cannot produce approval', async () => {
    await seedServiceTestHarness(prisma);

    const response = await request(app.getHttpServer())
      .post('/api/v1/services/TEST-BUS-LIC/forms/validate')
      .send({
        payload: {
          activityType: 'GENERAL',
          paymentStatus: 'PAID',
          paymentApproved: true,
        },
      })
      .expect(201);

    expect(response.body.isSubstantiveApproval).toBe(false);
    expect(response.body).not.toHaveProperty('paymentApproved');
    expect(response.body).not.toHaveProperty('approved');
  });

  it('26. SLA expiry cannot create approval', async () => {
    const harness = await seedServiceTestHarness(prisma);

    await prisma.serviceLevelTarget.create({
      data: {
        serviceVersionId: harness.version.id,
        targetCode: 'EXPIRED_SLA',
        label: 'Expired SLA',
        durationDays: -1,
      },
    });

    const startPackage = await request(app.getHttpServer())
      .get('/api/v1/services/TEST-BUS-LIC/start-package')
      .expect(200);

    expect(startPackage.body.isOfficialDecision).toBe(false);
    expect(startPackage.body).not.toHaveProperty('slaApproved');
    expect(startPackage.body).not.toHaveProperty('approved');
  });

  it('27. service dependency cannot transfer another institution authority', async () => {
    const harness = await seedServiceTestHarness(prisma);
    const beforeFnCount = await prisma.functionAuthorityRecord.count();
    const beforeDelegationCount = await prisma.delegation.count();

    await request(app.getHttpServer())
      .get('/api/v1/services/TEST-BUS-LIC/start-package')
      .expect(200);

    expect(await prisma.functionAuthorityRecord.count()).toBe(beforeFnCount);
    expect(await prisma.delegation.count()).toBe(beforeDelegationCount);
  });

  it('28. expected license output does not issue a license', async () => {
    await seedServiceTestHarness(prisma);

    const startPackage = await request(app.getHttpServer())
      .get('/api/v1/services/TEST-BUS-LIC/start-package')
      .expect(200);

    expect(startPackage.body.outputs.some((output: { outputType: string }) => output.outputType === 'LICENSE')).toBe(
      true,
    );
    expect(await tableExists('issued_licenses')).toBe(false);
  });

  it('29. expected certificate output does not issue a certificate', async () => {
    const harness = await seedServiceTestHarness(prisma);

    await prisma.serviceOutputDefinition.create({
      data: {
        serviceVersionId: harness.version.id,
        outputCode: 'CERT',
        label: 'Expected Certificate',
        outputType: ServiceOutputType.CERTIFICATE,
      },
    });

    const startPackage = await request(app.getHttpServer())
      .get('/api/v1/services/TEST-BUS-LIC/start-package')
      .expect(200);

    expect(startPackage.body.outputs.some((output: { outputCode: string }) => output.outputCode === 'CERT')).toBe(true);
    expect(await tableExists('issued_permits')).toBe(false);
    expect(await tableExists('issued_licenses')).toBe(false);
  });

  it('30. complaint route does not itself decide a complaint', async () => {
    await seedServiceTestHarness(prisma);

    const detail = await request(app.getHttpServer()).get('/api/v1/services/TEST-BUS-LIC').expect(200);

    expect(detail.body.redressRoutes.length).toBeGreaterThan(0);
    expect(detail.body).not.toHaveProperty('complaintDecision');
    expect(detail.body).not.toHaveProperty('decisionOutcome');
    expect(await tableExists('government_decisions')).toBe(false);
  });

  it('31. public APIs cannot leak restricted configuration', async () => {
    const harness = await seedServiceTestHarness(prisma);

    await prisma.governmentService.update({
      where: { id: harness.service.id },
      data: { publicVisibility: ServicePublicVisibility.RESTRICTED },
    });

    const list = await request(app.getHttpServer()).get('/api/v1/services').expect(200);
    expect(list.body.some((s: { code: string }) => s.code === 'TEST-BUS-LIC')).toBe(false);

    const detail = await request(app.getHttpServer()).get('/api/v1/services/TEST-BUS-LIC').expect(200);

    expect(detail.body).not.toHaveProperty('configurationFingerprint');
    expect(detail.body).not.toHaveProperty('functionMappings');
    expect(detail.body).not.toHaveProperty('waiverMetadata');
    expect(detail.body).not.toHaveProperty('internalNotes');

    const adminListing = await request(app.getHttpServer()).get('/api/v1/services/admin/all').expect(200);
    const restricted = adminListing.body.find((s: { code: string }) => s.code === 'TEST-BUS-LIC');
    expect(restricted?.publicVisibility).toBe(ServicePublicVisibility.RESTRICTED);
    expect(restricted?.currentPublishedVersion?.configurationFingerprint).toBeDefined();
    expect(detail.body).not.toHaveProperty('currentPublishedVersion');
  });

  it('32. service suspension invalidates cached active listing', async () => {
    const harness = await seedServiceTestHarness(prisma);

    const beforeList = await request(app.getHttpServer()).get('/api/v1/services').expect(200);
    expect(beforeList.body.some((s: { code: string }) => s.code === 'TEST-BUS-LIC')).toBe(true);

    await createSession(harness.adminIdentity.id, harness.adminIdentity.userAccountId, 'admin-token');

    await request(app.getHttpServer())
      .post(`/api/v1/services/${harness.service.id}/suspend`)
      .set('Authorization', 'Bearer admin-token')
      .send({ actorIdentityId: harness.adminIdentity.id, reason: 'Cache invalidation test' })
      .expect(201);

    const afterList = await request(app.getHttpServer()).get('/api/v1/services').expect(200);
    expect(afterList.body.some((s: { code: string }) => s.code === 'TEST-BUS-LIC')).toBe(false);
  });

  it('33. technical test completion cannot equal institutional acceptance', async () => {
    await seedServiceTestHarness(prisma);

    const validation = await request(app.getHttpServer())
      .post('/api/v1/services/TEST-BUS-LIC/forms/validate')
      .send({
        payload: {
          activityType: 'RESTRICTED',
          restrictedActivityDetail: 'Complete payload',
        },
      })
      .expect(201);

    const startPackage = await request(app.getHttpServer())
      .get('/api/v1/services/TEST-BUS-LIC/start-package')
      .expect(200);

    expect(validation.body.valid).toBe(true);
    expect(validation.body.isSubstantiveApproval).toBe(false);
    expect(startPackage.body.isOfficialDecision).toBe(false);
  });

  it('34. pilot-only service cannot be represented as unrestricted production service', async () => {
    const harness = await seedServiceTestHarness(prisma);

    await prisma.governmentService.update({
      where: { id: harness.service.id },
      data: { lifecycleStatus: GovernmentServiceLifecycleStatus.PILOT_ONLY },
    });

    const list = await request(app.getHttpServer()).get('/api/v1/services').expect(200);
    expect(list.body.some((s: { code: string }) => s.code === 'TEST-BUS-LIC')).toBe(false);

    await request(app.getHttpServer()).get('/api/v1/services/TEST-BUS-LIC/start-package').expect(400);
  });

  it('35. service with unresolved authority cannot be activated as ordinary production', async () => {
    const harness = await seedServiceTestHarness(prisma);

    await prisma.governmentService.update({
      where: { id: harness.service.id },
      data: {
        lifecycleStatus: GovernmentServiceLifecycleStatus.DRAFT,
        currentPublishedVersionId: null,
      },
    });

    await prisma.functionAuthorityRecord.update({
      where: { id: harness.fn.id },
      data: { lifecycleStatus: FunctionAuthorityLifecycleStatus.SUSPENDED },
    });

    const draftVersion = await prisma.governmentServiceVersion.create({
      data: {
        governmentServiceId: harness.service.id,
        versionNumber: 97,
        versionLabel: 'unresolved-auth',
        status: GovernmentServiceVersionStatus.DRAFT,
        publicTitle: 'Unresolved Authority',
        publicDescription: harness.version.publicDescription,
        applicantCategories: harness.version.applicantCategories,
        configurationFingerprint: 'unresolved-auth-fp',
      },
    });

    await prisma.serviceFunctionMapping.create({
      data: {
        serviceVersionId: draftVersion.id,
        functionAuthorityRecordId: harness.fn.id,
        isPrimary: true,
      },
    });

    await createSession(harness.adminIdentity.id, harness.adminIdentity.userAccountId, 'admin-token');

    await request(app.getHttpServer())
      .post(`/api/v1/services/${harness.service.id}/activate`)
      .set('Authorization', 'Bearer admin-token')
      .send({
        versionId: draftVersion.id,
        actorIdentityId: harness.adminIdentity.id,
      })
      .expect(400);
  });

  it('36. start package cannot create Application', async () => {
    await seedServiceTestHarness(prisma);

    const startPackage = await request(app.getHttpServer())
      .get('/api/v1/services/TEST-BUS-LIC/start-package')
      .expect(200);

    expect(startPackage.body.createsApplication).toBe(false);
    expect(await tableExists('applications')).toBe(false);
  });

  it('37. start package cannot create Case', async () => {
    await seedServiceTestHarness(prisma);

    const startPackage = await request(app.getHttpServer())
      .get('/api/v1/services/TEST-BUS-LIC/start-package')
      .expect(200);

    expect(startPackage.body.createsCase).toBe(false);
    expect(await tableExists('cases')).toBe(false);
  });

  it('38. Phase 5 cannot make a Government decision', async () => {
    await seedServiceTestHarness(prisma);

    await request(app.getHttpServer())
      .post('/api/v1/services/TEST-BUS-LIC/eligibility/evaluate')
      .send({ answers: { declaresEligiblePurpose: true } })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/services/TEST-BUS-LIC/forms/validate')
      .send({
        payload: {
          activityType: 'RESTRICTED',
          restrictedActivityDetail: 'detail',
          governmentDecision: 'APPROVED',
        },
      })
      .expect(201);

    expect(await tableExists('government_decisions')).toBe(false);
  });

  it('39. Phase 5 cannot issue an official instrument', async () => {
    await seedServiceTestHarness(prisma);

    await request(app.getHttpServer())
      .get('/api/v1/services/TEST-BUS-LIC/start-package')
      .expect(200);

    expect(await tableExists('issued_licenses')).toBe(false);
    expect(await tableExists('issued_permits')).toBe(false);
  });

  it('40. AI is not required and cannot silently determine service eligibility or approval', async () => {
    await seedServiceTestHarness(prisma);

    const withoutAi = await request(app.getHttpServer())
      .post('/api/v1/services/TEST-BUS-LIC/eligibility/evaluate')
      .send({ answers: { declaresEligiblePurpose: true } })
      .expect(201);

    const withAiOverride = await request(app.getHttpServer())
      .post('/api/v1/services/TEST-BUS-LIC/eligibility/evaluate')
      .send({
        answers: {
          aiRecommendation: 'APPROVED',
          aiDeterminedEligible: true,
        },
      })
      .expect(201);

    expect(withoutAi.body.outcome).toBe(EligibilityGuidanceOutcome.LIKELY_ELIGIBLE);
    expect(withoutAi.body.isPreliminaryGuidanceOnly).toBe(true);
    expect(withAiOverride.body.outcome).not.toBe('APPROVED');
    expect(withAiOverride.body.outcome).toBe(EligibilityGuidanceOutcome.LIKELY_INELIGIBLE);
    expect(withAiOverride.body).not.toHaveProperty('aiApproved');
    expect(withAiOverride.body.matchedRules).not.toContain('aiRecommendation');
  });
});
