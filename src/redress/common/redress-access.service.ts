import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RepresentativeAuthorityStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface MatterAccessContext {
  identityId: string;
  representativeAuthorityId?: string;
  isStaff?: boolean;
}

@Injectable()
export class RedressAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async assertMatterAccess(matterId: string, context: MatterAccessContext): Promise<void> {
    const matter = await this.prisma.redressMatter.findUnique({
      where: { id: matterId },
      select: {
        id: true,
        filerIdentityId: true,
        representativeAuthorityId: true,
      },
    });

    if (!matter) {
      throw new NotFoundException(`RedressMatter ${matterId} not found`);
    }

    if (context.isStaff) {
      return;
    }

    if (matter.filerIdentityId === context.identityId) {
      return;
    }

    if (context.representativeAuthorityId && matter.representativeAuthorityId) {
      await this.assertRepresentativeScope(
        context.representativeAuthorityId,
        context.identityId,
        matter.representativeAuthorityId,
      );
      return;
    }

    throw new ForbiddenException('Access denied to redress matter');
  }

  async assertFilingAccess(filingId: string, context: MatterAccessContext): Promise<void> {
    const filing = await this.prisma.redressFiling.findUnique({
      where: { id: filingId },
      select: {
        id: true,
        matterId: true,
        filerIdentityId: true,
        representativeAuthorityId: true,
      },
    });

    if (!filing) {
      throw new NotFoundException(`RedressFiling ${filingId} not found`);
    }

    if (context.isStaff) {
      return;
    }

    if (filing.filerIdentityId === context.identityId) {
      return;
    }

    if (context.representativeAuthorityId && filing.representativeAuthorityId) {
      await this.assertRepresentativeScope(
        context.representativeAuthorityId,
        context.identityId,
        filing.representativeAuthorityId,
      );
      return;
    }

    throw new ForbiddenException('Access denied to redress filing');
  }

  async assertRepresentativeScope(
    providedAuthorityId: string,
    identityId: string,
    matterAuthorityId: string,
    at: Date = new Date(),
  ): Promise<void> {
    if (providedAuthorityId !== matterAuthorityId) {
      throw new ForbiddenException('Representative authority does not match matter scope');
    }

    const authority = await this.prisma.representativeAuthority.findUnique({
      where: { id: providedAuthorityId },
    });

    if (
      authority?.status !== RepresentativeAuthorityStatus.ACTIVE ||
      authority.identityId !== identityId ||
      authority.effectiveFrom > at ||
      (authority.effectiveUntil && authority.effectiveUntil <= at)
    ) {
      throw new ForbiddenException('Representative authority is invalid or expired');
    }
  }

  assertIdorProtection(
    resourceIdentityId: string | null | undefined,
    sessionIdentityId: string,
    isStaff = false,
  ): void {
    if (isStaff) {
      return;
    }

    if (resourceIdentityId && resourceIdentityId !== sessionIdentityId) {
      throw new ForbiddenException('Resource does not belong to authenticated identity');
    }
  }
}
