import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class TradeScopeService {
  constructor(private readonly prisma: PrismaService) {}

  findOrganizationTraderAccount(organizationId: string) {
    return this.prisma.traderAccount.findFirst({
      where: { organizationId },
      include: {
        importerRegistration: true,
        exporterRegistration: true,
      },
    });
  }
}
