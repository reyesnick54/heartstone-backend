import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RecordsClassificationStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface CreateRecordsClassificationInput {
  code: string;
  name: string;
  description?: string;
  securityClassification: string;
  privacyClassification: string;
  accessRestriction?: string;
  archivalRequirement?: string;
  integrityRequirement?: string;
  reviewIntervalDays?: number;
  disposalApprovalRequired?: boolean;
  governingSourceId?: string;
}

@Injectable()
export class RecordsClassificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateRecordsClassificationInput) {
    if (input.governingSourceId) {
      const source = await this.prisma.governingSource.findUnique({
        where: { id: input.governingSourceId },
      });
      if (!source) {
        throw new NotFoundException(`GoverningSource "${input.governingSourceId}" was not found`);
      }
    }

    return this.prisma.recordsClassification.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        securityClassification: input.securityClassification,
        privacyClassification: input.privacyClassification,
        accessRestriction: input.accessRestriction,
        archivalRequirement: input.archivalRequirement,
        integrityRequirement: input.integrityRequirement,
        reviewIntervalDays: input.reviewIntervalDays,
        disposalApprovalRequired: input.disposalApprovalRequired ?? true,
        governingSourceId: input.governingSourceId,
        status: RecordsClassificationStatus.DRAFT,
      },
    });
  }

  async activate(id: string) {
    const existing = await this.prisma.recordsClassification.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`RecordsClassification "${id}" was not found`);
    }
    if (!existing.governingSourceId) {
      throw new BadRequestException(
        'Records classification requires a traceable governing source before activation',
      );
    }

    return this.prisma.recordsClassification.update({
      where: { id },
      data: { status: RecordsClassificationStatus.ACTIVE },
    });
  }

  async getByCode(code: string) {
    const record = await this.prisma.recordsClassification.findUnique({ where: { code } });
    if (!record) {
      throw new NotFoundException(`RecordsClassification "${code}" was not found`);
    }
    return record;
  }
}
