import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { type Credential, CredentialStatus, CredentialType } from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../audit/security-audit.service';
import { IdentityValidationService } from '../common/identity-validation.service';
import { CredentialsService } from './credentials.service';

describe('CredentialsService', () => {
  let service: CredentialsService;
  let validation: { ensureIdentityExists: jest.Mock };
  let audit: { record: jest.Mock };
  let prisma: {
    credential: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
  };

  const identityId = '22222222-2222-4222-8222-222222222222';
  const sampleCredential: Credential = {
    id: '33333333-3333-4333-8333-333333333333',
    identityId,
    type: CredentialType.PASSWORD,
    status: CredentialStatus.ACTIVE,
    secretHash: 'hashed-secret',
    oidcProvider: null,
    oidcSubject: null,
    apiKeyHash: null,
    revokedAt: null,
    lastUsedAt: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    validation = { ensureIdentityExists: jest.fn() };
    audit = { record: jest.fn() };

    prisma = {
      credential: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialsService,
        { provide: PrismaService, useValue: prisma },
        { provide: IdentityValidationService, useValue: validation },
        { provide: SecurityAuditService, useValue: audit },
      ],
    }).compile();

    service = module.get(CredentialsService);
  });

  it('creates password credentials without returning secret material', async () => {
    prisma.credential.create.mockResolvedValue(sampleCredential);

    const result = await service.create({
      identityId,
      type: CredentialType.PASSWORD,
      password: 'SecurePass123!',
    });

    expect(result).not.toHaveProperty('secretHash');
    expect(result.id).toBe(sampleCredential.id);
    expect(prisma.credential.create).toHaveBeenCalledTimes(1);
  });

  it('requires password for PASSWORD credential type', async () => {
    await expect(
      service.create({ identityId, type: CredentialType.PASSWORD }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('revokes active credentials', async () => {
    prisma.credential.findUnique.mockResolvedValue(sampleCredential);
    prisma.credential.update.mockResolvedValue({
      ...sampleCredential,
      status: CredentialStatus.REVOKED,
      revokedAt: new Date(),
    });

    const result = await service.revoke(sampleCredential.id);

    expect(result.status).toBe(CredentialStatus.REVOKED);
    expect(result).not.toHaveProperty('secretHash');
  });

  it('rejects revoking already revoked credentials', async () => {
    prisma.credential.findUnique.mockResolvedValue({
      ...sampleCredential,
      status: CredentialStatus.REVOKED,
    });

    await expect(service.revoke(sampleCredential.id)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws not found for missing credentials', async () => {
    prisma.credential.findUnique.mockResolvedValue(null);

    await expect(service.findOne(sampleCredential.id)).rejects.toBeInstanceOf(NotFoundException);
  });
});
