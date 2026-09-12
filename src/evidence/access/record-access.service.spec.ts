import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  MasterAdministrativeFileSecurityClassification,
  RecordAccessEventType,
  RecordAccessResult,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { SecurityAuditService } from '../../identity/audit/security-audit.service';
import { RecordAccessService } from './record-access.service';

describe('RecordAccessService', () => {
  let service: RecordAccessService;

  const prisma = {
    recordAccessEvent: {
      create: jest.fn(),
    },
  };

  const securityAudit = {
    record: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordAccessService,
        { provide: PrismaService, useValue: prisma },
        { provide: SecurityAuditService, useValue: securityAudit },
      ],
    }).compile();

    service = module.get(RecordAccessService);
    jest.clearAllMocks();
  });

  it('generates access event for restricted export', async () => {
    securityAudit.record.mockResolvedValue({ id: 'audit-1' });
    prisma.recordAccessEvent.create.mockResolvedValue({ id: 'access-1' });

    await service.recordAccess({
      recordType: 'EvidenceDocumentVersion',
      recordId: 'doc-version-1',
      accessType: RecordAccessEventType.EXPORT,
      identityId: 'identity-1',
      purpose: 'Court disclosure',
      result: RecordAccessResult.ALLOWED,
      classification: MasterAdministrativeFileSecurityClassification.RESTRICTED,
      correlationId: 'corr-1',
    });

    expect(securityAudit.record).toHaveBeenCalled();
    expect(prisma.recordAccessEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          accessType: RecordAccessEventType.EXPORT,
          securityAuditEventId: 'audit-1',
        }),
      }),
    );
  });

  it('rejects update and delete through ordinary API surface', async () => {
    await expect(service.updateAccessEvent()).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.deleteAccessEvent()).rejects.toBeInstanceOf(BadRequestException);
  });
});
