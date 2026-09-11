import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ServiceCatalogValidationService {
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

  async ensureDepartmentExistsForInstitution(
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

  async ensureServiceFamilyExists(serviceFamilyId: string): Promise<void> {
    const family = await this.prisma.serviceFamily.findUnique({
      where: { id: serviceFamilyId },
      select: { id: true },
    });

    if (!family) {
      throw new NotFoundException(`Service family with id "${serviceFamilyId}" was not found`);
    }
  }

  async ensureGovernmentServiceExists(governmentServiceId: string): Promise<void> {
    const service = await this.prisma.governmentService.findUnique({
      where: { id: governmentServiceId },
      select: { id: true },
    });

    if (!service) {
      throw new NotFoundException(
        `Government service with id "${governmentServiceId}" was not found`,
      );
    }
  }

  async ensureGovernmentServiceVersionExists(versionId: string): Promise<void> {
    const version = await this.prisma.governmentServiceVersion.findUnique({
      where: { id: versionId },
      select: { id: true },
    });

    if (!version) {
      throw new NotFoundException(
        `Government service version with id "${versionId}" was not found`,
      );
    }
  }

  async ensureFunctionAuthorityRecordExists(functionAuthorityRecordId: string): Promise<void> {
    const record = await this.prisma.functionAuthorityRecord.findUnique({
      where: { id: functionAuthorityRecordId },
      select: { id: true },
    });

    if (!record) {
      throw new NotFoundException(
        `Function authority record with id "${functionAuthorityRecordId}" was not found`,
      );
    }
  }
}
