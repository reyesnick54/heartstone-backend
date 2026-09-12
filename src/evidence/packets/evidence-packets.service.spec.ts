import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  EvidencePacketVersionStatus,
  EvidenceQualityLevel,
  EvidenceRecordStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { hashManifest } from '../common/manifest-hash.util';
import { EvidencePacketsService } from './evidence-packets.service';

describe('EvidencePacketsService', () => {
  let service: EvidencePacketsService;

  const packetId = 'packet-1';
  const versionId = 'version-1';
  const actorId = 'identity-1';

  const draftVersion = {
    id: versionId,
    packetId,
    version: 1,
    status: EvidencePacketVersionStatus.DRAFT,
    evidenceCutoffAt: null,
    assembledByIdentityId: actorId,
    assembledByOfficeholderId: null,
    authorityEvaluationRecordId: null,
    frozenAt: null,
    manifestHash: null,
    supersededById: null,
    readyForDecisionReview: false,
    qualitySummary: {},
    createdAt: new Date(),
  };

  const prisma = {
    evidencePacket: {
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    evidencePacketVersion: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    evidencePacketItem: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    evidencePacketItemExclusion: {
      create: jest.fn(),
    },
    evidencePacketManifest: {
      create: jest.fn(),
    },
    evidenceRecord: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    documentVersion: {
      findFirst: jest.fn(),
    },
    case: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EvidencePacketsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(EvidencePacketsService);
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<unknown>) =>
      fn(prisma),
    );
  });

  it('allows draft packet item mutation', async () => {
    prisma.evidencePacketVersion.findFirst.mockResolvedValue(draftVersion);
    prisma.evidenceRecord.findUnique.mockResolvedValue({
      id: 'record-1',
      status: EvidenceRecordStatus.ACTIVE,
    });
    prisma.documentVersion.findFirst.mockResolvedValue({ id: 'doc-1' });
    prisma.evidencePacketItem.aggregate.mockResolvedValue({ _max: { inclusionOrder: 0 } });
    prisma.evidencePacketItem.create.mockResolvedValue({ id: 'item-1' });

    const result = await service.addItem(packetId, {
      evidenceRecordId: 'record-1',
      documentVersionId: 'doc-1',
    });

    expect(result.id).toBe('item-1');
    expect(prisma.evidencePacketItem.create).toHaveBeenCalled();
  });

  it('rejects mutation on frozen packet versions', async () => {
    prisma.evidencePacketVersion.findUnique.mockResolvedValue({
      ...draftVersion,
      status: EvidencePacketVersionStatus.FROZEN,
    });

    await expect(service.assertNotFrozen(versionId)).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates new version while preserving superseded frozen version', async () => {
    prisma.evidencePacketVersion.findFirst.mockResolvedValue({
      ...draftVersion,
      status: EvidencePacketVersionStatus.FROZEN,
    });
    prisma.evidencePacketVersion.create.mockResolvedValue({
      id: 'version-2',
      version: 2,
      status: EvidencePacketVersionStatus.DRAFT,
    });
    prisma.evidencePacketVersion.update.mockResolvedValue({});

    const result = await service.createNewVersion(packetId, actorId);

    expect(result.version).toBe(2);
    expect(prisma.evidencePacketVersion.update).toHaveBeenCalledWith({
      where: { id: versionId },
      data: {
        status: EvidencePacketVersionStatus.SUPERSEDED,
        supersededById: 'version-2',
      },
    });
  });

  it('pins exact document and evidence versions on inclusion', async () => {
    prisma.evidencePacketVersion.findFirst.mockResolvedValue(draftVersion);
    prisma.evidenceRecord.findUnique.mockResolvedValue({
      id: 'record-1',
      status: EvidenceRecordStatus.EXPIRED,
    });
    prisma.documentVersion.findFirst.mockResolvedValue({ id: 'doc-v3' });
    prisma.evidencePacketItem.aggregate.mockResolvedValue({ _max: { inclusionOrder: null } });
    prisma.evidencePacketItem.create.mockResolvedValue({});

    await service.addItem(packetId, {
      evidenceRecordId: 'record-1',
      documentVersionId: 'doc-v3',
    });

    expect(prisma.evidencePacketItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          evidenceStatusAtInclusion: EvidenceRecordStatus.EXPIRED,
          documentVersionId: 'doc-v3',
        }),
      }),
    );
  });

  it('flags silently omitted adverse evidence during validation', async () => {
    prisma.evidencePacketVersion.findFirst.mockResolvedValue({
      ...draftVersion,
      packet: { masterAdministrativeFileId: 'maf-1' },
      items: [],
    });
    prisma.evidenceRecord.findMany.mockResolvedValue([
      {
        id: 'adverse-1',
        recordNumber: 'ER-001',
        isAdverse: true,
        isDisputed: false,
        status: EvidenceRecordStatus.ACTIVE,
        professionalReviews: [],
        governmentCommunications: [],
      },
    ]);

    const result = await service.validate(packetId);

    expect(result.valid).toBe(false);
    expect(result.issues[0]).toContain('ER-001');
  });

  it('allows explicit exclusion for adverse evidence', async () => {
    prisma.evidencePacketVersion.findFirst.mockResolvedValue({
      ...draftVersion,
      packet: { masterAdministrativeFileId: 'maf-1' },
      items: [
        {
          evidenceRecordId: 'adverse-1',
          isExplicitlyExcluded: true,
          evidenceStatusAtInclusion: EvidenceRecordStatus.ACTIVE,
        },
      ],
    });
    prisma.evidenceRecord.findMany.mockResolvedValue([
      {
        id: 'adverse-1',
        recordNumber: 'ER-001',
        isAdverse: true,
        isDisputed: false,
        status: EvidenceRecordStatus.ACTIVE,
        professionalReviews: [],
        governmentCommunications: [],
      },
    ]);

    const result = await service.validate(packetId);
    expect(result.valid).toBe(true);
  });

  it('keeps expired evidence visibly expired in validation', async () => {
    prisma.evidencePacketVersion.findFirst.mockResolvedValue({
      ...draftVersion,
      packet: { masterAdministrativeFileId: 'maf-1' },
      items: [
        {
          evidenceRecordId: 'expired-1',
          isExplicitlyExcluded: false,
          evidenceStatusAtInclusion: EvidenceRecordStatus.EXPIRED,
        },
      ],
    });
    prisma.evidenceRecord.findMany.mockResolvedValue([
      {
        id: 'expired-1',
        recordNumber: 'ER-EXP',
        isAdverse: false,
        isDisputed: false,
        status: EvidenceRecordStatus.EXPIRED,
        professionalReviews: [],
        governmentCommunications: [],
      },
    ]);

    const result = await service.validate(packetId);
    expect(result.valid).toBe(true);
  });

  it('keeps disputed evidence visibly disputed in validation', async () => {
    prisma.evidencePacketVersion.findFirst.mockResolvedValue({
      ...draftVersion,
      packet: { masterAdministrativeFileId: 'maf-1' },
      items: [
        {
          evidenceRecordId: 'disputed-1',
          isExplicitlyExcluded: false,
          evidenceStatusAtInclusion: EvidenceRecordStatus.DISPUTED,
        },
      ],
    });
    prisma.evidenceRecord.findMany.mockResolvedValue([
      {
        id: 'disputed-1',
        recordNumber: 'ER-DIS',
        isAdverse: false,
        isDisputed: true,
        status: EvidenceRecordStatus.DISPUTED,
        professionalReviews: [],
        governmentCommunications: [],
      },
    ]);

    const result = await service.validate(packetId);
    expect(result.valid).toBe(true);
  });

  it('exposes boundary metadata clarifying inclusion does not prove authenticity', async () => {
    prisma.evidencePacketVersion.findUnique.mockResolvedValue({
      ...draftVersion,
      items: [],
      exclusionRecords: [],
      manifest: null,
      packet: { id: packetId, caseId: null },
    });

    const result = await service.getPacketVersion(versionId);

    expect(result.inclusionDoesNotProveAuthenticity).toBe(true);
    expect(result.freezeDoesNotConstituteApproval).toBe(true);
  });

  it('sets readyForDecisionReview without creating a decision outcome on freeze', async () => {
    const assembledVersion = {
      ...draftVersion,
      status: EvidencePacketVersionStatus.ASSEMBLED,
      packet: { id: packetId, caseId: 'case-1', masterAdministrativeFileId: 'maf-1' },
      items: [],
      exclusionRecords: [],
    };

    prisma.evidencePacketVersion.findFirst
      .mockResolvedValueOnce(assembledVersion)
      .mockResolvedValueOnce({
        ...assembledVersion,
        items: [],
        packet: assembledVersion.packet,
      });
    prisma.evidenceRecord.findMany.mockResolvedValue([]);
    prisma.evidencePacketManifest.create.mockResolvedValue({});
    prisma.evidencePacketVersion.update.mockResolvedValue({
      ...assembledVersion,
      status: EvidencePacketVersionStatus.FROZEN,
      readyForDecisionReview: true,
      manifestHash: 'hash-abc',
    });

    const result = await service.freeze(packetId, { readyForDecisionReview: true });

    expect(result.readyForDecisionReview).toBe(true);
    expect(result).not.toHaveProperty('approved');
    expect(result).not.toHaveProperty('decisionOutcome');
  });

  it('stores manifest hash that changes when packet content changes', () => {
    const manifestA = {
      packetVersionId: 'v1',
      packetId: 'p1',
      version: 1,
      evidenceCutoffAt: null,
      items: [
        {
          itemId: 'i1',
          evidenceRecordId: 'r1',
          evidenceStatusAtInclusion: 'ACTIVE',
          documentVersionId: 'd1',
          documentContentHash: 'hash-a',
          inclusionOrder: 0,
          isExplicitlyExcluded: false,
          exclusionRecordId: null,
          verificationRecordIds: [],
          acceptanceRecordIds: [],
          departmentalReviewId: null,
          governmentCommunicationId: null,
          professionalReviewId: null,
          inspectionRecordId: null,
          sourceCitationId: null,
          limitations: null,
        },
      ],
      exclusions: [],
    };

    const manifestB = {
      ...manifestA,
      items: [{ ...manifestA.items[0]!, documentContentHash: 'hash-b' }],
    };

    expect(hashManifest(manifestA)).not.toBe(hashManifest(manifestB));
  });

  it('builds quality summary from assessments without aggregate score', async () => {
    prisma.evidencePacketVersion.findFirst
      .mockResolvedValueOnce(draftVersion)
      .mockResolvedValueOnce({
        ...draftVersion,
        packet: { masterAdministrativeFileId: 'maf-1' },
        items: [],
      });
    prisma.evidenceRecord.findMany.mockResolvedValue([]);
    prisma.evidencePacketItem.findMany.mockResolvedValue([
      {
        evidenceRecord: {
          qualityAssessments: [
            {
              qualityLevel: EvidenceQualityLevel.INSUFFICIENT,
              limitations: 'Missing survey plan',
              missingElements: ['survey-plan'],
            },
          ],
        },
      },
    ]);
    prisma.evidencePacketVersion.update.mockResolvedValue({});

    await service.assemble(packetId, actorId, {});

    expect(prisma.evidencePacketVersion.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          qualitySummary: expect.objectContaining({
            hasInsufficient: true,
            criticalMissingElements: ['survey-plan'],
            disclaimer: expect.stringContaining('does not prove evidence authenticity'),
          }),
        }),
      }),
    );
  });

  it('rejects remove item when packet is not draft', async () => {
    prisma.evidencePacketVersion.findFirst.mockResolvedValue({
      ...draftVersion,
      status: EvidencePacketVersionStatus.FROZEN,
    });

    await expect(service.removeItem(packetId, 'item-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws when packet version is not found', async () => {
    prisma.evidencePacketVersion.findUnique.mockResolvedValue(null);
    await expect(service.getPacketVersion('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
