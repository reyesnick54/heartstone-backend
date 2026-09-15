import { Injectable, NotFoundException } from '@nestjs/common';
import { OperatorReadinessProfile } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface CreateOperatorReadinessProfileInput {
  identityId: string;
  officeholderId?: string;
  departmentId?: string;
  notes?: string;
}

@Injectable()
export class OperatorReadinessProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateOperatorReadinessProfileInput): Promise<OperatorReadinessProfile> {
    return this.prisma.operatorReadinessProfile.create({ data: input });
  }

  async findById(id: string): Promise<OperatorReadinessProfile> {
    const profile = await this.prisma.operatorReadinessProfile.findUnique({
      where: { id },
      include: { qualifications: true },
    });

    if (!profile) {
      throw new NotFoundException(`OperatorReadinessProfile ${id} not found`);
    }

    return profile;
  }
}
