import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AcademicCredentialLifecycleStatus,
  EducationActorPersona,
  GuardianEducationRelationshipStatus,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { AcademicCredentialService } from './academic/academic-credential.service';
import { TranscriptRecordService } from './academic/transcript-record.service';
import { EducationAdmissionApplicationProfileService } from './admissions/education-admission-application-profile.service';
import { EducationAccessService } from './common/education-access.service';
import { EducationBoundaryService } from './common/education-boundary.service';
import { EnrollmentRecordService } from './enrollment/enrollment-record.service';
import { EducationInstitutionService } from './institutions/education-institution.service';
import { ScholarshipApplicationProfileService } from './scholarships/scholarship-application-profile.service';

describe('Education must-fail gates', () => {
  describe('EducationBoundaryService', () => {
    let boundary: EducationBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [EducationBoundaryService],
      }).compile();
      boundary = module.get(EducationBoundaryService);
    });

    it('application does not create enrollment', () => {
      expect(() => {
        boundary.assertApplicationDoesNotCreateEnrollment({
          doesNotCreateEnrollment: true,
          enrollmentsCreated: 1,
        });
      }).toThrow(BadRequestException);
    });

    it('school registration does not create accreditation', () => {
      expect(() => {
        boundary.assertRegistrationDoesNotCreateAccreditation({
          registrationDoesNotAccredit: true,
          accreditationsCreated: 1,
        });
      }).toThrow(BadRequestException);
    });

    it('scholarship application does not create award', () => {
      expect(() => {
        boundary.assertScholarshipApplicationDoesNotCreateAward({
          doesNotCreateAward: true,
          awardsCreated: 1,
        });
      }).toThrow(BadRequestException);
    });

    it('payment does not create admission', () => {
      expect(() => {
        boundary.assertPaymentDoesNotCreateAdmission(EducationActorPersona.PAYMENT_SYSTEM);
      }).toThrow(ForbiddenException);
    });

    it('AI cannot approve scholarship where human decision is required', () => {
      expect(() => {
        boundary.assertAiCannotApproveEducationDecision(
          EducationActorPersona.AI_ASSISTANCE,
          'APPROVE_SCHOLARSHIP',
        );
      }).toThrow(ForbiddenException);
    });

    it('technical admin cannot issue academic credential', () => {
      expect(() => {
        boundary.assertTechnicalAdminCannotIssueAcademicCredential(
          EducationActorPersona.TECHNICAL_ADMIN,
        );
      }).toThrow(ForbiddenException);
    });

    it('institution cannot self-mark itself accredited', () => {
      expect(() => {
        boundary.assertInstitutionCannotSelfAccredit(
          EducationActorPersona.INSTITUTION_ADMIN,
          'SELF_MARK_ACCREDITED',
        );
      }).toThrow(ForbiddenException);
    });

    it('transcript correction preserves prior history', () => {
      expect(() => {
        boundary.assertNoDestructiveTranscriptOverwrite(2, true);
      }).toThrow(BadRequestException);
    });

    it('public credential verification exposes minimal information', () => {
      const sanitized = boundary.sanitizePublicVerificationPayload({
        credentialReference: 'ACCR-1',
        lifecycleStatus: AcademicCredentialLifecycleStatus.ISSUED,
        grades: 'A',
        transcript: 'hidden',
      });
      expect(sanitized).not.toHaveProperty('grades');
      expect(sanitized).not.toHaveProperty('transcript');
      expect(sanitized).toHaveProperty('credentialReference');
    });
  });

  describe('EducationAccessService', () => {
    const prisma = {
      studentEducationProfile: { findUnique: jest.fn() },
      guardianEducationRelationship: { findFirst: jest.fn() },
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

    it('student cannot access another student private record', async () => {
      prisma.studentEducationProfile.findUnique.mockResolvedValue({
        id: 'sep-1',
        studentIdentityId: 'student-a',
      });

      await expect(
        access.assertStudentSelfAccess({
          accessorIdentityId: 'student-b',
          studentEducationProfileId: 'sep-1',
          endpoint: 'test',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('guardian requires valid relationship/authority', async () => {
      prisma.studentEducationProfile.findUnique.mockResolvedValue({
        id: 'sep-1',
        studentIdentityId: 'student-a',
      });
      prisma.guardianEducationRelationship.findFirst.mockResolvedValue(null);

      await expect(
        access.assertGuardianAuthorizedAccess({
          accessorIdentityId: 'guardian-1',
          studentEducationProfileId: 'sep-1',
          endpoint: 'test',
          requestedScope: 'viewEnrollmentSummary',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('guardian access ends when relationship no longer permits it', async () => {
      prisma.studentEducationProfile.findUnique.mockResolvedValue({
        id: 'sep-1',
        studentIdentityId: 'student-a',
      });
      prisma.guardianEducationRelationship.findFirst.mockResolvedValue({
        status: GuardianEducationRelationshipStatus.REVOKED,
        effectiveFrom: new Date('2020-01-01'),
        effectiveUntil: null,
        authorizedAccessScopes: { viewEnrollmentSummary: true },
      });

      await expect(
        access.assertGuardianAuthorizedAccess({
          accessorIdentityId: 'guardian-1',
          studentEducationProfileId: 'sep-1',
          endpoint: 'test',
          requestedScope: 'viewEnrollmentSummary',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('EducationAdmissionApplicationProfileService', () => {
    const prisma = {
      educationAdmissionApplicationProfile: { create: jest.fn() },
    };

    let service: EducationAdmissionApplicationProfileService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          EducationAdmissionApplicationProfileService,
          EducationBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(EducationAdmissionApplicationProfileService);
      jest.clearAllMocks();
    });

    it('application link returns zero enrollments created', async () => {
      prisma.educationAdmissionApplicationProfile.create.mockResolvedValue({
        id: 'eap-1',
        doesNotCreateEnrollment: true,
      });

      const result = await service.linkAdmissionApplicationProfile({
        studentEducationProfileId: 'sep-1',
        caseId: 'case-1',
        applicationId: 'app-1',
      });

      expect(result.enrollmentsCreated).toBe(0);
    });
  });

  describe('ScholarshipApplicationProfileService', () => {
    const prisma = {
      scholarshipApplicationProfile: { create: jest.fn() },
    };

    let service: ScholarshipApplicationProfileService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          ScholarshipApplicationProfileService,
          EducationBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(ScholarshipApplicationProfileService);
      jest.clearAllMocks();
    });

    it('scholarship application link returns zero awards', async () => {
      prisma.scholarshipApplicationProfile.create.mockResolvedValue({
        id: 'sap-1',
        doesNotCreateAward: true,
      });

      const result = await service.linkScholarshipApplicationProfile({
        studentEducationProfileId: 'sep-1',
        scholarshipProgramReferenceId: 'spr-1',
        caseId: 'case-1',
        applicationId: 'app-1',
      });

      expect(result.awardsCreated).toBe(0);
    });
  });

  describe('EducationInstitutionService', () => {
    const prisma = {
      educationInstitution: { create: jest.fn() },
      educationInstitutionRegistration: { create: jest.fn() },
    };

    let service: EducationInstitutionService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          EducationInstitutionService,
          EducationBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(EducationInstitutionService);
      jest.clearAllMocks();
    });

    it('registration submission returns zero accreditations', async () => {
      prisma.educationInstitutionRegistration.create.mockResolvedValue({
        id: 'reg-1',
        registrationDoesNotAccredit: true,
      });

      const result = await service.submitRegistration({
        educationInstitutionId: 'inst-1',
      });

      expect(result.accreditationsCreated).toBe(0);
    });
  });

  describe('TranscriptRecordService', () => {
    const prisma = {
      transcriptRecord: { findUnique: jest.fn(), update: jest.fn() },
      transcriptRecordCorrectionHistory: { create: jest.fn(), count: jest.fn() },
    };

    let service: TranscriptRecordService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          TranscriptRecordService,
          EducationBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(TranscriptRecordService);
      jest.clearAllMocks();
    });

    it('blocks destructive transcript overwrite', async () => {
      prisma.transcriptRecord.findUnique.mockResolvedValue({
        id: 'tr-1',
        versionNumber: 1,
        contentReference: 'v1',
        correctionHistory: [{ id: 'hist-1' }],
      });

      await expect(
        service.correctTranscript({
          transcriptRecordId: 'tr-1',
          correctionReason: 'fix',
          newContentReference: 'v2',
          destructiveOverwrite: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('append correction preserves prior version history', async () => {
      prisma.transcriptRecord.findUnique.mockResolvedValue({
        id: 'tr-1',
        versionNumber: 1,
        contentReference: 'v1',
        correctionHistory: [],
      });
      prisma.transcriptRecordCorrectionHistory.create.mockResolvedValue({ id: 'hist-1' });
      prisma.transcriptRecord.update.mockResolvedValue({
        id: 'tr-1',
        versionNumber: 2,
      });
      prisma.transcriptRecordCorrectionHistory.count.mockResolvedValue(1);

      const result = await service.correctTranscript({
        transcriptRecordId: 'tr-1',
        correctionReason: 'fix',
        newContentReference: 'v2',
      });

      expect(result.priorVersionPreserved).toBe(true);
      expect(result.historyEntries).toBe(1);
    });
  });

  describe('AcademicCredentialService', () => {
    const prisma = {
      academicCredential: { create: jest.fn() },
    };

    let service: AcademicCredentialService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          AcademicCredentialService,
          EducationBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      service = module.get(AcademicCredentialService);
      jest.clearAllMocks();
    });

    it('blocks technical admin credential issuance', async () => {
      await expect(
        service.registerGovernmentCredentialDraft({
          studentEducationProfileId: 'sep-1',
          actorPersona: EducationActorPersona.TECHNICAL_ADMIN,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('EnrollmentRecordService', () => {
    let service: EnrollmentRecordService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [EnrollmentRecordService, { provide: PrismaService, useValue: {} }],
      }).compile();
      service = module.get(EnrollmentRecordService);
    });

    it('rejects auto-enrollment from application link', () => {
      expect(() => {
        service.assertApplicationLinkDidNotAutoEnroll(1);
      }).toThrow(BadRequestException);
    });
  });
});
