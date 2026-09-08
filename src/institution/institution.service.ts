import { Injectable, NotFoundException } from '@nestjs/common';
import { Institution, Prisma, StructuralLifecycleStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class InstitutionService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Institution> {
    if (!UUID_PATTERN.test(id)) {
      throw new NotFoundException(`Institution '${id}' not found`);
    }

    try {
      const institution = await this.prisma.institution.findUnique({
        where: { id },
      });

      if (!institution) {
        throw new NotFoundException(`Institution '${id}' not found`);
      }

      return institution;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2023'
      ) {
        throw new NotFoundException(`Institution '${id}' not found`);
      }

      throw error;
    }
  }

  async assertActive(id: string): Promise<Institution> {
    const institution = await this.findById(id);

    if (institution.status !== StructuralLifecycleStatus.ACTIVE) {
      throw new NotFoundException(`Institution '${id}' not found`);
    }

    return institution;
  }
}
