import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { type Department, Prisma } from '@prisma/client';

import { RecordStatus } from '../common/enums/record-status.enum';
import { PrismaService } from '../database/prisma.service';
import { DepartmentService } from './department.service';

describe('DepartmentService', () => {
  let service: DepartmentService;

  const mockDepartment: Department = {
    id: 'dept-1',
    institutionId: 'inst-1',
    code: 'FIN-OPS',
    name: 'Financial Operations',
    description: null,
    status: RecordStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const prisma = {
    institution: {
      findUnique: jest.fn(),
    },
    department: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get(DepartmentService);
    jest.clearAllMocks();
  });

  it('creates a department when institution exists', async () => {
    prisma.institution.findUnique.mockResolvedValue({ id: 'inst-1' });
    prisma.department.create.mockResolvedValue(mockDepartment);

    const result = await service.create({
      institutionId: 'inst-1',
      code: 'FIN-OPS',
      name: 'Financial Operations',
    });

    expect(result).toEqual(mockDepartment);
  });

  it('rejects creation when institution does not exist', async () => {
    prisma.institution.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        institutionId: 'missing',
        code: 'FIN-OPS',
        name: 'Financial Operations',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects duplicate code within the same institution', async () => {
    prisma.institution.findUnique.mockResolvedValue({ id: 'inst-1' });
    prisma.department.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '6.0.0',
      }),
    );

    await expect(
      service.create({
        institutionId: 'inst-1',
        code: 'FIN-OPS',
        name: 'Financial Operations',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('filters departments by institution and status', async () => {
    prisma.department.findMany.mockResolvedValue([mockDepartment]);

    const result = await service.findAll({
      institutionId: 'inst-1',
      status: RecordStatus.ACTIVE,
    });

    expect(prisma.department.findMany).toHaveBeenCalledWith({
      where: {
        institutionId: 'inst-1',
        status: RecordStatus.ACTIVE,
      },
      orderBy: { createdAt: 'asc' },
    });
    expect(result).toEqual([mockDepartment]);
  });

  it('returns inactive departments by id', async () => {
    const inactive = { ...mockDepartment, status: RecordStatus.INACTIVE };
    prisma.department.findUnique.mockResolvedValue(inactive);

    const result = await service.findById('dept-1');

    expect(result.status).toBe(RecordStatus.INACTIVE);
  });

  it('throws when department is not found', async () => {
    prisma.department.findUnique.mockResolvedValue(null);

    await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
  });
});
