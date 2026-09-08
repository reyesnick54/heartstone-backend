import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  type Institution,
  InstitutionType,
  Prisma,
  StructuralLifecycleStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { InstitutionsService } from './institutions.service';

describe('InstitutionsService', () => {
  let service: InstitutionsService;
  let prisma: {
    jurisdiction: {
      findUnique: jest.Mock;
    };
    institution: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  const jurisdictionId = '11111111-1111-4111-8111-111111111111';
  const sampleInstitution: Institution = {
    id: '22222222-2222-4222-8222-222222222222',
    jurisdictionId,
    code: 'DOT',
    name: 'Department of Transportation',
    description: null,
    type: InstitutionType.AGENCY,
    status: StructuralLifecycleStatus.ACTIVE,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    prisma = {
      jurisdiction: {
        findUnique: jest.fn(),
      },
      institution: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstitutionsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get(InstitutionsService);
  });

  it('rejects institutions referencing a missing jurisdiction', async () => {
    prisma.jurisdiction.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        jurisdictionId,
        code: 'DOT',
        name: 'Department of Transportation',
        type: InstitutionType.AGENCY,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates an institution for an existing jurisdiction', async () => {
    prisma.jurisdiction.findUnique.mockResolvedValue({ id: jurisdictionId });
    prisma.institution.create.mockResolvedValue(sampleInstitution);

    await expect(
      service.create({
        jurisdictionId,
        code: 'DOT',
        name: 'Department of Transportation',
        type: InstitutionType.AGENCY,
      }),
    ).resolves.toEqual(sampleInstitution);
  });

  it('rejects duplicate institution codes within the same jurisdiction', async () => {
    prisma.jurisdiction.findUnique.mockResolvedValue({ id: jurisdictionId });
    prisma.institution.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6.16.1',
      }),
    );

    await expect(
      service.create({
        jurisdictionId,
        code: 'DOT',
        name: 'Duplicate',
        type: InstitutionType.AGENCY,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('preserves history when status changes', async () => {
    prisma.institution.findUnique.mockResolvedValue(sampleInstitution);
    prisma.institution.update.mockResolvedValue({
      ...sampleInstitution,
      status: StructuralLifecycleStatus.INACTIVE,
    });

    await expect(
      service.update(sampleInstitution.id, {
        status: StructuralLifecycleStatus.INACTIVE,
      }),
    ).resolves.toMatchObject({
      id: sampleInstitution.id,
      code: 'DOT',
      status: StructuralLifecycleStatus.INACTIVE,
    });
  });
});
