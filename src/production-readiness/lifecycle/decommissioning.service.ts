import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  type CapabilityReplacement,
  CapabilityReplacementStatus,
  type CapabilityRetirement,
  type DecommissioningExecution,
  type DecommissioningPlan,
  DecommissioningPlanStatus,
  ExitAcceptanceOutcome,
  type ExitAcceptanceRecord,
  LaunchEventType,
  Prisma,
} from '@prisma/client';

import { generateReferenceNumber } from '../../application-processing/common/reference-number.util';
import { PrismaService } from '../../database/prisma.service';
import { ProductionReadinessBoundaryService } from '../common/production-readiness-boundary.service';
import { hashManifestVerification } from '../common/snapshot-integrity.util';

@Injectable()
export class CapabilityRetirementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
  ) {}

  async recordRetirement(input: {
    capabilityRef: string;
    capabilityType: string;
    reason: string;
    effectiveAt: Date;
    authorizedByIdentityId: string;
    authorityEvaluationRecordId?: string;
    successorCapabilityRef?: string;
    recordsPreserved?: boolean;
    credentialsRevoked?: boolean;
    integrationsShutdown?: boolean;
  }): Promise<CapabilityRetirement> {
    this.boundary.assertRetirementNotDestruction(input.recordsPreserved ?? true);

    const retirement = await this.prisma.capabilityRetirement.create({
      data: {
        retirementNumber: generateReferenceNumber('RET'),
        capabilityRef: input.capabilityRef,
        capabilityType: input.capabilityType,
        reason: input.reason,
        effectiveAt: input.effectiveAt,
        authorizedByIdentityId: input.authorizedByIdentityId,
        authorityEvaluationRecordId: input.authorityEvaluationRecordId,
        successorCapabilityRef: input.successorCapabilityRef,
        recordsPreserved: input.recordsPreserved ?? true,
        credentialsRevoked: input.credentialsRevoked ?? false,
        integrationsShutdown: input.integrationsShutdown ?? false,
      },
    });

    await this.prisma.launchEvent.create({
      data: {
        eventType: LaunchEventType.RETIREMENT_RECORDED,
        description: `Capability retirement ${retirement.retirementNumber} recorded for ${input.capabilityRef}`,
        eventData: { retirementNumber: retirement.retirementNumber },
        recordedByIdentityId: input.authorizedByIdentityId,
      },
    });

    return retirement;
  }
}

@Injectable()
export class CapabilityReplacementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
  ) {}

  async planReplacement(input: {
    predecessorCapabilityRef: string;
    successorCapabilityRef: string;
    predecessorRetirementId?: string;
    dataMigrationPlan?: Record<string, unknown>;
    recordsContinuityPlan?: Record<string, unknown>;
    credentialTransitionPlan?: Record<string, unknown>;
    integrationTransitionPlan?: Record<string, unknown>;
    userCommunicationPlan?: Record<string, unknown>;
    cutoverPlan?: Record<string, unknown>;
    rollbackPlan?: Record<string, unknown>;
  }): Promise<CapabilityReplacement> {
    return this.prisma.capabilityReplacement.create({
      data: {
        replacementNumber: generateReferenceNumber('REPL'),
        predecessorCapabilityRef: input.predecessorCapabilityRef,
        successorCapabilityRef: input.successorCapabilityRef,
        predecessorRetirementId: input.predecessorRetirementId,
        dataMigrationPlan: (input.dataMigrationPlan ?? {}) as Prisma.InputJsonValue,
        recordsContinuityPlan: (input.recordsContinuityPlan ?? {}) as Prisma.InputJsonValue,
        credentialTransitionPlan: (input.credentialTransitionPlan ?? {}) as Prisma.InputJsonValue,
        integrationTransitionPlan: (input.integrationTransitionPlan ?? {}) as Prisma.InputJsonValue,
        userCommunicationPlan: (input.userCommunicationPlan ?? {}) as Prisma.InputJsonValue,
        cutoverPlan: (input.cutoverPlan ?? {}) as Prisma.InputJsonValue,
        rollbackPlan: (input.rollbackPlan ?? {}) as Prisma.InputJsonValue,
        status: CapabilityReplacementStatus.PLANNED,
      },
    });
  }

  async acceptSuccessor(input: {
    replacementId: string;
    acceptanceRecordRef: string;
  }): Promise<CapabilityReplacement> {
    this.boundary.assertReplacementRequiresAcceptance(true);

    return this.prisma.capabilityReplacement.update({
      where: { id: input.replacementId },
      data: {
        acceptanceRecordRef: input.acceptanceRecordRef,
        status: CapabilityReplacementStatus.ACCEPTANCE_PENDING,
      },
    });
  }

  async completeCutover(replacementId: string): Promise<CapabilityReplacement> {
    const replacement = await this.prisma.capabilityReplacement.findUnique({
      where: { id: replacementId },
    });
    if (!replacement?.acceptanceRecordRef) {
      throw new BadRequestException('Successor must be accepted before cutover');
    }

    return this.prisma.capabilityReplacement.update({
      where: { id: replacementId },
      data: { status: CapabilityReplacementStatus.COMPLETED },
    });
  }
}

@Injectable()
export class DecommissioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
  ) {}

  async createPlan(input: {
    targetSystemRef: string;
    openCasesDisposition?: Record<string, unknown>;
    recordsDisposition?: Record<string, unknown>;
    evidenceDisposition?: Record<string, unknown>;
    dataExportPlan?: Record<string, unknown>;
    legalHolds?: unknown[];
    archivePlan?: Record<string, unknown>;
    credentialShutdownPlan?: Record<string, unknown>;
    integrationShutdownPlan?: Record<string, unknown>;
  }): Promise<DecommissioningPlan> {
    return this.prisma.decommissioningPlan.create({
      data: {
        planNumber: generateReferenceNumber('DECOM'),
        targetSystemRef: input.targetSystemRef,
        openCasesDisposition: (input.openCasesDisposition ?? {}) as Prisma.InputJsonValue,
        recordsDisposition: (input.recordsDisposition ?? {}) as Prisma.InputJsonValue,
        evidenceDisposition: (input.evidenceDisposition ?? {}) as Prisma.InputJsonValue,
        dataExportPlan: (input.dataExportPlan ?? {}) as Prisma.InputJsonValue,
        legalHolds: (input.legalHolds ?? []) as Prisma.InputJsonValue,
        archivePlan: (input.archivePlan ?? {}) as Prisma.InputJsonValue,
        credentialShutdownPlan: (input.credentialShutdownPlan ?? {}) as Prisma.InputJsonValue,
        integrationShutdownPlan: (input.integrationShutdownPlan ?? {}) as Prisma.InputJsonValue,
        status: DecommissioningPlanStatus.DRAFT,
      },
    });
  }

  async approvePlan(planId: string, approvedByIdentityId: string): Promise<DecommissioningPlan> {
    return this.prisma.decommissioningPlan.update({
      where: { id: planId },
      data: {
        status: DecommissioningPlanStatus.APPROVED,
        approvedAt: new Date(),
        approvedByIdentityId,
      },
    });
  }

  async executePlan(input: {
    decommissioningPlanId: string;
    executedByIdentityId: string;
    executionNotes: string;
    executedSteps: unknown[];
    evidenceRefs?: unknown[];
    credentialShutdowns?: {
      credentialRef: string;
      credentialType: string;
      shutdownReason: string;
    }[];
    integrationShutdowns?: {
      integrationRef: string;
      integrationDefinitionId?: string;
      shutdownReason: string;
    }[];
  }): Promise<DecommissioningExecution> {
    const plan = await this.prisma.decommissioningPlan.findUnique({
      where: { id: input.decommissioningPlanId },
    });
    if (plan?.status !== DecommissioningPlanStatus.APPROVED) {
      throw new BadRequestException('Decommissioning plan must be approved before execution');
    }

    return this.prisma.$transaction(async (tx) => {
      const execution = await tx.decommissioningExecution.create({
        data: {
          decommissioningPlanId: input.decommissioningPlanId,
          executionNotes: input.executionNotes,
          executedSteps: input.executedSteps as Prisma.InputJsonValue,
          executedByIdentityId: input.executedByIdentityId,
          evidenceRefs: (input.evidenceRefs ?? []) as Prisma.InputJsonValue,
        },
      });

      for (const cred of input.credentialShutdowns ?? []) {
        await tx.credentialShutdownRecord.create({
          data: {
            ...cred,
            revokedByIdentityId: input.executedByIdentityId,
            decommissioningExecutionId: execution.id,
          },
        });
      }

      for (const integration of input.integrationShutdowns ?? []) {
        await tx.integrationShutdownRecord.create({
          data: {
            integrationRef: integration.integrationRef,
            integrationDefinitionId: integration.integrationDefinitionId,
            shutdownReason: integration.shutdownReason,
            shutDownByIdentityId: input.executedByIdentityId,
            decommissioningExecutionId: execution.id,
          },
        });
      }

      await tx.decommissioningPlan.update({
        where: { id: input.decommissioningPlanId },
        data: { status: DecommissioningPlanStatus.IN_PROGRESS },
      });

      await tx.launchEvent.create({
        data: {
          eventType: LaunchEventType.DECOMMISSIONING_STARTED,
          description: `Decommissioning execution started for plan ${plan.planNumber}`,
          eventData: { planNumber: plan.planNumber, executionId: execution.id },
          recordedByIdentityId: input.executedByIdentityId,
        },
      });

      return execution;
    });
  }

  async createDataExportManifest(input: {
    exportScope: Record<string, unknown>;
    dataCategories: unknown[];
    formatDescription: string;
  }) {
    const verificationHash = hashManifestVerification({
      exportScope: input.exportScope,
      dataCategories: input.dataCategories,
      formatDescription: input.formatDescription,
    });

    return this.prisma.dataExportManifest.create({
      data: {
        manifestNumber: generateReferenceNumber('DEX'),
        exportScope: input.exportScope as Prisma.InputJsonValue,
        dataCategories: input.dataCategories as Prisma.InputJsonValue,
        formatDescription: input.formatDescription,
        verificationHash,
      },
    });
  }

  async verifyDataExportManifest(input: { manifestId: string; verifiedByIdentityId: string }) {
    const manifest = await this.prisma.dataExportManifest.findUnique({
      where: { id: input.manifestId },
    });
    if (!manifest) {
      throw new NotFoundException(`DataExportManifest ${input.manifestId} not found`);
    }

    return this.prisma.dataExportManifest.update({
      where: { id: input.manifestId },
      data: {
        isUsable: true,
        verifiedAt: new Date(),
        verifiedByIdentityId: input.verifiedByIdentityId,
      },
    });
  }

  async createRecordsPreservationManifest(input: {
    preservedRecords: unknown[];
    legalHolds?: unknown[];
    archiveLocations?: unknown[];
    accessPolicy?: Record<string, unknown>;
    createdByIdentityId: string;
  }) {
    this.boundary.assertRetirementNotDestruction(true);

    const verificationHash = hashManifestVerification({
      preservedRecords: input.preservedRecords,
      legalHolds: input.legalHolds ?? [],
      archiveLocations: input.archiveLocations ?? [],
    });

    return this.prisma.recordsPreservationManifest.create({
      data: {
        manifestNumber: generateReferenceNumber('RPM'),
        preservedRecords: input.preservedRecords as Prisma.InputJsonValue,
        legalHolds: (input.legalHolds ?? []) as Prisma.InputJsonValue,
        archiveLocations: (input.archiveLocations ?? []) as Prisma.InputJsonValue,
        accessPolicy: (input.accessPolicy ?? {}) as Prisma.InputJsonValue,
        verificationHash,
        createdByIdentityId: input.createdByIdentityId,
      },
    });
  }
}

@Injectable()
export class ExitAcceptanceService {
  constructor(private readonly prisma: PrismaService) {}

  async recordExitAcceptance(input: {
    decommissioningExecutionId: string;
    institutionalAcceptorIdentityId: string;
    institutionalAcceptorOfficeholderId?: string;
    acceptanceOutcome: ExitAcceptanceOutcome;
    acceptanceNotes: string;
    residualObligations?: unknown[];
  }): Promise<ExitAcceptanceRecord> {
    const execution = await this.prisma.decommissioningExecution.findUnique({
      where: { id: input.decommissioningExecutionId },
    });
    if (!execution) {
      throw new NotFoundException(
        `DecommissioningExecution ${input.decommissioningExecutionId} not found`,
      );
    }

    const record = await this.prisma.$transaction(async (tx) => {
      const acceptance = await tx.exitAcceptanceRecord.create({
        data: {
          acceptanceNumber: generateReferenceNumber('EXIT'),
          decommissioningExecutionId: input.decommissioningExecutionId,
          institutionalAcceptorIdentityId: input.institutionalAcceptorIdentityId,
          institutionalAcceptorOfficeholderId: input.institutionalAcceptorOfficeholderId,
          acceptanceOutcome: input.acceptanceOutcome,
          acceptanceNotes: input.acceptanceNotes,
          residualObligations: (input.residualObligations ?? []) as Prisma.InputJsonValue,
        },
      });

      await tx.decommissioningPlan.update({
        where: { id: execution.decommissioningPlanId },
        data: { status: DecommissioningPlanStatus.COMPLETED },
      });

      await tx.launchEvent.create({
        data: {
          eventType: LaunchEventType.EXIT_ACCEPTED,
          description: `Exit acceptance ${acceptance.acceptanceNumber}: ${input.acceptanceOutcome}`,
          eventData: { acceptanceNumber: acceptance.acceptanceNumber },
          recordedByIdentityId: input.institutionalAcceptorIdentityId,
        },
      });

      return acceptance;
    });

    return record;
  }
}
