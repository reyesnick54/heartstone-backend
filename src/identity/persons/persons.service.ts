import { Injectable, NotFoundException } from '@nestjs/common';
import { Person } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { CreatePersonDto } from './dto/create-person.dto';

@Injectable()
export class PersonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: SecurityAuditService,
  ) {}

  async create(dto: CreatePersonDto): Promise<Person> {
    const person = await this.prisma.person.create({
      data: {
        givenName: dto.givenName,
        familyName: dto.familyName,
        displayName: dto.displayName ?? `${dto.givenName} ${dto.familyName}`,
      },
    });

    await this.audit.record({
      eventType: 'PERSON_CREATED',
      metadata: { personId: person.id },
    });

    return person;
  }

  async findOne(id: string): Promise<Person> {
    const person = await this.prisma.person.findUnique({ where: { id } });
    if (!person) {
      throw new NotFoundException(`Person with id "${id}" was not found`);
    }
    return person;
  }
}
