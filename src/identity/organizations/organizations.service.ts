import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Organization, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';

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

  async findOne(id: string): Promise<Organization> {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) {
      throw new NotFoundException(`Organization with id "${id}" was not found`);
    }
    return org;
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
