import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class IntegrationsValidationService {
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

  async ensureIntegrationDefinitionExists(integrationDefinitionId: string): Promise<void> {
    const definition = await this.prisma.integrationDefinition.findUnique({
      where: { id: integrationDefinitionId },
      select: { id: true },
    });

    if (!definition) {
      throw new NotFoundException(
        `Integration definition with id "${integrationDefinitionId}" was not found`,
      );
    }
  }

  async ensureIntegrationVersionExists(integrationVersionId: string): Promise<void> {
    const version = await this.prisma.integrationVersion.findUnique({
      where: { id: integrationVersionId },
      select: { id: true },
    });

    if (!version) {
      throw new NotFoundException(
        `Integration version with id "${integrationVersionId}" was not found`,
      );
    }
  }

  async ensureTechnologyDependencyExists(technologyDependencyId: string): Promise<void> {
    const dependency = await this.prisma.technologyDependency.findUnique({
      where: { id: technologyDependencyId },
      select: { id: true },
    });

    if (!dependency) {
      throw new NotFoundException(
        `Technology dependency with id "${technologyDependencyId}" was not found`,
      );
    }
  }

  async ensureDataExchangeContractExists(dataExchangeContractId: string): Promise<void> {
    const contract = await this.prisma.dataExchangeContract.findUnique({
      where: { id: dataExchangeContractId },
      select: { id: true },
    });

    if (!contract) {
      throw new NotFoundException(
        `Data exchange contract with id "${dataExchangeContractId}" was not found`,
      );
    }
  }

  async ensureAuthoritativeDesignationExists(designationId: string): Promise<void> {
    const designation = await this.prisma.authoritativeSourceDesignation.findUnique({
      where: { id: designationId },
      select: { id: true },
    });

    if (!designation) {
      throw new NotFoundException(
        `Authoritative source designation with id "${designationId}" was not found`,
      );
    }
  }
}
