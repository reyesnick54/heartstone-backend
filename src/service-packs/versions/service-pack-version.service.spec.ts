import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  ServicePackManifestValidationStatus,
  ServicePackVersionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ServicePacksBoundaryService } from '../common/service-packs-boundary.service';
import { ServicePackVersionService } from './service-pack-version.service';

describe('ServicePackVersionService', () => {
  let service: ServicePackVersionService;
  let prisma: {
    servicePackVersion: { findUnique: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      servicePackVersion: { findUnique: jest.fn(), update: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicePackVersionService,
        ServicePacksBoundaryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ServicePackVersionService);
  });

  it('blocks updates to accepted immutable versions', async () => {
    prisma.servicePackVersion.findUnique.mockResolvedValue({
      id: 'version-1',
      immutable: true,
      status: ServicePackVersionStatus.ACCEPTED,
    });

    await expect(
      service.update('version-1', { manifest: { manifestVersion: 'heartstone.service-pack/v1' } }),
    ).rejects.toThrow(BadRequestException);
  });

  it('requires a new version for post-acceptance modifications', async () => {
    prisma.servicePackVersion.findUnique.mockResolvedValue({
      id: 'version-2',
      immutable: false,
      status: ServicePackVersionStatus.ACCEPTED,
    });

    await expect(
      service.update('version-2', { manifest: { manifestVersion: 'heartstone.service-pack/v1' } }),
    ).rejects.toThrow('ACCEPTED_VERSION_IMMUTABLE');
  });

  it('accepts only manifest-validated versions and marks them immutable', async () => {
    prisma.servicePackVersion.findUnique.mockResolvedValue({
      id: 'version-3',
      immutable: false,
      status: ServicePackVersionStatus.COMPILED,
      manifestValidationStatus: ServicePackManifestValidationStatus.VALIDATED,
    });
    prisma.servicePackVersion.update.mockResolvedValue({
      id: 'version-3',
      status: ServicePackVersionStatus.ACCEPTED,
      immutable: true,
    });

    const result = await service.markAccepted('version-3', 'identity-1');

    expect(result.status).toBe(ServicePackVersionStatus.ACCEPTED);
    expect(result.immutable).toBe(true);
  });

  it('does not treat manifest-validated as institutionally accepted', () => {
    expect(service.isInstitutionallyAccepted(ServicePackVersionStatus.COMPILED)).toBe(false);
    expect(service.isInstitutionallyAccepted(ServicePackVersionStatus.ACCEPTED)).toBe(true);
  });
});
