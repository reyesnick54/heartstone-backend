import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AssuranceLevel,
  ExternalDeterminationStatus,
  ImmigrationActorPersona,
  ImmigrationCredentialLifecycleStatus,
  ImmigrationExternalCheckRecordedBy,
  ImmigrationExternalCheckType,
  ImmigrationStatusCategory,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { SubjectRecordAccessService } from '../institutional-scope/subject-record-access.service';
import { ImmigrationAccessService } from './access/immigration-access.service';
import { ImmigrationApplicationProfileService } from './applications/immigration-application-profile.service';
import { ImmigrationBoundaryService } from './common/immigration-boundary.service';
import { resolveImmigrationCredentialLifecycle } from './common/immigration-credential.util';
import { ImmigrationCredentialService } from './credentials/immigration-credential.service';
import { ImmigrationExternalCheckService } from './external/immigration-external-check.service';
import { ImmigrationProfileService } from './profiles/immigration-profile.service';
import { ImmigrationStatusService } from './status/immigration-status.service';

describe('Immigration must-fail gates', () => {
  describe('ImmigrationBoundaryService', () => {
    let boundary: ImmigrationBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [ImmigrationBoundaryService],
      }).compile();
      boundary = module.get(ImmigrationBoundaryService);
    });

    it('payment does not approve immigration case', () => {
      expect(() => {
        boundary.assertPaymentDoesNotApproveImmigrationCase(ImmigrationActorPersona.PAYMENT_SYSTEM);
      }).toThrow(ForbiddenException);
    });

    it('AI cannot approve visa/residency/citizenship', () => {
      expect(() => {
        boundary.assertAiCannotApprove('APPROVE_VISA');
      }).toThrow(ForbiddenException);
      expect(() => {
        boundary.assertAiCannotApprove('APPROVE_CITIZENSHIP');
      }).toThrow(ForbiddenException);
    });

    it('technical admin cannot change citizenship status', () => {
      expect(() => {
        boundary.assertTechnicalAdminCannotChangeCitizenshipStatus(
          ImmigrationActorPersona.TECHNICAL_ADMIN,
          'CITIZENSHIP_STATUS',
        );
      }).toThrow(ForbiddenException);
    });

    it('external security check cannot be forged by applicant', () => {
      expect(() => {
        boundary.rejectApplicantForgedExternalCheck(
          { isAuthenticated: true, determinationStatus: ExternalDeterminationStatus.GRANTED },
          ImmigrationActorPersona.APPLICANT,
        );
      }).toThrow(ForbiddenException);
    });

    it('failed/unresolved required external determination blocks decision where configured', () => {
      expect(() => {
        boundary.assertUnresolvedExternalChecksAllowDecision([
          {
            isRequired: true,
            blocksDecisionWhenRequired: true,
            determinationStatus: ExternalDeterminationStatus.PENDING,
            isAuthenticated: false,
          },
        ]);
      }).toThrow(BadRequestException);
    });

    it('cross-applicant access blocked', () => {
      expect(() => {
        boundary.assertCrossApplicantBlocked('identity-a', 'identity-b');
      }).toThrow(ForbiddenException);
    });

    it('sponsor access limited to authorized scope', () => {
      expect(() => {
        boundary.assertSponsorScope({ viewCaseStatus: false }, 'viewCaseStatus');
      }).toThrow(ForbiddenException);
    });
  });

  describe('ImmigrationApplicationProfileService', () => {
    const prisma = {
      visaApplicationProfile: { create: jest.fn() },
      residencyApplicationProfile: { create: jest.fn() },
      citizenshipApplicationProfile: { create: jest.fn() },
      visaApplicationProfileFind: { findUnique: jest.fn() },
    };

    let service: ImmigrationApplicationProfileService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          ImmigrationApplicationProfileService,
          { provide: PrismaService, useValue: prisma },
          {
            provide: SubjectRecordAccessService,
            useValue: { assertApplicationLinkedRecord: jest.fn() },
          },
        ],
      }).compile();
      service = module.get(ImmigrationApplicationProfileService);
      jest.clearAllMocks();
    });

    it('visa submission does not issue visa', async () => {
      prisma.visaApplicationProfile.create.mockResolvedValue({
        id: 'vap-1',
        doesNotIssueVisa: true,
      });

      const result = await service.linkVisaApplicationProfile({
        immigrationProfileId: 'imp-1',
        caseId: 'case-1',
        applicationId: 'app-1',
      });

      expect(result.visaPermissionsCreated).toBe(0);
      expect(result.profile.doesNotIssueVisa).toBe(true);
    });

    it('residency application does not create residency', async () => {
      prisma.residencyApplicationProfile.create.mockResolvedValue({
        id: 'rap-1',
        doesNotCreateResidency: true,
      });

      const result = await service.linkResidencyApplicationProfile({
        immigrationProfileId: 'imp-1',
        caseId: 'case-2',
        applicationId: 'app-2',
      });

      expect(result.residencyStatusRecordsCreated).toBe(0);
      expect(result.profile.doesNotCreateResidency).toBe(true);
    });

    it('citizenship application does not create citizenship', async () => {
      prisma.citizenshipApplicationProfile.create.mockResolvedValue({
        id: 'cap-1',
        doesNotGrantCitizenship: true,
      });

      const result = await service.linkCitizenshipApplicationProfile({
        immigrationProfileId: 'imp-1',
        caseId: 'case-3',
        applicationId: 'app-3',
      });

      expect(result.citizenshipStatusRecordsCreated).toBe(0);
      expect(result.profile.doesNotGrantCitizenship).toBe(true);
    });
  });

  describe('ImmigrationExternalCheckService', () => {
    const prisma = {
      immigrationExternalCheck: { create: jest.fn(), findMany: jest.fn() },
    };

    let service: ImmigrationExternalCheckService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          ImmigrationExternalCheckService,
          ImmigrationBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(ImmigrationExternalCheckService);
      jest.clearAllMocks();
    });

    it('rejects applicant recording authenticated external check', async () => {
      await expect(
        service.recordCheck(ImmigrationActorPersona.APPLICANT, {
          caseId: 'case-1',
          externalAuthorityId: 'ext-1',
          checkType: ImmigrationExternalCheckType.SECURITY_SCREENING,
          determinationStatus: ExternalDeterminationStatus.GRANTED,
          isAuthenticated: true,
          authenticatedPayload: { result: 'clear' },
          recordedBy: ImmigrationExternalCheckRecordedBy.EXTERNAL_AUTHORITY_LIAISON,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('ImmigrationStatusService', () => {
    const tx = {
      immigrationStatusRecord: {
        update: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'status-2' }),
      },
      immigrationStatusHistory: {
        create: jest.fn(),
        count: jest.fn().mockResolvedValue(2),
      },
      immigrationProfile: { update: jest.fn() },
    };

    const prisma = {
      immigrationProfile: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'imp-1',
          currentStatusRecordId: 'status-1',
          currentStatusRecord: { id: 'status-1' },
        }),
      },
      $transaction: jest.fn(async (fn: (client: typeof tx) => Promise<unknown>) => fn(tx)),
    };

    let service: ImmigrationStatusService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          ImmigrationStatusService,
          ImmigrationBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(ImmigrationStatusService);
      jest.clearAllMocks();
    });

    it('immigration status history preserved', async () => {
      const result = await service.recordStatus({
        immigrationProfileId: 'imp-1',
        statusCategory: ImmigrationStatusCategory.OVERALL,
        statusCode: 'UNDER_REVIEW',
        actorPersona: ImmigrationActorPersona.IMMIGRATION_OFFICER,
      });

      expect(tx.immigrationStatusRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'status-1' } }),
      );
      expect(result.priorRecordPreserved).toBe(true);
      expect(result.historyEntries).toBe(2);
    });
  });

  describe('ImmigrationProfileService cross-applicant access', () => {
    it('blocks cross-applicant profile reads', async () => {
      const prisma = {
        immigrationProfile: { findFirst: jest.fn(), create: jest.fn() },
      };
      const subjectRecordAccess = {
        assertSubjectIdentityVisible: jest
          .fn()
          .mockRejectedValue(new NotFoundException('Immigration profile not found')),
      };
      const module = await Test.createTestingModule({
        providers: [
          ImmigrationProfileService,
          { provide: PrismaService, useValue: prisma },
          { provide: SubjectRecordAccessService, useValue: subjectRecordAccess },
        ],
      }).compile();
      const service = module.get(ImmigrationProfileService);

      const session = {
        sessionId: '11111111-1111-4111-8111-111111111111',
        identityId: 'other-identity',
        assuranceLevel: AssuranceLevel.HIGH,
      };

      await expect(service.getProfileForSubject(session, 'subject-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('ImmigrationAccessService sponsor scope', () => {
    it('denies sponsor without authorized scope', async () => {
      const prisma = {
        immigrationSponsorship: { findFirst: jest.fn().mockResolvedValue(null) },
      };
      const module = await Test.createTestingModule({
        providers: [
          ImmigrationAccessService,
          ImmigrationBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      const service = module.get(ImmigrationAccessService);

      await expect(service.assertSponsorMayViewCase('sponsor-1', 'case-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Immigration credentials', () => {
    it('expired immigration credential represented correctly', () => {
      const effective = resolveImmigrationCredentialLifecycle({
        lifecycleStatus: ImmigrationCredentialLifecycleStatus.EFFECTIVE,
        validUntil: new Date('2020-01-01'),
        now: new Date('2025-01-01'),
      });
      expect(effective).toBe(ImmigrationCredentialLifecycleStatus.EXPIRED);
    });

    it('ImmigrationCredentialService surfaces expired lifecycle', async () => {
      const prisma = {
        visaPermissionRecord: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'vpr-1',
            lifecycleStatus: ImmigrationCredentialLifecycleStatus.EFFECTIVE,
            validUntil: new Date('2020-01-01'),
          }),
        },
      };
      const module = await Test.createTestingModule({
        providers: [ImmigrationCredentialService, { provide: PrismaService, useValue: prisma }],
      }).compile();
      const service = module.get(ImmigrationCredentialService);
      const result = await service.getVisaPermissionLifecycle('vpr-1');
      expect(service.isExpiredCredential(result.effectiveStatus)).toBe(true);
    });
  });
});
