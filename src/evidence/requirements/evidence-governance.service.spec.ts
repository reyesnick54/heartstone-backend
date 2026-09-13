import { EvidenceAcceptanceDecision, EvidenceAcceptancePurpose } from '@prisma/client';

import {
  EvidencePurposeAcceptanceService,
  EvidenceRequirementLinkService,
} from './evidence-governance.service';

describe('Evidence governance services (unit)', () => {
  const prisma = {
    evidenceRecord: { findUnique: jest.fn(), update: jest.fn() },
    governmentServiceChecklistItem: { findUnique: jest.fn() },
    evidenceRequirementLink: { create: jest.fn(), update: jest.fn() },
    evidencePurposeAcceptance: { create: jest.fn(), findFirst: jest.fn() },
  };

  const evidenceRecords = { getById: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    evidenceRecords.getById.mockResolvedValue({ id: 'evidence-1', status: 'RECEIVED' });
    prisma.evidenceRecord.findUnique.mockResolvedValue({ id: 'evidence-1' });
    prisma.governmentServiceChecklistItem.findUnique.mockResolvedValue({ id: 'checklist-1' });
    prisma.evidenceRequirementLink.create.mockResolvedValue({ id: 'link-1' });
    prisma.evidencePurposeAcceptance.create.mockResolvedValue({ id: 'acceptance-1' });
    prisma.evidenceRecord.update.mockResolvedValue({});
  });

  it('links one evidence item to a checklist requirement', async () => {
    const links = new EvidenceRequirementLinkService(prisma as never);
    await links.linkRequirement('evidence-1', {
      checklistItemId: 'checklist-1',
      relationship: 'SATISFIES',
    } as never);

    expect(prisma.evidenceRequirementLink.create).toHaveBeenCalled();
  });

  it('acceptance for one purpose does not satisfy another purpose', async () => {
    const acceptance = new EvidencePurposeAcceptanceService(
      prisma as never,
      evidenceRecords as never,
    );
    prisma.evidencePurposeAcceptance.findFirst.mockResolvedValueOnce({
      purpose: EvidenceAcceptancePurpose.COMPLETENESS,
      decision: EvidenceAcceptanceDecision.ACCEPTED,
    });
    prisma.evidencePurposeAcceptance.findFirst.mockResolvedValueOnce(null);

    const completeness = await acceptance.hasAcceptanceForPurpose(
      'evidence-1',
      EvidenceAcceptancePurpose.COMPLETENESS,
    );
    const substantive = await acceptance.hasAcceptanceForPurpose(
      'evidence-1',
      EvidenceAcceptancePurpose.SUBSTANTIVE_REVIEW,
    );

    expect(completeness).not.toBeNull();
    expect(substantive).toBeNull();
  });

  it('rejects AI finalization of purpose acceptance', async () => {
    const acceptance = new EvidencePurposeAcceptanceService(
      prisma as never,
      evidenceRecords as never,
    );

    await expect(
      acceptance.recordAcceptance(
        'evidence-1',
        'ai-identity',
        {
          purpose: EvidenceAcceptancePurpose.COMPLETENESS,
          decision: EvidenceAcceptanceDecision.ACCEPTED,
          decidedAt: new Date().toISOString(),
        },
        { isAiActor: true },
      ),
    ).rejects.toThrow('AI assistance cannot finalize evidence purpose acceptance');
  });
});
