import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { IdentityAccountStatus, ServiceIdentity } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

export interface CreateServiceIdentityInput {
  code: string;
  name: string;
}

@Injectable()
export class ServiceIdentitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateServiceIdentityInput): Promise<ServiceIdentity> {
    try {
      return await this.prisma.serviceIdentity.create({
        data: {
          code: input.code,
          name: input.name,
          status: IdentityAccountStatus.ACTIVE,
        },
      });
    } catch (error) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException(`Service identity with code "${input.code}" already exists`);
      }

      throw error;
    }
  }

  async findById(id: string): Promise<ServiceIdentity> {
    const identity = await this.prisma.serviceIdentity.findUnique({ where: { id } });

    if (!identity) {
      throw new NotFoundException(`Service identity with id "${id}" was not found`);
    }

    return identity;
  }

  async findByCode(code: string): Promise<ServiceIdentity | null> {
    return this.prisma.serviceIdentity.findUnique({ where: { code } });
  }
}
