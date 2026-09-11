import { Injectable } from '@nestjs/common';
import { AccountStatus, type UserAccount } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export type AccountWithIdentities = UserAccount & {
  identities: {
    id: string;
    credentials: { id: string; type: string; status: string; secretHash: string | null }[];
  }[];
};

@Injectable()
export class AccountLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async findByLoginIdentifier(loginIdentifier: string): Promise<AccountWithIdentities | null> {
    return this.prisma.userAccount.findUnique({
      where: { loginIdentifier },
      include: {
        identities: {
          include: {
            credentials: true,
          },
        },
      },
    });
  }

  isAuthenticatable(account: UserAccount): boolean {
    return account.status === AccountStatus.ACTIVE;
  }
}
