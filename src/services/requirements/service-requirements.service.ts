import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  GovernmentServiceVersionStatus,
  Prisma,
  ServiceRequirement,
  ServiceRequirementEffectiveState,
  ServiceRequirementMandatoryStatus,
  ServiceRequirementType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ServiceChecklistService } from '../checklist/service-checklist.service';

export interface CreateServiceRequirementInput {
  serviceVersionId: string;
  code: string;
  name: string;
  publicDescription?: string;
  requirementType: ServiceRequirementType;
  mandatoryStatus: ServiceRequirementMandatoryStatus;
  displayOrder?: number;
  sourceReference?: string;
  governingSourceId?: string;
  verificationRequired?: boolean;
  validityExpectationDays?: number;
  evidenceQualityExpectation?: ServiceRequirement['evidenceQualityExpectation'];
  applicabilityRuleId?: string;
  formDefinitionId?: string;
  formVersionId?: string;
  formFieldId?: string;
  declarationDefinitionId?: string;
  declarationDefinitionVersionId?: string;
  configuration?: Record<string, unknown>;
  effectiveFrom?: Date;
  effectiveUntil?: Date;
}

@Injectable()
export class ServiceRequirementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly checklist: ServiceChecklistService,
  ) {}

  async create(input: CreateServiceRequirementInput): Promise<ServiceRequirement> {
    const serviceVersion = await this.prisma.governmentServiceVersion.findUnique({
      where: { id: input.serviceVersionId },
    });

    if (!serviceVersion) {
      throw new NotFoundException(
        `Government service version "${input.serviceVersionId}" was not found`,
      );
    }

    this.checklist.assertPublishedVersionImmutable(serviceVersion.isImmutable, 'add requirements');

    if (
      input.requirementType === ServiceRequirementType.PROFESSIONAL_DOCUMENT &&
      input.formFieldId
    ) {
      throw new BadRequestException(
        'Professional document requirements cannot be satisfied by ordinary form field references',
      );
    }

    if (
      input.mandatoryStatus === ServiceRequirementMandatoryStatus.CONDITIONAL &&
      !input.applicabilityRuleId
    ) {
      throw new BadRequestException(
        'Conditional requirements must reference an applicability rule',
      );
    }

    try {
      return await this.prisma.serviceRequirement.create({
        data: {
          serviceVersionId: input.serviceVersionId,
          code: input.code,
          name: input.name,
          publicDescription: input.publicDescription,
          requirementType: input.requirementType,
          mandatoryStatus: input.mandatoryStatus,
          displayOrder: input.displayOrder ?? 0,
          effectiveState: ServiceRequirementEffectiveState.DRAFT,
          sourceReference: input.sourceReference,
          governingSourceId: input.governingSourceId,
          verificationRequired: input.verificationRequired ?? false,
          validityExpectationDays: input.validityExpectationDays,
          evidenceQualityExpectation: input.evidenceQualityExpectation,
          applicabilityRuleId: input.applicabilityRuleId,
          formDefinitionId: input.formDefinitionId,
          formVersionId: input.formVersionId,
          formFieldId: input.formFieldId,
          declarationDefinitionId: input.declarationDefinitionId,
          declarationDefinitionVersionId: input.declarationDefinitionVersionId,
          configuration: (input.configuration ?? {}) as Prisma.InputJsonValue,
          effectiveFrom: input.effectiveFrom,
          effectiveUntil: input.effectiveUntil,
        },
      });
    } catch (error) {
      this.handleUniqueConstraint(error, input.serviceVersionId, input.code);
    }
  }

  async activateRequirement(id: string): Promise<ServiceRequirement> {
    const requirement = await this.findOne(id);
    const serviceVersion = await this.prisma.governmentServiceVersion.findUnique({
      where: { id: requirement.serviceVersionId },
    });

    if (!serviceVersion) {
      throw new NotFoundException('Service version not found for requirement');
    }

    this.checklist.assertPublishedVersionImmutable(
      serviceVersion.isImmutable,
      'activate requirements',
    );

    return this.prisma.serviceRequirement.update({
      where: { id },
      data: { effectiveState: ServiceRequirementEffectiveState.ACTIVE },
    });
  }

  async findOne(id: string): Promise<ServiceRequirement> {
    const requirement = await this.prisma.serviceRequirement.findUnique({ where: { id } });

    if (!requirement) {
      throw new NotFoundException(`Service requirement "${id}" was not found`);
    }

    return requirement;
  }

  async listForServiceVersion(serviceVersionId: string): Promise<ServiceRequirement[]> {
    return this.prisma.serviceRequirement.findMany({
      where: { serviceVersionId },
      orderBy: [{ displayOrder: 'asc' }, { code: 'asc' }],
    });
  }

  async countActiveForPublishedVersion(serviceVersionId: string): Promise<number> {
    const serviceVersion = await this.prisma.governmentServiceVersion.findUnique({
      where: { id: serviceVersionId },
    });

    if (serviceVersion?.status !== GovernmentServiceVersionStatus.PUBLISHED) {
      return 0;
    }

    return this.prisma.serviceRequirement.count({
      where: {
        serviceVersionId,
        effectiveState: ServiceRequirementEffectiveState.ACTIVE,
      },
    });
  }

  private handleUniqueConstraint(error: unknown, serviceVersionId: string, code: string): never {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      throw new ConflictException(
        `Service requirement with code "${code}" already exists for service version "${serviceVersionId}"`,
      );
    }

    throw error;
  }
}
