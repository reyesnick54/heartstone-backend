import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ComplaintCategory,
  ComplaintPathwayActor,
  ComplaintPathwayScope,
  ComplaintSafeguardType,
  ComplaintStatus,
  RedressRelatedMatterType,
  SubstantiveAppealStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { COMPLAINT_NUMBER_PREFIX } from '../redress.constants';
import { ComplaintBoundaryService } from './complaint-boundary.service';

export interface LodgeComplaintInput {
  masterAdministrativeFileId: string;
  complainantIdentityId: string;
  responsibleInstitutionId: string;
  responsibleDepartmentId: string;
  subjectSummary: string;
  caseId?: string;
  governmentDecisionId?: string;
  category: ComplaintCategory;
  classificationNotes?: string;
}

export interface LinkRelatedAppealInput {
  complaintId: string;
  substantiveAppealId: string;
  linkageNotes: string;
  pathwayScope: ComplaintPathwayScope;
  ComplaintClassificationType,
  ComplaintClosureReason,
  ComplaintInvestigationStatus,
  RedressMatterStatus,
  RedressRouteCategory,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RedressBoundaryService } from '../common/redress-boundary.service';
import { RedressSafeHaltService } from '../common/redress-safe-halt.service';
import { APPEAL_ROUTE_CATEGORIES } from '../redress.constants';

export interface ClassifyComplaintInput {
  matterId: string;
  classificationType: ComplaintClassificationType;
  classifiedByIdentityId?: string;
  classifiedByOfficeholderId?: string;
  requestedRouteCategory?: RedressRouteCategory;
  explanation?: string;
}

export interface StartInvestigationInput {
  matterId: string;
  classificationId: string;
  investigatorIdentityId?: string;
  investigatorOfficeholderId?: string;
}

export interface RecordServiceRemedyInput {
  investigationId: string;
  actionSummary: string;
}

export interface CloseComplaintInput {
  investigationId: string;
  reason: ComplaintClosureReason;
}

@Injectable()
export class ComplaintService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ComplaintBoundaryService,
  ) {}

  async lodge(input: LodgeComplaintInput) {
    this.boundary.assertComplaintDistinctFromAppeal('COMPLAINT');
    this.boundary.rejectClientProtectedComplaintFields(input as unknown as Record<string, unknown>);

    const complaintNumber = `${COMPLAINT_NUMBER_PREFIX}-${String(Date.now())}`;

    return this.prisma.complaint.create({
      data: {
        complaintNumber,
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        caseId: input.caseId,
        governmentDecisionId: input.governmentDecisionId,
        complainantIdentityId: input.complainantIdentityId,
        responsibleInstitutionId: input.responsibleInstitutionId,
        responsibleDepartmentId: input.responsibleDepartmentId,
        subjectSummary: input.subjectSummary,
        status: ComplaintStatus.RECEIVED,
        classifications: {
          create: {
            category: input.category,
            classificationNotes: input.classificationNotes,
            isFactualFinding: false,
            classifiedByActor: ComplaintPathwayActor.COMPLAINANT,
          },
        },
      },
      include: {
        classifications: true,
      },
    });
  }

  async acknowledge(complaintId: string) {
    const complaint = await this.requireComplaint(complaintId);

    if (complaint.status === ComplaintStatus.CLOSED) {
      throw new BadRequestException('Closed complaint cannot be acknowledged');
    }

    return this.prisma.complaint.update({
      where: { id: complaintId },
      data: {
        status: ComplaintStatus.ACKNOWLEDGED,
        acknowledgedAt: new Date(),
      },
    });
  }

  async addClassification(input: {
    complaintId: string;
    category: ComplaintCategory;
    classificationNotes?: string;
    actor: ComplaintPathwayActor;
  }) {
    this.boundary.assertClassificationIsNotFactualFinding(false);

    await this.requireComplaint(input.complaintId);

    return this.prisma.complaintClassification.create({
      data: {
        complaintId: input.complaintId,
        category: input.category,
        classificationNotes: input.classificationNotes,
        isFactualFinding: false,
        classifiedByActor: input.actor,
      },
    });
  }

  async applySafeguard(input: {
    complaintId: string;
    safeguardType: ComplaintSafeguardType;
    configurationNotes?: string;
    actor: ComplaintPathwayActor;
  }) {
    this.boundary.assertWhistleblowerStatusNotClaimed(input.configurationNotes);
    await this.requireComplaint(input.complaintId);

    return this.prisma.complaintSafeguard.create({
      data: {
        complaintId: input.complaintId,
        safeguardType: input.safeguardType,
        configurationNotes: input.configurationNotes,
        appliedByActor: input.actor,
      },
    });
  }

  async recordRetaliationAllegation(input: {
    complaintId: string;
    allegationSummary: string;
    actor: ComplaintPathwayActor;
  }) {
    this.boundary.assertRetaliationPreservedSeparately(false);
    await this.requireComplaint(input.complaintId);

    return this.prisma.complaintRetaliationAllegation.create({
      data: {
        complaintId: input.complaintId,
        allegationSummary: input.allegationSummary,
        preservedSeparately: true,
        affectsRiskScore: false,
        recordedByActor: input.actor,
      },
    });
  }

  async linkRelatedAppeal(input: LinkRelatedAppealInput) {
    const complaint = await this.requireComplaint(input.complaintId);
    const appeal = await this.prisma.substantiveAppeal.findUnique({
      where: { id: input.substantiveAppealId },
    });

    if (!appeal) {
      throw new NotFoundException(`SubstantiveAppeal ${input.substantiveAppealId} not found`);
    }

    this.boundary.assertComplaintNotAutoDismissedBecauseAppealOpen({
      complaintStatus: complaint.status,
      relatedAppealStatus: appeal.status,
    });

    return this.prisma.complaintRelatedMatter.create({
      data: {
        complaintId: input.complaintId,
        relatedMatterType: RedressRelatedMatterType.SUBSTANTIVE_APPEAL,
        substantiveAppealId: input.substantiveAppealId,
        pathwayScope: input.pathwayScope,
        linkageNotes: input.linkageNotes,
        doesNotAutoClose: true,
      },
    });
  }

  async assertParallelAppealDoesNotCloseComplaint(complaintId: string) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
      include: {
        relatedMatters: {
          include: { substantiveAppeal: true },
        },
      },
    });

    if (!complaint) {
      throw new NotFoundException(`Complaint ${complaintId} not found`);
    }

    const openAppeal = complaint.relatedMatters.find(
      (matter) =>
        matter.substantiveAppeal &&
        matter.substantiveAppeal.status !== SubstantiveAppealStatus.CLOSED &&
        matter.substantiveAppeal.status !== SubstantiveAppealStatus.WITHDRAWN &&
        matter.substantiveAppeal.status !== SubstantiveAppealStatus.DECIDED,
    );

    if (openAppeal && complaint.status === ComplaintStatus.CLOSED) {
      this.boundary.assertComplaintNotAutoDismissedBecauseAppealOpen({
        complaintStatus: complaint.status,
        relatedAppealStatus: openAppeal.substantiveAppeal?.status,
      });
    }

    return {
      complaintId: complaint.id,
      complaintStatus: complaint.status,
      parallelAppealOpen: Boolean(openAppeal),
      pathwayScopeNotes: complaint.pathwayScopeNotes,
    };
  }

  async findById(complaintId: string) {
    return this.requireComplaint(complaintId, {
      classifications: true,
      safeguards: true,
      assignments: true,
      investigations: true,
      findings: true,
      responses: true,
      correctiveActions: true,
      escalations: true,
      closure: true,
      retaliationAllegations: true,
      relatedMatters: { include: { substantiveAppeal: true } },
    });
  }

  private async requireComplaint(complaintId: string, include?: object) {
    const complaint = await this.prisma.complaint.findUnique({
      where: { id: complaintId },
      include,
    });

    if (!complaint) {
      throw new NotFoundException(`Complaint ${complaintId} not found`);
    }

    return complaint;
    private readonly boundary: RedressBoundaryService,
    private readonly safeHalt: RedressSafeHaltService,
  ) {}

  async classifyComplaint(input: ClassifyComplaintInput) {
    await this.safeHalt.assertMatterNotSafeHalted(input.matterId, 'complaint classification');

    if (input.requestedRouteCategory) {
      if (APPEAL_ROUTE_CATEGORIES.includes(input.requestedRouteCategory)) {
        throw new BadRequestException('Complaint does not equal appeal');
      }
    }

    const isAppealMislabel =
      input.requestedRouteCategory != null &&
      APPEAL_ROUTE_CATEGORIES.includes(input.requestedRouteCategory);

    const classification = await this.prisma.complaintClassification.create({
      data: {
        matterId: input.matterId,
        classificationType: input.classificationType,
        classifiedByIdentityId: input.classifiedByIdentityId,
        classifiedByOfficeholderId: input.classifiedByOfficeholderId,
        isAppealMislabel,
        explanation: input.explanation,
        classifiedAt: new Date(),
      },
    });

    await this.prisma.redressMatter.update({
      where: { id: input.matterId },
      data: { status: RedressMatterStatus.CLASSIFICATION },
    });

    return classification;
  }

  async startInvestigation(input: StartInvestigationInput) {
    await this.safeHalt.assertMatterNotSafeHalted(input.matterId, 'complaint investigation');

    const classification = await this.prisma.complaintClassification.findUnique({
      where: { id: input.classificationId },
    });

    if (classification?.matterId !== input.matterId) {
      throw new NotFoundException('Complaint classification not found for matter');
    }

    if (classification.classificationType === ComplaintClassificationType.NOT_A_COMPLAINT) {
      throw new BadRequestException(
        'Investigation cannot start for NOT_A_COMPLAINT classification',
      );
    }

    const investigation = await this.prisma.complaintInvestigation.create({
      data: {
        matterId: input.matterId,
        classificationId: input.classificationId,
        status: ComplaintInvestigationStatus.IN_PROGRESS,
        investigatorIdentityId: input.investigatorIdentityId,
        investigatorOfficeholderId: input.investigatorOfficeholderId,
        startedAt: new Date(),
      },
    });

    await this.prisma.redressMatter.update({
      where: { id: input.matterId },
      data: { status: RedressMatterStatus.INVESTIGATION },
    });

    return investigation;
  }

  async recordServiceRemedy(input: RecordServiceRemedyInput) {
    const investigation = await this.prisma.complaintInvestigation.findUnique({
      where: { id: input.investigationId },
    });

    if (!investigation) {
      throw new NotFoundException(`ComplaintInvestigation ${input.investigationId} not found`);
    }

    this.boundary.assertSubstantiveRemedyPermitted(false, false);

    return this.prisma.complaintCorrectiveAction.create({
      data: {
        investigationId: input.investigationId,
        actionSummary: input.actionSummary,
        isServiceRemedy: true,
      },
    });
  }

  async closeComplaint(input: CloseComplaintInput) {
    const investigation = await this.prisma.complaintInvestigation.findUnique({
      where: { id: input.investigationId },
    });

    if (!investigation) {
      throw new NotFoundException(`ComplaintInvestigation ${input.investigationId} not found`);
    }

    await this.prisma.complaintInvestigation.update({
      where: { id: input.investigationId },
      data: {
        status: ComplaintInvestigationStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    const closure = await this.prisma.complaintClosure.create({
      data: {
        investigationId: input.investigationId,
        reason: input.reason,
      },
    });

    await this.prisma.redressMatter.update({
      where: { id: investigation.matterId },
      data: { status: RedressMatterStatus.CLOSED, closedAt: new Date() },
    });

    return closure;
  }
}
