import {
  InstrumentDeliveryChannel,
  InstrumentDeliveryClassification,
  InstrumentDeliveryStatus,
  InstrumentTypePublicVerificationMode,
  OfficialInstrumentStatus,
} from '@prisma/client';

import { type InstrumentDeliveryAuditService } from '../audit/instrument-delivery-audit.service';
import {
  ControlledDownloadDeliveryAdapter,
  PortalDeliveryAdapter,
} from '../delivery/adapters/delivery-channel.adapters';
import { InstrumentDeliveryService } from '../delivery/instrument-delivery.service';
import { InstrumentVerificationService } from '../verification/instrument-verification.service';
import { type InstrumentVerificationRateLimiterService } from '../verification/instrument-verification-rate-limiter.service';

describe('InstrumentDeliveryService', () => {
  const prisma = {
    officialInstrument: { findUnique: jest.fn() },
    officialInstrumentVersion: { findFirst: jest.fn() },
    instrumentDelivery: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    instrumentDeliveryAttempt: { count: jest.fn(), create: jest.fn(), update: jest.fn() },
  };

  const auditRecord = jest.fn();
  const audit = { record: auditRecord } as unknown as InstrumentDeliveryAuditService;

  const service = new InstrumentDeliveryService(
    prisma as never,
    audit,
    new PortalDeliveryAdapter(),
    new ControlledDownloadDeliveryAdapter(),
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks restricted material through unapproved channels', () => {
    expect(() => {
      service.assertChannelApprovedForClassification(
        InstrumentDeliveryChannel.SECURE_EMAIL,
        InstrumentDeliveryClassification.RESTRICTED,
      );
    }).toThrow('not approved');
  });

  it('preserves issuance when delivery fails by returning failed delivery without deleting instrument', async () => {
    prisma.instrumentDelivery.findUnique.mockResolvedValue({
      id: 'delivery-1',
      officialInstrumentId: 'instrument-1',
      instrumentVersionId: 'version-1',
      deliveryChannel: InstrumentDeliveryChannel.PORTAL,
      destinationReference: 'portal://holder',
      classification: InstrumentDeliveryClassification.OFFICIAL,
    });
    prisma.instrumentDeliveryAttempt.count.mockResolvedValue(0);
    prisma.instrumentDeliveryAttempt.create.mockResolvedValue({ id: 'attempt-1' });
    prisma.instrumentDeliveryAttempt.update.mockResolvedValue({});
    prisma.instrumentDelivery.update.mockResolvedValue({
      id: 'delivery-1',
      officialInstrumentId: 'instrument-1',
      instrumentVersionId: 'version-1',
      status: InstrumentDeliveryStatus.FAILED,
    });

    await service.markFailed('delivery-1', 'attempt-1', 'provider unavailable');

    expect(auditRecord.mock.calls.length).toBeGreaterThan(0);
  });
});

describe('InstrumentVerificationService', () => {
  const prisma = {
    instrumentVerificationRecord: { findUnique: jest.fn(), create: jest.fn() },
    instrumentVerificationEvent: { create: jest.fn() },
    officialInstrument: { findUnique: jest.fn() },
  };

  const audit = { record: jest.fn() } as unknown as InstrumentDeliveryAuditService;
  const rateLimiter = {
    assertAllowed: jest.fn(),
  } as unknown as InstrumentVerificationRateLimiterService;

  const service = new InstrumentVerificationService(prisma as never, audit, rateLimiter);

  it('does not report CURRENT based solely on existence when instrument is revoked', () => {
    const status = service.resolveVerificationStatus({
      status: OfficialInstrumentStatus.REVOKED,
      effectiveFrom: new Date('2019-01-01'),
      effectiveUntil: null,
    } as never);

    expect(status).toBe('REVOKED');
  });

  it('does not expose restricted instrument details publicly', async () => {
    prisma.instrumentVerificationRecord.findUnique.mockResolvedValue({
      id: 'record-1',
      verificationUri: '/api/v1/public/instruments/verify/abc',
      officialInstrumentId: 'instrument-1',
      instrumentVersionId: 'version-1',
      officialInstrument: {
        instrumentNumber: 'INST-1',
        status: OfficialInstrumentStatus.ISSUED,
        effectiveFrom: new Date('2024-01-01'),
        effectiveUntil: null,
        scope: { summary: 'secret scope' },
        issuerInstitution: { name: 'Test Institution' },
        holderIdentity: { displayName: 'Restricted Holder' },
        instrumentTypeVersion: {
          publicVerificationMode: InstrumentTypePublicVerificationMode.FULL,
          restrictedClassification: true,
          holderDisplayPermitted: true,
          scopeSummaryPublic: true,
          instrumentTypeDefinition: { name: 'Restricted Permit' },
        },
        currentVersion: { versionNumber: 1 },
      },
      instrumentVersion: { versionNumber: 1 },
    });

    const response = await service.verifyPublic('abc');

    expect(response.verificationStatus).toBe('NOT_PUBLICLY_DISCLOSABLE');
    expect(response).not.toHaveProperty('scopeSummary');
    expect(response).not.toHaveProperty('holderDisplay');
    expect(response).not.toHaveProperty('instrumentNumber');
  });
});

describe('verification code generation', () => {
  it('uses high-entropy opaque references', async () => {
    const { generateVerificationCode } = await import('../common/verification-code.util');
    const codeA = generateVerificationCode();
    const codeB = generateVerificationCode();

    expect(codeA).not.toEqual(codeB);
    expect(codeA.length).toBeGreaterThanOrEqual(32);
    expect(codeA).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
