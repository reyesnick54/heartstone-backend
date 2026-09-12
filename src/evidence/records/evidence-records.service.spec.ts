import { EvidenceRecordStatus } from '@prisma/client';

import { EvidenceRecordsService } from './evidence-records.service';

describe('EvidenceRecordsService (unit)', () => {
  const prisma = {
    case: { findUnique: jest.fn() },
    evidenceRecord: {
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    masterAdministrativeFile: {
      count: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  let service: EvidenceRecordsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EvidenceRecordsService(prisma as never);
  });

  it('treats received status as distinct from verified', async () => {
    prisma.case.findUnique.mockResolvedValue({
      id: 'case-1',
      masterAdministrativeFile: { id: 'maf-1' },
    });
    prisma.evidenceRecord.count.mockResolvedValue(0);
    prisma.$transaction.mockImplementation(async (callback: unknown) => {
      if (typeof callback === 'function') {
        return (callback as (tx: typeof prisma) => Promise<unknown>)(prisma);
      }
      return Promise.all(callback as never);
    });
    prisma.evidenceRecord.create.mockResolvedValue({
      id: 'evidence-1',
      status: EvidenceRecordStatus.RECEIVED,
    });

    const record = await service.receiveEvidence('submitter-1', {
      caseId: 'case-1',
      title: 'Business plan',
      evidenceType: 'DOCUMENT',
      source: 'APPLICANT',
      submittingParty: 'Applicant',
      dateReceived: new Date().toISOString(),
      confidentialityClassification: 'OFFICIAL',
      integrityReference: 'sha256:abc',
    } as never);

    expect(record.status).toBe(EvidenceRecordStatus.RECEIVED);
    expect(record.status).not.toBe(EvidenceRecordStatus.VERIFIED);
  });

  it('retains withdrawn and superseded evidence historically', async () => {
    prisma.evidenceRecord.findUnique.mockResolvedValue({
      id: 'evidence-1',
      status: EvidenceRecordStatus.RECEIVED,
      validUntil: null,
      verifications: [],
      requirementLinks: [],
      purposeAcceptances: [],
      qualityAssessments: [],
      supersededEvidence: [],
      supersededByEvidence: null,
    });
    prisma.evidenceRecord.update
      .mockResolvedValueOnce({ id: 'evidence-1', status: EvidenceRecordStatus.WITHDRAWN })
      .mockResolvedValueOnce({ id: 'evidence-1', status: EvidenceRecordStatus.SUPERSEDED })
      .mockResolvedValueOnce({ id: 'evidence-2', status: EvidenceRecordStatus.RECEIVED });
    prisma.$transaction.mockImplementation(async (ops: unknown) => {
      if (typeof ops === 'function') {
        return (ops as (tx: typeof prisma) => Promise<unknown>)(prisma);
      }
      const results = [];
      for (const op of ops as Promise<unknown>[]) {
        results.push(await op);
      }
      return results;
    });

    const withdrawn = await service.withdrawEvidence('evidence-1', 'Applicant withdrew submission');
    expect(withdrawn.status).toBe(EvidenceRecordStatus.WITHDRAWN);

    const superseded = await service.supersedeEvidence('evidence-1', 'evidence-2');
    expect(superseded.withdrawn.status).toBe(EvidenceRecordStatus.SUPERSEDED);
  });

  it('marks expired evidence as not current', () => {
    expect(
      service.isExpired({
        validUntil: new Date('2020-01-01T00:00:00.000Z'),
        status: EvidenceRecordStatus.VERIFIED,
      }),
    ).toBe(true);
  });
});
