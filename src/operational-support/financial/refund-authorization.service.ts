import { Injectable, NotFoundException } from '@nestjs/common';
import { RefundAuthorization } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class RefundAuthorizationService {
  constructor(private readonly prisma: PrismaService) {}

  async findByReference(authorizationReference: string): Promise<RefundAuthorization | null> {
    return this.prisma.refundAuthorization.findUnique({
      where: { authorizationReference },
      include: { refundRequest: true, transactions: true },
    });
  }

  async findById(id: string): Promise<RefundAuthorization | null> {
    return this.prisma.refundAuthorization.findUnique({ where: { id } });
  }

  async getByIdOrThrow(id: string): Promise<RefundAuthorization> {
    const authorization = await this.findById(id);
    if (!authorization) {
      throw new NotFoundException(`RefundAuthorization ${id} not found`);
    }
    return authorization;
  }
}
