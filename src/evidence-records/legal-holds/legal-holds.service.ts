import { ForbiddenException, Injectable } from '@nestjs/common';
import { LegalHoldStatus, LegalHoldTargetType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { EvidenceRecordsBoundaryService } from '../common/evidence-records-boundary.service';
import { generateEvidenceReferenceNumber } from '../common/reference-number.util';
import { LEGAL_HOLD_REFERENCE_PREFIX } from '../evidence-records.constants';

@Injectable()
export class LegalHoldsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: EvidenceRecordsBoundaryService,
  ) {}

  async create(input: {
    title: string;
    reason: string;
    actorIdentityId: string;
    targetType: LegalHoldTargetType;
    masterAdministrativeFileId?: string;
    documentRecordId?: string;
    evidenceRecordId?: string;
    evidencePacketId?: string;
  }) {
    const hold = await this.prisma.legalHold.create({
      data: {
        holdReference: generateEvidenceReferenceNumber(LEGAL_HOLD_REFERENCE_PREFIX),
        title: input.title,
        reason: input.reason,
        status: LegalHoldStatus.ACTIVE,
        issuedByIdentityId: input.actorIdentityId,
        effectiveFrom: new Date(),
        targets: {
          create: {
            targetType: input.targetType,
            masterAdministrativeFileId: input.masterAdministrativeFileId,
            documentRecordId: input.documentRecordId,
            evidenceRecordId: input.evidenceRecordId,
            evidencePacketId: input.evidencePacketId,
          },
        },
      },
      include: { targets: true },
    });

    return hold;
  }

  async assertApplicantCannotAccess(legalHoldId: string): Promise<void> {
    await this.boundary.assertApplicantCannotAccessLegalHold(legalHoldId);
  }

  async assertDispositionAllowed(targetId: string): Promise<void> {
    await this.boundary.assertLegalHoldDoesNotBlockDisposition('EvidenceRecord', targetId);
  }
}
