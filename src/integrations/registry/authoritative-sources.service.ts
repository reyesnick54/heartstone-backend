import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AuthoritativeDesignationStatus,
  AuthoritativeSourceDesignation,
  AuthoritativeSourceStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { IntegrationsBoundaryService } from '../common/integrations-boundary.service';
import { IntegrationsValidationService } from '../common/integrations-validation.service';
import { CreateAuthoritativeDesignationDto } from '../dto/create-authoritative-designation.dto';
import { CreateFieldAuthorityMappingDto } from '../dto/create-field-authority-mapping.dto';
import { ProposeAuthoritativeDesignationDto } from '../dto/propose-authoritative-designation.dto';
import { IntegrationAcceptanceService } from './integration-acceptance.service';
import { IntegrationVersionsService } from './integration-versions.service';

@Injectable()
export class AuthoritativeSourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: IntegrationsValidationService,
    private readonly boundary: IntegrationsBoundaryService,
    private readonly versionsService: IntegrationVersionsService,
    private readonly acceptanceService: IntegrationAcceptanceService,
  ) {}

  async createDraft(dto: CreateAuthoritativeDesignationDto): Promise<AuthoritativeSourceDesignation> {
    this.boundary.rejectForbiddenAuthoritativeDesignationFields(
      dto as unknown as Record<string, unknown>,
    );
    this.boundary.assertNewIntegrationDefaultsNonAuthoritative(dto.sourceStatus);

    await this.validation.ensureIntegrationVersionExists(dto.integrationVersionId);
    await this.validation.ensureInstitutionExists(dto.institutionId);

    return this.prisma.authoritativeSourceDesignation.create({
      data: {
        integrationVersionId: dto.integrationVersionId,
        institutionId: dto.institutionId,
        datasetResource: dto.datasetResource,
        authoritySource: dto.authoritySource,
        scope: dto.scope,
        effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null,
        effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : null,
        sourceStatus: AuthoritativeSourceStatus.UNVERIFIED,
        designationStatus: AuthoritativeDesignationStatus.DRAFT,
      },
    });
  }

  async proposeDesignation(
    id: string,
    dto: ProposeAuthoritativeDesignationDto,
  ): Promise<AuthoritativeSourceDesignation> {
    const existing = await this.findOne(id);
    const version = await this.versionsService.findOne(existing.integrationVersionId);

    this.boundary.assertAuthoritativeDesignationRequiresInstitutionalAcceptance(
      version.currentAcceptanceState,
    );
    this.boundary.assertTechnicalAdminCannotDesignateAuthoritativeByRole(
      dto.actorRole,
      dto.sourceStatus,
    );

    if (dto.sourceStatus === AuthoritativeSourceStatus.AUTHORITATIVE && !dto.acceptanceRecordId) {
      throw new BadRequestException(
        'AUTHORITATIVE designation requires linked institutional acceptance record',
      );
    }

    return this.prisma.authoritativeSourceDesignation.update({
      where: { id },
      data: {
        sourceStatus: dto.sourceStatus,
        designationStatus: AuthoritativeDesignationStatus.PROPOSED,
        designatingAuthorityIdentityId: dto.designatingAuthorityIdentityId,
        designatingOfficeholderId: dto.designatingOfficeholderId,
        acceptanceRecordId: dto.acceptanceRecordId,
      },
    });
  }

  async activateDesignation(id: string): Promise<AuthoritativeSourceDesignation> {
    const existing = await this.findOne(id);

    if (existing.designationStatus !== AuthoritativeDesignationStatus.PROPOSED) {
      throw new BadRequestException('Only proposed designations can be activated');
    }

    if (existing.sourceStatus === AuthoritativeSourceStatus.AUTHORITATIVE && !existing.acceptanceRecordId) {
      throw new BadRequestException(
        'AUTHORITATIVE designation cannot be activated without acceptance record',
      );
    }

    return this.prisma.authoritativeSourceDesignation.update({
      where: { id },
      data: { designationStatus: AuthoritativeDesignationStatus.ACTIVE },
    });
  }

  async addFieldAuthorityMapping(
    designationId: string,
    dto: CreateFieldAuthorityMappingDto,
  ): Promise<void> {
    const designation = await this.findOne(designationId);
    this.boundary.assertFieldAuthorityPreserved(
      designation.sourceStatus,
      dto.sourceStatus ?? AuthoritativeSourceStatus.UNVERIFIED,
      dto.field,
    );

    try {
      await this.prisma.fieldAuthorityMapping.create({
        data: {
          authoritativeSourceDesignationId: designationId,
          field: dto.field,
          source: dto.source,
          sourceStatus: dto.sourceStatus ?? AuthoritativeSourceStatus.UNVERIFIED,
          scope: dto.scope,
          validity: dto.validity,
          conflictBehavior: dto.conflictBehavior,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException(`Field authority mapping for "${dto.field}" already exists`);
      }

      throw error;
    }
  }

  async findByVersion(integrationVersionId: string): Promise<AuthoritativeSourceDesignation[]> {
    await this.validation.ensureIntegrationVersionExists(integrationVersionId);

    return this.prisma.authoritativeSourceDesignation.findMany({
      where: { integrationVersionId },
      include: { fieldAuthorityMappings: true },
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  async findOne(id: string): Promise<AuthoritativeSourceDesignation> {
    const record = await this.prisma.authoritativeSourceDesignation.findUnique({
      where: { id },
      include: { fieldAuthorityMappings: true },
    });

    if (!record) {
      throw new NotFoundException(
        `Authoritative source designation with id "${id}" was not found`,
      );
    }

    return record;
  }
}
