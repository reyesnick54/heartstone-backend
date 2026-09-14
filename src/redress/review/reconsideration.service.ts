import { Injectable, NotFoundException } from '@nestjs/common';
import { RedressMatterStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RedressBoundaryService } from '../common/redress-boundary.service';
import { RedressSafeHaltService } from '../common/redress-safe-halt.service';

export interface OpenReconsiderationInput {
  matterId: string;
  snapshotId?: string;
}

@Injectable()
export class ReconsiderationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: RedressBoundaryService,
    private readonly safeHalt: RedressSafeHaltService,
  ) {}

  async openProceeding(input: OpenReconsiderationInput) {
    await this.safeHalt.assertMatterNotSafeHalted(input.matterId, 'reconsideration');

    const matter = await this.prisma.redressMatter.findUnique({
      where: { id: input.matterId },
    });

    if (!matter) {
      throw new NotFoundException(`RedressMatter ${input.matterId} not found`);
    }

    this.boundary.assertOriginalPreserved(true);

    const proceeding = await this.prisma.reconsiderationProceeding.create({
      data: {
        matterId: input.matterId,
        snapshotId: input.snapshotId,
        newEvidenceSeparated: true,
        originalPreserved: true,
      },
    });

    await this.prisma.redressMatter.update({
      where: { id: input.matterId },
      data: { status: RedressMatterStatus.REVIEW },
    });

    return proceeding;
  }
}
