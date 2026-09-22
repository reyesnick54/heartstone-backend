import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class RevenueScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async requireCitizenTaxpayerAccount(identityId: string) {
    const account = await this.prisma.taxpayerAccount.findFirst({
      where: { primaryIdentityId: identityId, isActive: true },
      include: {
        identifiers: true,
        registrations: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!account) {
      throw new NotFoundException('No taxpayer account is linked to this citizen identity');
    }

    return account;
  }

  async findOrganizationTaxpayerAccount(organizationId: string) {
    return this.prisma.taxpayerAccount.findFirst({
      where: { organizationId, isActive: true },
      include: {
        identifiers: true,
        registrations: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }

  async listCitizenAccountIds(identityId: string): Promise<string[]> {
    const accounts = await this.prisma.taxpayerAccount.findMany({
      where: { primaryIdentityId: identityId, isActive: true },
      select: { id: true },
    });
    return accounts.map((account) => account.id);
  }
}
