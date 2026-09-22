import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { EducationActorPersona } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { EducationAccreditationService } from './applications/education-accreditation.service';
import { EducationEnrollmentApplicationService } from './applications/education-enrollment-application.service';
import { ScholarshipApplicationService } from './applications/scholarship-application.service';
import { ScholarshipAwardService } from './applications/scholarship-award.service';
import { EducationAccessService } from './common/education-access.service';
import { EducationBoundaryService } from './common/education-boundary.service';
import { EducationRecordCorrectionService } from './corrections/education-record-correction.service';
import { PublicEducationVerificationService } from './verification/public-education-verification.service';

describe('Education must-fail gates', () => {
  describe('EducationBoundaryService', () => {
    let boundary: EducationBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [EducationBoundaryService],
      }).compile();
      boundary = module.get(EducationBoundaryService);
    });

    it('blocks cross-student access', () => {
      expect(() => {
        boundary.assertCrossStudentAccessBlocked('a', 'b');
      }).toThrow(ForbiddenException);
    });

    it('AI cannot grant admission/scholarship/accreditation', () => {
      expect(() => {
        boundary.assertAiCannotGrantEducationAuthority(
          EducationActorPersona.AI_ASSISTANCE,
          'GRANT_ADMISSION',
        );
      }).toThrow(ForbiddenException);
      expect(() => {
        boundary.assertAiCannotGrantEducationAuthority(
          EducationActorPersona.AI_ASSISTANCE,
          'AWARD_SCHOLARSHIP',
        );
      }).toThrow(ForbiddenException);
      expect(() => {
        boundary.assertAiCannotGrantEducationAuthority(
          EducationActorPersona.AI_ASSISTANCE,
          'GRANT_ACCREDITATION',
        );
      }).toThrow(ForbiddenException);
    });

    it('platform administrator cannot create educational legal status', () => {
      expect(() => {
        boundary.assertPlatformAdminCannotCreateEducationalLegalStatus(
          EducationActorPersona.PLATFORM_ADMINISTRATOR,
        );
      }).toThrow(ForbiddenException);
    });

    it('school cannot self-accredit', () => {
      expect(() => {
        boundary.assertInstitutionCannotSelfAccredit('org-1', 'org-1');
      }).toThrow(ForbiddenException);
    });

    it('official without authority cannot grant accreditation', () => {
      expect(() => {
        boundary.assertOfficialWithoutAuthorityCannotGrantAccreditation(false);
      }).toThrow(ForbiddenException);
    });

    it('scholarship award requires decision workflow reference', () => {
      expect(() => {
        boundary.assertScholarshipAwardRequiresDecisionWorkflow({
          requiresDecisionWorkflow: true,
          governmentDecisionId: null,
        });
      }).toThrow(BadRequestException);
    });

    it('academic correction preserves history', () => {
      expect(() => {
        boundary.assertCorrectionPreservesHistory(0);
      }).toThrow(BadRequestException);
    });
  });

  describe('ScholarshipApplicationService', () => {
    const prisma = {
      scholarshipApplicationProfile: { create: jest.fn() },
    };

    let service: ScholarshipApplicationService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          ScholarshipApplicationService,
          EducationBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(ScholarshipApplicationService);
      jest.clearAllMocks();
    });

    it('scholarship application does not create award', async () => {
      prisma.scholarshipApplicationProfile.create.mockResolvedValue({
        doesNotCreateAward: true,
        recommendationOnly: true,
      });

      const result = await service.linkScholarshipApplicationProfile({
        studentProfileId: 'stu-1',
        caseId: 'case-1',
        applicationId: 'app-1',
      });

      expect(result.awardsCreated).toBe(0);
    });
  });

  describe('ScholarshipAwardService', () => {
    const prisma = {
      scholarshipApplicationProfile: {
        findUnique: jest.fn().mockResolvedValue({ recommendationOnly: true }),
      },
      scholarshipAwardRecord: { upsert: jest.fn() },
    };

    let service: ScholarshipAwardService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          ScholarshipAwardService,
          EducationBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(ScholarshipAwardService);
    });

    it('rejects award without government decision', async () => {
      await expect(
        service.recordAwardAfterDecision({
          scholarshipApplicationProfileId: 'sch-1',
          governmentDecisionId: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('EducationEnrollmentApplicationService', () => {
    const prisma = {
      educationEnrollmentApplicationProfile: {
        create: jest.fn().mockResolvedValue({ doesNotGrantEnrollment: true }),
      },
    };

    let service: EducationEnrollmentApplicationService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          EducationEnrollmentApplicationService,
          EducationBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(EducationEnrollmentApplicationService);
    });

    it('enrollment application does not grant enrollment', async () => {
      const result = await service.linkEnrollmentApplicationProfile({
        studentProfileId: 'stu-1',
        caseId: 'case-1',
        applicationId: 'app-1',
      });
      expect(result.enrollmentsCreated).toBe(0);
    });
  });

  describe('EducationAccreditationService', () => {
    const prisma = {
      educationAccreditationRecord: { create: jest.fn() },
    };

    let service: EducationAccreditationService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          EducationAccreditationService,
          EducationBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(EducationAccreditationService);
    });

    it('blocks self-accreditation attempts', async () => {
      await expect(
        service.proposeAccreditationRecord({
          institutionRegistryRecordId: 'reg-1',
          organizationId: 'org-1',
          accreditingOrganizationId: 'org-1',
          hasOfficialAuthority: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('PublicEducationVerificationService', () => {
    let service: PublicEducationVerificationService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          PublicEducationVerificationService,
          {
            provide: PrismaService,
            useValue: { educationAccreditationRecord: { findUnique: jest.fn() } },
          },
        ],
      }).compile();
      service = module.get(PublicEducationVerificationService);
    });

    it('credential public verification is data-minimized', () => {
      expect(() => {
        service.assertDataMinimized({
          reference: 'token',
          verificationKind: 'CREDENTIAL',
          verificationState: 'FOUND',
          ruleEnvironment: 'NON_PRODUCTION',
          publicFacts: { studentProfileId: 'hidden' },
        });
      }).toThrow();
    });
  });

  describe('EducationAccessService', () => {
    const prisma = {
      educationStudentProfile: { findUnique: jest.fn() },
      educationGuardianRelationship: { findFirst: jest.fn() },
      organizationMembership: { findFirst: jest.fn() },
      educationInstitutionRegistryRecord: { findFirst: jest.fn() },
    };

    let access: EducationAccessService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          EducationAccessService,
          EducationBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      access = module.get(EducationAccessService);
      jest.clearAllMocks();
    });

    it('guardian access requires active relationship', async () => {
      prisma.educationStudentProfile.findUnique.mockResolvedValue({ subjectIdentityId: 'student' });
      prisma.educationGuardianRelationship.findFirst.mockResolvedValue(null);

      await expect(access.assertStudentProfileAccess('guardian', 'profile-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('institution access requires valid organization representation', async () => {
      prisma.organizationMembership.findFirst.mockResolvedValue({ id: 'mem-1' });
      prisma.educationInstitutionRegistryRecord.findFirst.mockResolvedValue(null);

      await expect(access.assertOrganizationEducationAccess('identity-1', 'org-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('EducationRecordCorrectionService', () => {
    const prisma = {
      educationRecordCorrection: { create: jest.fn().mockResolvedValue({ id: 'cor-1' }) },
      educationRecordCorrectionHistory: { create: jest.fn().mockResolvedValue({ id: 'hist-1' }) },
    };

    let service: EducationRecordCorrectionService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          EducationRecordCorrectionService,
          EducationBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(EducationRecordCorrectionService);
    });

    it('academic correction preserves history', async () => {
      await service.submitCorrection({
        studentProfileId: 'stu-1',
        applicantIdentityId: 'id-1',
        correctionSummary: 'Correct spelling of legal name on transcript index',
      });
      expect(prisma.educationRecordCorrectionHistory.create).toHaveBeenCalled();
    });
  });
});
