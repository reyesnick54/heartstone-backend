import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ComplianceCorrectiveActionRegisterStatus } from '@prisma/client';

import { generateReferenceNumber } from '../../application-processing/common/reference-number.util';
import { PrismaService } from '../../database/prisma.service';
import { S16_BOUNDARY_DISCLAIMERS } from '../../operational-lifecycle/operational-lifecycle.constants';

@Injectable()
export class ComplianceCorrectiveActionBoundaryService {
  assertCorrectiveActionIsNotEnforcement(): string {
    return S16_BOUNDARY_DISCLAIMERS.correctiveActionNotEnforcement;
  }

  assertClosureRequiresEvidence(input: {
    remediationEvidenceRecordIds: string[];
    verificationEvidenceRecordIds: string[];
    verifiedAt: Date | null | undefined;
  }): void {
    if (input.remediationEvidenceRecordIds.length === 0) {
      throw new BadRequestException('Corrective action closure requires remediation evidence');
    }
    if (input.verificationEvidenceRecordIds.length === 0 || !input.verifiedAt) {
      throw new BadRequestException(
        'Corrective action closure requires authorized verification with evidence',
      );
    }
  }

  assertReviewerAuthorized(input: {
    actorOfficeholderId?: string | null;
    reviewerOfficeholderId?: string | null;
    actorIdentityId: string;
    reviewerIdentityId?: string | null;
  }): void {
    const isAssignedReviewer =
      input.reviewerOfficeholderId &&
      input.actorOfficeholderId &&
      input.reviewerOfficeholderId === input.actorOfficeholderId;
    const isAssignedReviewerIdentity =
      input.reviewerIdentityId && input.reviewerIdentityId === input.actorIdentityId;

    if (!isAssignedReviewer && !isAssignedReviewerIdentity) {
      throw new ForbiddenException(
        'Only the assigned reviewer may verify and close corrective action',
      );
    }
  }
}

export interface OpenComplianceCorrectiveActionInput {
  complianceMatterId?: string;
  inspectionRecordId?: string;
  originatingFindingReference?: string;
  responsibleIdentityId?: string;
  responsibleOrganizationId?: string;
  requiredAction: string;
  dueDate: Date;
  reviewerOfficeholderId?: string;
  reviewerIdentityId?: string;
  createdByIdentityId: string;
}

@Injectable()
export class ComplianceCorrectiveActionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ComplianceCorrectiveActionBoundaryService,
  ) {}

  async open(input: OpenComplianceCorrectiveActionInput) {
    if (!input.complianceMatterId && !input.inspectionRecordId) {
      throw new BadRequestException(
        'Corrective action must reference an originating inspection or compliance matter',
      );
    }

    return this.prisma.complianceCorrectiveActionRegister.create({
      data: {
        correctiveActionReference: generateReferenceNumber('CCA'),
        complianceMatterId: input.complianceMatterId,
        inspectionRecordId: input.inspectionRecordId,
        originatingFindingReference: input.originatingFindingReference,
        responsibleIdentityId: input.responsibleIdentityId,
        responsibleOrganizationId: input.responsibleOrganizationId,
        requiredAction: input.requiredAction,
        dueDate: input.dueDate,
        reviewerOfficeholderId: input.reviewerOfficeholderId,
        reviewerIdentityId: input.reviewerIdentityId,
        createdByIdentityId: input.createdByIdentityId,
        status: ComplianceCorrectiveActionRegisterStatus.OPEN,
      },
    });
  }

  async submitRemediation(input: {
    correctiveActionId: string;
    remediationEvidenceRecordIds: string[];
  }) {
    const action = await this.getOrThrow(input.correctiveActionId);
    if (input.remediationEvidenceRecordIds.length === 0) {
      throw new BadRequestException('Remediation submission requires evidence');
    }

    return this.prisma.complianceCorrectiveActionRegister.update({
      where: { id: action.id },
      data: {
        remediationEvidenceRecordIds: input.remediationEvidenceRecordIds,
        status: ComplianceCorrectiveActionRegisterStatus.REMEDIATION_SUBMITTED,
      },
    });
  }

  async verifyAndClose(input: {
    correctiveActionId: string;
    actorIdentityId: string;
    actorOfficeholderId?: string;
    verificationEvidenceRecordIds: string[];
  }) {
    const action = await this.getOrThrow(input.correctiveActionId);

    this.boundary.assertReviewerAuthorized({
      actorIdentityId: input.actorIdentityId,
      actorOfficeholderId: input.actorOfficeholderId,
      reviewerOfficeholderId: action.reviewerOfficeholderId,
      reviewerIdentityId: action.reviewerIdentityId,
    });

    const verifiedAt = new Date();
    this.boundary.assertClosureRequiresEvidence({
      remediationEvidenceRecordIds: action.remediationEvidenceRecordIds,
      verificationEvidenceRecordIds: input.verificationEvidenceRecordIds,
      verifiedAt,
    });

    return this.prisma.complianceCorrectiveActionRegister.update({
      where: { id: action.id },
      data: {
        verificationEvidenceRecordIds: input.verificationEvidenceRecordIds,
        verifiedAt,
        status: ComplianceCorrectiveActionRegisterStatus.CLOSED,
        closedAt: verifiedAt,
      },
    });
  }

  enforcementBoundaryDisclaimer(): string {
    return this.boundary.assertCorrectiveActionIsNotEnforcement();
  }

  private async getOrThrow(id: string) {
    const action = await this.prisma.complianceCorrectiveActionRegister.findUnique({
      where: { id },
    });
    if (!action) {
      throw new NotFoundException(`Corrective action ${id} not found`);
    }
    return action;
  }
}
