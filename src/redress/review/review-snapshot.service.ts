import { createHash } from 'node:crypto';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { RedressSafeHaltService } from '../common/redress-safe-halt.service';

export interface PinSnapshotInput {
  matterId: string;
  snapshotReference: string;
  originalDecisionReference?: string;
}

export interface AddLaterEvidenceInput {
  snapshotId: string;
  submissionReference: string;
  attributableToIdentityId?: string;
}

@Injectable()
export class ReviewSnapshotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly safeHalt: RedressSafeHaltService,
  ) {}

  async pinSnapshot(input: PinSnapshotInput) {
    await this.safeHalt.assertMatterNotSafeHalted(input.matterId, 'review snapshot pinning');

    const snapshotHash = createHash('sha256')
      .update(`${input.snapshotReference}:${input.originalDecisionReference ?? ''}`, 'utf8')
      .digest('hex');

    return this.prisma.reviewRecordSnapshot.create({
      data: {
        matterId: input.matterId,
        snapshotReference: input.snapshotReference,
        snapshotHash,
        originalDecisionReference: input.originalDecisionReference,
        isImmutable: true,
      },
    });
  }

  async addReviewIssue(snapshotId: string, issueSummary: string, sortOrder = 0) {
    const snapshot = await this.prisma.reviewRecordSnapshot.findUnique({
      where: { id: snapshotId },
    });

    if (!snapshot) {
      throw new NotFoundException(`ReviewRecordSnapshot ${snapshotId} not found`);
    }

    if (!snapshot.isImmutable) {
      throw new BadRequestException('Snapshot immutability must be preserved');
    }

    return this.prisma.reviewIssue.create({
      data: {
        snapshotId,
        issueSummary,
        sortOrder,
      },
    });
  }

  async addLaterEvidence(input: AddLaterEvidenceInput) {
    const snapshot = await this.prisma.reviewRecordSnapshot.findUnique({
      where: { id: input.snapshotId },
    });

    if (!snapshot) {
      throw new NotFoundException(`ReviewRecordSnapshot ${input.snapshotId} not found`);
    }

    return this.prisma.reviewSubmission.create({
      data: {
        snapshotId: input.snapshotId,
        submissionReference: input.submissionReference,
        isLaterEvidence: true,
        attributableToIdentityId: input.attributableToIdentityId,
      },
    });
  }

  async findByMatterId(matterId: string) {
    return this.prisma.reviewRecordSnapshot.findMany({
      where: { matterId },
      include: {
        reviewIssues: { orderBy: { sortOrder: 'asc' } },
        reviewSubmissions: { orderBy: { submittedAt: 'asc' } },
      },
      orderBy: { pinnedAt: 'asc' },
    });
  }
}
