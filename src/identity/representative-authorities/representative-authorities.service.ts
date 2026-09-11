import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RepresentativeAuthority, RepresentativeAuthorityStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { AuthorityBoundaryService } from '../common/authority-boundary.service';
import { IdentityValidationService } from '../common/identity-validation.service';
import { assertNotTerminal, assertStatusTransition } from '../common/lifecycle-transition.util';
import { CreateRepresentativeAuthorityDto } from './dto/create-representative-authority.dto';
import { QueryRepresentativeAuthoritiesDto } from './dto/query-representative-authorities.dto';
import { UpdateRepresentativeAuthorityDto } from './dto/update-representative-authority.dto';

const TERMINAL_STATUSES: RepresentativeAuthorityStatus[] = [
  RepresentativeAuthorityStatus.REVOKED,
  RepresentativeAuthorityStatus.ENDED,
];

@Injectable()
export class RepresentativeAuthoritiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: IdentityValidationService,
    private readonly audit: SecurityAuditService,
    private readonly authorityBoundary: AuthorityBoundaryService,
  ) {}

  async create(dto: CreateRepresentativeAuthorityDto): Promise<RepresentativeAuthority> {
    await this.validation.ensureOrganizationExists(dto.organizationId);
    await this.validation.ensureIdentityExists(dto.identityId);

    const authority = await this.prisma.representativeAuthority.create({
      data: {
        organizationId: dto.organizationId,
        identityId: dto.identityId,
        scopeDescription: dto.scopeDescription,
        status: dto.status,
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveUntil: dto.effectiveUntil ? new Date(dto.effectiveUntil) : undefined,
      },
    });

    this.authorityBoundary.assertNoGovernmentAuthority({
      identityId: dto.identityId,
      organizationId: dto.organizationId,
      representativeAuthorityId: authority.id,
    });

    await this.audit.record({
      eventType: 'REPRESENTATIVE_AUTHORITY_CREATED',
      identityId: dto.identityId,
      metadata: {
        representativeAuthorityId: authority.id,
        organizationId: dto.organizationId,
        note: 'Organizational representation only — not government authority',
      },
    });

    return authority;
  }

  async findAll(query: QueryRepresentativeAuthoritiesDto): Promise<RepresentativeAuthority[]> {
    const where: Prisma.RepresentativeAuthorityWhereInput = {};

    if (query.organizationId !== undefined) {
      where.organizationId = query.organizationId;
    }
    if (query.identityId !== undefined) {
      where.identityId = query.identityId;
    }
    if (query.status !== undefined) {
      where.status = query.status;
    }

    return this.prisma.representativeAuthority.findMany({
      where,
      orderBy: [{ effectiveFrom: 'desc' }],
    });
  }

  async findOne(id: string): Promise<RepresentativeAuthority> {
    const authority = await this.prisma.representativeAuthority.findUnique({ where: { id } });
    if (!authority) {
      throw new NotFoundException(`Representative authority with id "${id}" was not found`);
    }
    return authority;
  }

  async update(
    id: string,
    dto: UpdateRepresentativeAuthorityDto,
  ): Promise<RepresentativeAuthority> {
    const authority = await this.findOne(id);
    assertNotTerminal(authority.status, TERMINAL_STATUSES, 'Representative authority');
    return this.prisma.representativeAuthority.update({ where: { id }, data: dto });
  }

  async activate(id: string): Promise<RepresentativeAuthority> {
    const authority = await this.findOne(id);
    assertStatusTransition(
      authority.status,
      [RepresentativeAuthorityStatus.PENDING, RepresentativeAuthorityStatus.SUSPENDED],
      RepresentativeAuthorityStatus.ACTIVE,
      'representative authority',
    );

    return this.prisma.representativeAuthority.update({
      where: { id },
      data: { status: RepresentativeAuthorityStatus.ACTIVE },
    });
  }

  async suspend(id: string): Promise<RepresentativeAuthority> {
    const authority = await this.findOne(id);
    assertStatusTransition(
      authority.status,
      [RepresentativeAuthorityStatus.ACTIVE],
      RepresentativeAuthorityStatus.SUSPENDED,
      'representative authority',
    );

    return this.prisma.representativeAuthority.update({
      where: { id },
      data: { status: RepresentativeAuthorityStatus.SUSPENDED },
    });
  }

  async revoke(id: string): Promise<RepresentativeAuthority> {
    const authority = await this.findOne(id);
    assertNotTerminal(authority.status, TERMINAL_STATUSES, 'Representative authority');

    const revoked = await this.prisma.representativeAuthority.update({
      where: { id },
      data: { status: RepresentativeAuthorityStatus.REVOKED },
    });

    this.authorityBoundary.assertNoGovernmentAuthority({
      identityId: authority.identityId,
      organizationId: authority.organizationId,
      representativeAuthorityId: id,
    });

    return revoked;
  }

  async end(id: string): Promise<RepresentativeAuthority> {
    const authority = await this.findOne(id);
    assertNotTerminal(authority.status, TERMINAL_STATUSES, 'Representative authority');

    const ended = await this.prisma.representativeAuthority.update({
      where: { id },
      data: {
        status: RepresentativeAuthorityStatus.ENDED,
        effectiveUntil: new Date(),
      },
    });

    this.authorityBoundary.assertNoGovernmentAuthority({
      identityId: authority.identityId,
      organizationId: authority.organizationId,
      representativeAuthorityId: id,
    });

    return ended;
  }
}
