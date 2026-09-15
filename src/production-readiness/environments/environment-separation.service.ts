import { Injectable, NotFoundException } from '@nestjs/common';
import { DataTransferApprovalStatus, PlatformEnvironmentClassification } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ProductionReadinessBoundaryService } from '../common/production-readiness-boundary.service';

@Injectable()
export class EnvironmentSeparationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
  ) {}

  async requestDataTransferApproval(input: {
    sourceEnvironmentId: string;
    targetEnvironmentId: string;
    deidentificationProcessRef: string;
  }) {
    const source = await this.prisma.environmentDefinition.findUniqueOrThrow({
      where: { id: input.sourceEnvironmentId },
    });
    const target = await this.prisma.environmentDefinition.findUniqueOrThrow({
      where: { id: input.targetEnvironmentId },
    });

    const isProductionSource =
      source.classification === PlatformEnvironmentClassification.PRODUCTION;
    const nonProductionTargets: PlatformEnvironmentClassification[] = [
      PlatformEnvironmentClassification.LOCAL,
      PlatformEnvironmentClassification.DEVELOPMENT,
      PlatformEnvironmentClassification.TEST,
      PlatformEnvironmentClassification.INTEGRATION,
      PlatformEnvironmentClassification.SANDBOX,
    ];
    const isNonProductionTarget = nonProductionTargets.includes(target.classification);

    if (isProductionSource && isNonProductionTarget) {
      return this.prisma.dataTransferApproval.create({
        data: {
          sourceEnvironmentId: input.sourceEnvironmentId,
          targetEnvironmentId: input.targetEnvironmentId,
          deidentificationProcessRef: input.deidentificationProcessRef,
          status: DataTransferApprovalStatus.PENDING,
        },
      });
    }

    throw new NotFoundException(
      'Data transfer approval is only required for production-to-non-production transfers',
    );
  }

  async approveDataTransfer(approvalId: string, approvedByIdentityId: string) {
    return this.prisma.dataTransferApproval.update({
      where: { id: approvalId },
      data: {
        status: DataTransferApprovalStatus.APPROVED,
        approvedByIdentityId,
        approvedAt: new Date(),
      },
    });
  }

  async assertDataTransferAllowed(sourceEnvironmentId: string, targetEnvironmentId: string) {
    const source = await this.prisma.environmentDefinition.findUniqueOrThrow({
      where: { id: sourceEnvironmentId },
    });
    const target = await this.prisma.environmentDefinition.findUniqueOrThrow({
      where: { id: targetEnvironmentId },
    });

    const isProductionSource =
      source.classification === PlatformEnvironmentClassification.PRODUCTION;
    const devTargets: PlatformEnvironmentClassification[] = [
      PlatformEnvironmentClassification.LOCAL,
      PlatformEnvironmentClassification.DEVELOPMENT,
      PlatformEnvironmentClassification.TEST,
    ];
    const isNonProductionTarget = devTargets.includes(target.classification);

    if (!isProductionSource || !isNonProductionTarget) {
      return;
    }

    const approval = await this.prisma.dataTransferApproval.findFirst({
      where: {
        sourceEnvironmentId,
        targetEnvironmentId,
        status: DataTransferApprovalStatus.APPROVED,
      },
    });

    this.boundary.assertProductionDataTransferApproved(approval !== null);
  }

  async validateCredentialAccess(
    environmentDefinitionId: string,
    credentialReference: string,
    targetEnvironmentId: string,
  ): Promise<void> {
    const binding = await this.prisma.environmentCredentialBinding.findFirst({
      where: { environmentDefinitionId, credentialReference },
      include: { environmentDefinition: true },
    });

    if (!binding) {
      throw new NotFoundException(`Credential binding ${credentialReference} not found`);
    }

    const targetEnvironment = await this.prisma.environmentDefinition.findUniqueOrThrow({
      where: { id: targetEnvironmentId },
    });

    if (binding.environmentDefinitionId !== targetEnvironmentId) {
      this.boundary.assertProductionCredentialNotInNonProduction(
        binding.isProductionCredential,
        targetEnvironment.classification,
      );
    }
  }
}
