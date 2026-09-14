import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AdministrativeCorrectionMatterStatus,
  AuthorityEvaluationOutcome,
  Prisma,
  RecordsReplayMode,
  RedressRouteType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RecordCorrectionService } from '../../evidence/correction/record-correction.service';
import { AI_ACTOR_IDENTITY_PREFIX } from '../../evidence/evidence.constants';
import { RecordsReplayService } from '../../evidence/replay/records-replay.service';
import { ADMINISTRATIVE_CORRECTION_MATTER_NUMBER_PREFIX } from '../redress.constants';
import { AdministrativeCorrectionBoundaryService } from './administrative-correction-boundary.service';

export interface RequestAdministrativeCorrectionInput {
  category: string;
  targetRecordType: string;
  targetRecordId: string;
  targetVersionId?: string;
  requestedByIdentityId: string;
  requesterOfficeholderId?: string;
  correctionAuthorityFunctionId?: string;
  reason: string;
  requestedChangeDescription: string;
  requestedChanges: Record<string, unknown>;
  supportingEvidenceIds?: string[];
  caseId?: string;
  masterAdministrativeFileId?: string;
  governmentDecisionId?: string;
  configuredAlternateRoutes?: RedressRouteType[];
  downstreamRecordsRequiringUpdate?: string[];
}

export interface ApproveAdministrativeCorrectionInput {
  matterId: string;
  reviewerIdentityId: string;
  reviewerOfficeholderId?: string;
  authorityEvaluationRecordId: string;
  notificationReferences?: string[];
}

export interface ImplementAdministrativeCorrectionInput {
  matterId: string;
  actorIdentityId: string;
  actorOfficeholderId?: string;
  correctedContentReference: string;
  correctedContent: Record<string, unknown>;
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';
import { RedressBoundaryService } from '../common/redress-boundary.service';
import { RedressSafeHaltService } from '../common/redress-safe-halt.service';

export interface CreateAdministrativeCorrectionInput {
  matterId: string;
  originalNoticeReference: string;
  errorDescription: string;
  altersSubstantiveOutcome?: boolean;
  altersMaterialReasons?: boolean;
  removesReviewRights?: boolean;
}

export interface CompleteCorrectionInput {
  correctionId: string;
  correctedNoticeReference: string;
}

@Injectable()
export class AdministrativeCorrectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundaryService: AdministrativeCorrectionBoundaryService,
    private readonly recordCorrectionService: RecordCorrectionService,
    private readonly recordsReplayService: RecordsReplayService,
  ) {}

  async requestCorrection(input: RequestAdministrativeCorrectionInput) {
    if (input.requestedByIdentityId.startsWith(AI_ACTOR_IDENTITY_PREFIX)) {
      throw new ForbiddenException('AI assistants cannot request administrative corrections');
    }

    const boundary = this.boundaryService.evaluateCorrectionBoundary({
      requestedChanges: input.requestedChanges,
      configuredAlternateRoutes: input.configuredAlternateRoutes,
    });

    const originalSnapshot = await this.captureOriginalSnapshot(
      input.targetRecordType,
      input.targetRecordId,
      input.masterAdministrativeFileId,
      input.caseId,
    );

    const matterNumber = `${ADMINISTRATIVE_CORRECTION_MATTER_NUMBER_PREFIX}-${String(Date.now())}`;

    if (!boundary.permitted) {
      return this.prisma.administrativeCorrectionMatter.create({
        data: {
          matterNumber,
          category: input.category as never,
          status: AdministrativeCorrectionMatterStatus.ROUTED_TO_ALTERNATE_REDRESS,
          targetRecordType: input.targetRecordType,
          targetRecordId: input.targetRecordId,
          targetVersionId: input.targetVersionId,
          requestedByIdentityId: input.requestedByIdentityId,
          requesterOfficeholderId: input.requesterOfficeholderId,
          correctionAuthorityFunctionId: input.correctionAuthorityFunctionId,
          reason: input.reason,
          requestedChangeDescription: input.requestedChangeDescription,
          requestedChanges: input.requestedChanges as Prisma.InputJsonValue,
          originalRecordSnapshot: originalSnapshot,
          supportingEvidenceIds: input.supportingEvidenceIds ?? [],
          routedToRoute: boundary.suggestedRoute,
          routedRouteGuidance: boundary.routeGuidance,
          caseId: input.caseId,
          masterAdministrativeFileId: input.masterAdministrativeFileId,
          governmentDecisionId: input.governmentDecisionId,
        },
      });
    }

    return this.prisma.administrativeCorrectionMatter.create({
      data: {
        matterNumber,
        category: input.category as never,
        status: AdministrativeCorrectionMatterStatus.REQUESTED,
        targetRecordType: input.targetRecordType,
        targetRecordId: input.targetRecordId,
        targetVersionId: input.targetVersionId,
        requestedByIdentityId: input.requestedByIdentityId,
        requesterOfficeholderId: input.requesterOfficeholderId,
        correctionAuthorityFunctionId: input.correctionAuthorityFunctionId,
        reason: input.reason,
        requestedChangeDescription: input.requestedChangeDescription,
        requestedChanges: input.requestedChanges as Prisma.InputJsonValue,
        originalRecordSnapshot: originalSnapshot,
        supportingEvidenceIds: input.supportingEvidenceIds ?? [],
        downstreamRecordsRequiringUpdate: input.downstreamRecordsRequiringUpdate ?? [],
        caseId: input.caseId,
        masterAdministrativeFileId: input.masterAdministrativeFileId,
        governmentDecisionId: input.governmentDecisionId,
      },
    });
  }

  async approveCorrection(input: ApproveAdministrativeCorrectionInput) {
    const matter = await this.getMatter(input.matterId);

    if (matter.status === AdministrativeCorrectionMatterStatus.ROUTED_TO_ALTERNATE_REDRESS) {
      throw new BadRequestException(
        'Matter was routed to an alternate redress route and cannot be approved as correction',
      );
    }

    if (input.reviewerIdentityId.startsWith(AI_ACTOR_IDENTITY_PREFIX)) {
      throw new ForbiddenException('AI assistants cannot approve administrative corrections');
    }

    this.boundaryService.assertCorrectionPermitted({
      requestedChanges: matter.requestedChanges as Record<string, unknown>,
    });

    const evaluation = await this.prisma.authorityEvaluationRecord.findUnique({
      where: { id: input.authorityEvaluationRecordId },
    });

    if (evaluation?.outcome !== AuthorityEvaluationOutcome.ALLOW) {
      throw new ForbiddenException(
        'Correction approval requires a successful authority evaluation',
      );
    }

    const recordCorrection = await this.recordCorrectionService.requestCorrection({
      targetRecordType: matter.targetRecordType,
      targetRecordId: matter.targetRecordId,
      targetVersionId: matter.targetVersionId ?? undefined,
      requestedBy: matter.requestedByIdentityId,
      errorOrDisputeDescription: matter.requestedChangeDescription,
      supportingEvidenceIds: matter.supportingEvidenceIds as string[],
      correctionAuthorityFunctionId: matter.correctionAuthorityFunctionId ?? undefined,
      reason: matter.reason,
    });

    const approvedCorrection = await this.recordCorrectionService.approveCorrection({
      correctionId: recordCorrection.id,
      approvedByIdentityId: input.reviewerIdentityId,
      approvedByOfficeholderId: input.reviewerOfficeholderId,
      authorityEvaluationRecordId: input.authorityEvaluationRecordId,
      downstreamAffectedReferences: matter.downstreamRecordsRequiringUpdate as string[],
    });

    return this.prisma.administrativeCorrectionMatter.update({
      where: { id: matter.id },
      data: {
        status: AdministrativeCorrectionMatterStatus.APPROVED,
        reviewerIdentityId: input.reviewerIdentityId,
        reviewerOfficeholderId: input.reviewerOfficeholderId,
        approvedAt: new Date(),
        authorityEvaluationRecordId: input.authorityEvaluationRecordId,
        recordCorrectionId: approvedCorrection.id,
        notificationReferences: input.notificationReferences ?? [],
      },
    });
  }

  async implementCorrection(input: ImplementAdministrativeCorrectionInput) {
    const matter = await this.getMatter(input.matterId);

    if (matter.status !== AdministrativeCorrectionMatterStatus.APPROVED) {
      throw new BadRequestException('Only approved correction matters can be implemented');
    }

    if (!matter.recordCorrectionId) {
      throw new BadRequestException('Approved matter is missing linked record correction');
    }

    if (input.actorIdentityId.startsWith(AI_ACTOR_IDENTITY_PREFIX)) {
      throw new ForbiddenException('AI assistants cannot implement administrative corrections');
    }

    const { newVersionId } = await this.recordCorrectionService.implementCorrection({
      correctionId: matter.recordCorrectionId,
      actorIdentityId: input.actorIdentityId,
      actorOfficeholderId: input.actorOfficeholderId,
      correctedContentReference: input.correctedContentReference,
      correctedContent: input.correctedContent,
    });

    return this.prisma.administrativeCorrectionMatter.update({
      where: { id: matter.id },
      data: {
        status: AdministrativeCorrectionMatterStatus.IMPLEMENTED,
        correctedRecordReference: newVersionId,
      },
      include: {
        recordCorrection: true,
      },
    });
  }

  async getMatterWithHistory(matterId: string) {
    const matter = await this.getMatter(matterId);

    let originalRecord: unknown = matter.originalRecordSnapshot;
    if (matter.recordCorrectionId) {
      const loadedOriginal = await this.recordCorrectionService.getOriginalRecord(
        matter.recordCorrectionId,
      );
      originalRecord = loadedOriginal ?? matter.originalRecordSnapshot;
    }

    return {
      matter,
      originalRecord,
      correctedRecordReference: matter.correctedRecordReference,
      preservesOriginal: true,
      recordCorrectionStatus: matter.recordCorrectionId
        ? (
            await this.prisma.recordCorrection.findUnique({
              where: { id: matter.recordCorrectionId },
            })
          )?.status
        : null,
    };
  }

  private async getMatter(matterId: string) {
    const matter = await this.prisma.administrativeCorrectionMatter.findUnique({
      where: { id: matterId },
    });

    if (!matter) {
      throw new NotFoundException(`AdministrativeCorrectionMatter ${matterId} not found`);
    }

    return matter;
  }

  private async captureOriginalSnapshot(
    targetRecordType: string,
    targetRecordId: string,
    masterAdministrativeFileId?: string,
    caseId?: string,
  ) {
    if (caseId) {
      const replay = await this.recordsReplayService.replay({
        caseId,
        asOf: new Date(),
        mode: RecordsReplayMode.HISTORICAL_REPLAY,
      });
      return replay as object;
    }

    if (masterAdministrativeFileId) {
      const maf = await this.prisma.masterAdministrativeFile.findUnique({
        where: { id: masterAdministrativeFileId },
      });
      if (maf?.caseId) {
        const replay = await this.recordsReplayService.replay({
          caseId: maf.caseId,
          asOf: new Date(),
          mode: RecordsReplayMode.HISTORICAL_REPLAY,
        });
        return replay as object;
      }
    }

    return { targetRecordType, targetRecordId, capturedAt: new Date().toISOString() };
    private readonly boundary: RedressBoundaryService,
    private readonly safeHalt: RedressSafeHaltService,
  ) {}

  async createCorrection(input: CreateAdministrativeCorrectionInput) {
    await this.safeHalt.assertMatterNotSafeHalted(input.matterId, 'administrative correction');

    this.boundary.assertNonSubstantiveCorrection({
      altersSubstantiveOutcome: input.altersSubstantiveOutcome,
      altersMaterialReasons: input.altersMaterialReasons,
      removesReviewRights: input.removesReviewRights,
    });

    return this.prisma.administrativeCorrectionMatter.create({
      data: {
        matterId: input.matterId,
        originalNoticeReference: input.originalNoticeReference,
        errorDescription: input.errorDescription,
        isNonSubstantive: true,
        altersSubstantiveOutcome: input.altersSubstantiveOutcome ?? false,
        altersMaterialReasons: input.altersMaterialReasons ?? false,
        removesReviewRights: input.removesReviewRights ?? false,
        originalPreserved: true,
      },
    });
  }

  async completeCorrection(input: CompleteCorrectionInput) {
    const correction = await this.prisma.administrativeCorrectionMatter.findUnique({
      where: { id: input.correctionId },
    });

    if (!correction) {
      throw new NotFoundException(`AdministrativeCorrectionMatter ${input.correctionId} not found`);
    }

    if (
      correction.altersSubstantiveOutcome ||
      correction.altersMaterialReasons ||
      correction.removesReviewRights
    ) {
      throw new BadRequestException('Substantive changes cannot be completed as correction');
    }

    this.boundary.assertOriginalPreserved(correction.originalPreserved);

    return this.prisma.administrativeCorrectionMatter.update({
      where: { id: input.correctionId },
      data: {
        correctedNoticeReference: input.correctedNoticeReference,
      },
    });
  }
}
