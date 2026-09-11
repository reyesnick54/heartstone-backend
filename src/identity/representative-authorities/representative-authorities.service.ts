import { Injectable } from '@nestjs/common';
import { RepresentativeAuthority } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { AuthorityBoundaryService } from '../common/authority-boundary.service';
import { IdentityValidationService } from '../common/identity-validation.service';
import { CreateRepresentativeAuthorityDto } from './dto/create-representative-authority.dto';

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
}
