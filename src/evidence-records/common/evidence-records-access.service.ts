import { Injectable } from '@nestjs/common';
import { IdentityOfficeholderLinkStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class EvidenceRecordsAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async isOfficialIdentity(identityId: string): Promise<boolean> {
    const link = await this.prisma.identityOfficeholderLink.findFirst({
      where: {
        identityId,
        status: IdentityOfficeholderLinkStatus.ACTIVE,
      },
    });
    return link !== null;
  }
}
