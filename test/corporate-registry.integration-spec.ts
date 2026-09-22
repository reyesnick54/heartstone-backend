import { type INestApplication } from '@nestjs/common';
import {
  CorporateEntityType,
  CorporatePublicVerificationMode,
  CorporateRegistrationStatus,
  CorporateRegistryDecisionType,
  CorporateRegistryRecordStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { CorporateCertificateService } from '../src/corporate-registry/certificates/corporate-certificate.service';
import { CorporateRegistryConfigurationService } from '../src/corporate-registry/configuration/corporate-registry-configuration.service';
import { CorporateRegistryLifecycleService } from '../src/corporate-registry/lifecycle/corporate-registry-lifecycle.service';
import { PublicCorporateRegistryVerificationService } from '../src/corporate-registry/verification/public-corporate-registry-verification.service';
import { PrismaService } from '../src/database/prisma.service';
import {
  CORPORATE_REGISTRY_SERVICE_PACK,
  CORPORATE_REGISTRY_TEMPLATE_SERVICE_DEFINITIONS,
} from '../src/service-catalog/service-packs/corporate-registry-service-pack';
import { validateServicePackManifest } from '../src/service-catalog/service-packs/validate-service-pack';
import { seedBusinessExperienceFixture } from './helpers/business-experience-test-fixtures';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Corporate Registry domain (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let lifecycle: CorporateRegistryLifecycleService;
  let certificates: CorporateCertificateService;
  let configuration: CorporateRegistryConfigurationService;
  let publicVerification: PublicCorporateRegistryVerificationService;
  let fixture: Awaited<ReturnType<typeof seedBusinessExperienceFixture>>;

  beforeAll(async () => {
    ({ app } = await createIntegrationApp());
    prisma = app.get(PrismaService);
    lifecycle = app.get(CorporateRegistryLifecycleService);
    certificates = app.get(CorporateCertificateService);
    configuration = app.get(CorporateRegistryConfigurationService);
    publicVerification = app.get(PublicCorporateRegistryVerificationService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
    fixture = await seedBusinessExperienceFixture(app, prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('validates the corporate registry business service pack', () => {
    const result = validateServicePackManifest(CORPORATE_REGISTRY_SERVICE_PACK);
    expect(result.valid).toBe(true);
    expect(CORPORATE_REGISTRY_TEMPLATE_SERVICE_DEFINITIONS).toHaveLength(14);
  });

  it('marks every corporate registry template service as NON_PRODUCTION', () => {
    for (const service of CORPORATE_REGISTRY_TEMPLATE_SERVICE_DEFINITIONS) {
      expect(service.description).toMatch(/NON_PRODUCTION/);
    }
  });

  it('denies unauthorized users from another company corporate profile', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/experience/business/organizations/${fixture.organizationId}/corporate-profile`)
      .set('Authorization', `Bearer ${fixture.outsiderSessionToken}`)
      .expect(403);
  });

  it('minimizes public verification data and hides beneficial ownership', async () => {
    const profile = await lifecycle.ensureProfileForOrganization(fixture.organizationId);
    await lifecycle.applyOfficialDecision({
      profileId: profile.id,
      decisionType: CorporateRegistryDecisionType.INCORPORATION,
      approved: true,
      registeredName: 'Acme Holdings',
      registrationReference: 'REG-PUBLIC-1',
      entityType: CorporateEntityType.COMPANY,
    });

    await prisma.corporateBeneficialOwnershipDeclaration.create({
      data: {
        profileId: profile.id,
        declarationReference: 'BO-SECRET-1',
        restrictedSummary: 'Sensitive owner identity',
        recordApprovalStatus: CorporateRegistryRecordStatus.APPROVED,
      },
    });

    await configuration.setPublicVerificationMode(CorporatePublicVerificationMode.MINIMAL_FACTS);

    const response = await publicVerification.verify('CRV-REG-PUBLIC-1');
    expect(response.registeredName).toBe('Acme Holdings');
    expect(response.registrationReference).toBe('REG-PUBLIC-1');
    expect(JSON.stringify(response)).not.toContain('Sensitive owner identity');
    expect(JSON.stringify(response)).not.toContain('BO-SECRET-1');
  });

  it('requires official registry decision before incorporation activates the company', async () => {
    const profile = await lifecycle.ensureProfileForOrganization(fixture.organizationId);

    await lifecycle.recordPaymentReceived({
      profileId: profile.id,
      paymentReference: 'PAY-NO-ACTIVATE',
      amount: 500,
      currencyCode: 'USD',
    });

    const afterPayment = await prisma.corporateRegistryProfile.findUniqueOrThrow({
      where: { id: profile.id },
    });
    expect(afterPayment.registrationStatus).toBe(CorporateRegistrationStatus.DRAFT);

    await lifecycle.applyOfficialDecision({
      profileId: profile.id,
      decisionType: CorporateRegistryDecisionType.INCORPORATION,
      approved: true,
      registeredName: 'Activated Co',
      registrationReference: 'REG-ACTIVATED',
      entityType: CorporateEntityType.COMPANY,
    });

    const afterDecision = await prisma.corporateRegistryProfile.findUniqueOrThrow({
      where: { id: profile.id },
    });
    expect(afterDecision.registrationStatus).toBe(CorporateRegistrationStatus.ACTIVE);
  });

  it('blocks certificate issuance from unapproved draft records', async () => {
    const profile = await lifecycle.ensureProfileForOrganization(fixture.organizationId);

    await expect(
      certificates.issueCertificate({
        profileId: profile.id,
        certificateReference: 'CERT-DRAFT',
        label: 'Certificate of Good Standing',
      }),
    ).rejects.toThrow(/cannot be issued/i);
  });

  it('keeps superseded registered office history and restoration dissolution history', async () => {
    const profile = await lifecycle.ensureProfileForOrganization(fixture.organizationId);
    await lifecycle.supersedeRegisteredOffice(profile.id, 'First Office');
    await lifecycle.supersedeRegisteredOffice(profile.id, 'Second Office');

    const offices = await prisma.corporateRegisteredOffice.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(offices).toHaveLength(2);
    expect(offices[0]?.recordStatus).toBe(CorporateRegistryRecordStatus.SUPERSEDED);
    expect(offices[1]?.isCurrent).toBe(true);

    await lifecycle.applyOfficialDecision({
      profileId: profile.id,
      decisionType: CorporateRegistryDecisionType.DISSOLUTION,
      approved: true,
    });
    await lifecycle.applyOfficialDecision({
      profileId: profile.id,
      decisionType: CorporateRegistryDecisionType.RESTORATION,
      approved: true,
    });

    const history = await prisma.corporateRegistryStatusHistory.findMany({
      where: { profileId: profile.id },
    });
    expect(history.some((entry) => entry.eventType === 'DISSOLUTION')).toBe(true);
    expect(history.some((entry) => entry.summary.includes('dissolution history preserved'))).toBe(
      true,
    );
  });

  it('enforces representative access scope for beneficial ownership on corporate profile', async () => {
    const profile = await lifecycle.ensureProfileForOrganization(fixture.organizationId);
    await prisma.corporateBeneficialOwnershipDeclaration.create({
      data: {
        profileId: profile.id,
        declarationReference: 'BO-1',
        restrictedSummary: 'Member-only ownership summary',
        recordApprovalStatus: CorporateRegistryRecordStatus.APPROVED,
      },
    });

    const memberResponse = await request(app.getHttpServer())
      .get(`/api/v1/experience/business/organizations/${fixture.organizationId}/corporate-profile`)
      .set('Authorization', `Bearer ${fixture.memberSessionToken}`)
      .expect(200);
    const memberBody = memberResponse.body as {
      beneficialOwnershipSummary: { restrictedSummary: string } | null;
    };
    expect(memberBody.beneficialOwnershipSummary?.restrictedSummary).toBe(
      'Member-only ownership summary',
    );

    const representativeResponse = await request(app.getHttpServer())
      .get(`/api/v1/experience/business/organizations/${fixture.organizationId}/corporate-profile`)
      .set('Authorization', `Bearer ${fixture.representativeSessionToken}`)
      .expect(200);
    const representativeBody = representativeResponse.body as {
      beneficialOwnershipSummary: unknown;
      representativeAccessLimited: boolean;
    };
    expect(representativeBody.beneficialOwnershipSummary).toBeNull();
    expect(representativeBody.representativeAccessLimited).toBe(true);
  });

  it('rejects direct client attempts to forge corporate status', () => {
    expect(() => lifecycle.assertClientCannotSetRegistrationStatus()).toThrow(
      /official registry decisions/i,
    );
  });
});
