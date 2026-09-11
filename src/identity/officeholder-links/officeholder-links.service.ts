import { ConflictException, Injectable } from '@nestjs/common';
import { IdentityOfficeholderLink, IdentityOfficeholderLinkStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { AuthorityBoundaryService } from '../common/authority-boundary.service';
import { IdentityValidationService } from '../common/identity-validation.service';
import { CreateOfficeholderLinkDto } from './dto/create-officeholder-link.dto';

@Injectable()
export class OfficeholderLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: IdentityValidationService,
    private readonly audit: SecurityAuditService,
    private readonly authorityBoundary: AuthorityBoundaryService,
  ) {}

  async create(dto: CreateOfficeholderLinkDto): Promise<IdentityOfficeholderLink> {
    await this.validation.ensureIdentityExists(dto.identityId);
    await this.validation.ensureOfficeholderExists(dto.officeholderId);

    try {
      const link = await this.prisma.identityOfficeholderLink.create({
        data: {
          identityId: dto.identityId,
          officeholderId: dto.officeholderId,
          linkedByIdentityId: dto.linkedByIdentityId,
          status: dto.status ?? IdentityOfficeholderLinkStatus.ACTIVE,
        },
      });

      this.authorityBoundary.assertNoGovernmentAuthority({
        identityId: dto.identityId,
        officeholderId: dto.officeholderId,
      });

      await this.audit.record({
        eventType: 'OFFICEHOLDER_LINK_CREATED',
        identityId: dto.identityId,
        actorIdentityId: dto.linkedByIdentityId,
        metadata: {
          officeholderId: dto.officeholderId,
          linkId: link.id,
          note: 'Identity-to-Officeholder link does not confer government authority',
        },
      });

      return link;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Link already exists for this identity and officeholder');
      }
      throw error;
    }
  }
}
