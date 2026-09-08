import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { DelegationStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { DelegationService } from './delegation.service';

describe('DelegationService', () => {
  let service: DelegationService;

  const prismaMock = {
    institution: { findUnique: jest.fn() },
    office: { findUnique: jest.fn() },
    officeholder: { findUnique: jest.fn() },
    delegation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [DelegationService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    service = module.get<DelegationService>(DelegationService);
  });

  describe('validateAndResolveTarget', () => {
    it('rejects zero delegator targets', () => {
      expect(() => service.validateAndResolveTarget('delegator', {})).toThrow(
        new BadRequestException('Exactly one delegator target is required'),
      );
    });

    it('rejects multiple delegator targets', () => {
      expect(() =>
        service.validateAndResolveTarget('delegator', {
          institutionId: 'inst-1',
          officeId: 'office-1',
        }),
      ).toThrow(new BadRequestException('Only one delegator target may be specified'));
    });

    it('rejects zero recipient targets', () => {
      expect(() => service.validateAndResolveTarget('recipient', {})).toThrow(
        new BadRequestException('Exactly one recipient target is required'),
      );
    });

    it('rejects multiple recipient targets', () => {
      expect(() =>
        service.validateAndResolveTarget('recipient', {
          officeId: 'office-1',
          officeholderId: 'holder-1',
        }),
      ).toThrow(new BadRequestException('Only one recipient target may be specified'));
    });
  });

  describe('validateSourceReference', () => {
    it('rejects missing source reference', () => {
      expect(() => {
        service.validateSourceReference('');
      }).toThrow(new BadRequestException('sourceReference is required'));
    });
  });

  describe('validateScopeDescription', () => {
    it('rejects missing scope description', () => {
      expect(() => {
        service.validateScopeDescription('   ');
      }).toThrow(new BadRequestException('scopeDescription is required'));
    });
  });

  describe('validateEffectiveDates', () => {
    it('rejects invalid dates', () => {
      const from = new Date('2026-06-01');
      const until = new Date('2026-05-01');
      expect(() => {
        service.validateEffectiveDates(from, until);
      }).toThrow(new BadRequestException('effectiveUntil cannot precede effectiveFrom'));
    });
  });

  describe('create', () => {
    const baseDto = {
      referenceCode: 'DEL-001',
      sourceReference: 'SI 2026/1',
      scopeDescription: 'Permit processing',
      status: DelegationStatus.ACTIVE,
      effectiveFrom: new Date('2026-01-01'),
      delegator: { institutionId: 'inst-1' },
      recipient: { officeId: 'office-1' },
    };

    it('rejects self-delegation', async () => {
      await expect(
        service.create({
          ...baseDto,
          delegator: { officeId: 'office-1' },
          recipient: { officeId: 'office-1' },
        }),
      ).rejects.toThrow(new BadRequestException('Delegation cannot delegate to itself'));
    });

    it('rejects missing delegator entity', async () => {
      prismaMock.institution.findUnique.mockResolvedValue(null);

      await expect(service.create(baseDto)).rejects.toThrow(
        new BadRequestException('Institution inst-1 not found'),
      );
    });

    it('creates a valid delegation', async () => {
      prismaMock.institution.findUnique.mockResolvedValue({ id: 'inst-1' });
      prismaMock.office.findUnique.mockResolvedValue({ id: 'office-1' });
      prismaMock.delegation.create.mockResolvedValue({
        id: 'del-1',
        referenceCode: 'DEL-001',
        sourceReference: 'SI 2026/1',
        scopeDescription: 'Permit processing',
        status: DelegationStatus.ACTIVE,
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: null,
        notes: null,
        delegatorInstitutionId: 'inst-1',
        delegatorOfficeId: null,
        delegatorOfficeholderId: null,
        recipientInstitutionId: null,
        recipientOfficeId: 'office-1',
        recipientOfficeholderId: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      });

      const result = await service.create(baseDto);

      expect(result.delegator).toEqual({ type: 'institution', id: 'inst-1' });
      expect(result.recipient).toEqual({ type: 'office', id: 'office-1' });
      expect(result).not.toHaveProperty('authority');
      expect(result).not.toHaveProperty('permissions');
    });
  });

  describe('update', () => {
    it('preserves revoked records for retrieval', async () => {
      const revokedRecord = {
        id: 'del-revoked',
        referenceCode: 'DEL-REV',
        sourceReference: 'SI 2026/2',
        scopeDescription: 'Inspection duties',
        status: DelegationStatus.REVOKED,
        effectiveFrom: new Date('2026-01-01'),
        effectiveUntil: null,
        notes: null,
        delegatorInstitutionId: 'inst-1',
        delegatorOfficeId: null,
        delegatorOfficeholderId: null,
        recipientInstitutionId: null,
        recipientOfficeId: 'office-1',
        recipientOfficeholderId: null,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-06-01'),
      };

      prismaMock.delegation.findUnique.mockResolvedValue(revokedRecord);
      prismaMock.delegation.update.mockResolvedValue({
        ...revokedRecord,
        notes: 'Revoked by ministerial order',
      });

      const result = await service.update('del-revoked', {
        notes: 'Revoked by ministerial order',
      });

      expect(result.status).toBe(DelegationStatus.REVOKED);
      expect(result.notes).toBe('Revoked by ministerial order');
    });
  });
});
