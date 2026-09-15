import { Injectable } from '@nestjs/common';
import {
  CapabilityDependencyControlScope,
  CapabilityDependencyVerificationStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CapabilityDefinitionService } from '../capabilities/capability-definition.service';
import { OperationalReadinessBoundaryService } from '../common/operational-readiness-boundary.service';

export interface CreateCapabilityDependencyInput {
  capabilityDefinitionId: string;
  dependencyName: string;
  ownerIdentityId?: string;
  ownerOfficeholderId?: string;
  requiredState: string;
  actualState?: string;
  fallbackPlan?: string;
  effectIfUnavailable: string;
  controlScope: CapabilityDependencyControlScope;
}

export interface VerifyDependencyInput {
  dependencyId: string;
  actualState: string;
  verificationNotes?: string;
  verifiedByIdentityId?: string;
}

@Injectable()
export class CapabilityDependencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: OperationalReadinessBoundaryService,
    private readonly definitionService: CapabilityDefinitionService,
  ) {}

  async createDependency(
    input: CreateCapabilityDependencyInput,
    clientPayload?: Record<string, unknown>,
  ) {
    if (clientPayload) {
      this.boundary.rejectClientProtectedDependencyFields(clientPayload);
    }

    await this.definitionService.findDefinitionById(input.capabilityDefinitionId);

    return this.prisma.capabilityDependency.create({
      data: {
        capabilityDefinitionId: input.capabilityDefinitionId,
        dependencyName: input.dependencyName,
        ownerIdentityId: input.ownerIdentityId,
        ownerOfficeholderId: input.ownerOfficeholderId,
        requiredState: input.requiredState,
        actualState: input.actualState,
        fallbackPlan: input.fallbackPlan,
        effectIfUnavailable: input.effectIfUnavailable,
        controlScope: input.controlScope,
        isReady: false,
        verificationStatus: CapabilityDependencyVerificationStatus.NOT_VERIFIED,
      },
    });
  }

  async verifyDependency(input: VerifyDependencyInput) {
    const dependency = await this.prisma.capabilityDependency.findUnique({
      where: { id: input.dependencyId },
    });

    if (!dependency) {
      throw new Error(`Dependency ${input.dependencyId} not found`);
    }

    const meetsRequiredState = input.actualState === dependency.requiredState;
    const verificationStatus = meetsRequiredState
      ? CapabilityDependencyVerificationStatus.VERIFIED
      : CapabilityDependencyVerificationStatus.VERIFICATION_FAILED;

    const isReady =
      meetsRequiredState &&
      dependency.controlScope === CapabilityDependencyControlScope.HEARTSTONE_CONTROLLED;

    this.boundary.assertExternalDependencyNotFalselyControlled({
      controlScope: dependency.controlScope,
      isReady,
      verificationStatus,
    });

    return this.prisma.capabilityDependency.update({
      where: { id: input.dependencyId },
      data: {
        actualState: input.actualState,
        verificationStatus,
        verificationNotes: input.verificationNotes,
        isReady,
      },
    });
  }

  async listDependencies(capabilityDefinitionId: string) {
    return this.prisma.capabilityDependency.findMany({
      where: { capabilityDefinitionId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
