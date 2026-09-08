import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  type Jurisdiction,
  JurisdictionType,
  Prisma,
  StructuralLifecycleStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { JurisdictionsService } from './jurisdictions.service';

describe('JurisdictionsService', () => {
  let service: JurisdictionsService;
  let prisma: {
    jurisdiction: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  const sampleJurisdiction: Jurisdiction = {
    id: '11111111-1111-4111-8111-111111111111',
    code: 'US-FED',
    name: 'United States Federal Government',
    description: null,
    type: JurisdictionType.NATIONAL,
    status: StructuralLifecycleStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      jurisdiction: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JurisdictionsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get(JurisdictionsService);
  });

  it('creates a jurisdiction', async () => {
    prisma.jurisdiction.create.mockResolvedValue(sampleJurisdiction);

    await expect(
      service.create({
        code: 'US-FED',
        name: 'United States Federal Government',
        type: JurisdictionType.NATIONAL,
      }),
    ).resolves.toEqual(sampleJurisdiction);
  });

  it('rejects duplicate jurisdiction codes', async () => {
    prisma.jurisdiction.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.16.1',
      }),
    );

    await expect(
      service.create({
        code: 'US-FED',
        name: 'Duplicate',
        type: JurisdictionType.NATIONAL,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('throws when a jurisdiction is not found', async () => {
    prisma.jurisdiction.findUnique.mockResolvedValue(null);

    await expect(service.findOne(sampleJurisdiction.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates mutable fields without changing code', async () => {
    prisma.jurisdiction.findUnique.mockResolvedValue(sampleJurisdiction);
    prisma.jurisdiction.update.mockResolvedValue({
      ...sampleJurisdiction,
      status: StructuralLifecycleStatus.ARCHIVED,
    });

    await expect(
      service.update(sampleJurisdiction.id, {
        status: StructuralLifecycleStatus.ARCHIVED,
      }),
    ).resolves.toMatchObject({
      status: StructuralLifecycleStatus.ARCHIVED,
      code: 'US-FED',
    });

    expect(prisma.jurisdiction.update).toHaveBeenCalledWith({
      where: { id: sampleJurisdiction.id },
      data: { status: StructuralLifecycleStatus.ARCHIVED },
    });
  });
});
