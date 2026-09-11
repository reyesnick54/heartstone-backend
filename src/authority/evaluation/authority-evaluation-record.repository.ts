import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuthorityEvaluationRecord, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuthorityEvaluationRecordRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.AuthorityEvaluationRecordCreateInput): Promise<AuthorityEvaluationRecord> {
    return this.prisma.authorityEvaluationRecord.create({ data });
  }

  async findById(id: string): Promise<AuthorityEvaluationRecord> {
    const record = await this.prisma.authorityEvaluationRecord.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException(`Authority evaluation record "${id}" was not found`);
    }
    return record;
  }

  async findMany(where: Prisma.AuthorityEvaluationRecordWhereInput): Promise<AuthorityEvaluationRecord[]> {
    return this.prisma.authorityEvaluationRecord.findMany({
      where,
      orderBy: { evaluatedAt: 'desc' },
    });
  }

  update(): never {
    throw new ForbiddenException('Authority evaluation records are append-only and cannot be updated');
  }

  delete(): never {
    throw new ForbiddenException('Authority evaluation records are append-only and cannot be deleted');
  }
}
