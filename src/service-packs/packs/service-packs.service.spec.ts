import { ConflictException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { ServicePackManifestValidationStatus, ServicePackVersionStatus } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ManifestValidatorService } from '../common/manifest/manifest-validator.service';
import { ServicePacksBoundaryService } from '../common/service-packs-boundary.service';
import { REPRESENTATIVE_SERVICE_PACK_MANIFEST } from '../fixtures/representative-service-pack-manifest.fixture';
import { ServicePacksService } from './service-packs.service';

describe('ServicePacksService', () => {
  let service: ServicePacksService;
  let prisma: {
    servicePack: { create: jest.Mock; findUnique: jest.Mock };
    servicePackVersion: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
    servicePackImport: { create: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      servicePack: { create: jest.fn(), findUnique: jest.fn() },
      servicePackVersion: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
        update: jest.fn(),
      },
      servicePackImport: {
        create: jest.fn().mockResolvedValue({ id: 'import-1' }),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (callback: (tx: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicePacksService,
        ManifestValidatorService,
        ServicePacksBoundaryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ServicePacksService);
  });

  it('rejects malformed manifest imports before persistence', async () => {
    prisma.servicePack.findUnique.mockResolvedValue({ id: 'pack-1' });

    await expect(
      service.importManifest('pack-1', {
        manifest: { manifestVersion: 'heartstone.service-pack/v99' },
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('imports a valid manifest as a draft compiled version', async () => {
    prisma.servicePack.findUnique.mockResolvedValue({ id: 'pack-1' });
    prisma.servicePackVersion.create.mockResolvedValue({
      id: 'version-1',
      version: '1.0.0',
      status: ServicePackVersionStatus.COMPILED,
      manifestValidationStatus: ServicePackManifestValidationStatus.DRAFT,
    });

    const result = await service.importManifest('pack-1', {
      manifest: REPRESENTATIVE_SERVICE_PACK_MANIFEST as unknown as Record<string, unknown>,
    });

    expect(result.servicePackVersionId).toBe('version-1');
    expect(result.status).toBe(ServicePackVersionStatus.COMPILED);
    expect(result.manifestValidationStatus).toBe(ServicePackManifestValidationStatus.DRAFT);
    expect(prisma.servicePackImport.create).toHaveBeenCalled();
  });
});
