import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { type Office, Prisma, StructuralLifecycleStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { OfficesService } from './offices.service';

describe('OfficesService', () => {
  let service: OfficesService;
  let prisma: {
    department: {
      findUnique: jest.Mock;
    };
    office: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  const departmentId = '11111111-1111-4111-8111-111111111111';
  const sampleOffice: Office = {
    id: '22222222-2222-4222-8222-222222222222',
    departmentId,
    code: 'DIR-BL',
    title: 'Director of Business Licensing',
    description: null,
    status: StructuralLifecycleStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      department: {
        findUnique: jest.fn(),
      },
      office: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OfficesService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get(OfficesService);
  });

  it('rejects offices referencing a missing department', async () => {
    prisma.department.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        departmentId,
        code: 'DIR-BL',
        title: 'Director of Business Licensing',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates an office for an existing department', async () => {
    prisma.department.findUnique.mockResolvedValue({ id: departmentId });
    prisma.office.create.mockResolvedValue(sampleOffice);

    await expect(
      service.create({
        departmentId,
        code: 'DIR-BL',
        title: 'Director of Business Licensing',
      }),
    ).resolves.toEqual(sampleOffice);
  });

  it('rejects duplicate office codes within the same department', async () => {
    prisma.department.findUnique.mockResolvedValue({ id: departmentId });
    prisma.office.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.16.1',
      }),
    );

    await expect(
      service.create({
        departmentId,
        code: 'DIR-BL',
        title: 'Duplicate',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('preserves history when status changes', async () => {
    prisma.office.findUnique.mockResolvedValue(sampleOffice);
    prisma.office.update.mockResolvedValue({
      ...sampleOffice,
      status: StructuralLifecycleStatus.INACTIVE,
    });

    await expect(
      service.update(sampleOffice.id, {
        status: StructuralLifecycleStatus.INACTIVE,
      }),
    ).resolves.toMatchObject({
      id: sampleOffice.id,
      code: 'DIR-BL',
      departmentId,
      status: StructuralLifecycleStatus.INACTIVE,
    });
  });
});
