import { type INestApplication } from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityClassification,
  CivilRegistryCertificateStatus,
  CivilRegistryCertificateType,
  CivilRegistryEventType,
  CivilRegistryRecordStatus,
  ControlledFunctionClass,
  FunctionAuthorityLifecycleStatus,
} from '@prisma/client';
import request from 'supertest';
import { type App } from 'supertest/types';

import { CivilRegistryVitalRecordCertificateService } from '../src/civil-registry/certificates/civil-registry-vital-record-certificate.service';
import {
  CIVIL_REGISTRY_AUTHORITY_FUNCTION_CODES,
  CIVIL_REGISTRY_SERVICE_PACK_ID,
} from '../src/civil-registry/civil-registry.constants';
import { CivilRegistryVitalRecordRegistrationService } from '../src/civil-registry/registration/civil-registry-vital-record-registration.service';
import { CivilRegistryVerificationService } from '../src/civil-registry/verification/civil-registry-verification.service';
import { type PrismaService } from '../src/database/prisma.service';
import { CIVIL_REGISTRY_SERVICE_PACK_MANIFEST } from '../src/service-catalog/service-packs/civil-registry-service-pack.manifest';
import { validateServicePackManifest } from '../src/service-catalog/service-packs/validate-service-pack';
import { provisionAuthenticatedIdentity } from './helpers/identity-provisioning.fixture';
import { createIntegrationApp, resetAllTestData } from './helpers/integration-app';
import { type Phase8FixtureContext, seedPhase8Fixture } from './helpers/phase-8-test-fixtures';

describe('Civil Identity & Vital Records service pack (integration)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let fixture: Phase8FixtureContext;
  let entitledCitizenSession: string;
  let otherCitizenSession: string;
  let entitledCitizenId: string;
  let otherCitizenId: string;
  let officialSession: string;
  let officialIdentityId: string;

  beforeAll(async () => {
    const boot = await createIntegrationApp();
    app = boot.app;
    prisma = boot.prisma;
    await resetAllTestData(prisma);
    fixture = await seedPhase8Fixture(app, prisma);

    const templateIssueFunctionCode = CIVIL_REGISTRY_AUTHORITY_FUNCTION_CODES.CERTIFICATE_ISSUE;
    const baseFunction = await prisma.functionAuthorityRecord.findUniqueOrThrow({
      where: { id: fixture.functionAuthorityRecordId },
      include: { governingSources: true },
    });
    const governingSourceId = baseFunction.governingSources[0]?.governingSourceId;
    if (!governingSourceId) {
      throw new Error('Expected governing source on Phase 8 function authority record');
    }

    await prisma.functionAuthorityRecord.upsert({
      where: { code: templateIssueFunctionCode },
      create: {
        code: templateIssueFunctionCode,
        name: 'Template civil certificate issuance',
        classification: AuthorityClassification.ABSEZ_OWNED,
        functionClass: ControlledFunctionClass.REGISTRATION,
        lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
        institutionId: fixture.institutionId,
        officeId: fixture.officeId,
        activatedAt: new Date('2020-01-01'),
        requiresAppointment: true,
        governingSources: {
          create: { governingSourceId, isPrimary: true },
        },
        actionRights: {
          create: [
            {
              action: AuthorityActionType.ISSUE,
              permitted: true,
              requiresHumanActor: true,
            },
          ],
        },
      },
      update: {
        lifecycleStatus: FunctionAuthorityLifecycleStatus.ACTIVE,
        institutionId: fixture.institutionId,
        officeId: fixture.officeId,
      },
    });

    const entitled = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'civil-entitled@example.test',
      password: 'Civil-Entitled-Test-Password-1!',
      displayName: 'Civil Registry Entitled Citizen',
    });
    const other = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'civil-other@example.test',
      password: 'Civil-Other-Test-Password-1!',
      displayName: 'Civil Registry Other Citizen',
    });
    entitledCitizenSession = entitled.sessionToken;
    entitledCitizenId = entitled.identityId;
    otherCitizenSession = other.sessionToken;
    otherCitizenId = other.identityId;

    const official = await provisionAuthenticatedIdentity(app, prisma, {
      loginIdentifier: 'civil-official@example.test',
      password: 'Civil-Official-Test-Password-1!',
      displayName: 'Civil Registry Official Actor',
    });
    officialSession = official.sessionToken;
    officialIdentityId = official.identityId;
  });

  afterAll(async () => {
    await app.close();
  });

  it('service pack validates and is NON_PRODUCTION', () => {
    const result = validateServicePackManifest(CIVIL_REGISTRY_SERVICE_PACK_MANIFEST);
    expect(result.valid).toBe(true);
    expect(CIVIL_REGISTRY_SERVICE_PACK_MANIFEST.packLabel).toBe('NON_PRODUCTION');
    expect(CIVIL_REGISTRY_SERVICE_PACK_MANIFEST.description).toMatch(/NON_PRODUCTION/);
    expect(CIVIL_REGISTRY_SERVICE_PACK_MANIFEST.packId).toBe(CIVIL_REGISTRY_SERVICE_PACK_ID);
    expect(CIVIL_REGISTRY_SERVICE_PACK_MANIFEST.services).toHaveLength(10);
  });

  it('citizen sees only entitled records', async () => {
    const caseRecord = await prisma.case.findUniqueOrThrow({
      where: { id: fixture.caseId },
      select: { applicationId: true },
    });
    const registration = app.get(CivilRegistryVitalRecordRegistrationService);
    const created = await registration.createEventSubmission({
      caseId: fixture.caseId,
      applicationId: caseRecord.applicationId,
      eventType: CivilRegistryEventType.BIRTH,
      institutionId: fixture.institutionId,
      subjectIdentityId: entitledCitizenId,
    });

    const otherRecord = await prisma.civilRegistryVitalRecord.create({
      data: {
        recordNumber: 'CIV-TPL-OTHER-ONLY',
        eventType: CivilRegistryEventType.DEATH,
        status: CivilRegistryRecordStatus.OFFICIAL,
        institutionId: fixture.institutionId,
        subjectIdentityId: otherCitizenId,
      },
    });
    const otherVersion = await prisma.civilRegistryVitalRecordVersion.create({
      data: {
        vitalRecordId: otherRecord.id,
        versionNumber: 1,
        recordStateHash: 'hash-other',
        summaryLabel: 'Other citizen record',
        isOriginal: true,
      },
    });
    await prisma.civilRegistryVitalRecord.update({
      where: { id: otherRecord.id },
      data: { currentVersionId: otherVersion.id },
    });

    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/experience/citizen/vital-records')
      .set('Authorization', `Bearer ${entitledCitizenSession}`)
      .expect(200);

    const ids = (listResponse.body as { id: string }[]).map((item) => item.id);
    expect(ids).toContain(created.vitalRecord.id);

    const otherList = await request(app.getHttpServer())
      .get('/api/v1/experience/citizen/vital-records')
      .set('Authorization', `Bearer ${otherCitizenSession}`)
      .expect(200);
    const otherIds = (otherList.body as { id: string }[]).map((item) => item.id);
    expect(otherIds).not.toContain(created.vitalRecord.id);
  });

  it('birth submission does not become official without decision', async () => {
    const record = await prisma.civilRegistryVitalRecord.findFirstOrThrow({
      where: { registrationCaseId: fixture.caseId },
    });
    expect(record.status).toBe(CivilRegistryRecordStatus.SUBMISSION_PENDING);
  });

  it('correction request preserves original record version', async () => {
    const registration = app.get(CivilRegistryVitalRecordRegistrationService);
    const record = await prisma.civilRegistryVitalRecord.findFirstOrThrow({
      where: { registrationCaseId: fixture.caseId },
    });

    await registration.registerOfficialEvent({
      vitalRecordId: record.id,
      officialIdentityId: officialIdentityId,
      summaryLabel: 'Original birth registration',
      recordStatePayload: { givenNames: 'Template Child' },
    });

    const corrected = await registration.approveCorrection({
      vitalRecordId: record.id,
      officialIdentityId: officialIdentityId,
      amendmentReason: 'Template spelling correction',
      summaryLabel: 'Corrected birth registration',
      correctedStatePayload: { givenNames: 'Template Child Corrected' },
    });

    const versions = await prisma.civilRegistryVitalRecordVersion.findMany({
      where: { vitalRecordId: record.id },
      orderBy: { versionNumber: 'asc' },
    });
    expect(versions).toHaveLength(2);
    expect(versions[0]?.isOriginal).toBe(true);
    expect(versions[1]?.id).toBe(corrected.newVersion.id);
    expect(corrected.previousVersionId).toBe(versions[0]?.id);
  });

  it('citizen cannot self-issue certificate', () => {
    const certificates = app.get(CivilRegistryVitalRecordCertificateService);
    expect(() => {
      certificates.assertCitizenCannotIssueCertificate();
    }).toThrow(/cannot self-issue/i);
  });

  it('official without authority cannot issue certificate via consequential route', async () => {
    const record = await prisma.civilRegistryVitalRecord.findFirstOrThrow({
      where: { registrationCaseId: fixture.caseId },
    });

    const certificateService = app.get(CivilRegistryVitalRecordCertificateService);
    const pending = await certificateService.requestCertificate({
      identityId: entitledCitizenId,
      vitalRecordId: record.id,
      certificateType: CivilRegistryCertificateType.BIRTH_CERTIFICATE,
    });

    await request(app.getHttpServer())
      .post(`/api/v1/civil-registry/certificates/${pending.id}/issue`)
      .set('Authorization', `Bearer ${officialSession}`)
      .send({ issuerInstitutionId: fixture.institutionId })
      .expect(403);
  });

  it('historical certificate remains traceable to versioned registry state', async () => {
    const record = await prisma.civilRegistryVitalRecord.findFirstOrThrow({
      where: { registrationCaseId: fixture.caseId },
      include: { currentVersion: true },
    });

    const certificateService = app.get(CivilRegistryVitalRecordCertificateService);
    if (!record.currentVersionId) {
      throw new Error('Expected versioned registry state for certificate traceability test');
    }

    const pending = await prisma.civilRegistryCertificate.create({
      data: {
        vitalRecordId: record.id,
        registryVersionId: record.currentVersionId,
        certificateType: CivilRegistryCertificateType.BIRTH_CERTIFICATE,
        status: CivilRegistryCertificateStatus.PENDING_ISSUANCE,
      },
    });

    const issued = await certificateService.issueCertificate({
      certificateId: pending.id,
      officialIdentityId: officialIdentityId,
      issuerInstitutionId: fixture.institutionId,
    });

    expect(issued.registryVersionId).toBe(record.currentVersionId);
    expect(issued.certificate.registryVersionId).toBe(record.currentVersionId);
  });

  it('public verification reveals minimal information and not source evidence', async () => {
    const verification = await prisma.civilRegistryCertificateVerification.findFirstOrThrow({
      orderBy: { createdAt: 'desc' },
    });

    const response = await request(app.getHttpServer())
      .get(`/api/v1/public/civil-registry/verify/${verification.verificationCode}`)
      .expect(200);

    const body = response.body as Record<string, unknown>;
    expect(body).toHaveProperty('verificationReference');
    expect(body).toHaveProperty('documentHash');
    expect(body).not.toHaveProperty('recordStatePayload');
    expect(body).not.toHaveProperty('evidence');
    expect(body).not.toHaveProperty('givenNames');
    expect(String(body.minimalDisclosureDisclaimer)).toMatch(/never exposes/i);
  });

  it('certificate verification service does not expose source evidence', async () => {
    const verificationService = app.get(CivilRegistryVerificationService);
    const record = await prisma.civilRegistryCertificateVerification.findFirstOrThrow({
      orderBy: { createdAt: 'desc' },
    });
    const result = await verificationService.verifyPublic(record.verificationCode);
    expect(result).not.toHaveProperty('evidence');
    expect(Object.keys(result).sort()).toEqual(
      [
        'certificateType',
        'documentHash',
        'issuer',
        'minimalDisclosureDisclaimer',
        'publicStatusLabel',
        'qrTokenReference',
        'registryVersionNumber',
        'validityStatus',
        'verificationReference',
        'verifiedAt',
      ].sort(),
    );
  });

  it('citizen civil registry actions surface governed service discovery', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/experience/citizen/civil-registry/actions')
      .set('Authorization', `Bearer ${entitledCitizenSession}`)
      .expect(200);

    const actions = response.body as { serviceSlug: string }[];
    expect(actions.some((action) => action.serviceSlug.includes('birth-certificate'))).toBe(true);
    expect(actions.every((action) => !action.serviceSlug.includes('download-record'))).toBe(true);
  });
});
