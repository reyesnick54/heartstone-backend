import { createHash, randomUUID } from 'node:crypto';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DashboardAccessPurpose,
  DashboardConsoleType,
  DashboardSensitivityLevel,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { type AuthenticatedPrincipal } from '../../identity/auth/domain/authenticated-principal';
import { DashboardAccessPolicyService } from './dashboard-access-policy.service';
import { DashboardIndicatorProjectionService } from './dashboard-indicator-projection.service';

export interface CaptureSnapshotInput {
  actor: AuthenticatedPrincipal;
  dashboardVersionId: string;
  projectionIds: string[];
}

@Injectable()
export class DashboardSnapshotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectionService: DashboardIndicatorProjectionService,
    private readonly accessPolicyService: DashboardAccessPolicyService,
  ) {}

  async captureSnapshot(input: CaptureSnapshotInput) {
    const version = await this.prisma.dashboardVersion.findUnique({
      where: { id: input.dashboardVersionId },
      include: { dashboardDefinition: true },
    });

    if (!version) {
      throw new NotFoundException(`Dashboard version "${input.dashboardVersionId}" was not found`);
    }

    const definition = version.dashboardDefinition;

    await this.accessPolicyService.evaluateAccess({
      actor: input.actor,
      dashboardDefinitionId: definition.id,
      institutionId: definition.institutionId ?? undefined,
      departmentId: definition.departmentId ?? undefined,
      purpose:
        definition.consoleType === DashboardConsoleType.EXECUTIVE_COMMAND
          ? DashboardAccessPurpose.EXECUTIVE_BRIEFING
          : DashboardAccessPurpose.DEPARTMENT_MANAGEMENT,
      sensitivityScope: DashboardSensitivityLevel.RESTRICTED,
    });

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

    const snapshotHash = createHash('sha256').update(JSON.stringify(snapshotPayload)).digest('hex');

    return this.prisma.dashboardSnapshot.create({
      data: {
        dashboardVersionId: input.dashboardVersionId,
        capturedByIdentityId: input.actor.identityId,
        snapshotPayload,
        snapshotHash,
        replayToken: randomUUID(),
        isImmutable: true,
      },
    });
  }

  async replaySnapshot(replayToken: string, actor: AuthenticatedPrincipal) {
    const snapshot = await this.prisma.dashboardSnapshot.findUnique({
      where: { replayToken },
      include: {
        dashboardVersion: {
          include: { dashboardDefinition: true },
        },
      },
    });

    if (!snapshot) {
      throw new NotFoundException(`Snapshot with replay token "${replayToken}" was not found`);
    }

    const definition = snapshot.dashboardVersion.dashboardDefinition;

    await this.accessPolicyService.evaluateAccess({
      actor,
      dashboardDefinitionId: definition.id,
      institutionId: definition.institutionId ?? undefined,
      departmentId: definition.departmentId ?? undefined,
      purpose:
        definition.consoleType === DashboardConsoleType.EXECUTIVE_COMMAND
          ? DashboardAccessPurpose.EXECUTIVE_BRIEFING
          : DashboardAccessPurpose.DEPARTMENT_MANAGEMENT,
      sensitivityScope: DashboardSensitivityLevel.RESTRICTED,
    });

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
