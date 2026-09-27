import { ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { GovernedConfigurationChangeStatus, GovernedConfigurationDomain } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { CanonicalAuditRecorderService } from '../ledger/canonical-audit-recorder.service';
import { GovernedConfigurationChangeService } from './governed-configuration-change.service';

describe('GovernedConfigurationChangeService', () => {
  let service: GovernedConfigurationChangeService;

  const canonicalAudit = {
    recordGovernedConfigurationEvent: jest.fn(),
  };

  const prisma = {
    governedConfigurationChange: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    governedConfigurationEffectiveVersion: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GovernedConfigurationChangeService,
        { provide: PrismaService, useValue: prisma },
        { provide: CanonicalAuditRecorderService, useValue: canonicalAudit },
      ],
    }).compile();

    service = module.get(GovernedConfigurationChangeService);
    jest.clearAllMocks();
  });

  it('blocks self-approval', async () => {
    prisma.governedConfigurationChange.findUnique.mockResolvedValue({
      id: 'change-1',
      status: GovernedConfigurationChangeStatus.IN_REVIEW,
      proposerIdentityId: 'identity-1',
      proposedPayloadHash: 'hash',
      institutionId: 'inst-1',
      jurisdictionId: 'jur-1',
    });

    await expect(
      service.approve({
        changeId: 'change-1',
        approverIdentityId: 'identity-1',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('does not resolve future effective configuration early', async () => {
    prisma.governedConfigurationEffectiveVersion.findFirst.mockResolvedValue(null);

    const resolved = await service.resolveEffectiveConfiguration({
      institutionId: 'inst-1',
      configurationDomain: GovernedConfigurationDomain.SLA_RULES,
      configurationKey: 'default',
      at: new Date(),
    });

    expect(resolved).toBeNull();
    expect(prisma.governedConfigurationEffectiveVersion.findFirst).toHaveBeenCalled();
  });
});
