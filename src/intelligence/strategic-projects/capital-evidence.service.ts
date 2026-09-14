import { Injectable, NotFoundException } from '@nestjs/common';
import { CapitalEvidenceClassification, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { StrategicProjectBoundaryService } from '../common/strategic-project-boundary.service';

export interface RecordCapitalEvidenceInput {
  profileId: string;
  classification: CapitalEvidenceClassification;
  amount: Prisma.Decimal | number;
  currency?: string;
  evidenceRecordRefs: Prisma.InputJsonValue;
  independentVerificationRefs?: Prisma.InputJsonValue;
  recordedByIdentityId: string;
  isAiActor?: boolean;
}

@Injectable()
export class CapitalEvidenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: StrategicProjectBoundaryService,
  ) {}

  async recordCapitalEvidence(input: RecordCapitalEvidenceInput) {
    const profile = await this.prisma.strategicProjectProfile.findUnique({
      where: { id: input.profileId },
    });

    if (!profile) {
      throw new NotFoundException(`StrategicProjectProfile ${input.profileId} not found`);
    }

    const latestEvidence = await this.prisma.capitalEvidenceRecord.findFirst({
      where: { profileId: input.profileId },
      orderBy: { recordedAt: 'desc' },
    });

    const evidenceRefs = Array.isArray(input.evidenceRecordRefs) ? input.evidenceRecordRefs : [];
    const hasEvidence = evidenceRefs.length > 0;

    if (input.classification !== CapitalEvidenceClassification.PROPOSED) {
      this.boundary.assertAiCannotPerformStrategicProjectAction(
        'ESCALATE_CAPITAL_CLASSIFICATION',
        input.isAiActor,
      );
    }

    this.boundary.assertCapitalEscalationRequiresEvidence(
      latestEvidence?.classification ?? null,
      input.classification,
      hasEvidence,
    );

    return this.prisma.capitalEvidenceRecord.create({
      data: {
        profileId: input.profileId,
        classification: input.classification,
        amount: input.amount,
        currency: input.currency ?? 'USD',
        evidenceRecordRefs: input.evidenceRecordRefs,
        independentVerificationRefs: input.independentVerificationRefs ?? [],
        recordedByIdentityId: input.recordedByIdentityId,
      },
    });
  }

  async getHighestClassification(profileId: string): Promise<CapitalEvidenceClassification | null> {
    const records = await this.prisma.capitalEvidenceRecord.findMany({
      where: { profileId },
      orderBy: { recordedAt: 'desc' },
    });

    return records[0]?.classification ?? null;
  }
}
