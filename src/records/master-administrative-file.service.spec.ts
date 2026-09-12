import { ConflictException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { MasterAdministrativeFileLifecycleStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { MasterAdministrativeFileService } from './master-administrative-file.service';

describe('MasterAdministrativeFileService', () => {
  let service: MasterAdministrativeFileService;
  const prisma = {
    masterAdministrativeFile: {
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
    case: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    identity: { findUnique: jest.fn() },
    office: { findFirst: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [MasterAdministrativeFileService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = moduleRef.get(MasterAdministrativeFileService);
  });

  it('asserts file number immutability', async () => {
    prisma.masterAdministrativeFile.findUnique.mockResolvedValue({
      id: 'file-1',
      fileNumber: 'MAF-2026-000001',
    });

    await expect(
      service.assertFileNumberImmutable('file-1', 'MAF-2026-000002'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates all twenty section types during initialization', async () => {
    prisma.masterAdministrativeFile.findUnique.mockResolvedValue(null);
    prisma.case.findUnique.mockResolvedValue({
      id: 'case-1',
      applicationId: 'app-1',
      governmentServiceId: 'svc-1',
      governmentServiceVersionId: 'svc-v1',
      responsibleInstitutionId: 'inst-1',
      responsibleDepartmentId: 'dept-1',
      application: { id: 'app-1' },
      workflowInstances: [],
    });
    prisma.office.findFirst
      .mockResolvedValueOnce({
        id: 'office-admin',
        code: 'ADMIN',
        status: 'ACTIVE',
        department: { institutionId: 'inst-1' },
      })
      .mockResolvedValueOnce({
        id: 'office-records',
        code: 'RECORDS',
        status: 'ACTIVE',
        department: { institutionId: 'inst-1' },
      });
    prisma.office.findMany.mockResolvedValue([
      {
        id: 'office-admin',
        code: 'ADMIN',
        status: 'ACTIVE',
        departmentId: 'dept-1',
        department: { institutionId: 'inst-1' },
      },
      {
        id: 'office-records',
        code: 'RECORDS',
        status: 'ACTIVE',
        departmentId: 'dept-1',
        department: { institutionId: 'inst-1' },
      },
    ]);
    prisma.masterAdministrativeFile.count.mockResolvedValue(0);
    prisma.$transaction.mockImplementation((callback: (tx: typeof prisma) => Promise<unknown>) =>
      callback({
        masterAdministrativeFile: {
          create: jest.fn().mockResolvedValue({
            id: 'file-1',
            fileNumber: 'MAF-2026-000001',
            lifecycleStatus: MasterAdministrativeFileLifecycleStatus.OPEN,
            sections: Array.from({ length: 20 }, (_, index) => ({
              sectionType: `SECTION_${String(index + 1)}`,
              sectionNumber: index + 1,
            })),
          }),
        },
        case: { update: jest.fn().mockResolvedValue({}) },
      } as unknown as typeof prisma),
    );

    const file = await service.initializeForCase({ caseId: 'case-1' });
    expect(file.sections).toHaveLength(20);
  });
});
