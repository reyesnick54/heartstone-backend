import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { RedressBoundaryService } from '../common/redress-boundary.service';
import { RedressSafeHaltService } from '../common/redress-safe-halt.service';

export interface CreateAdministrativeCorrectionInput {
  matterId: string;
  originalNoticeReference: string;
  errorDescription: string;
  altersSubstantiveOutcome?: boolean;
  altersMaterialReasons?: boolean;
  removesReviewRights?: boolean;
}

export interface CompleteCorrectionInput {
  correctionId: string;
  correctedNoticeReference: string;
}

@Injectable()
export class AdministrativeCorrectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: RedressBoundaryService,
    private readonly safeHalt: RedressSafeHaltService,
  ) {}

  async createCorrection(input: CreateAdministrativeCorrectionInput) {
    await this.safeHalt.assertMatterNotSafeHalted(input.matterId, 'administrative correction');

    this.boundary.assertNonSubstantiveCorrection({
      altersSubstantiveOutcome: input.altersSubstantiveOutcome,
      altersMaterialReasons: input.altersMaterialReasons,
      removesReviewRights: input.removesReviewRights,
    });

    return this.prisma.administrativeCorrectionMatter.create({
      data: {
        matterId: input.matterId,
        originalNoticeReference: input.originalNoticeReference,
        errorDescription: input.errorDescription,
        isNonSubstantive: true,
        altersSubstantiveOutcome: input.altersSubstantiveOutcome ?? false,
        altersMaterialReasons: input.altersMaterialReasons ?? false,
        removesReviewRights: input.removesReviewRights ?? false,
        originalPreserved: true,
      },
    });
  }

  async completeCorrection(input: CompleteCorrectionInput) {
    const correction = await this.prisma.administrativeCorrectionMatter.findUnique({
      where: { id: input.correctionId },
    });

    if (!correction) {
      throw new NotFoundException(
        `AdministrativeCorrectionMatter ${input.correctionId} not found`,
      );
    }

    if (
      correction.altersSubstantiveOutcome ||
      correction.altersMaterialReasons ||
      correction.removesReviewRights
    ) {
      throw new BadRequestException('Substantive changes cannot be completed as correction');
    }

    this.boundary.assertOriginalPreserved(correction.originalPreserved);

    return this.prisma.administrativeCorrectionMatter.update({
      where: { id: input.correctionId },
      data: {
        correctedNoticeReference: input.correctedNoticeReference,
      },
    });
  }
}
