import { Injectable, NotFoundException } from '@nestjs/common';
import { OperationalRoleRequirement, OperationalRoleRequirementStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ProductionReadinessBoundaryService } from '../common/production-readiness-boundary.service';

export interface CreateOperationalRoleRequirementInput {
  code: string;
  name: string;
  description?: string;
  institutionId: string;
  departmentId: string;
  functionAuthorityRecordId: string;
  appointmentRequired?: boolean;
  delegationRequired?: boolean;
  professionalQualificationReference?: string;
  trainingRequirementId?: string;
  requiresKnowledgeAssessment?: boolean;
  requiresPracticalAssessment?: boolean;
  requiresAuthorityBoundaryAssessment?: boolean;
  requiresSecurityPrivacyAssessment?: boolean;
  requiresContinuityAssessment?: boolean;
  supervisionRequired?: boolean;
  recertificationIntervalDays?: number;
  expirationPolicy?: string;
  alternateRequirementConfigured?: boolean;
  isHighConsequence?: boolean;
}

@Injectable()
export class OperationalRoleRequirementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
  ) {}

  async create(input: CreateOperationalRoleRequirementInput): Promise<OperationalRoleRequirement> {
    return this.prisma.operationalRoleRequirement.create({
      data: {
        ...input,
        status: OperationalRoleRequirementStatus.DRAFT,
      },
    });
  }

  async activate(id: string): Promise<OperationalRoleRequirement> {
    const requirement = await this.findById(id);
    return this.prisma.operationalRoleRequirement.update({
      where: { id: requirement.id },
      data: { status: OperationalRoleRequirementStatus.ACTIVE },
    });
  }

  async findById(id: string): Promise<OperationalRoleRequirement> {
    const requirement = await this.prisma.operationalRoleRequirement.findUnique({
      where: { id },
      include: { trainingRequirement: true },
    });

    if (!requirement) {
      throw new NotFoundException(`OperationalRoleRequirement ${id} not found`);
    }

    return requirement;
  }

  async findByCode(institutionId: string, code: string): Promise<OperationalRoleRequirement | null> {
    return this.prisma.operationalRoleRequirement.findUnique({
      where: { institutionId_code: { institutionId, code } },
    });
  }
}
