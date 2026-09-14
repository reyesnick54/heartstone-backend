import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuthorityEvaluationOutcome,
  Prisma,
  ReportCorrectionStatus,
  ReportPublicationStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { AI_ACTOR_IDENTITY_PREFIX } from '../../evidence/evidence.constants';
import { ReportingBoundaryService } from '../common/reporting-boundary.service';
import { hashReportContent } from '../common/reporting-hash.util';

export interface CreateReportCorrectionInput {
  reportPublicationId: string;
  correctedContent: Record<string, unknown>;
  reason: string;
  correctedByIdentityId: string;
  correctedByOfficeholderId?: string;
  authorityEvaluationRecordId?: string;
  affectedReportClaimIds?: string[];
  sendNotification?: boolean;
}

@Injectable()
export class ReportCorrectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: ReportingBoundaryService,
  ) {}

  async createCorrection(input: CreateReportCorrectionInput) {
    if (input.correctedByIdentityId.startsWith(AI_ACTOR_IDENTITY_PREFIX)) {
      throw new ForbiddenException('AI cannot authorize report corrections');
    }

    const publication = await this.prisma.reportPublication.findUnique({
      where: { id: input.reportPublicationId },
    });
    if (!publication) {
      throw new NotFoundException(`ReportPublication "${input.reportPublicationId}" not found`);
    }

    if (publication.status !== ReportPublicationStatus.PUBLISHED) {
      throw new BadRequestException('Corrections apply only to published reports');
    }

    if (input.authorityEvaluationRecordId) {
      const evaluation = await this.prisma.authorityEvaluationRecord.findUnique({
        where: { id: input.authorityEvaluationRecordId },
      });
      if (evaluation?.outcome !== AuthorityEvaluationOutcome.ALLOW) {
        throw new ForbiddenException('Correction requires successful authority evaluation');
      }
    }

    const redactedCorrected = this.boundary.redactRestrictedContent(
      input.correctedContent,
      publication.classification,
    );
    this.boundary.assertPublicReportDoesNotRevealProtectedDetails(
      publication.classification,
      redactedCorrected,
    );

    const correction = await this.prisma.$transaction(async (tx) => {
      const created = await tx.reportCorrection.create({
        data: {
          reportPublicationId: publication.id,
          originalContent: publication.frozenContent as object,
          correctedContent: redactedCorrected as Prisma.InputJsonValue,
          reason: input.reason,
          authorityEvaluationRecordId: input.authorityEvaluationRecordId,
          correctedByIdentityId: input.correctedByIdentityId,
          correctedByOfficeholderId: input.correctedByOfficeholderId,
          notificationSent: input.sendNotification ?? false,
          notificationSentAt: input.sendNotification ? new Date() : null,
          status: ReportCorrectionStatus.PUBLISHED,
        },
      });

      for (const claimId of input.affectedReportClaimIds ?? []) {
        await tx.reportCorrectionAffectedClaim.create({
          data: { reportCorrectionId: created.id, reportClaimId: claimId },
        });
      }

      await tx.reportPublication.update({
        where: { id: publication.id },
        data: {
          status: ReportPublicationStatus.CORRECTED,
          frozenContent: redactedCorrected as Prisma.InputJsonValue,
          frozenSnapshotHash: hashReportContent(redactedCorrected),
        },
      });

      return created;
    });

    return {
      correctionId: correction.id,
      originalPreserved: true,
      originalContent: correction.originalContent,
      correctedContent: correction.correctedContent,
      correctedAt: correction.correctedAt,
    };
  }

  async getCorrectionHistory(publicationId: string) {
    return this.prisma.reportCorrection.findMany({
      where: { reportPublicationId: publicationId },
      include: { affectedClaims: true },
      orderBy: { correctedAt: 'asc' },
    });
  }
}
