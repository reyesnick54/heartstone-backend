import { Test, type TestingModule } from '@nestjs/testing';
import {
  ServicePackManifestValidationStatus,
  ServicePackValidationOutcome,
  ServicePackVersionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ManifestValidatorService } from '../common/manifest/manifest-validator.service';
import { ServicePacksBoundaryService } from '../common/service-packs-boundary.service';
import { REPRESENTATIVE_SERVICE_PACK_MANIFEST } from '../fixtures/representative-service-pack-manifest.fixture';
import { ServicePackValidationService } from './service-pack-validation.service';

describe('ServicePackValidationService', () => {
  let service: ServicePackValidationService;
  let prisma: {
    servicePackVersion: { findUnique: jest.Mock; update: jest.Mock };
    servicePackValidationResult: { create: jest.Mock };
    servicePackImport: { update: jest.Mock };
    servicePackComponent: { deleteMany: jest.Mock; createMany: jest.Mock };
    servicePackDependency: { deleteMany: jest.Mock; createMany: jest.Mock };
    functionAuthorityRecord: { findUnique: jest.Mock };
    department: { findUnique: jest.Mock };
    institution: { findUnique: jest.Mock };
    externalAuthority: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      servicePackVersion: { findUnique: jest.fn(), update: jest.fn() },
      servicePackValidationResult: { create: jest.fn() },
      servicePackImport: { update: jest.fn() },
      servicePackComponent: { deleteMany: jest.fn(), createMany: jest.fn() },
      servicePackDependency: { deleteMany: jest.fn(), createMany: jest.fn() },
      functionAuthorityRecord: { findUnique: jest.fn().mockResolvedValue({ id: 'far-1' }) },
      department: {
        findUnique: jest.fn().mockResolvedValue({ id: '00000000-0000-4000-8000-000000000001' }),
      },
      institution: { findUnique: jest.fn() },
      externalAuthority: { findUnique: jest.fn() },
      $transaction: jest.fn(async (callback: (tx: typeof prisma) => Promise<unknown>) =>
        callback(prisma),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicePackValidationService,
        ManifestValidatorService,
        ServicePacksBoundaryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ServicePackValidationService);
  });

  it('validates manifest without activating services or creating decisions', async () => {
    prisma.servicePackVersion.findUnique.mockResolvedValue({
      id: 'version-1',
      immutable: false,
      status: ServicePackVersionStatus.COMPILED,
      manifestVersion: 'heartstone.service-pack/v1',
      manifest: REPRESENTATIVE_SERVICE_PACK_MANIFEST,
      servicePack: { id: 'pack-1' },
    });

    const result = await service.validateVersion({ servicePackVersionId: 'version-1' });

    expect(result.outcome).toBe(ServicePackValidationOutcome.PASSED);
    expect(result.manifestValidationStatus).toBe(ServicePackManifestValidationStatus.VALIDATED);
    expect(prisma.servicePackVersion.update).toHaveBeenCalledTimes(1);
    expect(prisma.servicePackValidationResult.create).toHaveBeenCalled();
  });

  it('marks invalid manifests without advancing to accepted status', async () => {
    prisma.servicePackVersion.findUnique.mockResolvedValue({
      id: 'version-2',
      immutable: false,
      status: ServicePackVersionStatus.COMPILED,
      manifestVersion: 'heartstone.service-pack/v99',
      manifest: { manifestVersion: 'heartstone.service-pack/v99' },
      servicePack: { id: 'pack-1' },
    });

    const result = await service.validateVersion({ servicePackVersionId: 'version-2' });

    expect(result.outcome).toBe(ServicePackValidationOutcome.FAILED);
    expect(result.manifestValidationStatus).toBe(ServicePackManifestValidationStatus.INVALID);
  });

  it('rejects validation when version is already accepted and immutable', async () => {
    prisma.servicePackVersion.findUnique.mockResolvedValue({
      id: 'version-3',
      immutable: true,
      status: ServicePackVersionStatus.ACCEPTED,
      manifestVersion: 'heartstone.service-pack/v1',
      manifest: REPRESENTATIVE_SERVICE_PACK_MANIFEST,
      servicePack: { id: 'pack-1' },
    });

    await expect(service.validateVersion({ servicePackVersionId: 'version-3' })).rejects.toThrow(
      'ACCEPTED_VERSION_IMMUTABLE',
    );
  });
});
