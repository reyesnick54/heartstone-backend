import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ComplaintAssignmentStatus, ComplaintStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ComplaintBoundaryService } from './complaint-boundary.service';

export interface ProposeComplaintAssignmentInput {
  complaintId: string;
  handlerIdentityId: string;
  handlerInstitutionId: string;
  handlerDepartmentId: string;
  competenceNotes?: string;
  conflictCheckPassed: boolean;
  conflictReason?: string;
  priorInvolvementDeclared: boolean;
  independenceRequired: boolean;
  independenceSatisfied: boolean;
  accessVerified: boolean;
}

@Injectable()
export class ComplaintAssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ComplaintBoundaryService,
  ) {}

  async propose(input: ProposeComplaintAssignmentInput) {
    const complaint = await this.prisma.complaint.findUnique({ where: { id: input.complaintId } });
    if (!complaint) {
      throw new NotFoundException(`Complaint ${input.complaintId} not found`);
    }

    if (complaint.responsibleInstitutionId !== input.handlerInstitutionId) {
      throw new BadRequestException('Handler institution must match complaint responsible institution');
    }

    if (complaint.responsibleDepartmentId !== input.handlerDepartmentId) {
      throw new BadRequestException('Handler department must match complaint responsible department');
    }

    const status =
      !input.conflictCheckPassed || input.priorInvolvementDeclared
        ? ComplaintAssignmentStatus.BLOCKED_CONFLICT
        : input.independenceRequired && !input.independenceSatisfied
          ? ComplaintAssignmentStatus.PROPOSED
          : ComplaintAssignmentStatus.PROPOSED;

    this.boundary.assertConflictedHandlerBlocked({
      conflictCheckPassed: input.conflictCheckPassed,
      priorInvolvementDeclared: input.priorInvolvementDeclared,
      status,
    });

    this.boundary.assertIndependenceRequirement({
      independenceRequired: input.independenceRequired,
      independenceSatisfied: input.independenceSatisfied,
      status,
    });

    this.boundary.assertAssignmentDoesNotCreateDecisionAuthority(true);

    return this.prisma.complaintAssignment.create({
      data: {
        complaintId: input.complaintId,
        handlerIdentityId: input.handlerIdentityId,
        handlerInstitutionId: input.handlerInstitutionId,
        handlerDepartmentId: input.handlerDepartmentId,
        competenceNotes: input.competenceNotes,
        conflictCheckPassed: input.conflictCheckPassed,
        conflictReason: input.conflictReason,
        priorInvolvementDeclared: input.priorInvolvementDeclared,
        independenceRequired: input.independenceRequired,
        independenceSatisfied: input.independenceSatisfied,
        accessVerified: input.accessVerified,
        doesNotAlterDecisionAuthority: true,
        status,
      },
    });
  }

  async activate(assignmentId: string) {
    const assignment = await this.prisma.complaintAssignment.findUnique({
      where: { id: assignmentId },
      include: { complaint: true },
    });

    if (!assignment) {
      throw new NotFoundException(`ComplaintAssignment ${assignmentId} not found`);
    }

    this.boundary.assertConflictedHandlerBlocked({
      conflictCheckPassed: assignment.conflictCheckPassed,
      priorInvolvementDeclared: assignment.priorInvolvementDeclared,
      status: ComplaintAssignmentStatus.ACTIVE,
    });

    this.boundary.assertIndependenceRequirement({
      independenceRequired: assignment.independenceRequired,
      independenceSatisfied: assignment.independenceSatisfied,
      status: ComplaintAssignmentStatus.ACTIVE,
    });

    if (!assignment.accessVerified) {
      throw new BadRequestException('Handler access must be verified before assignment activation');
    }

    this.boundary.assertAssignmentDoesNotCreateDecisionAuthority(assignment.doesNotAlterDecisionAuthority);

    const [updatedAssignment] = await this.prisma.$transaction([
      this.prisma.complaintAssignment.update({
        where: { id: assignmentId },
        data: {
          status: ComplaintAssignmentStatus.ACTIVE,
          assignedAt: new Date(),
        },
      }),
      this.prisma.complaint.update({
        where: { id: assignment.complaintId },
        data: { status: ComplaintStatus.ASSIGNED },
      }),
    ]);

    return updatedAssignment;
  }
}
