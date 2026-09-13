import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  DispositionEligibilityStatus,
  DispositionRequestStatus,
  DispositionSafeHaltReason,
  LegalHoldStatus,
  LegalHoldTargetType,
  RecordsClassificationStatus,
  RetentionScheduleStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ArchivalTransfersService } from '../archival/archival-transfers.service';
import { LegalHoldsService } from '../legal-hold/legal-holds.service';
import { PreservationCollectionsService } from '../preservation/preservation-collections.service';
import { RecordDispositionService } from './record-disposition.service';

describe('RecordDispositionService (Phase 7G)', () => {
  let service: RecordDispositionService;
  let prisma: {
    retentionSchedule: { findUnique: jest.Mock };
    recordRetentionAssignment: { findFirst: jest.Mock };
    recordDispositionRequest: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    recordDispositionRecord: { create: jest.Mock };
    $transaction: jest.Mock;
  };
  let legalHoldsService: { hasActiveHold: jest.Mock };
  let preservationCollectionsService: { blocksDisposition: jest.Mock };
  let archivalTransfersService: { isTransferComplete: jest.Mock };

  beforeEach(async () => {
    prisma = {
      retentionSchedule: { findUnique: jest.fn() },
      recordRetentionAssignment: { findFirst: jest.fn() },
      recordDispositionRequest: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      recordDispositionRecord: { create: jest.fn() },
      $transaction: jest.fn(async (callback: (tx: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
      ),
    };
    legalHoldsService = { hasActiveHold: jest.fn().mockResolvedValue(false) };
    preservationCollectionsService = { blocksDisposition: jest.fn().mockResolvedValue(false) };
    archivalTransfersService = { isTransferComplete: jest.fn().mockResolvedValue(true) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        RecordDispositionService,
        { provide: PrismaService, useValue: prisma },
        { provide: LegalHoldsService, useValue: legalHoldsService },
        { provide: PreservationCollectionsService, useValue: preservationCollectionsService },
        { provide: ArchivalTransfersService, useValue: archivalTransfersService },
      ],
    }).compile();

    service = moduleRef.get(RecordDispositionService);
  });

  it('blocks disposition when an active legal hold applies', async () => {
    legalHoldsService.hasActiveHold.mockResolvedValue(true);

    const result = await service.evaluateEligibility({
      targetType: LegalHoldTargetType.DOCUMENT,
      targetReference: 'DOC-1',
    });

    expect(result.eligibilityStatus).toBe(DispositionEligibilityStatus.BLOCKED);
    expect(result.safeHaltReasons).toContain(DispositionSafeHaltReason.LEGAL_HOLD_ACTIVE);
  });

  it('does not treat an expired retention period alone as authorization to destroy', async () => {
    prisma.retentionSchedule.findUnique.mockResolvedValue({
      id: 'schedule-1',
      status: RetentionScheduleStatus.ACTIVE,
      governingSourceId: 'source-1',
      recordsClassification: { status: RecordsClassificationStatus.ACTIVE },
    });
    prisma.recordRetentionAssignment.findFirst.mockResolvedValue({
      retentionExpiresAt: new Date('2020-01-01T00:00:00.000Z'),
    });

    const result = await service.evaluateEligibility({
      targetType: LegalHoldTargetType.DOCUMENT,
      targetReference: 'DOC-2',
      retentionScheduleId: 'schedule-1',
    });

    expect(result.eligibilityStatus).toBe(DispositionEligibilityStatus.ELIGIBLE_FOR_REVIEW);
    expect(result.automatedOutcome).toBe('ELIGIBLE_FOR_REVIEW');
    expect(result.forbiddenAutomatedOutcome).toBe('DESTROY_NOW');
  });

  it('never auto-deletes on scheduled date alone', () => {
    const result = service.attemptScheduledDisposition({
      targetType: LegalHoldTargetType.DOCUMENT,
      targetReference: 'DOC-3',
      scheduledDate: new Date('2020-01-01T00:00:00.000Z'),
    });

    expect(result.deleted).toBe(false);
  });

  it('requires authorization before execution', async () => {
    prisma.recordDispositionRequest.findUnique.mockResolvedValue({
      id: 'req-1',
      status: DispositionRequestStatus.SUBMITTED,
      dispositionRecords: [],
      targetType: LegalHoldTargetType.DOCUMENT,
      targetReference: 'DOC-4',
    });

    await expect(
      service.execute('req-1', { executedByIdentityId: 'identity-1' }),
    ).rejects.toThrow('Disposition execution requires prior authorization');
  });

  it('blocks disposition when appeal or investigation preservation is active', async () => {
    preservationCollectionsService.blocksDisposition.mockResolvedValue(true);

    const result = await service.evaluateEligibility({
      targetType: LegalHoldTargetType.EVIDENCE,
      targetReference: 'EV-1',
      investigationActive: true,
    });

    expect(result.safeHaltReasons).toContain(DispositionSafeHaltReason.INVESTIGATION_ACTIVE);
  });

  it('blocks disposition for protected adverse evidence', async () => {
    const result = await service.evaluateEligibility({
      targetType: LegalHoldTargetType.EVIDENCE,
      targetReference: 'EV-2',
      adverseEvidenceProtected: true,
    });

    expect(result.safeHaltReasons).toContain(DispositionSafeHaltReason.ADVERSE_EVIDENCE_PROTECTED);
  });

  it('automated scan never returns destroy-now outcomes', async () => {
    const results = await service.runAutomatedEligibilityScan([
      { targetType: LegalHoldTargetType.DOCUMENT, targetReference: 'DOC-5' },
    ]);

    expect(results[0]?.destroyNow).toBe(false);
    expect(results[0]?.forbiddenAutomatedOutcome).toBe('DESTROY_NOW');
  });

  it('creates safe-halted disposition requests when holds are active', async () => {
    legalHoldsService.hasActiveHold.mockResolvedValue(true);
    prisma.recordDispositionRequest.create.mockResolvedValue({
      id: 'req-2',
      status: DispositionRequestStatus.SAFE_HALTED,
    });

    await service.createRequest({
      targetType: LegalHoldTargetType.CASE,
      targetReference: 'CASE-1',
      requestedByIdentityId: 'identity-2',
      reason: 'Routine review',
    });

    expect(prisma.recordDispositionRequest.create).toHaveBeenCalledTimes(1);
    const [[createArgs]] = prisma.recordDispositionRequest.create.mock.calls as [
      [{ data: { status: DispositionRequestStatus; safeHaltReasons: DispositionSafeHaltReason[] } }],
    ];

    expect(createArgs.data.status).toBe(DispositionRequestStatus.SAFE_HALTED);
    expect(createArgs.data.safeHaltReasons).toContain(
      DispositionSafeHaltReason.LEGAL_HOLD_ACTIVE,
    );
  });

  it('requires approval permission to authorize disposition', async () => {
    prisma.recordDispositionRequest.findUnique.mockResolvedValue({
      id: 'req-3',
      status: DispositionRequestStatus.SUBMITTED,
      safeHaltReasons: [],
      requestReference: 'DISP-1',
      targetType: LegalHoldTargetType.DOCUMENT,
      targetReference: 'DOC-6',
    });

    await expect(
      service.authorize('req-3', {
        authorizedByIdentityId: 'identity-3',
        authorityReference: 'AUTH-1',
        method: 'SECURE_DESTRUCTION',
        actorPermissions: [],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('LegalHoldsService (Phase 7G)', () => {
  let service: LegalHoldsService;
  let prisma: {
    legalHold: { findUnique: jest.Mock; update: jest.Mock };
    legalHoldReleaseRecord: { create: jest.Mock };
    legalHoldTarget: { count: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      legalHold: { findUnique: jest.fn(), update: jest.fn() },
      legalHoldReleaseRecord: { create: jest.fn() },
      legalHoldTarget: { count: jest.fn() },
      $transaction: jest.fn(async (callback: (tx: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
      ),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [LegalHoldsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(LegalHoldsService);
  });

  it('prevents ordinary records administrators from self-releasing a hold', async () => {
    prisma.legalHold.findUnique.mockResolvedValue({
      id: 'hold-1',
      status: LegalHoldStatus.ACTIVE,
      targets: [],
      releaseRecords: [],
    });

    await expect(
      service.release('hold-1', {
        releasedByIdentityId: 'admin-1',
        releaseAuthorityReference: 'AUTH-2',
        releaseReason: 'Matter closed',
        actorPermissions: [],
        actorRoles: ['records.administrator'],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates an audited release record when release authority is configured', async () => {
    prisma.legalHold.findUnique.mockResolvedValue({
      id: 'hold-2',
      status: LegalHoldStatus.ACTIVE,
      targets: [{ targetType: LegalHoldTargetType.CASE, targetReference: 'CASE-2' }],
      releaseRecords: [],
    });
    prisma.legalHoldReleaseRecord.create.mockResolvedValue({ id: 'release-1' });
    prisma.legalHold.update.mockResolvedValue({
      id: 'hold-2',
      status: LegalHoldStatus.RELEASED,
      targets: [],
      releaseRecords: [{ id: 'release-1' }],
    });

    const result = await service.release('hold-2', {
      releasedByIdentityId: 'authority-1',
      releaseAuthorityReference: 'COURT-ORDER-123',
      releaseReason: 'Hold lifted by order',
      actorPermissions: ['records.legal_hold.release'],
      actorRoles: ['records.administrator'],
    });

    expect(prisma.legalHoldReleaseRecord.create).toHaveBeenCalled();
    expect(result.releaseRecord.id).toBe('release-1');
  });
});
