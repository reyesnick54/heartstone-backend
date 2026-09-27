import { type INestApplication } from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityClassification,
  ControlledFunctionClass,
  CorporateEntityType,
  CorporateRegistrationStatus,
  CorporateRegistryDecisionType,
  FunctionAuthorityLifecycleStatus,
  OfficialInstrumentStatus,
  SezBusinessLicenceLifecycleStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import {
  ABSEZ_SEZ_AUTHORITY_FUNCTION_CODES,
  ABSEZ_SEZ_LICENCE_SERVICE_PACK_ID,
} from '../src/absez/absez.constants';
import { ABSEZ_SEZ_BUSINESS_LICENCE_SERVICE_PACK } from '../src/absez/service-pack/sez-business-licence-service-pack';
import { CorporateBeneficialOwnershipService } from '../src/corporate-registry/beneficial-ownership/corporate-beneficial-ownership.service';
import { CorporateRegistryLifecycleService } from '../src/corporate-registry/lifecycle/corporate-registry-lifecycle.service';
import { PrismaService } from '../src/database/prisma.service';
import { validateServicePackManifest } from '../src/service-catalog/service-packs/validate-service-pack';
import { seedBusinessExperienceFixture } from './helpers/business-experience-test-fixtures';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';

describe('Remediation S17 — SEZ licensing and corporate registry (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let lifecycle: CorporateRegistryLifecycleService;
  let fixture: Awaited<ReturnType<typeof seedBusinessExperienceFixture>>;

  beforeAll(async () => {
    ({ app } = await createIntegrationApp());
    prisma = app.get(PrismaService);
    lifecycle = app.get(CorporateRegistryLifecycleService);
  });

  beforeEach(async () => {
    await resetAllTestData(prisma);
    fixture = await seedBusinessExperienceFixture(app, prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  async function seedSezAuthorityFunctions(institutionId: string, officeId: string) {
    const governingSource = await prisma.governingSource.findFirstOrThrow();
    for (const code of [
      ABSEZ_SEZ_AUTHORITY_FUNCTION_CODES.DECIDE,
      ABSEZ_SEZ_AUTHORITY_FUNCTION_CODES.ISSUE,
      ABSEZ_SEZ_AUTHORITY_FUNCTION_CODES.SUSPEND,
      ABSEZ_SEZ_AUTHORITY_FUNCTION_CODES.REVOKE,
    ]) {
      await prisma.functionAuthorityRecord.upsert({
        where: { code },
        create: {
          code,
          name: `S17 ${code}`,
          classification: AuthorityClassification.ABSEZ_OWNED,
          functionClass: ControlledFunctionClass.LICENSING,
          lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
          institutionId,
          officeId,
          activatedAt: new Date('2020-01-01'),
          requiresAppointment: true,
          governingSources: { create: { governingSourceId: governingSource.id, isPrimary: true } },
          actionRights: {
            create: [
              {
                action: code.includes('ISSUE')
                  ? AuthorityActionType.ISSUE
                  : code.includes('SUSPEND')
                    ? AuthorityActionType.SUSPEND
                    : code.includes('REVOKE')
                      ? AuthorityActionType.REVOKE
                      : AuthorityActionType.APPROVE,
                permitted: true,
                requiresHumanActor: true,
              },
            ],
          },
        },
        update: {
          lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
          institutionId,
          officeId,
        },
      });
    }
  }

  it('validates ABSEZ SEZ business licence service pack', () => {
    const result = validateServicePackManifest(ABSEZ_SEZ_BUSINESS_LICENCE_SERVICE_PACK);
    expect(result.valid).toBe(true);
    expect(ABSEZ_SEZ_BUSINESS_LICENCE_SERVICE_PACK.packId).toBe(ABSEZ_SEZ_LICENCE_SERVICE_PACK_ID);
    expect(ABSEZ_SEZ_BUSINESS_LICENCE_SERVICE_PACK.services.length).toBeGreaterThanOrEqual(5);
  });

  it('company registration intake creates canonical organization profile state without activation', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/corporate-registry/organizations/${fixture.organizationId}/registration-intake`)
      .set('Authorization', `Bearer ${fixture.memberSessionToken}`)
      .send({
        registeredName: 'S17 Test Co',
        entityType: CorporateEntityType.COMPANY,
        jurisdictionCode: 'ABSEZ',
      })
      .expect(200);

    const body = response.body as { profile: { registrationStatus: string } };
    expect(body.profile.registrationStatus).toBe(CorporateRegistrationStatus.DRAFT);

    const profile = await prisma.corporateRegistryProfile.findUniqueOrThrow({
      where: { organizationId: fixture.organizationId },
    });
    expect(profile.registeredName).toBe('S17 Test Co');
    expect(profile.registrationStatus).toBe(CorporateRegistrationStatus.DRAFT);
  });

  it('denies unauthorized user from altering corporate registry records', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/corporate-registry/organizations/${fixture.organizationId}/registration-intake`)
      .set('Authorization', `Bearer ${fixture.outsiderSessionToken}`)
      .send({ registeredName: 'Hostile Takeover Ltd' })
      .expect(403);
  });

  it('allows representative to submit general filings but not structured beneficial ownership', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/corporate-registry/organizations/${fixture.organizationId}/amendments`)
      .set('Authorization', `Bearer ${fixture.representativeSessionToken}`)
      .send({ label: 'Representative amendment filing' })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/corporate-registry/organizations/${fixture.organizationId}/beneficial-ownership`)
      .set('Authorization', `Bearer ${fixture.representativeSessionToken}`)
      .send({
        owners: [
          {
            ownerReference: 'BO-REP-1',
            controlNature: 'OWNERSHIP',
            ownershipPercentage: 40,
            provenanceSource: 'representative attempt',
          },
        ],
      })
      .expect(403);
  });

  it('stores structured beneficial ownership and preserves superseded history', async () => {
    const submit = await request(app.getHttpServer())
      .post(`/api/v1/corporate-registry/organizations/${fixture.organizationId}/beneficial-ownership`)
      .set('Authorization', `Bearer ${fixture.memberSessionToken}`)
      .send({
        owners: [
          {
            ownerReference: 'BO-STRUCT-1',
            controlNature: 'OWNERSHIP',
            ownershipPercentage: 55,
            provenanceSource: 'member declaration',
          },
        ],
      })
      .expect(200);

    const submitBody = submit.body as { records: { id: string }[] };
    const firstRecord = submitBody.records[0];
    if (!firstRecord) {
      throw new Error('Expected beneficial owner record in submission response');
    }
    const status = await request(app.getHttpServer())
      .get(`/api/v1/corporate-registry/organizations/${fixture.organizationId}/status`)
      .set('Authorization', `Bearer ${fixture.memberSessionToken}`)
      .expect(200);

    const statusBody = status.body as {
      beneficialOwners: { ownerReference: string; ownershipPercentage: string }[];
    };
    expect(statusBody.beneficialOwners).toHaveLength(1);
    expect(statusBody.beneficialOwners[0]?.ownerReference).toBe('BO-STRUCT-1');

    const historyBefore = await prisma.corporateBeneficialOwnershipChangeHistory.count();
    expect(historyBefore).toBeGreaterThan(0);

    const beneficialService = app.get(CorporateBeneficialOwnershipService);
    await beneficialService.supersedeOwnerRecord({
      profileId: (await prisma.corporateRegistryProfile.findUniqueOrThrow({
        where: { organizationId: fixture.organizationId },
      })).id,
      beneficialOwnerRecordId: firstRecord.id,
      changedByIdentityId: fixture.memberIdentityId,
      replacement: {
        ownerReference: 'BO-STRUCT-2',
        controlNature: 'BOTH',
        ownershipPercentage: 60,
        provenanceSource: 'amended declaration',
      },
    });

    const historyAfter = await prisma.corporateBeneficialOwnershipChangeHistory.count();
    expect(historyAfter).toBeGreaterThan(historyBefore);
    const superseded = await prisma.corporateBeneficialOwnerRecord.findMany({
      where: { profileId: (await prisma.corporateRegistryProfile.findUniqueOrThrow({
        where: { organizationId: fixture.organizationId },
      })).id },
    });
    expect(superseded.some((record) => record.ownerReference === 'BO-STRUCT-1' && record.supersededAt)).toBe(
      true,
    );
  });

  it('SEZ licence workflow: payment does not issue; decision + instrument required', async () => {
    await seedSezAuthorityFunctions(fixture.institutionId, fixture.phase11Base.officeId);

    const profile = await lifecycle.ensureProfileForOrganization(fixture.organizationId);
    await lifecycle.applyOfficialDecision({
      profileId: profile.id,
      decisionType: CorporateRegistryDecisionType.INCORPORATION,
      approved: true,
      registeredName: 'Licensed Co',
      registrationReference: 'REG-S17',
      entityType: CorporateEntityType.COMPANY,
    });

    const intake = await request(app.getHttpServer())
      .post(
        `/api/v1/absez/organizations/${fixture.organizationId}/institutions/${fixture.institutionId}/sez-licences/intake`,
      )
      .set('Authorization', `Bearer ${fixture.memberSessionToken}`)
      .send({ approvedActivityCategoryCodes: ['MANUFACTURING'] })
      .expect(200);

    const licenceId = (intake.body as { id: string }).id;

    await request(app.getHttpServer())
      .post(`/api/v1/absez/sez-licences/${licenceId}/payments`)
      .send({
        paymentReference: 'PAY-SEZ-1',
        amount: 750,
        currencyCode: 'USD',
      })
      .expect(200);

    const afterPayment = await prisma.sezBusinessLicenceRecord.findUniqueOrThrow({
      where: { id: licenceId },
    });
    expect(afterPayment.lifecycleStatus).toBe(SezBusinessLicenceLifecycleStatus.PENDING);
    expect(afterPayment.officialInstrumentId).toBeNull();

    const instrument = await prisma.officialInstrument.create({
      data: {
        governmentDecisionId: fixture.governmentDecisionId,
        issuerInstitutionId: fixture.institutionId,
        scope: { licenceReference: afterPayment.licenceReference },
        status: OfficialInstrumentStatus.ISSUED,
        verificationCode: 'SEZVERIFY0001',
      },
    });

    await request(app.getHttpServer())
      .post(`/api/v1/absez/sez-licences/${licenceId}/issue`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        governmentDecisionId: fixture.governmentDecisionId,
        officialInstrumentId: instrument.id,
      })
      .expect(200);

    const issued = await prisma.sezBusinessLicenceRecord.findUniqueOrThrow({ where: { id: licenceId } });
    expect(issued.lifecycleStatus).toBe(SezBusinessLicenceLifecycleStatus.ACTIVE);
    expect(issued.officialInstrumentId).toBe(instrument.id);
  });

  it('denies cross-institution SEZ licence suspension', async () => {
    await seedSezAuthorityFunctions(fixture.institutionId, fixture.phase11Base.officeId);
    const otherInstitution = await prisma.institution.create({
      data: {
        jurisdictionId: (
          await prisma.institution.findUniqueOrThrow({ where: { id: fixture.institutionId } })
        ).jurisdictionId,
        code: 'S17-OTHER-INST',
        name: 'Other Institution',
        type: 'MINISTRY',
      },
    });

    const intake = await request(app.getHttpServer())
      .post(
        `/api/v1/absez/organizations/${fixture.organizationId}/institutions/${fixture.institutionId}/sez-licences/intake`,
      )
      .set('Authorization', `Bearer ${fixture.memberSessionToken}`)
      .send({ approvedActivityCategoryCodes: ['LOGISTICS'] })
      .expect(200);
    const licenceId = (intake.body as { id: string }).id;

    await request(app.getHttpServer())
      .post(`/api/v1/absez/sez-licences/${licenceId}/suspend`)
      .set('Authorization', `Bearer ${fixture.officialSessionToken}`)
      .send({
        governmentDecisionId: fixture.governmentDecisionId,
        officialInstitutionId: otherInstitution.id,
      })
      .expect(403);
  });
});
