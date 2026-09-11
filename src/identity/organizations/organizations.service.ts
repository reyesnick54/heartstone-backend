import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Organization, OrganizationStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { assertNotTerminal, assertStatusTransition } from '../common/lifecycle-transition.util';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { QueryOrganizationsDto } from './dto/query-organizations.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

const TERMINAL_STATUSES: OrganizationStatus[] = [OrganizationStatus.REVOKED];

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: SecurityAuditService,
  ) {}

  async create(dto: CreateOrganizationDto): Promise<Organization> {
    try {
      const org = await this.prisma.organization.create({
        data: {
          code: dto.code,
          name: dto.name,
          description: dto.description,
          status: dto.status,
        },
      });

      await this.audit.record({
        eventType: 'ORGANIZATION_CREATED',
        metadata: { organizationId: org.id, code: org.code },
      });

      return org;
    } catch (error) {
      this.handleWriteError(error, dto.code);
    }
  }

  async findAll(query: QueryOrganizationsDto): Promise<Organization[]> {
    const where: Prisma.OrganizationWhereInput = {};

    if (query.status !== undefined) {
      where.status = query.status;
    }

    return this.prisma.organization.findMany({
      where,
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });
  }

  async findOne(id: string): Promise<Organization> {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) {
      throw new NotFoundException(`Organization with id "${id}" was not found`);
    }
    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto): Promise<Organization> {
    const org = await this.findOne(id);
    assertNotTerminal(org.status, TERMINAL_STATUSES, 'Organization');
    return this.prisma.organization.update({ where: { id }, data: dto });
  }

  async activate(id: string): Promise<Organization> {
    const org = await this.findOne(id);
    assertStatusTransition(
      org.status,
      [OrganizationStatus.PENDING, OrganizationStatus.SUSPENDED],
      OrganizationStatus.ACTIVE,
      'organization',
    );

    return this.prisma.organization.update({
      where: { id },
      data: { status: OrganizationStatus.ACTIVE },
    });
  }

  async suspend(id: string): Promise<Organization> {
    const org = await this.findOne(id);
    assertStatusTransition(
      org.status,
      [OrganizationStatus.ACTIVE],
      OrganizationStatus.SUSPENDED,
      'organization',
    );

    return this.prisma.organization.update({
      where: { id },
      data: { status: OrganizationStatus.SUSPENDED },
    });
  }

  async revoke(id: string): Promise<Organization> {
    const org = await this.findOne(id);
    assertNotTerminal(org.status, TERMINAL_STATUSES, 'Organization');

    return this.prisma.organization.update({
      where: { id },
      data: { status: OrganizationStatus.REVOKED },
    });
  }

  private handleWriteError(error: unknown, code?: string): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException(
        code
          ? `Organization with code "${code}" already exists`
          : 'Organization with the same code already exists',
      );
    }
    throw error;
  }
}
