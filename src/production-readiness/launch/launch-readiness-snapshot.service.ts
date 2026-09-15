import { Injectable, NotFoundException } from '@nestjs/common';
import { LaunchEventType, type LaunchReadinessSnapshot, Prisma } from '@prisma/client';

import { generateReferenceNumber } from '../../application-processing/common/reference-number.util';
import { PrismaService } from '../../database/prisma.service';
import { hashSnapshotIntegrity } from '../common/snapshot-integrity.util';

export interface CreateLaunchReadinessSnapshotInput {
  releaseCommit: string;
  artifactDigest: string;
  migrationState: string;
  configurationBaseline?: Record<string, unknown>;
  activeCapabilities?: unknown[];
  institutionalAcceptanceDossiers?: unknown[];
  activationDecisions?: unknown[];
  staffQualifications?: unknown[];
  securityReadiness?: Record<string, unknown>;
  privacyReadiness?: Record<string, unknown>;
  recordsReadiness?: Record<string, unknown>;
  continuityReadiness?: Record<string, unknown>;
  integrations?: unknown[];
  aiModelVersions?: unknown[];
  paymentProviders?: unknown[];
  notificationProviders?: unknown[];
  knownDefects?: unknown[];
  residualRisks?: unknown[];
  supportReadiness?: Record<string, unknown>;
  monitoringReadiness?: Record<string, unknown>;
  rollbackPlan?: Record<string, unknown>;
  safeHaltConditions?: unknown[];
  createdByIdentityId: string;
}

@Injectable()
export class LaunchReadinessSnapshotService {
  constructor(private readonly prisma: PrismaService) {}

  async createSnapshot(
    input: CreateLaunchReadinessSnapshotInput,
  ): Promise<LaunchReadinessSnapshot> {
    const snapshotPayload = {
      releaseCommit: input.releaseCommit,
      artifactDigest: input.artifactDigest,
      migrationState: input.migrationState,
      configurationBaseline: input.configurationBaseline ?? {},
      activeCapabilities: input.activeCapabilities ?? [],
      institutionalAcceptanceDossiers: input.institutionalAcceptanceDossiers ?? [],
      activationDecisions: input.activationDecisions ?? [],
      staffQualifications: input.staffQualifications ?? [],
      securityReadiness: input.securityReadiness ?? {},
      privacyReadiness: input.privacyReadiness ?? {},
      recordsReadiness: input.recordsReadiness ?? {},
      continuityReadiness: input.continuityReadiness ?? {},
      integrations: input.integrations ?? [],
      aiModelVersions: input.aiModelVersions ?? [],
      paymentProviders: input.paymentProviders ?? [],
      notificationProviders: input.notificationProviders ?? [],
      knownDefects: input.knownDefects ?? [],
      residualRisks: input.residualRisks ?? [],
      supportReadiness: input.supportReadiness ?? {},
      monitoringReadiness: input.monitoringReadiness ?? {},
      rollbackPlan: input.rollbackPlan ?? {},
      safeHaltConditions: input.safeHaltConditions ?? [],
    };

    const integrityHash = hashSnapshotIntegrity(snapshotPayload);

    const snapshot = await this.prisma.launchReadinessSnapshot.create({
      data: {
        snapshotNumber: generateReferenceNumber('LRS'),
        releaseCommit: input.releaseCommit,
        artifactDigest: input.artifactDigest,
        migrationState: input.migrationState,
        configurationBaseline: (input.configurationBaseline ?? {}) as Prisma.InputJsonValue,
        activeCapabilities: (input.activeCapabilities ?? []) as Prisma.InputJsonValue,
        institutionalAcceptanceDossiers: (input.institutionalAcceptanceDossiers ??
          []) as Prisma.InputJsonValue,
        activationDecisions: (input.activationDecisions ?? []) as Prisma.InputJsonValue,
        staffQualifications: (input.staffQualifications ?? []) as Prisma.InputJsonValue,
        securityReadiness: (input.securityReadiness ?? {}) as Prisma.InputJsonValue,
        privacyReadiness: (input.privacyReadiness ?? {}) as Prisma.InputJsonValue,
        recordsReadiness: (input.recordsReadiness ?? {}) as Prisma.InputJsonValue,
        continuityReadiness: (input.continuityReadiness ?? {}) as Prisma.InputJsonValue,
        integrations: (input.integrations ?? []) as Prisma.InputJsonValue,
        aiModelVersions: (input.aiModelVersions ?? []) as Prisma.InputJsonValue,
        paymentProviders: (input.paymentProviders ?? []) as Prisma.InputJsonValue,
        notificationProviders: (input.notificationProviders ?? []) as Prisma.InputJsonValue,
        knownDefects: (input.knownDefects ?? []) as Prisma.InputJsonValue,
        residualRisks: (input.residualRisks ?? []) as Prisma.InputJsonValue,
        supportReadiness: (input.supportReadiness ?? {}) as Prisma.InputJsonValue,
        monitoringReadiness: (input.monitoringReadiness ?? {}) as Prisma.InputJsonValue,
        rollbackPlan: (input.rollbackPlan ?? {}) as Prisma.InputJsonValue,
        safeHaltConditions: (input.safeHaltConditions ?? []) as Prisma.InputJsonValue,
        integrityHash,
        createdByIdentityId: input.createdByIdentityId,
      },
    });

    await this.prisma.launchEvent.create({
      data: {
        eventType: LaunchEventType.SNAPSHOT_CREATED,
        launchReadinessSnapshotId: snapshot.id,
        description: `Launch readiness snapshot ${snapshot.snapshotNumber} frozen at commit ${input.releaseCommit}`,
        eventData: { integrityHash, releaseCommit: input.releaseCommit },
        recordedByIdentityId: input.createdByIdentityId,
      },
    });

    return snapshot;
  }

  async getSnapshot(id: string): Promise<LaunchReadinessSnapshot> {
    const snapshot = await this.prisma.launchReadinessSnapshot.findUnique({ where: { id } });
    if (!snapshot) {
      throw new NotFoundException(`LaunchReadinessSnapshot ${id} not found`);
    }
    return snapshot;
  }

  verifySnapshotIntegrity(snapshot: LaunchReadinessSnapshot): boolean {
    const payload = {
      releaseCommit: snapshot.releaseCommit,
      artifactDigest: snapshot.artifactDigest,
      migrationState: snapshot.migrationState,
      configurationBaseline: snapshot.configurationBaseline,
      activeCapabilities: snapshot.activeCapabilities,
      institutionalAcceptanceDossiers: snapshot.institutionalAcceptanceDossiers,
      activationDecisions: snapshot.activationDecisions,
      staffQualifications: snapshot.staffQualifications,
      securityReadiness: snapshot.securityReadiness,
      privacyReadiness: snapshot.privacyReadiness,
      recordsReadiness: snapshot.recordsReadiness,
      continuityReadiness: snapshot.continuityReadiness,
      integrations: snapshot.integrations,
      aiModelVersions: snapshot.aiModelVersions,
      paymentProviders: snapshot.paymentProviders,
      notificationProviders: snapshot.notificationProviders,
      knownDefects: snapshot.knownDefects,
      residualRisks: snapshot.residualRisks,
      supportReadiness: snapshot.supportReadiness,
      monitoringReadiness: snapshot.monitoringReadiness,
      rollbackPlan: snapshot.rollbackPlan,
      safeHaltConditions: snapshot.safeHaltConditions,
    };
    return hashSnapshotIntegrity(payload) === snapshot.integrityHash;
  }
}
