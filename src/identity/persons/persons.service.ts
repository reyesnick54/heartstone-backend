import { Injectable } from '@nestjs/common';
import { IdentityAccountStatus, Person } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class PersonsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(displayName?: string): Promise<Person> {
    return this.prisma.person.create({
      data: {
        displayName,
        status: IdentityAccountStatus.ACTIVE,
      },
    });
  }

  async findById(id: string): Promise<Person | null> {
    return this.prisma.person.findUnique({ where: { id } });
  }
}
