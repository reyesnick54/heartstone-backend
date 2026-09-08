import { Injectable, NotFoundException } from '@nestjs/common';
import { Institution, RecordStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

@Injectable()
export class InstitutionService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Institution> {
    const institution = await this.prisma.institution.findUnique({
      where: { id },
    });

    if (!institution) {
      throw new NotFoundException(`Institution '${id}' not found`);
    }

    return institution;
  }

  async assertActive(id: string): Promise<Institution> {
    const institution = await this.findById(id);

    if (institution.status !== RecordStatus.ACTIVE) {
      throw new NotFoundException(`Institution '${id}' not found`);
    }

    return institution;
  }
}
