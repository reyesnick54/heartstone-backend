import { ConflictException, NotFoundException } from '@nestjs/common';
import { HealthcareConsentType } from '@prisma/client';

import { type PrismaService } from '../../../database/prisma.service';
import { type SecurityAuditService } from '../../../identity/audit/security-audit.service';
import { type ActorContext } from '../../../identity/auth/context/actor-context.types';
import { type SessionContextDto } from '../../../identity/auth/dto/session-context.dto';
import { type HealthcareConsentService } from '../healthcare-consent.service';
import { CitizenHealthcareConsentService } from './citizen-healthcare-consent.service';

const ME = '11111111-1111-4111-8111-111111111111';
const GRANT_ID = '22222222-2222-4222-8222-222222222222';
const session = { identityId: ME, sessionId: 'session-1' } as SessionContextDto;
const actor = { identityId: ME } as ActorContext;

describe('Citizen health consent must-fail rules', () => {
  const prisma = {
    healthcarePatientReference: { findMany: jest.fn() },
    healthcareConsentPurposeDefinition: { findMany: jest.fn() },
    healthcareConsentGrant: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
  };
  const consents = { createConsentAndGrant: jest.fn(), withdrawConsentGrant: jest.fn() };
  const audit = { record: jest.fn() };
  const service = new CitizenHealthcareConsentService(
    prisma as unknown as PrismaService,
    consents as unknown as HealthcareConsentService,
    audit as unknown as SecurityAuditService,
  );
  const grantDto = {
    purposeCode: 'CARE_COORDINATION',
    consentVersionCode: 'CARE-V2',
    consentType: HealthcareConsentType.DATA_SHARING,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.healthcarePatientReference.findMany.mockResolvedValue([{ id: 'patient-ref-1' }]);
    prisma.healthcareConsentPurposeDefinition.findMany.mockResolvedValue([
      {
        purposeCode: 'CARE_COORDINATION',
        displayName: 'Care coordination',
        description: null,
        consentVersions: [{ id: 'version-2', versionCode: 'CARE-V2', legalTextRef: null }],
      },
    ]);
    prisma.healthcareConsentGrant.findFirst.mockResolvedValue(null);
  });

  it("withdrawing another patient's consent is not found and nothing is withdrawn", async () => {
    await expect(service.withdraw(session, actor, GRANT_ID, {})).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.healthcareConsentGrant.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: GRANT_ID, patientReferenceId: { in: ['patient-ref-1'] } },
      }),
    );
    expect(consents.withdrawConsentGrant).not.toHaveBeenCalled();
  });

  it('a consent cannot be withdrawn twice', async () => {
    prisma.healthcareConsentGrant.findFirst.mockResolvedValue({
      id: GRANT_ID,
      isActive: false,
      withdrawal: { id: 'w-1' },
    });

    await expect(service.withdraw(session, actor, GRANT_ID, {})).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(consents.withdrawConsentGrant).not.toHaveBeenCalled();
  });

  it('consent against a superseded version of the text is refused', async () => {
    await expect(
      service.grant(session, actor, { ...grantDto, consentVersionCode: 'CARE-V1' }),
    ).rejects.toMatchObject({ response: { code: 'CONSENT_VERSION_NOT_CURRENT' } });
    expect(consents.createConsentAndGrant).not.toHaveBeenCalled();
  });

  it('a second active consent for the same purpose is refused', async () => {
    prisma.healthcareConsentGrant.findFirst.mockResolvedValue({ id: 'existing-grant' });

    await expect(service.grant(session, actor, grantDto)).rejects.toMatchObject({
      response: { code: 'CONSENT_ALREADY_ACTIVE' },
    });
    expect(consents.createConsentAndGrant).not.toHaveBeenCalled();
  });

  it('without an established patient reference nothing is created', async () => {
    prisma.healthcarePatientReference.findMany.mockResolvedValue([]);

    await expect(service.grant(session, actor, grantDto)).rejects.toMatchObject({
      response: { code: 'PATIENT_REFERENCE_NOT_ESTABLISHED' },
    });
    expect(consents.createConsentAndGrant).not.toHaveBeenCalled();
  });

  it('grants as the patient consent basis for the session patient only', async () => {
    consents.createConsentAndGrant.mockResolvedValue({
      consent: { id: 'consent-1' },
      grant: { id: GRANT_ID, consentId: 'consent-1' },
    });
    prisma.healthcareConsentGrant.findUniqueOrThrow.mockResolvedValue({
      id: GRANT_ID,
      grantReference: 'HC-GRANT-1',
      consentId: 'consent-1',
      isActive: true,
      revokedAt: null,
      expiresAt: null,
      grantedAt: new Date('2026-11-06T00:00:00Z'),
      withdrawal: null,
      purpose: { purposeCode: 'CARE_COORDINATION', displayName: 'Care coordination' },
      consent: {
        consentReference: 'HC-CONSENT-1',
        consentType: HealthcareConsentType.DATA_SHARING,
        status: 'ACTIVE',
        consentVersion: { versionCode: 'CARE-V2' },
        scopes: [{ dataCategories: ['LAB_RESULTS'], recipientCodes: [] }],
      },
    });

    const result = await service.grant(session, actor, grantDto);

    expect(consents.createConsentAndGrant).toHaveBeenCalledWith(
      actor,
      expect.objectContaining({
        patientReferenceId: 'patient-ref-1',
        consentVersionId: 'version-2',
        accessBasisKind: 'PATIENT_CONSENT',
        representsPatientConsent: true,
      }),
    );
    expect(result).toMatchObject({ isActive: true, dataCategories: ['LAB_RESULTS'] });
  });
});
