import { ConflictException, Injectable } from '@nestjs/common';
import { MembershipStatus, OrganizationMembership, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { IdentityValidationService } from '../common/identity-validation.service';
import { CreateMembershipDto } from './dto/create-membership.dto';

@Injectable()
export class MembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validation: IdentityValidationService,
    private readonly audit: SecurityAuditService,
  ) {}

  async create(dto: CreateMembershipDto): Promise<OrganizationMembership> {
    await this.validation.ensureOrganizationExists(dto.organizationId);
    await this.validation.ensureIdentityExists(dto.identityId);

    try {
      const membership = await this.prisma.organizationMembership.create({
        data: {
          organizationId: dto.organizationId,
          identityId: dto.identityId,
          roleLabel: dto.roleLabel,
          status: dto.status ?? MembershipStatus.ACTIVE,
        },
      });

      await this.audit.record({
        eventType: 'MEMBERSHIP_CREATED',
        identityId: dto.identityId,
        metadata: { organizationId: dto.organizationId, membershipId: membership.id },
      });

      return membership;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Membership already exists for this organization and identity');
      }
      throw error;
    }
  }
}
