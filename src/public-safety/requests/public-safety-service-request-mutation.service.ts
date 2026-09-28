import { randomUUID } from 'node:crypto';

import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  PublicSafetyServiceRequestKind,
  PublicSafetyServiceRequestStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PublicSafetyAccessService } from '../common/public-safety-access.service';
import { PUBLIC_SAFETY_REASON_CODES } from '../public-safety.constants';

const REQUEST_REFERENCE_PREFIX = 'PS-REQ';

@Injectable()
export class PublicSafetyServiceRequestMutationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: PublicSafetyAccessService,
  ) {}

  async createOfficialServiceRequest(input: {
    engagementId: string;
    requestKind: PublicSafetyServiceRequestKind;
    serviceTemplateCode: string;
    actorIdentityId: string;
    institutionScopeVerified: boolean;
  }) {
    if (!input.institutionScopeVerified) {
      throw new ForbiddenException(PUBLIC_SAFETY_REASON_CODES.CROSS_ORGANIZATION_ACCESS_DENIED);
    }

    const requestReference = `${REQUEST_REFERENCE_PREFIX}-${randomUUID().slice(0, 8).toUpperCase()}`;
    return this.prisma.publicSafetyServiceRequest.create({
      data: {
        id: randomUUID(),
        engagementId: input.engagementId,
        requestReference,
        requestKind: input.requestKind,
        serviceTemplateCode: input.serviceTemplateCode,
        status: PublicSafetyServiceRequestStatus.SUBMITTED,
        submittedAt: new Date(),
      },
    });
  }

  async updateRequestStatus(input: {
    serviceRequestId: string;
    status: PublicSafetyServiceRequestStatus;
    actorIdentityId: string;
    institutionScopeVerified: boolean;
  }) {
    if (!input.institutionScopeVerified) {
      throw new ForbiddenException(PUBLIC_SAFETY_REASON_CODES.CROSS_ORGANIZATION_ACCESS_DENIED);
    }

    return this.prisma.publicSafetyServiceRequest.update({
      where: { id: input.serviceRequestId },
      data: { status: input.status },
    });
  }

  async assertCitizenCannotMutateSensitiveRecord(identityId: string, engagementId: string) {
    try {
      await this.access.assertCitizenEngagementAccess(identityId, engagementId);
    } catch {
      throw new ForbiddenException(PUBLIC_SAFETY_REASON_CODES.CROSS_REPORTER_ACCESS_DENIED);
    }
  }
}
