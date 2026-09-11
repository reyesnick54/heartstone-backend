import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { MembershipStatus, OrganizationMembership, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { IdentityValidationService } from '../common/identity-validation.service';
import { assertNotTerminal, assertStatusTransition } from '../common/lifecycle-transition.util';
import { CreateMembershipDto } from './dto/create-membership.dto';
import { QueryMembershipsDto } from './dto/query-memberships.dto';
import { UpdateMembershipDto } from './dto/update-membership.dto';

const TERMINAL_STATUSES: MembershipStatus[] = [MembershipStatus.REVOKED];

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

  async findAll(query: QueryMembershipsDto): Promise<OrganizationMembership[]> {
    const where: Prisma.OrganizationMembershipWhereInput = {};

    if (query.organizationId !== undefined) {
      where.organizationId = query.organizationId;
    }
    if (query.identityId !== undefined) {
      where.identityId = query.identityId;
    }
    if (query.status !== undefined) {
      where.status = query.status;
    }

    return this.prisma.organizationMembership.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async findOne(id: string): Promise<OrganizationMembership> {
    const membership = await this.prisma.organizationMembership.findUnique({ where: { id } });
    if (!membership) {
      throw new NotFoundException(`Organization membership with id "${id}" was not found`);
    }
    return membership;
  }

  async update(id: string, dto: UpdateMembershipDto): Promise<OrganizationMembership> {
    const membership = await this.findOne(id);
    assertNotTerminal(membership.status, TERMINAL_STATUSES, 'Organization membership');
    return this.prisma.organizationMembership.update({ where: { id }, data: dto });
  }

  async activate(id: string): Promise<OrganizationMembership> {
    const membership = await this.findOne(id);
    assertStatusTransition(
      membership.status,
      [MembershipStatus.PENDING, MembershipStatus.SUSPENDED],
      MembershipStatus.ACTIVE,
      'organization membership',
    );

    return this.prisma.organizationMembership.update({
      where: { id },
      data: { status: MembershipStatus.ACTIVE },
    });
  }

  async suspend(id: string): Promise<OrganizationMembership> {
    const membership = await this.findOne(id);
    assertStatusTransition(
      membership.status,
      [MembershipStatus.ACTIVE],
      MembershipStatus.SUSPENDED,
      'organization membership',
    );

    return this.prisma.organizationMembership.update({
      where: { id },
      data: { status: MembershipStatus.SUSPENDED },
    });
  }

  async revoke(id: string): Promise<OrganizationMembership> {
    const membership = await this.findOne(id);
    assertNotTerminal(membership.status, TERMINAL_STATUSES, 'Organization membership');

    return this.prisma.organizationMembership.update({
      where: { id },
      data: { status: MembershipStatus.REVOKED, effectiveUntil: new Date() },
    });
  }

  async end(id: string): Promise<OrganizationMembership> {
    const membership = await this.findOne(id);
    assertNotTerminal(membership.status, TERMINAL_STATUSES, 'Organization membership');

    return this.prisma.organizationMembership.update({
      where: { id },
      data: { status: MembershipStatus.REVOKED, effectiveUntil: new Date() },
    });
  }
}
