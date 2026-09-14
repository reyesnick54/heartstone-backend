import { Injectable, NotFoundException } from '@nestjs/common';
import { CredentialRotationStatus, IntegrationCredentialReference } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntegrationsBoundaryService } from '../common/integrations-boundary.service';
import { IntegrationsValidationService } from '../common/integrations-validation.service';
import { CreateCredentialReferenceDto } from '../dto/create-credential-reference.dto';
import { CredentialReferenceResponseDto } from '../dto/credential-reference-response.dto';

@Injectable()
export class IntegrationCredentialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: IntegrationsValidationService,
    private readonly boundary: IntegrationsBoundaryService,
  ) {}

  async create(dto: CreateCredentialReferenceDto): Promise<CredentialReferenceResponseDto> {
    await this.validation.ensureIntegrationVersionExists(dto.integrationVersionId);

    const record = await this.prisma.integrationCredentialReference.create({
      data: {
        integrationVersionId: dto.integrationVersionId,
        credentialType: dto.credentialType,
        secretReference: dto.secretReference,
        certificateReference: dto.certificateReference,
        serviceIdentity: dto.serviceIdentity,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
        expiration: dto.expiration ? new Date(dto.expiration) : null,
        rotationStatus: dto.rotationStatus ?? CredentialRotationStatus.CURRENT,
      },
    });

    return this.toResponse(record);
  }

  async findByVersion(integrationVersionId: string): Promise<CredentialReferenceResponseDto[]> {
    await this.validation.ensureIntegrationVersionExists(integrationVersionId);

    const records = await this.prisma.integrationCredentialReference.findMany({
      where: { integrationVersionId },
      orderBy: [{ createdAt: 'asc' }],
    });

    return records.map((record) => this.toResponse(record));
  }

  async findOne(id: string): Promise<CredentialReferenceResponseDto> {
    const record = await this.prisma.integrationCredentialReference.findUnique({ where: { id } });

    if (!record) {
      throw new NotFoundException(`Integration credential reference with id "${id}" was not found`);
    }

    return this.toResponse(record);
  }

  async findIncludingExpired(integrationVersionId: string): Promise<CredentialReferenceResponseDto[]> {
    const records = await this.prisma.integrationCredentialReference.findMany({
      where: {
        integrationVersionId,
        OR: [
          { rotationStatus: CredentialRotationStatus.EXPIRED },
          { expiration: { lt: new Date() } },
        ],
      },
    });

    return records.map((record) => this.toResponse(record));
  }

  toResponse(record: IntegrationCredentialReference): CredentialReferenceResponseDto {
    const sanitized = this.boundary.sanitizeCredentialReference(record);

    return {
      id: record.id,
      integrationVersionId: record.integrationVersionId,
      credentialType: record.credentialType,
      serviceIdentity: record.serviceIdentity,
      effectiveFrom: record.effectiveFrom,
      expiration: record.expiration,
      rotationStatus: record.rotationStatus,
      secretReferenceConfigured: sanitized.secretReferenceConfigured,
      certificateReferenceConfigured: sanitized.certificateReferenceConfigured,
      isExpired: sanitized.isExpired,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
