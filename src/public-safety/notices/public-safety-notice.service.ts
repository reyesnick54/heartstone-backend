import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PublicSafetyOfficialNoticeStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { PublicSafetyBoundaryService } from '../common/public-safety-boundary.service';
import {
  PUBLIC_SAFETY_NOTICE_DISCLAIMER,
  PUBLIC_SAFETY_REASON_CODES,
} from '../public-safety.constants';

export interface PublicSafetyNoticeActorContext {
  isAuthorizedNoticeOfficial: boolean;
  officeholderId?: string | null;
  actorRoleMarker?: string;
  isAiActor?: boolean;
  isCitizenActor?: boolean;
}

@Injectable()
export class PublicSafetyNoticeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly boundary: PublicSafetyBoundaryService,
  ) {}

  async createDraft(input: {
    jurisdictionId: string;
    noticeReference: string;
    draftContent: string;
    actor: PublicSafetyNoticeActorContext;
  }) {
    this.boundary.rejectClientForgedNoticeLifecycleFields(input);
    if (!input.actor.isAuthorizedNoticeOfficial) {
      throw new ForbiddenException(PUBLIC_SAFETY_REASON_CODES.UNAUTHORIZED_NOTICE_PUBLISH);
    }

    return this.prisma.publicSafetyOfficialNotice.create({
      data: {
        jurisdictionId: input.jurisdictionId,
        noticeReference: input.noticeReference,
        draftContent: input.draftContent,
        status: PublicSafetyOfficialNoticeStatus.DRAFT,
      },
    });
  }

  async approveNotice(input: {
    noticeId: string;
    approvedContent: string;
    actor: PublicSafetyNoticeActorContext;
  }) {
    if (!input.actor.isAuthorizedNoticeOfficial || !input.actor.officeholderId) {
      throw new ForbiddenException(PUBLIC_SAFETY_REASON_CODES.UNAUTHORIZED_NOTICE_PUBLISH);
    }

    const notice = await this.prisma.publicSafetyOfficialNotice.findUnique({
      where: { id: input.noticeId },
    });
    if (!notice) {
      throw new NotFoundException('Notice not found');
    }
    if (notice.status !== PublicSafetyOfficialNoticeStatus.DRAFT) {
      throw new ForbiddenException(PUBLIC_SAFETY_REASON_CODES.UNAUTHORIZED_NOTICE_PUBLISH);
    }

    return this.prisma.publicSafetyOfficialNotice.update({
      where: { id: input.noticeId },
      data: {
        status: PublicSafetyOfficialNoticeStatus.APPROVED,
        approvedContent: input.approvedContent,
        approvedByOfficeholderId: input.actor.officeholderId,
        approvedAt: new Date(),
      },
    });
  }

  async publishNotice(input: { noticeId: string; actor: PublicSafetyNoticeActorContext }) {
    if (input.actor.isCitizenActor) {
      this.boundary.assertCitizenCannotIssuePublicEmergencyAlert('PUBLISH_GOVERNMENT_NOTICE');
    }
    if (input.actor.isAiActor) {
      this.boundary.assertAiCannotIssuePublicEmergencyDeclaration('PUBLISH_EMERGENCY_ALERT');
    }
    if (!input.actor.isAuthorizedNoticeOfficial || !input.actor.officeholderId) {
      throw new ForbiddenException(PUBLIC_SAFETY_REASON_CODES.UNAUTHORIZED_NOTICE_PUBLISH);
    }

    const notice = await this.prisma.publicSafetyOfficialNotice.findUnique({
      where: { id: input.noticeId },
    });
    if (!notice) {
      throw new NotFoundException('Notice not found');
    }

    this.boundary.assertNoticePublishRequiresApprovedContent({
      status: notice.status,
      approvedContent: notice.approvedContent,
    });

    const publishedContent = notice.approvedContent ?? notice.draftContent;

    return this.prisma.publicSafetyOfficialNotice.update({
      where: { id: input.noticeId },
      data: {
        status: PublicSafetyOfficialNoticeStatus.PUBLISHED,
        publishedContent,
        publishedByOfficeholderId: input.actor.officeholderId,
        publishedAt: new Date(),
      },
    });
  }

  async getPublishedNoticeByReference(noticeReference: string) {
    const notice = await this.prisma.publicSafetyOfficialNotice.findUnique({
      where: { noticeReference },
    });
    if (!notice) {
      throw new NotFoundException('Notice not found');
    }

    const content = this.boundary.resolvePublicNoticeContent({
      status: notice.status,
      draftContent: notice.draftContent,
      approvedContent: notice.approvedContent,
      publishedContent: notice.publishedContent,
    });

    return {
      disclaimer: PUBLIC_SAFETY_NOTICE_DISCLAIMER,
      noticeReference: notice.noticeReference,
      status: notice.status,
      content,
      publishedAt: notice.publishedAt?.toISOString() ?? null,
    };
  }
}
