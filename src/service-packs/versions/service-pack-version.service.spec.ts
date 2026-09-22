import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  ServicePackGovernanceLifecycleStatus,
  ServicePackManifestValidationStatus,
  ServicePackVersionStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { ServicePacksBoundaryService } from '../common/service-packs-boundary.service';
import { ServicePackAcceptanceService } from '../governance/service-pack-acceptance.service';
import { ServicePackVersionService } from './service-pack-version.service';

describe('ServicePackVersionService', () => {
  let service: ServicePackVersionService;
  let prisma: {
    servicePackVersion: { findUnique: jest.Mock; update: jest.Mock };
    servicePackAcceptanceRecord: { findFirst: jest.Mock };
  };
  let governanceAcceptance: { invalidateAcceptanceForFingerprintChange: jest.Mock };

  beforeEach(async () => {
    governanceAcceptance = {
      invalidateAcceptanceForFingerprintChange: jest.fn().mockResolvedValue(undefined),
    };

    prisma = {
      servicePackVersion: { findUnique: jest.fn(), update: jest.fn() },
      servicePackAcceptanceRecord: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicePackVersionService,
        ServicePacksBoundaryService,
        { provide: PrismaService, useValue: prisma },
        { provide: ServicePackAcceptanceService, useValue: governanceAcceptance },
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

  it('requires an active institutional acceptance record before marking accepted', async () => {
    prisma.servicePackVersion.findUnique.mockResolvedValue({
      id: 'version-3',
      immutable: false,
      status: ServicePackVersionStatus.COMPILED,
      manifestValidationStatus: ServicePackManifestValidationStatus.VALIDATED,
      governanceLifecycleStatus: ServicePackGovernanceLifecycleStatus.INSTITUTIONALLY_ACCEPTED,
      compilationFingerprint: 'fp',
      manifestChecksum: 'checksum',
    });
    prisma.servicePackAcceptanceRecord.findFirst.mockResolvedValue({
      id: 'acceptance-1',
      isActive: true,
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

  it('blocks acceptance when only manifest-validated without governance acceptance', async () => {
    prisma.servicePackVersion.findUnique.mockResolvedValue({
      id: 'version-4',
      immutable: false,
      status: ServicePackVersionStatus.COMPILED,
      manifestValidationStatus: ServicePackManifestValidationStatus.VALIDATED,
      governanceLifecycleStatus: ServicePackGovernanceLifecycleStatus.NOT_IN_GOVERNANCE,
      compilationFingerprint: 'fp',
      manifestChecksum: 'checksum',
    });
    prisma.servicePackAcceptanceRecord.findFirst.mockResolvedValue(null);

    await expect(service.markAccepted('version-4', 'identity-1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('does not treat manifest-validated as institutionally accepted', () => {
    expect(service.isInstitutionallyAccepted(ServicePackVersionStatus.COMPILED)).toBe(false);
    expect(service.isInstitutionallyAccepted(ServicePackVersionStatus.ACCEPTED)).toBe(true);
  });
});
