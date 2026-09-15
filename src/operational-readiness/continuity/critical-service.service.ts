import { Injectable, NotFoundException } from '@nestjs/common';
import {
  BusinessImpactAssessment,
  ConfigurationConfirmationStatus,
  CriticalServiceDefinition,
  CriticalServiceDefinitionStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { BUSINESS_IMPACT_ASSESSMENT_PREFIX } from '../business-continuity.constants';

export interface CreateCriticalServiceDefinitionInput {
  serviceCode: string;
  name: string;
  description?: string;
  institutionalOwnerInstitutionId: string;
  authorityBasisReference: string;
  authorityBasisConfirmationStatus?: ConfigurationConfirmationStatus;
  minimumServiceDescription: string;
  maximumTolerableInterruptionMinutes?: number | null;
  mtiConfirmationStatus?: ConfigurationConfirmationStatus;
  rtoMinutes?: number | null;
  rtoConfirmationStatus?: ConfigurationConfirmationStatus;
  rpoMinutes?: number | null;
  rpoConfirmationStatus?: ConfigurationConfirmationStatus;
  fallbackDescription?: string;
  fallbackConfirmationStatus?: ConfigurationConfirmationStatus;
  recoveryPriority?: number | null;
  recoveryPriorityConfirmationStatus?: ConfigurationConfirmationStatus;
  safeHaltConditions?: string;
}

export interface RecordBusinessImpactAssessmentInput {
  criticalServiceDefinitionId: string;
  impactSummary: string;
  financialImpactNotes?: string;
  operationalImpactNotes?: string;
  reputationalImpactNotes?: string;
  assessedByIdentityId: string;
  institutionId?: string;
}

@Injectable()
export class CriticalServiceService {
  constructor(private readonly prisma: PrismaService) {}

  async createDefinition(
    input: CreateCriticalServiceDefinitionInput,
  ): Promise<CriticalServiceDefinition> {
    return this.prisma.criticalServiceDefinition.create({
      data: {
        serviceCode: input.serviceCode,
        name: input.name,
        description: input.description,
        institutionalOwnerInstitutionId: input.institutionalOwnerInstitutionId,
        authorityBasisReference: input.authorityBasisReference,
        authorityBasisConfirmationStatus:
          input.authorityBasisConfirmationStatus ?? ConfigurationConfirmationStatus.TBD,
        minimumServiceDescription: input.minimumServiceDescription,
        maximumTolerableInterruptionMinutes: input.maximumTolerableInterruptionMinutes ?? null,
        mtiConfirmationStatus:
          input.mtiConfirmationStatus ??
          (input.maximumTolerableInterruptionMinutes == null
            ? ConfigurationConfirmationStatus.TBD
            : ConfigurationConfirmationStatus.UNCONFIRMED),
        rtoMinutes: input.rtoMinutes ?? null,
        rtoConfirmationStatus:
          input.rtoConfirmationStatus ??
          (input.rtoMinutes == null
            ? ConfigurationConfirmationStatus.TBD
            : ConfigurationConfirmationStatus.UNCONFIRMED),
        rpoMinutes: input.rpoMinutes ?? null,
        rpoConfirmationStatus:
          input.rpoConfirmationStatus ??
          (input.rpoMinutes == null
            ? ConfigurationConfirmationStatus.TBD
            : ConfigurationConfirmationStatus.UNCONFIRMED),
        fallbackDescription: input.fallbackDescription,
        fallbackConfirmationStatus:
          input.fallbackConfirmationStatus ?? ConfigurationConfirmationStatus.TBD,
        recoveryPriority: input.recoveryPriority ?? null,
        recoveryPriorityConfirmationStatus:
          input.recoveryPriorityConfirmationStatus ?? ConfigurationConfirmationStatus.TBD,
        safeHaltConditions: input.safeHaltConditions,
        status: CriticalServiceDefinitionStatus.DRAFT,
      },
    });
  }

  async recordBusinessImpactAssessment(
    input: RecordBusinessImpactAssessmentInput,
  ): Promise<BusinessImpactAssessment> {
    await this.getDefinitionOrThrow(input.criticalServiceDefinitionId);

    const count = await this.prisma.businessImpactAssessment.count();
    const assessmentNumber = `${BUSINESS_IMPACT_ASSESSMENT_PREFIX}-${String(count + 1).padStart(6, '0')}`;

    return this.prisma.businessImpactAssessment.create({
      data: {
        assessmentNumber,
        criticalServiceDefinitionId: input.criticalServiceDefinitionId,
        impactSummary: input.impactSummary,
        financialImpactNotes: input.financialImpactNotes,
        operationalImpactNotes: input.operationalImpactNotes,
        reputationalImpactNotes: input.reputationalImpactNotes,
        assessedByIdentityId: input.assessedByIdentityId,
        institutionId: input.institutionId,
        assessedAt: new Date(),
      },
    });
  }

  async addDependency(
    criticalServiceDefinitionId: string,
    data: Prisma.ContinuityDependencyCreateWithoutCriticalServiceDefinitionInput,
  ) {
    await this.getDefinitionOrThrow(criticalServiceDefinitionId);
    return this.prisma.continuityDependency.create({
      data: {
        ...data,
        criticalServiceDefinition: { connect: { id: criticalServiceDefinitionId } },
      },
    });
  }

  async addSinglePointOfFailure(
    criticalServiceDefinitionId: string,
    data: Prisma.SinglePointOfFailureCreateWithoutCriticalServiceDefinitionInput,
  ) {
    await this.getDefinitionOrThrow(criticalServiceDefinitionId);
    return this.prisma.singlePointOfFailure.create({
      data: {
        ...data,
        criticalServiceDefinition: { connect: { id: criticalServiceDefinitionId } },
      },
    });
  }

  async addRecoveryObjective(
    criticalServiceDefinitionId: string,
    data: Prisma.RecoveryObjectiveCreateWithoutCriticalServiceDefinitionInput,
  ) {
    await this.getDefinitionOrThrow(criticalServiceDefinitionId);
    return this.prisma.recoveryObjective.create({
      data: {
        ...data,
        criticalServiceDefinition: { connect: { id: criticalServiceDefinitionId } },
      },
    });
  }

  async getDefinitionOrThrow(id: string): Promise<CriticalServiceDefinition> {
    const definition = await this.prisma.criticalServiceDefinition.findUnique({ where: { id } });
    if (!definition) {
      throw new NotFoundException(`CriticalServiceDefinition ${id} not found`);
    }
    return definition;
  }
}
