import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { InstitutionExternalAuthorityRelationshipType, RecordStatus, StructuralLifecycleStatus } from '@prisma/client';

import { type PrismaService } from '../database/prisma.service';
import { type ExternalAuthorityService } from '../external-authority/external-authority.service';
import { type InstitutionService } from '../institution/institution.service';
import { InstitutionExternalAuthorityService } from './institution-external-authority.service';

describe('InstitutionExternalAuthorityService', () => {
  let service: InstitutionExternalAuthorityService;
  let prisma: {
    institutionExternalAuthority: {
      findFirst: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let institutionService: jest.Mocked<Pick<InstitutionService, 'assertActive'>>;
  let externalAuthorityService: jest.Mocked<Pick<ExternalAuthorityService, 'assertActive'>>;

  beforeEach(() => {
    prisma = {
      institutionExternalAuthority: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    institutionService = {
      assertActive: jest.fn(),
    };

    externalAuthorityService = {
      assertActive: jest.fn(),
    };

    service = new InstitutionExternalAuthorityService(
      prisma as unknown as PrismaService,
      institutionService as unknown as InstitutionService,
      externalAuthorityService as unknown as ExternalAuthorityService,
    );
  });

  it('rejects creation when institution is missing', async () => {
    institutionService.assertActive.mockRejectedValue(
      new NotFoundException("Institution 'missing' not found"),
    );

    await expect(
      service.create({
        institutionId: 'missing',
        externalAuthorityId: 'ea-1',
        relationshipType: InstitutionExternalAuthorityRelationshipType.COORDINATION,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects duplicate active relationships', async () => {
    institutionService.assertActive.mockResolvedValue({
      id: 'inst-1',
      jurisdictionId: 'jur-1',
      code: 'GOV-1',
      name: 'Government',
      description: null,
      type: 'MINISTRY',
      status: StructuralLifecycleStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    externalAuthorityService.assertActive.mockResolvedValue({
      id: 'ea-1',
      code: 'REG-1',
      name: 'Regulator',
      description: null,
      type: 'REGULATOR',
      jurisdictionDescription: null,
      status: RecordStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.institutionExternalAuthority.findFirst.mockResolvedValue({
      id: 'existing',
    });

    await expect(
      service.create({
        institutionId: 'inst-1',
        externalAuthorityId: 'ea-1',
        relationshipType: InstitutionExternalAuthorityRelationshipType.COORDINATION,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires institutionId or externalAuthorityId when listing', async () => {
    await expect(service.findAll({})).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows status transition to historical while preserving record', async () => {
    const existing = {
      id: 'rel-1',
      institutionId: 'inst-1',
      externalAuthorityId: 'ea-1',
      relationshipType: InstitutionExternalAuthorityRelationshipType.COORDINATION,
      description: null,
      status: RecordStatus.ACTIVE,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const updated = {
      ...existing,
      status: RecordStatus.HISTORICAL,
    };

    prisma.institutionExternalAuthority.findUnique.mockResolvedValue(existing);
    prisma.institutionExternalAuthority.findFirst.mockResolvedValue(null);
    prisma.institutionExternalAuthority.update.mockResolvedValue(updated);

    await expect(service.update('rel-1', { status: RecordStatus.HISTORICAL })).resolves.toEqual(
      updated,
    );
  });
});
