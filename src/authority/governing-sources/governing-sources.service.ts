import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  GoverningSource,
  GoverningSourceRelationship,
  GoverningSourceStatus,
  Prisma,
  SourceAuthenticationStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { AuthorityAuditService } from '../common/authority-audit.service';
import { CreateGoverningSourceDto } from './dto/create-governing-source.dto';
import { CreateGoverningSourceRelationshipDto } from './dto/create-governing-source-relationship.dto';
import { QueryGoverningSourcesDto } from './dto/query-governing-sources.dto';
import { UpdateGoverningSourceAuthenticationDto } from './dto/update-governing-source-authentication.dto';
import { UpdateGoverningSourceStatusDto } from './dto/update-governing-source-status.dto';

@Injectable()
export class GoverningSourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuthorityAuditService,
  ) {}

  async create(dto: CreateGoverningSourceDto): Promise<GoverningSource> {
    if (dto.jurisdictionId) {
      await this.assertJurisdictionExists(dto.jurisdictionId);
    }

    try {
      const source = await this.prisma.governingSource.create({
        data: {
          sourceCode: dto.sourceCode,
          title: dto.title,
          sourceType: dto.sourceType,
          issuer: dto.issuer,
          jurisdictionId: dto.jurisdictionId,
          instrumentDate: dto.instrumentDate,
          effectiveDate: dto.effectiveDate,
          commencementDate: dto.commencementDate,
          expiryDate: dto.expiryDate,
          officialLocationRef: dto.officialLocationRef,
          documentFingerprint: dto.documentFingerprint,
          classificationMetadata: dto.classificationMetadata as Prisma.InputJsonValue,
          authenticationStatus: SourceAuthenticationStatus.UNVERIFIED,
          sourceStatus: GoverningSourceStatus.IDENTIFIED,
        },
      });

      await this.audit.record('GOVERNING_SOURCE_CREATED', {
        governingSourceId: source.id,
        sourceCode: source.sourceCode,
        sourceType: source.sourceType,
        authenticationStatus: source.authenticationStatus,
        sourceStatus: source.sourceStatus,
      });

      return source;
    } catch (error) {
      this.handleWriteError(error, dto.sourceCode);
    }
  }

  async findAll(query: QueryGoverningSourcesDto): Promise<GoverningSource[]> {
    const where: Prisma.GoverningSourceWhereInput = {};

    if (query.sourceStatus !== undefined) {
      where.sourceStatus = query.sourceStatus;
    }

    if (query.authenticationStatus !== undefined) {
      where.authenticationStatus = query.authenticationStatus;
    }

    if (query.sourceType !== undefined) {
      where.sourceType = query.sourceType;
    }

    if (query.jurisdictionId !== undefined) {
      where.jurisdictionId = query.jurisdictionId;
    }

    return this.prisma.governingSource.findMany({
      where,
      orderBy: [{ title: 'asc' }, { sourceCode: 'asc' }],
    });
  }

  async findOne(id: string): Promise<GoverningSource> {
    const source = await this.prisma.governingSource.findUnique({ where: { id } });

    if (!source) {
      throw new NotFoundException(`Governing source with id "${id}" was not found`);
    }

    return source;
  }

  async updateAuthenticationStatus(
    id: string,
    dto: UpdateGoverningSourceAuthenticationDto,
  ): Promise<GoverningSource> {
    const existing = await this.findOne(id);

    const source = await this.prisma.governingSource.update({
      where: { id },
      data: { authenticationStatus: dto.authenticationStatus },
    });

    await this.audit.record('GOVERNING_SOURCE_AUTHENTICATION_UPDATED', {
      governingSourceId: source.id,
      sourceCode: source.sourceCode,
      previousAuthenticationStatus: existing.authenticationStatus,
      newAuthenticationStatus: source.authenticationStatus,
    });

    return source;
  }

  async updateSourceStatus(
    id: string,
    dto: UpdateGoverningSourceStatusDto,
  ): Promise<GoverningSource> {
    const existing = await this.findOne(id);

    const source = await this.prisma.governingSource.update({
      where: { id },
      data: { sourceStatus: dto.sourceStatus },
    });

    await this.audit.record('GOVERNING_SOURCE_STATUS_UPDATED', {
      governingSourceId: source.id,
      sourceCode: source.sourceCode,
      previousSourceStatus: existing.sourceStatus,
      newSourceStatus: source.sourceStatus,
    });

    return source;
  }

  async createRelationship(
    sourceId: string,
    dto: CreateGoverningSourceRelationshipDto,
  ): Promise<GoverningSourceRelationship> {
    await this.findOne(sourceId);
    await this.findOne(dto.relatedSourceId);

    if (sourceId === dto.relatedSourceId) {
      throw new ConflictException('A governing source cannot relate to itself');
    }

    try {
      const relationship = await this.prisma.governingSourceRelationship.create({
        data: {
          sourceId,
          relatedSourceId: dto.relatedSourceId,
          relationshipType: dto.relationshipType,
          effectiveFrom: dto.effectiveFrom,
          effectiveUntil: dto.effectiveUntil,
          notes: dto.notes,
        },
      });

      await this.audit.record('GOVERNING_SOURCE_RELATIONSHIP_CREATED', {
        relationshipId: relationship.id,
        sourceId,
        relatedSourceId: dto.relatedSourceId,
        relationshipType: dto.relationshipType,
      });

      return relationship;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('This governing source relationship already exists');
      }

      throw error;
    }
  }

  async findRelationships(sourceId: string): Promise<GoverningSourceRelationship[]> {
    await this.findOne(sourceId);

    return this.prisma.governingSourceRelationship.findMany({
      where: {
        OR: [{ sourceId }, { relatedSourceId: sourceId }],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async assertJurisdictionExists(jurisdictionId: string): Promise<void> {
    const jurisdiction = await this.prisma.jurisdiction.findUnique({
      where: { id: jurisdictionId },
    });

    if (!jurisdiction) {
      throw new NotFoundException(`Jurisdiction with id "${jurisdictionId}" was not found`);
    }
  }

  private handleWriteError(error: unknown, sourceCode?: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(
        sourceCode
          ? `Governing source with code "${sourceCode}" already exists`
          : 'Governing source with the same code already exists',
      );
    }

    throw error;
  }
}
