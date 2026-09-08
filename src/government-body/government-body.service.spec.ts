import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { type GovernmentBody, Prisma } from '@prisma/client';

import { GovernmentBodyType } from '../common/enums/government-body-type.enum';
import { RecordStatus } from '../common/enums/record-status.enum';
import { PrismaService } from '../database/prisma.service';
import { GovernmentBodyService } from './government-body.service';

describe('GovernmentBodyService', () => {
  let service: GovernmentBodyService;

  const mockGovernmentBody: GovernmentBody = {
    id: 'gb-1',
    institutionId: 'inst-1',
    code: 'BOARD-01',
    name: 'Governing Board',
    description: null,
    type: GovernmentBodyType.GOVERNING_BOARD,
    status: RecordStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  const prisma = {
    institution: {
      findUnique: jest.fn(),
    },
    governmentBody: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GovernmentBodyService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get(GovernmentBodyService);
    jest.clearAllMocks();
  });

  it('creates a government body when institution exists', async () => {
    prisma.institution.findUnique.mockResolvedValue({ id: 'inst-1' });
    prisma.governmentBody.create.mockResolvedValue(mockGovernmentBody);

    const result = await service.create({
      institutionId: 'inst-1',
      code: 'BOARD-01',
      name: 'Governing Board',
      type: GovernmentBodyType.GOVERNING_BOARD,
    });

    expect(result).toEqual(mockGovernmentBody);
  });

  it('rejects creation when institution does not exist', async () => {
    prisma.institution.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        institutionId: 'missing',
        code: 'BOARD-01',
        name: 'Governing Board',
        type: GovernmentBodyType.GOVERNING_BOARD,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects duplicate code within the same institution', async () => {
    prisma.institution.findUnique.mockResolvedValue({ id: 'inst-1' });
    prisma.governmentBody.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '6.0.0',
      }),
    );

    await expect(
      service.create({
        institutionId: 'inst-1',
        code: 'BOARD-01',
        name: 'Governing Board',
        type: GovernmentBodyType.GOVERNING_BOARD,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('filters government bodies by institution, status, and type', async () => {
    prisma.governmentBody.findMany.mockResolvedValue([mockGovernmentBody]);

    const result = await service.findAll({
      institutionId: 'inst-1',
      status: RecordStatus.ACTIVE,
      type: GovernmentBodyType.GOVERNING_BOARD,
    });

    expect(prisma.governmentBody.findMany).toHaveBeenCalledWith({
      where: {
        institutionId: 'inst-1',
        status: RecordStatus.ACTIVE,
        type: GovernmentBodyType.GOVERNING_BOARD,
      },
      orderBy: { createdAt: 'asc' },
    });
    expect(result).toEqual([mockGovernmentBody]);
  });

  it('returns inactive government bodies by id', async () => {
    const inactive = { ...mockGovernmentBody, status: RecordStatus.INACTIVE };
    prisma.governmentBody.findUnique.mockResolvedValue(inactive);

    const result = await service.findById('gb-1');

    expect(result.status).toBe(RecordStatus.INACTIVE);
  });

  it('throws when government body is not found', async () => {
    prisma.governmentBody.findUnique.mockResolvedValue(null);

    await expect(service.findById('missing')).rejects.toThrow(NotFoundException);
  });
});
