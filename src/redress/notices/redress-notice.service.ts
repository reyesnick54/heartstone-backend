import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RedressNoticeType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { RedressSafeHaltService } from '../common/redress-safe-halt.service';

export interface IssueNoticeInput {
  matterId: string;
  noticeType: RedressNoticeType;
  noticeReference: string;
  recipientIdentityId?: string;
  isPrivileged?: boolean;
}

@Injectable()
export class RedressNoticeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly safeHalt: RedressSafeHaltService,
  ) {}

  async issueNotice(input: IssueNoticeInput) {
    await this.safeHalt.assertMatterNotSafeHalted(input.matterId, 'notice issuance');

    const matter = await this.prisma.redressMatter.findUnique({
      where: { id: input.matterId },
    });

    if (!matter) {
      throw new NotFoundException(`RedressMatter ${input.matterId} not found`);
    }

    return this.prisma.redressNotice.create({
      data: {
        matterId: input.matterId,
        noticeType: input.noticeType,
        noticeReference: input.noticeReference,
        recipientIdentityId: input.recipientIdentityId,
        isPrivileged: input.isPrivileged ?? false,
      },
    });
  }

  async listNoticesForMatter(matterId: string, includePrivileged = false) {
    const notices = await this.prisma.redressNotice.findMany({
      where: { matterId },
      orderBy: { issuedAt: 'asc' },
    });

    if (includePrivileged) {
      return notices;
    }

    return notices.filter((notice) => !notice.isPrivileged);
  }

  async getNotice(noticeId: string, requesterIsStaff = false) {
    const notice = await this.prisma.redressNotice.findUnique({
      where: { id: noticeId },
    });

    if (!notice) {
      throw new NotFoundException(`RedressNotice ${noticeId} not found`);
    }

    if (notice.isPrivileged && !requesterIsStaff) {
      throw new ForbiddenException('Privileged investigation notes are protected from disclosure');
    }

    return notice;
  }
}
