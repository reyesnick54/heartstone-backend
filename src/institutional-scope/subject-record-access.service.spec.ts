import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IdentityType } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { type SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { ResourceAccessService } from './resource-access.service';
import {
  SUBJECT_RECORD_ACCESS_REASON,
  SubjectRecordAccessService,
} from './subject-record-access.service';

describe('SubjectRecordAccessService', () => {
  let service: SubjectRecordAccessService;

  const session: SessionContextDto = {
    sessionId: '11111111-1111-4111-8111-111111111111',
    identityId: '22222222-2222-4222-8222-222222222222',
    userAccountId: '33333333-3333-4333-8333-333333333333',
    assuranceLevel: 'HIGH',
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SubjectRecordAccessService,
        {
          provide: ResourceAccessService,
          useValue: {
            assertVisibility: jest.fn(),
            assertModification: jest.fn(),
            assertInstitutionalBoundary: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            representativeAuthority: { findMany: jest.fn().mockResolvedValue([]) },
            application: { findFirst: jest.fn().mockResolvedValue(null) },
          },
        },
      ],
    }).compile();

    service = module.get(SubjectRecordAccessService);
  });

  it('rejects client-supplied identity that differs from session', () => {
    expect(() => { service.assertSessionDerivedIdentity(session, '99999999-9999-4999-8999-999999999999'); },
    ).toThrow(ForbiddenException);
    try {
      service.assertSessionDerivedIdentity(session, '99999999-9999-4999-8999-999999999999');
    } catch (error) {
      expect((error as ForbiddenException).getResponse()).toMatchObject({
        reason: SUBJECT_RECORD_ACCESS_REASON.CLIENT_IDENTITY_FORBIDDEN,
      });
    }
  });

  it('blocks service identities from personal self-service', () => {
    expect(() => { service.assertPersonaAllowsPersonalSelfService(session, IdentityType.SERVICE); }).toThrow(
      ForbiddenException,
    );
  });

  it('allows session identity to access own subject id', async () => {
    await expect(
      service.assertSubjectIdentityVisible(session, session.identityId),
    ).resolves.toBeUndefined();
  });
});
