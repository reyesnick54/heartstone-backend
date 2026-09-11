import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AuthorityValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureInstitutionExists(institutionId: string): Promise<void> {
    const institution = await this.prisma.institution.findUnique({
      where: { id: institutionId },
      select: { id: true },
    });

    if (!institution) {
      throw new NotFoundException(`Institution with id "${institutionId}" was not found`);
    }
  }

  async ensureDepartmentBelongsToInstitution(
    departmentId: string,
    institutionId: string,
  ): Promise<void> {
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
      select: { id: true, institutionId: true },
    });

    if (!department) {
      throw new NotFoundException(`Department with id "${departmentId}" was not found`);
    }

    if (department.institutionId !== institutionId) {
      throw new BadRequestException(
        `Department "${departmentId}" does not belong to institution "${institutionId}"`,
      );
    }
  }
}
