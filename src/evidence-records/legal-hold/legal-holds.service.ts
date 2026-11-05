import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LegalHoldStatus, type LegalHoldTargetType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PermissionCodes } from '../../technical-access/constants/permission-codes.constants';
import { TechnicalPermissionEvaluationService } from '../../technical-access/services/technical-permission-evaluation.service';
import { hashRecordsPayload } from '../common/records-hash.util';

export interface CreateLegalHoldInput {
  holdNumber: string;
  title: string;
  authorityReference: string;
  reason: string;
  issuedByIdentityId: string;
  effectiveFrom: Date;
  targets: {
    targetType: LegalHoldTargetType;
    targetReference: string;
    recordsClassificationId?: string;
    notes?: string;
  }[];
}

export interface ReleaseLegalHoldInput {
  /** The signed-in officer; callers must take this from the session, never a request body. */
  releasedByIdentityId: string;
  releaseAuthorityReference: string;
  releaseReason: string;
}

@Injectable()
export class LegalHoldsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: TechnicalPermissionEvaluationService,
  ) {}

  async create(input: CreateLegalHoldInput) {
    return this.prisma.legalHold.create({
      data: {
        holdNumber: input.holdNumber,
        title: input.title,
        authorityReference: input.authorityReference,
        reason: input.reason,
        issuedByIdentityId: input.issuedByIdentityId,
        effectiveFrom: input.effectiveFrom,
        status: LegalHoldStatus.ACTIVE,
        targets: {
          create: input.targets.map((target) => ({
            targetType: target.targetType,
            targetReference: target.targetReference,
            recordsClassificationId: target.recordsClassificationId,
            notes: target.notes,
          })),
        },
      },
      include: { targets: true },
    });
  }

  async hasActiveHold(targetType: LegalHoldTargetType, targetReference: string): Promise<boolean> {
    const count = await this.prisma.legalHoldTarget.count({
      where: {
        targetType,
        targetReference,
        legalHold: {
          status: LegalHoldStatus.ACTIVE,
          effectiveFrom: { lte: new Date() },
          releasedAt: null,
        },
      },
    });
    return count > 0;
  }

  async release(id: string, input: ReleaseLegalHoldInput) {
    const hold = await this.prisma.legalHold.findUnique({
      where: { id },
      include: { targets: true, releaseRecords: true },
    });
    if (!hold) {
      throw new NotFoundException(`LegalHold "${id}" was not found`);
    }
    if (hold.status !== LegalHoldStatus.ACTIVE) {
      throw new BadRequestException('Only active legal holds can be released');
    }

    // Permissions are resolved from the releaser's role assignments, never from the request.
    const granted = await this.permissions.resolveGrantedPermissions(input.releasedByIdentityId);
    if (!granted.includes(PermissionCodes.RECORDS_LEGAL_HOLD_RELEASE)) {
      throw new ForbiddenException('Legal hold release requires configured release authority');
    }
    // Segregation of duties: whoever placed the hold cannot lift it.
    if (hold.issuedByIdentityId === input.releasedByIdentityId) {
      throw new ForbiddenException('The officer who placed a legal hold cannot release it');
    }

    const auditManifestHash = hashRecordsPayload({
      legalHoldId: id,
      releaseAuthorityReference: input.releaseAuthorityReference,
      releaseReason: input.releaseReason,
      releasedByIdentityId: input.releasedByIdentityId,
      targets: hold.targets,
    });

    return this.prisma.$transaction(async (tx) => {
      const releaseRecord = await tx.legalHoldReleaseRecord.create({
        data: {
          legalHoldId: id,
          releasedByIdentityId: input.releasedByIdentityId,
          releaseAuthorityReference: input.releaseAuthorityReference,
          releaseReason: input.releaseReason,
          auditManifestHash,
        },
      });

      const updated = await tx.legalHold.update({
        where: { id },
        data: {
          status: LegalHoldStatus.RELEASED,
          releasedAt: new Date(),
        },
        include: { targets: true, releaseRecords: true },
      });

      return { hold: updated, releaseRecord };
    });
  }
}
