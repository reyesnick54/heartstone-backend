import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CompetencyAssessmentOutcome,
  OperatorQualification,
  OperatorQualificationStatus,
  TrainingCompletionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ProductionReadinessBoundaryService } from '../common/production-readiness-boundary.service';
import { OperationalRoleRequirementService } from './operational-role-requirement.service';

export interface CreateOperatorQualificationInput {
  qualificationNumber: string;
  operatorReadinessProfileId: string;
  operationalRoleRequirementId: string;
  identityId: string;
  officeholderId?: string;
  appointmentId?: string;
  delegationId?: string;
  functionAuthorityRecordId: string;
  scope: string;
  assessmentAuthorityOfficeholderId?: string;
  isAiAssessed?: boolean;
}

export interface DetermineQualificationStatusInput {
  operatorQualificationId: string;
  proposedStatus: OperatorQualificationStatus;
  assessorIsAiActor?: boolean;
  isAttendanceOnly?: boolean;
}

@Injectable()
export class OperatorQualificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ProductionReadinessBoundaryService,
    private readonly roleRequirementService: OperationalRoleRequirementService,
  ) {}

  async create(input: CreateOperatorQualificationInput): Promise<OperatorQualification> {
    this.boundary.rejectClientQualificationFields(input as unknown as Record<string, unknown>);
    this.boundary.assertAiCannotQualifyOperator(input.isAiAssessed ?? false);

    const requirement = await this.roleRequirementService.findById(input.operationalRoleRequirementId);

    this.boundary.assertSystemRoleNotAppointment(
      Boolean(input.identityId),
      Boolean(input.appointmentId),
      requirement.appointmentRequired,
    );

    return this.prisma.operatorQualification.create({
      data: {
        ...input,
        status: OperatorQualificationStatus.NOT_QUALIFIED,
        isAiAssessed: false,
      },
    });
  }

  async determineQualificationStatus(
    input: DetermineQualificationStatusInput,
  ): Promise<OperatorQualification> {
    const qualification = await this.findById(input.operatorQualificationId);
    const requirement = await this.roleRequirementService.findById(
      qualification.operationalRoleRequirementId,
    );

    this.boundary.rejectClientQualificationFields({ status: input.proposedStatus });
    this.boundary.assertAiCannotQualifyOperator(input.assessorIsAiActor ?? false);
    this.boundary.assertAttendanceNotCompetence(
      input.isAttendanceOnly ?? false,
      input.proposedStatus,
    );

    const [
      competencyAssessments,
      practicalAssessments,
      trainingCompletions,
      authorityAssessments,
      securityAssessments,
      continuityAssessments,
    ] = await Promise.all([
      this.prisma.operatorCompetencyAssessment.findMany({
        where: { operatorQualificationId: qualification.id },
      }),
      this.prisma.practicalAssessment.findMany({
        where: { operatorQualificationId: qualification.id },
      }),
      this.prisma.trainingCompletion.findMany({
        where: { operatorQualificationId: qualification.id },
      }),
      this.prisma.authorityBoundaryAssessment.findMany({
        where: { operatorQualificationId: qualification.id },
      }),
      this.prisma.securityPrivacyAssessment.findMany({
        where: { operatorQualificationId: qualification.id },
      }),
      this.prisma.continuityCompetencyAssessment.findMany({
        where: { operatorQualificationId: qualification.id },
      }),
    ]);

    const hasPassedKnowledge = competencyAssessments.some(
      (a) =>
        a.outcome === CompetencyAssessmentOutcome.PASSED ||
        a.outcome === CompetencyAssessmentOutcome.PASSED_WITH_CONDITIONS,
    );
    const hasPassedPractical = practicalAssessments.some(
      (a) =>
        a.outcome === CompetencyAssessmentOutcome.PASSED ||
        a.outcome === CompetencyAssessmentOutcome.PASSED_WITH_CONDITIONS,
    );
    const hasCompletedTraining = trainingCompletions.some(
      (c) => c.status === TrainingCompletionStatus.COMPLETED && !c.isAttendanceOnly,
    );

    this.boundary.assertCourseCompletionNotQualification(
      hasCompletedTraining ? TrainingCompletionStatus.COMPLETED : TrainingCompletionStatus.ENROLLED,
      input.proposedStatus,
      hasPassedKnowledge,
      hasPassedPractical,
    );

    if (requirement.appointmentRequired && !qualification.appointmentId) {
      throw new BadRequestException('Appointment is required for this operational role');
    }

    if (requirement.delegationRequired && !qualification.delegationId) {
      throw new BadRequestException('Delegation is required for this operational role');
    }

    if (requirement.requiresKnowledgeAssessment && !hasPassedKnowledge) {
      throw new BadRequestException('Knowledge assessment must pass before qualification');
    }

    if (requirement.requiresPracticalAssessment && !hasPassedPractical) {
      throw new BadRequestException('Practical assessment must pass before qualification');
    }

    if (requirement.trainingRequirementId && !hasCompletedTraining) {
      throw new BadRequestException('Required training must be completed before qualification');
    }

    if (
      requirement.requiresAuthorityBoundaryAssessment &&
      !authorityAssessments.some((a) => a.outcome === CompetencyAssessmentOutcome.PASSED)
    ) {
      throw new BadRequestException('Authority-boundary assessment must pass before qualification');
    }

    if (
      requirement.requiresSecurityPrivacyAssessment &&
      !securityAssessments.some((a) => a.outcome === CompetencyAssessmentOutcome.PASSED)
    ) {
      throw new BadRequestException('Security/privacy assessment must pass before qualification');
    }

    if (
      requirement.requiresContinuityAssessment &&
      !continuityAssessments.some((a) => a.outcome === CompetencyAssessmentOutcome.PASSED)
    ) {
      throw new BadRequestException('Continuity assessment must pass before qualification');
    }

    const effectiveFrom = new Date();
    let effectiveUntil: Date | undefined;
    if (requirement.recertificationIntervalDays) {
      effectiveUntil = new Date(
        effectiveFrom.getTime() + requirement.recertificationIntervalDays * 24 * 60 * 60 * 1000,
      );
    }

    return this.prisma.operatorQualification.update({
      where: { id: qualification.id },
      data: {
        status: input.proposedStatus,
        effectiveFrom,
        effectiveUntil,
        isAiAssessed: false,
      },
    });
  }

  async suspend(id: string): Promise<OperatorQualification> {
    const qualification = await this.findById(id);
    return this.prisma.operatorQualification.update({
      where: { id: qualification.id },
      data: { status: OperatorQualificationStatus.SUSPENDED },
    });
  }

  async expire(id: string): Promise<OperatorQualification> {
    const qualification = await this.findById(id);
    return this.prisma.operatorQualification.update({
      where: { id: qualification.id },
      data: {
        status: OperatorQualificationStatus.EXPIRED,
        effectiveUntil: new Date(),
      },
    });
  }

  async findById(id: string): Promise<OperatorQualification> {
    const qualification = await this.prisma.operatorQualification.findUnique({
      where: { id },
      include: {
        operationalRoleRequirement: true,
        trainingCompletions: true,
      },
    });

    if (!qualification) {
      throw new NotFoundException(`OperatorQualification ${id} not found`);
    }

    return qualification;
  }
}
