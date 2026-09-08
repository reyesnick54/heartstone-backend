import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { type Officeholder, Prisma, StructuralLifecycleStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { OfficeholdersService } from './officeholders.service';

describe('OfficeholdersService', () => {
  let service: OfficeholdersService;
  let prisma: {
    officeholder: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  const sampleOfficeholder: Officeholder = {
    id: '33333333-3333-4333-8333-333333333333',
    referenceCode: 'OH-2026-001',
    displayName: 'Jane Q. Public',
    givenName: 'Jane',
    familyName: 'Public',
    titlePrefix: null,
    titleSuffix: null,
    status: StructuralLifecycleStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      officeholder: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfficeholdersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get(OfficeholdersService);
  });

  it('creates an officeholder without requiring an office', async () => {
    prisma.officeholder.create.mockResolvedValue(sampleOfficeholder);

    await expect(
      service.create({
        referenceCode: 'OH-2026-001',
        displayName: 'Jane Q. Public',
        givenName: 'Jane',
        familyName: 'Public',
      }),
    ).resolves.toEqual(sampleOfficeholder);

    expect(prisma.officeholder.create).toHaveBeenCalledWith({
      data: {
        referenceCode: 'OH-2026-001',
        displayName: 'Jane Q. Public',
        givenName: 'Jane',
        familyName: 'Public',
        titlePrefix: undefined,
        titleSuffix: undefined,
        status: undefined,
      },
    });
  });

  it('rejects duplicate reference codes', async () => {
    prisma.officeholder.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.16.1',
      }),
    );

    await expect(
      service.create({
        referenceCode: 'OH-2026-001',
        displayName: 'Duplicate',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns not found for missing officeholders', async () => {
    prisma.officeholder.findUnique.mockResolvedValue(null);

    await expect(service.findOne(sampleOfficeholder.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('preserves history when status changes', async () => {
    prisma.officeholder.findUnique.mockResolvedValue(sampleOfficeholder);
    prisma.officeholder.update.mockResolvedValue({
      ...sampleOfficeholder,
      status: StructuralLifecycleStatus.ARCHIVED,
    });

    await expect(
      service.update(sampleOfficeholder.id, {
        status: StructuralLifecycleStatus.ARCHIVED,
      }),
    ).resolves.toMatchObject({
      id: sampleOfficeholder.id,
      referenceCode: 'OH-2026-001',
      status: StructuralLifecycleStatus.ARCHIVED,
    });
  });
});
