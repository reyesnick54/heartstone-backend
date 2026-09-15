import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  OnCallAssignment,
  OnCallAssignmentStatus,
  SuccessionAssignment,
  SuccessionAssignmentStatus,
  SupportAssignment,
  SupportCoveragePlan,
  SupportCoveragePlanStatus,
  SupportTier,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ProductionReadinessBoundaryService } from '../common/production-readiness-boundary.service';

export interface CreateSupportCoveragePlanInput {
  planCode: string;
  name: string;
  institutionId: string;
  departmentId?: string;
  serviceHours?: string;
  supportTiers?: Prisma.InputJsonValue;
  incidentContacts?: Prisma.InputJsonValue;
  securityEscalationContacts?: Prisma.InputJsonValue;
  recordsEscalationContacts?: Prisma.InputJsonValue;
  integrationSupportContacts?: Prisma.InputJsonValue;
  paymentSupportContacts?: Prisma.InputJsonValue;
  aiEscalationContacts?: Prisma.InputJsonValue;
  continuityResponseContacts?: Prisma.InputJsonValue;
  vendorContacts?: Prisma.InputJsonValue;
}

export interface AssignSupportInput {
  supportCoveragePlanId: string;
  identityId: string;
  officeholderId?: string;
  supportTier: SupportTier;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  isNamedOwner?: boolean;
  isOperationalCoverage?: boolean;
}

export interface AssignOnCallInput {
  supportCoveragePlanId: string;
  primaryIdentityId: string;
  primaryOfficeholderId?: string;
  alternateIdentityId?: string;
  alternateOfficeholderId?: string;
  coverageStart: Date;
  coverageEnd: Date;
  restrictedContactRef?: string;
}

export interface AssignSuccessionInput {
  operationalRoleRequirementId: string;
  primaryOfficeholderId: string;
  alternateOfficeholderId: string;
  alternateAppointmentRequired?: boolean;
  alternateDelegationRequired?: boolean;
  alternateQualificationRequired?: boolean;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  notes?: string;
}

@Injectable()
export class SupportCoverageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
  ) {}

  async createPlan(input: CreateSupportCoveragePlanInput): Promise<SupportCoveragePlan> {
    this.boundary.rejectClientSupportFields(input as unknown as Record<string, unknown>);

    return this.prisma.supportCoveragePlan.create({
      data: {
        planCode: input.planCode,
        name: input.name,
        institutionId: input.institutionId,
        departmentId: input.departmentId,
        serviceHours: input.serviceHours,
        supportTiers: input.supportTiers ?? [],
        incidentContacts: input.incidentContacts ?? [],
        securityEscalationContacts: input.securityEscalationContacts ?? [],
        recordsEscalationContacts: input.recordsEscalationContacts ?? [],
        integrationSupportContacts: input.integrationSupportContacts ?? [],
        paymentSupportContacts: input.paymentSupportContacts ?? [],
        aiEscalationContacts: input.aiEscalationContacts ?? [],
        continuityResponseContacts: input.continuityResponseContacts ?? [],
        vendorContacts: input.vendorContacts ?? [],
        isTwentyFourSeven: false,
        contactsRestricted: true,
        status: SupportCoveragePlanStatus.DRAFT,
      },
    });
  }

  async activatePlan(id: string): Promise<SupportCoveragePlan> {
    const plan = await this.findPlanById(id);
    return this.prisma.supportCoveragePlan.update({
      where: { id: plan.id },
      data: { status: SupportCoveragePlanStatus.ACTIVE },
    });
  }

  async assignSupport(input: AssignSupportInput): Promise<SupportAssignment> {
    this.boundary.assertNamedOwnerNotCoverage(
      input.isNamedOwner ?? false,
      input.isOperationalCoverage ?? true,
    );

    await this.findPlanById(input.supportCoveragePlanId);

    return this.prisma.supportAssignment.create({
      data: {
        supportCoveragePlanId: input.supportCoveragePlanId,
        identityId: input.identityId,
        officeholderId: input.officeholderId,
        supportTier: input.supportTier,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil,
        isNamedOwner: input.isNamedOwner ?? false,
        isOperationalCoverage: input.isOperationalCoverage ?? true,
      },
    });
  }

  async assignOnCall(input: AssignOnCallInput): Promise<OnCallAssignment> {
    await this.findPlanById(input.supportCoveragePlanId);

    return this.prisma.onCallAssignment.create({
      data: {
        supportCoveragePlanId: input.supportCoveragePlanId,
        primaryIdentityId: input.primaryIdentityId,
        primaryOfficeholderId: input.primaryOfficeholderId,
        alternateIdentityId: input.alternateIdentityId,
        alternateOfficeholderId: input.alternateOfficeholderId,
        coverageStart: input.coverageStart,
        coverageEnd: input.coverageEnd,
        contactDataRestricted: true,
        restrictedContactRef: input.restrictedContactRef,
        status: OnCallAssignmentStatus.SCHEDULED,
      },
    });
  }

  async assignSuccession(input: AssignSuccessionInput): Promise<SuccessionAssignment> {
    const requirement = await this.prisma.operationalRoleRequirement.findUnique({
      where: { id: input.operationalRoleRequirementId },
    });

    if (!requirement) {
      throw new NotFoundException(
        `OperationalRoleRequirement ${input.operationalRoleRequirementId} not found`,
      );
    }

    if (
      requirement.alternateRequirementConfigured &&
      input.primaryOfficeholderId === input.alternateOfficeholderId
    ) {
      throw new BadRequestException('Primary and alternate officeholder must be distinct');
    }

    return this.prisma.successionAssignment.create({
      data: {
        operationalRoleRequirementId: input.operationalRoleRequirementId,
        primaryOfficeholderId: input.primaryOfficeholderId,
        alternateOfficeholderId: input.alternateOfficeholderId,
        alternateAppointmentRequired:
          input.alternateAppointmentRequired ?? requirement.appointmentRequired,
        alternateDelegationRequired:
          input.alternateDelegationRequired ?? requirement.delegationRequired,
        alternateQualificationRequired: input.alternateQualificationRequired ?? true,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil,
        notes: input.notes,
        status: SuccessionAssignmentStatus.DESIGNATED,
      },
    });
  }

  async assertAlternateAuthority(
    successionId: string,
    hasValidAppointment: boolean,
    hasValidDelegation: boolean,
  ): Promise<void> {
    const succession = await this.prisma.successionAssignment.findUnique({
      where: { id: successionId },
    });

    if (!succession) {
      throw new NotFoundException(`SuccessionAssignment ${successionId} not found`);
    }

    this.boundary.assertAlternateCannotAssumeOffice(
      true,
      hasValidAppointment,
      hasValidDelegation,
      succession.alternateAppointmentRequired,
      succession.alternateDelegationRequired,
    );
  }

  async detectCoverageGap(planId: string, at: Date = new Date()): Promise<boolean> {
    const plan = await this.findPlanById(planId);

    const activeAssignments = await this.prisma.supportAssignment.findMany({
      where: {
        supportCoveragePlanId: plan.id,
        effectiveFrom: { lte: at },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: at } }],
        isOperationalCoverage: true,
      },
    });

    const activeOnCall = await this.prisma.onCallAssignment.findMany({
      where: {
        supportCoveragePlanId: plan.id,
        coverageStart: { lte: at },
        coverageEnd: { gte: at },
        status: { in: [OnCallAssignmentStatus.SCHEDULED, OnCallAssignmentStatus.ACTIVE] },
      },
    });

    return activeAssignments.length === 0 && activeOnCall.length === 0;
  }

  async getPlanContacts(planId: string, includeRestricted = false): Promise<Record<string, unknown>> {
    const plan = await this.findPlanById(planId);

    if (plan.contactsRestricted && !includeRestricted) {
      return {
        planId: plan.id,
        contactsRestricted: true,
        serviceHours: plan.serviceHours,
        isTwentyFourSeven: plan.isTwentyFourSeven,
        supportTiers: plan.supportTiers,
        message: 'Personal contact data is restricted; use restricted contact references',
      };
    }

    return {
      planId: plan.id,
      serviceHours: plan.serviceHours,
      isTwentyFourSeven: plan.isTwentyFourSeven,
      supportTiers: plan.supportTiers,
      incidentContacts: plan.incidentContacts,
      securityEscalationContacts: plan.securityEscalationContacts,
      recordsEscalationContacts: plan.recordsEscalationContacts,
      integrationSupportContacts: plan.integrationSupportContacts,
      paymentSupportContacts: plan.paymentSupportContacts,
      aiEscalationContacts: plan.aiEscalationContacts,
      continuityResponseContacts: plan.continuityResponseContacts,
      vendorContacts: plan.vendorContacts,
    };
  }

  private async findPlanById(id: string): Promise<SupportCoveragePlan> {
    const plan = await this.prisma.supportCoveragePlan.findUnique({ where: { id } });

    if (!plan) {
      throw new NotFoundException(`SupportCoveragePlan ${id} not found`);
    }

    return plan;
  }
}
