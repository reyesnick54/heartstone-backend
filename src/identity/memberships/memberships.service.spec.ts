import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { MembershipStatus, type OrganizationMembership, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { IdentityValidationService } from '../common/identity-validation.service';
import { MembershipsService } from './memberships.service';

describe('MembershipsService', () => {
  let service: MembershipsService;
  let validation: {
    ensureOrganizationExists: jest.Mock;
    ensureIdentityExists: jest.Mock;
  };
  let audit: { record: jest.Mock };
  let prisma: {
    organizationMembership: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  const organizationId = '11111111-1111-4111-8111-111111111111';
  const identityId = '22222222-2222-4222-8222-222222222222';
  const sampleMembership: OrganizationMembership = {
    id: '33333333-3333-4333-8333-333333333333',
    organizationId,
    identityId,
    roleLabel: 'member',
    status: MembershipStatus.ACTIVE,
    effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
    effectiveUntil: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    validation = {
      ensureOrganizationExists: jest.fn(),
      ensureIdentityExists: jest.fn(),
    };
    audit = { record: jest.fn() };

    prisma = {
      organizationMembership: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembershipsService,
        { provide: PrismaService, useValue: prisma },
        { provide: IdentityValidationService, useValue: validation },
        { provide: SecurityAuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(MembershipsService);
  });

  it('creates memberships for valid organization and identity', async () => {
    prisma.organizationMembership.create.mockResolvedValue(sampleMembership);

    const result = await service.create({
      organizationId,
      identityId,
      roleLabel: 'member',
    });

    expect(result).toEqual(sampleMembership);
  });

  it('rejects duplicate memberships', async () => {
    prisma.organizationMembership.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', {
        code: 'P2002',
        clientVersion: '6.0.0',
      }),
    );

    await expect(service.create({ organizationId, identityId })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('ends active memberships', async () => {
    prisma.organizationMembership.findUnique.mockResolvedValue(sampleMembership);
    prisma.organizationMembership.update.mockResolvedValue({
      ...sampleMembership,
      status: MembershipStatus.REVOKED,
      effectiveUntil: new Date(),
    });

    const result = await service.end(sampleMembership.id);

    expect(result.status).toBe(MembershipStatus.REVOKED);
    expect(result.effectiveUntil).toBeDefined();
  });

  it('rejects invalid suspend transitions', async () => {
    prisma.organizationMembership.findUnique.mockResolvedValue({
      ...sampleMembership,
      status: MembershipStatus.PENDING,
    });

    await expect(service.suspend(sampleMembership.id)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws not found for missing memberships', async () => {
    prisma.organizationMembership.findUnique.mockResolvedValue(null);

    await expect(service.findOne(sampleMembership.id)).rejects.toBeInstanceOf(NotFoundException);
  });
});
