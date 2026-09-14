import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IntegrationAcceptanceState,
  IntegrationVersion,
  IntegrationVersionStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntegrationsBoundaryService } from '../common/integrations-boundary.service';
import { IntegrationsValidationService } from '../common/integrations-validation.service';
import { CreateIntegrationVersionDto } from '../dto/create-integration-version.dto';
import { UpdateIntegrationVersionDto } from '../dto/update-integration-version.dto';

@Injectable()
export class IntegrationVersionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: IntegrationsValidationService,
    private readonly boundary: IntegrationsBoundaryService,
  ) {}

  async create(dto: CreateIntegrationVersionDto): Promise<IntegrationVersion> {
    this.boundary.rejectForbiddenVersionFields(dto as unknown as Record<string, unknown>);
    await this.validation.ensureIntegrationDefinitionExists(dto.integrationDefinitionId);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const version = await tx.integrationVersion.create({
          data: {
            integrationDefinitionId: dto.integrationDefinitionId,
            version: dto.version,
            sourceSystem: dto.sourceSystem,
            destinationSystem: dto.destinationSystem,
            direction: dto.direction,
            protocol: dto.protocol,
            dataContractVersion: dto.dataContractVersion,
            securityProfile: dto.securityProfile,
            privacyProfile: dto.privacyProfile,
            retentionProfile: dto.retentionProfile,
            availabilityExpectation: dto.availabilityExpectation,
            recoveryExpectation: dto.recoveryExpectation,
            fallbackProcedure: dto.fallbackProcedure,
            effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
            effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : null,
            status: IntegrationVersionStatus.DRAFT,
            currentAcceptanceState: IntegrationAcceptanceState.DISCOVERED,
          },
        });

        await tx.integrationAcceptanceRecord.create({
          data: {
            integrationVersionId: version.id,
            acceptanceState: IntegrationAcceptanceState.DISCOVERED,
            notes: 'Initial discovery recorded at version creation',
          },
        });

        return version;
      });
    } catch (error) {
      this.handleWriteError(error, dto.integrationDefinitionId, dto.version);
    }
  }

  async findByDefinition(integrationDefinitionId: string): Promise<IntegrationVersion[]> {
    await this.validation.ensureIntegrationDefinitionExists(integrationDefinitionId);

    return this.prisma.integrationVersion.findMany({
      where: { integrationDefinitionId },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async findOne(id: string): Promise<IntegrationVersion> {
    const record = await this.prisma.integrationVersion.findUnique({ where: { id } });

    if (!record) {
      throw new NotFoundException(`Integration version with id "${id}" was not found`);
    }

    return record;
  }

  async update(id: string, dto: UpdateIntegrationVersionDto): Promise<IntegrationVersion> {
    this.boundary.rejectForbiddenVersionFields(dto as unknown as Record<string, unknown>);
    const existing = await this.findOne(id);
    this.boundary.assertAcceptedVersionImmutable(
      existing.acceptedAt,
      dto as unknown as Record<string, unknown>,
    );

    if (existing.status === IntegrationVersionStatus.SUPERSEDED) {
      throw new BadRequestException('Superseded integration versions are retained and immutable');
    }

    const data: Prisma.IntegrationVersionUpdateInput = {};

    if (dto.securityProfile !== undefined) data.securityProfile = dto.securityProfile;
    if (dto.privacyProfile !== undefined) data.privacyProfile = dto.privacyProfile;
    if (dto.retentionProfile !== undefined) data.retentionProfile = dto.retentionProfile;
    if (dto.availabilityExpectation !== undefined) {
      data.availabilityExpectation = dto.availabilityExpectation;
    }
    if (dto.recoveryExpectation !== undefined) data.recoveryExpectation = dto.recoveryExpectation;
    if (dto.fallbackProcedure !== undefined) data.fallbackProcedure = dto.fallbackProcedure;
    if (dto.effectiveFrom !== undefined) data.effectiveFrom = new Date(dto.effectiveFrom);
    if (dto.effectiveUntil !== undefined) data.effectiveUntil = new Date(dto.effectiveUntil);

    return this.prisma.integrationVersion.update({
      where: { id },
      data,
    });
  }

  async supersede(id: string, supersedingVersionId: string): Promise<IntegrationVersion> {
    const existing = await this.findOne(id);
    const superseding = await this.findOne(supersedingVersionId);

    if (existing.integrationDefinitionId !== superseding.integrationDefinitionId) {
      throw new BadRequestException('Superseding version must belong to the same integration definition');
    }

    if (existing.status === IntegrationVersionStatus.SUPERSEDED) {
      throw new BadRequestException('Version is already superseded');
    }

    return this.prisma.integrationVersion.update({
      where: { id },
      data: {
        status: IntegrationVersionStatus.SUPERSEDED,
        supersededByVersionId: supersedingVersionId,
      },
    });
  }

  async markConfigured(id: string): Promise<IntegrationVersion> {
    const existing = await this.findOne(id);

    if (existing.status === IntegrationVersionStatus.SUPERSEDED) {
      throw new BadRequestException('Cannot configure a superseded version');
    }

    return this.prisma.integrationVersion.update({
      where: { id },
      data: { status: IntegrationVersionStatus.CONFIGURED },
    });
  }

  async listIncludingSuperseded(integrationDefinitionId: string): Promise<IntegrationVersion[]> {
    return this.prisma.integrationVersion.findMany({
      where: { integrationDefinitionId },
      orderBy: [{ version: 'asc' }],
    });
  }

  private handleWriteError(
    error: unknown,
    integrationDefinitionId: string,
    version: string,
  ): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(
        `Integration version "${version}" already exists for definition "${integrationDefinitionId}"`,
      );
    }

    throw error;
  }
}
