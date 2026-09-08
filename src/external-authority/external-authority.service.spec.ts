import { ConflictException, NotFoundException } from '@nestjs/common';
import { ExternalAuthorityType, Prisma, RecordStatus } from '@prisma/client';

import { type PrismaService } from '../database/prisma.service';
import { ExternalAuthorityService } from './external-authority.service';

describe('ExternalAuthorityService', () => {
  let service: ExternalAuthorityService;
  let prisma: {
    externalAuthority: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      externalAuthority: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    service = new ExternalAuthorityService(prisma as unknown as PrismaService);
  });

  it('creates an external authority', async () => {
    const created = {
      id: 'ea-1',
      code: 'EU-COMMISSION',
      name: 'European Commission',
      description: null,
      type: ExternalAuthorityType.INTERNATIONAL_BODY,
      jurisdictionDescription: null,
      status: RecordStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    prisma.externalAuthority.create.mockResolvedValue(created);

    await expect(
      service.create({
        code: 'EU-COMMISSION',
        name: 'European Commission',
        type: ExternalAuthorityType.INTERNATIONAL_BODY,
      }),
    ).resolves.toEqual(created);
  });

  it('throws NotFoundException when external authority is missing', async () => {
    prisma.externalAuthority.findUnique.mockResolvedValue(null);

    await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ConflictException for duplicate code', async () => {
    prisma.externalAuthority.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );

    await expect(
      service.create({
        code: 'DUPLICATE',
        name: 'Duplicate Authority',
        type: ExternalAuthorityType.OTHER,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('filters collection by status', async () => {
    prisma.externalAuthority.findMany.mockResolvedValue([]);

    await service.findAll({ status: RecordStatus.HISTORICAL });

    expect(prisma.externalAuthority.findMany).toHaveBeenCalledWith({
      where: { status: RecordStatus.HISTORICAL },
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });
  });
});
