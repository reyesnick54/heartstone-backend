import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthorityEvaluationOutcome,
  IdentityType,
  InspectionAssignmentStatus,
  InspectorIndependenceStatus,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import { isAppointmentCurrent } from '../../government/common/appointment-current.util';
import { INSPECTION_COMPLIANCE_REASON_CODES } from '../compliance.constants';
import { InspectionPlanningBoundaryService } from './inspection-planning-boundary.service';

export interface AssignInspectorInput {
  inspectionPlanId: string;
  inspectorIdentityId: string;
  officeholderId: string;
  appointmentId: string;
  scope: string;
  jurisdictionId: string;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  conflictDeclaration?: string;
  independenceStatus?: InspectorIndependenceStatus;
  leadInspector?: boolean;
  assignerIdentityId: string;
  assignerIdentityType: IdentityType;
  assignerOfficeholderId?: string;
}

export interface AuthorizeInspectionActionInput {
  inspectionPlanId: string;
  inspectorIdentityId: string;
  inspectorOfficeholderId: string;
  evidenceProvided?: string[];
}

@Injectable()
export class InspectionAssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: InspectionPlanningBoundaryService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
  ) {}

  async assignInspector(input: AssignInspectorInput) {
    this.boundary.assertAssignmentDoesNotCreateAuthority();
    this.boundary.assertAiCannotOrderInspection(input.assignerIdentityType);
    this.boundary.assertTechnicalAdminCannotSelfAssignSovereignAuthority(
      input.assignerIdentityType,
      input.assignerOfficeholderId,
      input.officeholderId,
    );

    const plan = await this.prisma.inspectionPlan.findUnique({
      where: { id: input.inspectionPlanId },
      include: { inspectionTypeDefinition: true },
    });

    if (!plan) {
      throw new NotFoundException('Inspection plan not found');
    }

    this.boundary.assertJurisdictionMatches(plan.jurisdictionId, input.jurisdictionId);
    this.boundary.assertScopeNotSilentlyExpanded(plan.scope, input.scope);

    const independenceStatus = input.independenceStatus ?? InspectorIndependenceStatus.INDEPENDENT;
    this.boundary.assertInspectorNotConflicted(independenceStatus);

    const appointment = await this.prisma.appointment.findUnique({
      where: { id: input.appointmentId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (!isAppointmentCurrent(appointment, input.effectiveFrom)) {
      throw new BadRequestException(INSPECTION_COMPLIANCE_REASON_CODES.EXPIRED_APPOINTMENT);
    }

    if (appointment.officeholderId !== input.officeholderId) {
      throw new BadRequestException('Appointment does not match officeholder');
    }

    const status =
      independenceStatus === InspectorIndependenceStatus.DECLARED_CONFLICT
        ? InspectionAssignmentStatus.CONFLICT_BLOCKED
        : InspectionAssignmentStatus.ACTIVE;

    return this.prisma.inspectionAssignment.create({
      data: {
        inspectionPlanId: input.inspectionPlanId,
        inspectorIdentityId: input.inspectorIdentityId,
        officeholderId: input.officeholderId,
        appointmentId: input.appointmentId,
        scope: input.scope,
        jurisdictionId: input.jurisdictionId,
        effectiveFrom: input.effectiveFrom,
        effectiveUntil: input.effectiveUntil,
        conflictDeclaration: input.conflictDeclaration,
        independenceStatus,
        leadInspector: input.leadInspector ?? false,
        status,
      },
    });
  }

  async authorizeInspectionAction(input: AuthorizeInspectionActionInput) {
    const plan = await this.prisma.inspectionPlan.findUnique({
      where: { id: input.inspectionPlanId },
      include: { inspectionTypeDefinition: true },
    });

    if (!plan) {
      throw new NotFoundException('Inspection plan not found');
    }

    const evaluation = await this.authorityEvaluation.evaluate({
      identityId: input.inspectorIdentityId,
      officeholderId: input.inspectorOfficeholderId,
      functionAuthorityRecordId: plan.functionAuthorityRecordId,
      action: plan.inspectionTypeDefinition.requiredAuthorityAction,
      evidenceProvided: input.evidenceProvided,
    });

    if (evaluation.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException(
        'Consequential inspection action requires explicit INSPECT authority evaluation; assignment is insufficient',
      );
    }

    return evaluation;
  }

  assignmentCreatesAuthority(): boolean {
    return false;
  }
}
