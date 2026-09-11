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
import { Injectable, NotFoundException } from '@nestjs/common';
import { Person, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { QueryPersonsDto } from './dto/query-persons.dto';
import { UpdatePersonDto } from './dto/update-person.dto';

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

  async findAll(query: QueryPersonsDto): Promise<Person[]> {
    const where: Prisma.PersonWhereInput = {};

    if (query.familyName !== undefined) {
      where.familyName = query.familyName;
    }

    return this.prisma.person.findMany({
      where,
      orderBy: [{ familyName: 'asc' }, { givenName: 'asc' }],
    });
  }

  async findOne(id: string): Promise<Person> {
    const person = await this.prisma.person.findUnique({ where: { id } });
    if (!person) {
      throw new NotFoundException(`Person with id "${id}" was not found`);
    }
    return person;
  }

  async update(id: string, dto: UpdatePersonDto): Promise<Person> {
    await this.findOne(id);
    return this.prisma.person.update({ where: { id }, data: dto });
  }
}
