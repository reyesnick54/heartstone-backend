import { BadRequestException, Injectable } from '@nestjs/common';
import { Case, CaseStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { DECISION_ENGINE_OWNED_CASE_STATUSES } from './cases.constants';
import { UpdateCaseStatusDto } from './dto/update-case-status.dto';

@Injectable()
export class CaseStatusService {
  constructor(private readonly prisma: PrismaService) {}

  assertOrdinaryStatusPatchAllowed(caseStatus: CaseStatus): void {
    if (
      DECISION_ENGINE_OWNED_CASE_STATUSES.includes(
        caseStatus as (typeof DECISION_ENGINE_OWNED_CASE_STATUSES)[number],
      )
    ) {
      throw new BadRequestException(
        `Case status "${caseStatus}" is owned by the Decision Engine and cannot be set via ordinary status patch`,
      );
    }
  }

  async updateStatus(
    caseRecord: Case,
    dto: UpdateCaseStatusDto,
    actorIdentityId: string,
  ): Promise<Case> {
    this.assertOrdinaryStatusPatchAllowed(dto.caseStatus);

    const nextLegalStatus = dto.legalStatus ?? caseRecord.legalStatus;

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedCase = await tx.case.update({
        where: { id: caseRecord.id },
        data: {
          caseStatus: dto.caseStatus,
          legalStatus: nextLegalStatus,
        },
      });

      await tx.caseStatusHistory.create({
        data: {
          caseId: caseRecord.id,
          previousStatus: caseRecord.caseStatus,
          newStatus: dto.caseStatus,
          previousLegalStatus: caseRecord.legalStatus,
          newLegalStatus: nextLegalStatus,
          actorIdentityId,
          officeholderId: dto.officeholderId ?? null,
          reason: dto.reason ?? null,
          correlationId: dto.correlationId ?? null,
        },
      });

      return updatedCase;
    });

    return updated;
  }
}
