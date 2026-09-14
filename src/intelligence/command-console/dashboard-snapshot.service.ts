import { createHash, randomUUID } from 'node:crypto';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { DashboardIndicatorProjectionService } from './dashboard-indicator-projection.service';

export interface CaptureSnapshotInput {
  dashboardVersionId: string;
  capturedByIdentityId: string;
  projectionIds: string[];
}

@Injectable()
export class DashboardSnapshotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectionService: DashboardIndicatorProjectionService,
  ) {}

  async captureSnapshot(input: CaptureSnapshotInput) {
    const projections = await this.prisma.dashboardIndicatorProjection.findMany({
      where: { id: { in: input.projectionIds }, dashboardVersionId: input.dashboardVersionId },
      include: {
        drilldownReferences: true,
        statusDictionaryEntry: true,
        indicatorDefinition: true,
      },
    });

    if (projections.length === 0) {
      throw new NotFoundException('No projections found for snapshot capture');
    }

    const formattedProjections = projections.map((projection) =>
      this.projectionService.formatProjectionResponse(projection),
    );

    const snapshotPayload = {
      capturedAt: new Date().toISOString(),
      dashboardVersionId: input.dashboardVersionId,
      indicators: formattedProjections,
    };

    const snapshotHash = createHash('sha256')
      .update(JSON.stringify(snapshotPayload))
      .digest('hex');

    return this.prisma.dashboardSnapshot.create({
      data: {
        dashboardVersionId: input.dashboardVersionId,
        capturedByIdentityId: input.capturedByIdentityId,
        snapshotPayload,
        snapshotHash,
        replayToken: randomUUID(),
        isImmutable: true,
      },
    });
  }

  async replaySnapshot(replayToken: string) {
    const snapshot = await this.prisma.dashboardSnapshot.findUnique({
      where: { replayToken },
    });

    if (!snapshot) {
      throw new NotFoundException(`Snapshot with replay token "${replayToken}" was not found`);
    }

    return {
      id: snapshot.id,
      capturedAt: snapshot.capturedAt,
      snapshotHash: snapshot.snapshotHash,
      replayToken: snapshot.replayToken,
      isImmutable: snapshot.isImmutable,
      payload: snapshot.snapshotPayload,
    };
  }

  async assertSnapshotImmutable(snapshotId: string) {
    const snapshot = await this.prisma.dashboardSnapshot.findUnique({
      where: { id: snapshotId },
    });

    if (!snapshot) {
      throw new NotFoundException(`Snapshot "${snapshotId}" was not found`);
    }

    if (!snapshot.isImmutable) {
      throw new BadRequestException('Dashboard snapshots must be immutable once captured');
    }

    return snapshot;
  }

  async rejectMutationAttempt(snapshotId: string) {
    const snapshot = await this.assertSnapshotImmutable(snapshotId);
    throw new BadRequestException(
      `Snapshot "${snapshot.id}" is immutable and cannot be mutated (hash: ${snapshot.snapshotHash})`,
    );
  }
}
