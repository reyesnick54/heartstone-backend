import { Injectable, NotFoundException } from '@nestjs/common';
import { SubstantiveAppealStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SUBSTANTIVE_APPEAL_NUMBER_PREFIX } from '../redress.constants';

export interface LodgeSubstantiveAppealInput {
  masterAdministrativeFileId: string;
  appellantIdentityId: string;
  subjectSummary: string;
  caseId?: string;
  governmentDecisionId?: string;
}

@Injectable()
export class SubstantiveAppealService {
  constructor(private readonly prisma: PrismaService) {}

  async lodge(input: LodgeSubstantiveAppealInput) {
    const appealNumber = `${SUBSTANTIVE_APPEAL_NUMBER_PREFIX}-${String(Date.now())}`;

    return this.prisma.substantiveAppeal.create({
      data: {
        appealNumber,
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        caseId: input.caseId,
        governmentDecisionId: input.governmentDecisionId,
        appellantIdentityId: input.appellantIdentityId,
        subjectSummary: input.subjectSummary,
        status: SubstantiveAppealStatus.LODGED,
      },
    });
  }

  async findById(appealId: string) {
    const appeal = await this.prisma.substantiveAppeal.findUnique({
      where: { id: appealId },
      include: {
        relatedMatters: true,
      },
    });

    if (!appeal) {
      throw new NotFoundException(`SubstantiveAppeal ${appealId} not found`);
    }

    return appeal;
  }
}
