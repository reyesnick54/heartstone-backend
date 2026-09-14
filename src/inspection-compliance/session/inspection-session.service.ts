import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthorityActionType,
  AuthorityEvaluationOutcome,
  CaseAssignmentStatus,
  InspectionSessionStatus,
  InspectionStatus,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { PrismaService } from '../../database/prisma.service';
import { InspectionComplianceBoundaryService } from '../boundary/inspection-compliance-boundary.service';
import { INSPECTOR_OUTSIDE_AUTHORITY_MESSAGE } from '../inspection-compliance.constants';

export interface StartInspectionSessionInput {
  inspectionRecordId: string;
  inspectorIdentityId: string;
  inspectorOfficeholderId: string;
  caseAssignmentId?: string;
  jurisdictionId?: string;
  functionAuthorityRecordId: string;
  scopeVerified: boolean;
  locationVerified: boolean;
  qualificationVerified: boolean;
  independenceVerified: boolean;
  conflictOfInterestDeclared?: boolean;
  conflictOfInterestNotes?: string;
}

export interface ApproveScopeAmendmentInput {
  sessionId: string;
  approverIdentityId: string;
  approverOfficeholderId: string;
  amendedScope: string;
  amendmentNotes?: string;
}

@Injectable()
export class InspectionSessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorityEvaluation: AuthorityEvaluationService,
    private readonly boundary: InspectionComplianceBoundaryService,
  ) {}

  async ensureSessionForInspection(inspectionRecordId: string) {
    const existing = await this.prisma.inspectionSession.findUnique({
      where: { inspectionRecordId },
    });
    if (existing) {
      return existing;
    }

    return this.prisma.inspectionSession.create({
      data: { inspectionRecordId },
    });
  }

  async startSession(input: StartInspectionSessionInput) {
    const inspection = await this.prisma.inspectionRecord.findUnique({
      where: { id: input.inspectionRecordId },
      include: { inspectors: true, session: true },
    });

    if (!inspection) {
      throw new NotFoundException('Inspection record not found');
    }

    if (inspection.status === InspectionStatus.COMPLETED || inspection.status === InspectionStatus.CANCELLED) {
      throw new BadRequestException('Cannot start session for a completed or cancelled inspection');
    }

    const isAssignedInspector = inspection.inspectors.some(
      (inspector) =>
        inspector.identityId === input.inspectorIdentityId &&
        inspector.officeholderId === input.inspectorOfficeholderId,
    );
    if (!isAssignedInspector) {
      throw new ForbiddenException('Inspector must be assigned to the inspection record');
    }

    if (input.caseAssignmentId) {
      const assignment = await this.prisma.caseAssignment.findUnique({
        where: { id: input.caseAssignmentId },
      });
      if (!assignment || assignment.caseId !== inspection.caseId) {
        throw new BadRequestException('Case assignment does not match inspection case');
      }
      if (assignment.status !== CaseAssignmentStatus.ACTIVE) {
        throw new BadRequestException('Inspector case assignment is not active');
      }
      if (assignment.assigneeIdentityId !== input.inspectorIdentityId) {
        throw new ForbiddenException('Case assignment identity does not match inspector');
      }
    }

    if (!input.scopeVerified || !input.locationVerified || !input.qualificationVerified || !input.independenceVerified) {
      throw new BadRequestException(
        'Scope, location, qualification, and independence must be verified before session start',
      );
    }

    const evaluation = await this.authorityEvaluation.evaluate({
      identityId: input.inspectorIdentityId,
      officeholderId: input.inspectorOfficeholderId,
      functionAuthorityRecordId: input.functionAuthorityRecordId,
      action: AuthorityActionType.INSPECT,
    });

    if (evaluation.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException(INSPECTOR_OUTSIDE_AUTHORITY_MESSAGE);
    }

    const actualStartAt = new Date();

    const session = inspection.session
      ? await this.prisma.inspectionSession.update({
          where: { id: inspection.session.id },
          data: {
            caseAssignmentId: input.caseAssignmentId,
            jurisdictionId: input.jurisdictionId,
            actualStartAt,
            startAuthorityEvaluationRecordId: evaluation.evaluationId,
            scopeVerified: input.scopeVerified,
            locationVerified: input.locationVerified,
            qualificationVerified: input.qualificationVerified,
            independenceVerified: input.independenceVerified,
            conflictOfInterestDeclared: input.conflictOfInterestDeclared,
            conflictOfInterestNotes: input.conflictOfInterestNotes,
            status: InspectionSessionStatus.IN_PROGRESS,
          },
        })
      : await this.prisma.inspectionSession.create({
          data: {
            inspectionRecordId: input.inspectionRecordId,
            caseAssignmentId: input.caseAssignmentId,
            jurisdictionId: input.jurisdictionId,
            actualStartAt,
            startAuthorityEvaluationRecordId: evaluation.evaluationId,
            scopeVerified: input.scopeVerified,
            locationVerified: input.locationVerified,
            qualificationVerified: input.qualificationVerified,
            independenceVerified: input.independenceVerified,
            conflictOfInterestDeclared: input.conflictOfInterestDeclared,
            conflictOfInterestNotes: input.conflictOfInterestNotes,
            status: InspectionSessionStatus.IN_PROGRESS,
          },
        });

    await this.prisma.inspectionRecord.update({
      where: { id: input.inspectionRecordId },
      data: {
        status: InspectionStatus.IN_PROGRESS,
        functionAuthorityRecordId: input.functionAuthorityRecordId,
      },
    });

    return session;
  }

  async requestScopeAmendment(sessionId: string, amendmentNotes: string, requestedScope: string) {
    const session = await this.getSessionWithInspection(sessionId);
    if (requestedScope.trim() === session.inspectionRecord.scope.trim()) {
      throw new BadRequestException('Requested scope must differ from the current authorized scope');
    }

    return this.prisma.inspectionSession.update({
      where: { id: sessionId },
      data: {
        scopeAmendmentRequired: true,
        scopeAmendmentNotes: amendmentNotes,
        amendedScope: requestedScope,
      },
    });
  }

  async approveScopeAmendment(input: ApproveScopeAmendmentInput) {
    const session = await this.getSessionWithInspection(input.sessionId);
    if (!session.scopeAmendmentRequired || !session.amendedScope) {
      throw new BadRequestException('No pending scope amendment for this session');
    }

    await this.prisma.$transaction([
      this.prisma.inspectionSession.update({
        where: { id: input.sessionId },
        data: {
          scopeAmendmentApprovedAt: new Date(),
          scopeAmendmentApprovedByIdentityId: input.approverIdentityId,
          scopeAmendmentApprovedByOfficeholderId: input.approverOfficeholderId,
          scopeAmendmentRequired: false,
          scopeAmendmentNotes: input.amendmentNotes ?? session.scopeAmendmentNotes,
        },
      }),
      this.prisma.inspectionRecord.update({
        where: { id: session.inspectionRecordId },
        data: { scope: input.amendedScope },
      }),
    ]);

    return this.prisma.inspectionSession.findUnique({ where: { id: input.sessionId } });
  }

  private async getSessionWithInspection(sessionId: string) {
    const session = await this.prisma.inspectionSession.findUnique({
      where: { id: sessionId },
      include: { inspectionRecord: true },
    });
    if (!session) {
      throw new NotFoundException('Inspection session not found');
    }
    return session;
  }
}
