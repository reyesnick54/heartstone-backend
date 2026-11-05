import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { GoverningSource, GoverningSourceStatus, Prisma } from '@prisma/client';

import { GOVERNMENT_AUDIT_EVENT_TYPES } from '../../audit-governance/audit-governance.constants';
import { GovernmentAuditLedgerService } from '../../audit-governance/ledger/government-audit-ledger.service';
import { PrismaService } from '../../database/prisma.service';
import { hashContent } from '../common/authority-hash.util';
import { CreateGoverningSourceDto } from './dto/create-governing-source.dto';
import { GoverningSourceResponseDto } from './dto/governing-source-response.dto';

export interface GoverningSourceActor {
  /** Always the authenticated session identity; never a request field. */
  actorIdentityId: string;
  sessionId?: string;
}

@Injectable()
export class GoverningSourcesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLedger: GovernmentAuditLedgerService,
  ) {}

  async create(dto: CreateGoverningSourceDto): Promise<GoverningSourceResponseDto> {
    const contentHash = hashContent(dto.content);
    const effectiveFrom = new Date(dto.effectiveFrom);
    const effectiveUntil = dto.effectiveUntil ? new Date(dto.effectiveUntil) : null;

    const source = await this.prisma.governingSource.create({
      data: {
        code: dto.code,
        title: dto.title,
        versionLabel: dto.versionLabel,
        status: GoverningSourceStatus.DRAFT,
        effectiveFrom,
        effectiveUntil,
        contentHash,
        versions: {
          create: {
            versionLabel: dto.versionLabel,
            contentHash,
          },
        },
      },
    });

    return this.toResponse(source);
  }

  async authenticate(
    id: string,
    actor: GoverningSourceActor & { verificationReference?: string },
  ): Promise<GoverningSourceResponseDto> {
    const existing = await this.prisma.governingSource.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`GoverningSource "${id}" was not found`);
    }

    if (existing.status === GoverningSourceStatus.REVOKED) {
      throw new BadRequestException('Cannot authenticate a revoked governing source');
    }
    if (existing.status === GoverningSourceStatus.AUTHENTICATED) {
      throw new BadRequestException('Governing source is already authenticated');
    }

    const source = await this.prisma.governingSource.update({
      where: { id },
      data: {
        status: GoverningSourceStatus.AUTHENTICATED,
        authenticatedAt: new Date(),
        authenticatedByIdentityId: actor.actorIdentityId,
      },
    });

    await this.auditLedger.append({
      eventType: GOVERNMENT_AUDIT_EVENT_TYPES.ADMINISTRATIVE_CHANGE,
      actorIdentityId: actor.actorIdentityId,
      sessionId: actor.sessionId,
      action: 'AUTHENTICATE_GOVERNING_SOURCE',
      outcome: 'COMPLETED',
      resourceType: 'GoverningSource',
      resourceId: source.id,
      newStateHash: source.contentHash,
      metadata: {
        code: source.code,
        versionLabel: source.versionLabel,
        priorStatus: existing.status,
        verificationReference: actor.verificationReference ?? null,
      },
      sourceDomainEventType: 'GoverningSource',
      sourceDomainEventId: `${source.id}:authenticate`,
    });

    return this.toResponse(source);
  }

  async revoke(id: string, actor: GoverningSourceActor): Promise<GoverningSourceResponseDto> {
    const existing = await this.prisma.governingSource.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`GoverningSource "${id}" was not found`);
    }
    if (existing.status === GoverningSourceStatus.REVOKED) {
      throw new BadRequestException('Governing source is already revoked');
    }

    const source = await this.prisma.governingSource.update({
      where: { id },
      data: {
        status: GoverningSourceStatus.REVOKED,
        revokedAt: new Date(),
      },
    });

    await this.auditLedger.append({
      eventType: GOVERNMENT_AUDIT_EVENT_TYPES.ADMINISTRATIVE_CHANGE,
      actorIdentityId: actor.actorIdentityId,
      sessionId: actor.sessionId,
      action: 'REVOKE_GOVERNING_SOURCE',
      outcome: 'COMPLETED',
      resourceType: 'GoverningSource',
      resourceId: source.id,
      metadata: { code: source.code, priorStatus: existing.status },
      sourceDomainEventType: 'GoverningSource',
      sourceDomainEventId: `${source.id}:revoke`,
    });

    return this.toResponse(source);
  }

  async findOne(id: string): Promise<GoverningSourceResponseDto> {
    const source = await this.prisma.governingSource.findUnique({ where: { id } });
    if (!source) {
      throw new NotFoundException(`GoverningSource "${id}" was not found`);
    }
    return this.toResponse(source);
  }

  async findAll(query?: { status?: GoverningSourceStatus }): Promise<GoverningSourceResponseDto[]> {
    const where: Prisma.GoverningSourceWhereInput = {};
    if (query?.status) {
      where.status = query.status;
    }

    const sources = await this.prisma.governingSource.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
    });

    return sources.map((source) => this.toResponse(source));
  }

  toResponse(source: GoverningSource): GoverningSourceResponseDto {
    return {
      id: source.id,
      code: source.code,
      title: source.title,
      versionLabel: source.versionLabel,
      status: source.status,
      effectiveFrom: source.effectiveFrom,
      effectiveUntil: source.effectiveUntil,
      contentHash: source.contentHash,
      authenticatedAt: source.authenticatedAt,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt,
    };
  }
}
