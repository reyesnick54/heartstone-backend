import { Test } from '@nestjs/testing';
import {
  CorporateEntityType,
  CorporateRegistrationStatus,
  CorporateRegistryDecisionType,
  CorporateRegistryRecordStatus,
  CorporateRegistryStatusEventType,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { CorporateCertificateService } from './certificates/corporate-certificate.service';
import {
  CorporateCertificateIssuanceBlockedException,
  CorporateRegistryClientStatusForgeryException,
  CorporateRegistryDecisionRequiredException,
} from './common/corporate-registry.exceptions';
import { CorporateRegistryLifecycleService } from './lifecycle/corporate-registry-lifecycle.service';

describe('Corporate registry invariants', () => {
  let lifecycle: CorporateRegistryLifecycleService;
  let certificates: CorporateCertificateService;

  const prisma = {
    corporateRegistryProfile: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    corporateRegistryPaymentEvent: { create: jest.fn() },
    corporateRegistryStatusHistory: { create: jest.fn() },
    corporateRegistryOfficialDecision: { create: jest.fn() },
    corporateRegisteredOffice: { updateMany: jest.fn(), create: jest.fn() },
    corporateCertificate: { findFirst: jest.fn(), create: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CorporateRegistryLifecycleService,
        CorporateCertificateService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    lifecycle = moduleRef.get(CorporateRegistryLifecycleService);
    certificates = moduleRef.get(CorporateCertificateService);
  });

  it('rejects client-forged registration status changes', () => {
    expect(() => lifecycle.assertClientCannotSetRegistrationStatus()).toThrow(
      CorporateRegistryClientStatusForgeryException,
    );
  });

  it('does not activate a company when payment is recorded', async () => {
    prisma.corporateRegistryProfile.findUnique.mockResolvedValue({
      id: 'profile-1',
      registrationStatus: CorporateRegistrationStatus.DRAFT,
    });
    prisma.corporateRegistryProfile.findUniqueOrThrow.mockResolvedValue({
      id: 'profile-1',
      registrationStatus: CorporateRegistrationStatus.DRAFT,
    });

    const result = await lifecycle.recordPaymentReceived({
      profileId: 'profile-1',
      paymentReference: 'PAY-1',
      amount: 100,
      currencyCode: 'USD',
    });

    expect(result.registrationStatus).toBe(CorporateRegistrationStatus.DRAFT);
    /* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest matcher composition */
    expect(prisma.corporateRegistryPaymentEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ activatesEntity: false }),
      }),
    );
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
  });

  it('requires official registry decision for incorporation activation', async () => {
    prisma.corporateRegistryProfile.findUnique.mockResolvedValue(null);

    await expect(
      lifecycle.applyOfficialDecision({
        profileId: 'missing',
        decisionType: CorporateRegistryDecisionType.INCORPORATION,
        approved: true,
      }),
    ).rejects.toBeInstanceOf(CorporateRegistryDecisionRequiredException);
  });

  it('activates incorporation only after approved registry decision', async () => {
    prisma.corporateRegistryProfile.findUnique.mockResolvedValue({
      id: 'profile-1',
      registrationStatus: CorporateRegistrationStatus.PENDING_DECISION,
      recordApprovalStatus: CorporateRegistryRecordStatus.DRAFT,
      registeredName: null,
      registrationReference: null,
      entityType: null,
      registrationDate: null,
      publicVerificationReference: null,
    });
    prisma.corporateRegistryOfficialDecision.create.mockResolvedValue({ id: 'decision-1' });
    prisma.corporateRegistryProfile.update.mockResolvedValue({
      id: 'profile-1',
      registrationStatus: CorporateRegistrationStatus.ACTIVE,
    });

    await lifecycle.applyOfficialDecision({
      profileId: 'profile-1',
      decisionType: CorporateRegistryDecisionType.INCORPORATION,
      approved: true,
      registeredName: 'Example Co',
      registrationReference: 'REG-001',
      entityType: CorporateEntityType.COMPANY,
    });

    /* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest matcher composition */
    expect(prisma.corporateRegistryProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          registrationStatus: CorporateRegistrationStatus.ACTIVE,
          recordApprovalStatus: CorporateRegistryRecordStatus.APPROVED,
        }),
      }),
    );
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
  });

  it('blocks certificate issuance from unapproved draft records', async () => {
    prisma.corporateRegistryProfile.findUnique.mockResolvedValue({
      id: 'profile-1',
      recordApprovalStatus: CorporateRegistryRecordStatus.DRAFT,
      registrationStatus: CorporateRegistrationStatus.DRAFT,
    });

    await expect(
      certificates.issueCertificate({
        profileId: 'profile-1',
        certificateReference: 'CERT-1',
        label: 'Certificate',
      }),
    ).rejects.toBeInstanceOf(CorporateCertificateIssuanceBlockedException);
  });

  it('preserves dissolution history when restoration is applied', async () => {
    prisma.corporateRegistryProfile.findUnique.mockResolvedValue({
      id: 'profile-1',
      registrationStatus: CorporateRegistrationStatus.DISSOLVED,
      recordApprovalStatus: CorporateRegistryRecordStatus.APPROVED,
      registeredName: 'Example Co',
      registrationReference: 'REG-001',
      entityType: CorporateEntityType.COMPANY,
      registrationDate: new Date(),
      publicVerificationReference: 'CRV-REG-001',
    });
    prisma.corporateRegistryOfficialDecision.create.mockResolvedValue({ id: 'decision-2' });
    prisma.corporateRegistryProfile.update.mockResolvedValue({
      id: 'profile-1',
      registrationStatus: CorporateRegistrationStatus.RESTORED,
    });

    await lifecycle.applyOfficialDecision({
      profileId: 'profile-1',
      decisionType: CorporateRegistryDecisionType.RESTORATION,
      approved: true,
    });

    expect(prisma.corporateRegistryStatusHistory.create).toHaveBeenCalledTimes(2);
    /* eslint-disable @typescript-eslint/no-unsafe-assignment -- jest matcher composition */
    expect(prisma.corporateRegistryStatusHistory.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: CorporateRegistryStatusEventType.DISSOLUTION,
          preserved: true,
        }),
      }),
    );
    /* eslint-enable @typescript-eslint/no-unsafe-assignment */
  });
});
