import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  CompetencyAssessmentOutcome,
  IdentityType,
  OperatorQualificationStatus,
  TrainingCompletionStatus,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { OperatorAccessAlignmentService } from './access/operator-access-alignment.service';
import { OperatorFunctionAccessService } from './access/operator-function-access.service';
import { ProductionReadinessBoundaryService } from './common/production-readiness-boundary.service';
import { DepartmentReadinessService } from './readiness/department-readiness.service';
import { SupportCoverageService } from './support/support-coverage.service';
import { OperationalRoleRequirementService } from './workforce/operational-role-requirement.service';
import { OperatorCompetencyAssessmentService } from './workforce/operator-competency-assessment.service';
import { OperatorQualificationService } from './workforce/operator-qualification.service';
import { TrainingService } from './workforce/training.service';

describe('Phase 13F must-fail gates', () => {
  describe('ProductionReadinessBoundaryService', () => {
    let boundary: ProductionReadinessBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [ProductionReadinessBoundaryService],
      }).compile();
      boundary = module.get(ProductionReadinessBoundaryService);
    });

    it('rejects attendance as competence', () => {
      expect(() => {
        boundary.assertAttendanceNotCompetence(true, OperatorQualificationStatus.QUALIFIED);
      }).toThrow(BadRequestException);
    });

    it('rejects course completion alone as qualification', () => {
      expect(() => {
        boundary.assertCourseCompletionNotQualification(
          TrainingCompletionStatus.COMPLETED,
          OperatorQualificationStatus.QUALIFIED,
          false,
          false,
        );
      }).toThrow(BadRequestException);
    });

    it('rejects technical role without appointment', () => {
      expect(() => {
        boundary.assertSystemRoleNotAppointment(true, false, true);
      }).toThrow(ForbiddenException);
    });

    it('rejects AI qualifying operator', () => {
      expect(() => {
        boundary.assertAiCannotQualifyOperator(true);
      }).toThrow(ForbiddenException);
      expect(() => {
        boundary.assertAiCannotQualifyOperator(false, IdentityType.SERVICE, 'AI_ASSISTANCE');
      }).toThrow(ForbiddenException);
    });

    it('rejects training provider self-assigning authority', () => {
      expect(() => {
        boundary.assertTrainingProviderCannotSelfAssignAuthority('provider-x', false, true);
      }).toThrow(ForbiddenException);
    });

    it('rejects alternate assuming office without appointment/delegation', () => {
      expect(() => {
        boundary.assertAlternateCannotAssumeOffice(true, false, false, true, true);
      }).toThrow(ForbiddenException);
    });

    it('rejects department readiness as institutional acceptance', () => {
      expect(() => {
        boundary.assertDepartmentReadinessNotInstitutionalAcceptance(true);
      }).toThrow(BadRequestException);
    });

    it('rejects department self-activation', () => {
      expect(() => {
        boundary.assertDepartmentCannotSelfActivate(true);
      }).toThrow(ForbiddenException);
    });

    it('blocks high-consequence access for suspended qualification', () => {
      expect(() => {
        boundary.assertHighConsequenceAccessAllowed({
          status: OperatorQualificationStatus.SUSPENDED,
          scope: 'ROLE-A',
          requiredScope: 'ROLE-A',
          isHighConsequence: true,
          isAiAssessed: false,
        });
      }).toThrow(ForbiddenException);
    });

    it('blocks high-consequence access for expired training', () => {
      expect(() => {
        boundary.assertTrainingGateForHighConsequence({
          isHighConsequence: true,
          trainingExpired: true,
          professionalQualificationExpired: false,
        });
      }).toThrow(ForbiddenException);
    });

    it('blocks readiness when staffing shortage prevents mandatory control', () => {
      expect(() => {
        boundary.assertStaffingShortageBlocksReadiness(true, false);
      }).toThrow(BadRequestException);
    });

    it('enforces qualification scope', () => {
      expect(() => {
        boundary.assertQualificationScopeEnforced('ROLE-A', 'ROLE-B');
      }).toThrow(ForbiddenException);
    });

    it('rejects named owner without operational coverage', () => {
      expect(() => {
        boundary.assertNamedOwnerNotCoverage(true, false);
      }).toThrow(BadRequestException);
    });
  });

  describe('OperatorQualificationService', () => {
    let qualificationService: OperatorQualificationService;
    const prisma = {
      operatorQualification: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      operatorCompetencyAssessment: { findMany: jest.fn().mockResolvedValue([]) },
      practicalAssessment: { findMany: jest.fn().mockResolvedValue([]) },
      trainingCompletion: { findMany: jest.fn().mockResolvedValue([]) },
      authorityBoundaryAssessment: { findMany: jest.fn().mockResolvedValue([]) },
      securityPrivacyAssessment: { findMany: jest.fn().mockResolvedValue([]) },
      continuityCompetencyAssessment: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const roleRequirementService = {
      findById: jest.fn().mockResolvedValue({
        id: 'req-1',
        appointmentRequired: true,
        delegationRequired: false,
        requiresKnowledgeAssessment: true,
        requiresPracticalAssessment: true,
        trainingRequirementId: null,
        requiresAuthorityBoundaryAssessment: false,
        requiresSecurityPrivacyAssessment: false,
        requiresContinuityAssessment: false,
        recertificationIntervalDays: null,
      }),
    };

    beforeEach(async () => {
      jest.clearAllMocks();
      const module = await Test.createTestingModule({
        providers: [
          OperatorQualificationService,
          ProductionReadinessBoundaryService,
          { provide: PrismaService, useValue: prisma },
          { provide: OperationalRoleRequirementService, useValue: roleRequirementService },
        ],
      }).compile();
      qualificationService = module.get(OperatorQualificationService);
    });

    it('cannot fabricate qualification from attendance only', async () => {
      prisma.operatorQualification.findUnique.mockResolvedValue({
        id: 'qual-1',
        operationalRoleRequirementId: 'req-1',
        appointmentId: 'appt-1',
      });

      await expect(
        qualificationService.determineQualificationStatus({
          operatorQualificationId: 'qual-1',
          proposedStatus: OperatorQualificationStatus.QUALIFIED,
          isAttendanceOnly: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('OperatorCompetencyAssessmentService', () => {
    let competencyService: OperatorCompetencyAssessmentService;
    const prisma = {
      identity: { findUnique: jest.fn() },
      operatorCompetencyAssessment: { create: jest.fn() },
    };

    beforeEach(async () => {
      jest.clearAllMocks();
      const module = await Test.createTestingModule({
        providers: [
          OperatorCompetencyAssessmentService,
          ProductionReadinessBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      competencyService = module.get(OperatorCompetencyAssessmentService);
    });

    it('rejects AI competency assessment', async () => {
      await expect(
        competencyService.recordAssessment({
          operatorReadinessProfileId: 'profile-1',
          assessorIdentityId: 'identity-1',
          assessmentType: 'KNOWLEDGE',
          outcome: CompetencyAssessmentOutcome.PASSED,
          isAiAssessed: true,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('OperatorAccessAlignmentService', () => {
    let accessService: OperatorAccessAlignmentService;
    const prisma = {
      operatorQualification: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      operatorAccessReview: {
        create: jest.fn().mockResolvedValue({ id: 'review-1' }),
      },
      qualificationExpiryEvent: {
        create: jest.fn().mockResolvedValue({ id: 'event-1' }),
      },
    };

    beforeEach(async () => {
      jest.clearAllMocks();
      prisma.operatorQualification.findUnique.mockResolvedValue({ id: 'qual-1', status: 'QUALIFIED' });
      const module = await Test.createTestingModule({
        providers: [
          OperatorAccessAlignmentService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();
      accessService = module.get(OperatorAccessAlignmentService);
    });

    it('triggers access review on delegation revocation', async () => {
      await accessService.onDelegationRevoked('qual-1', 'delegation-1', 'identity-1');
      expect(prisma.operatorAccessReview.create).toHaveBeenCalled();
    });
  });

  describe('DepartmentReadinessService', () => {
    let readinessService: DepartmentReadinessService;
    const prisma = {
      departmentReadinessAssessment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      staffingReadinessAssessment: { create: jest.fn() },
    };
    const supportCoverageService = {
      detectCoverageGap: jest.fn().mockResolvedValue(false),
    };

    beforeEach(async () => {
      jest.clearAllMocks();
      const module = await Test.createTestingModule({
        providers: [
          DepartmentReadinessService,
          ProductionReadinessBoundaryService,
          { provide: PrismaService, useValue: prisma },
          { provide: SupportCoverageService, useValue: supportCoverageService },
        ],
      }).compile();
      readinessService = module.get(DepartmentReadinessService);
    });

    it('rejects self-activated department readiness', async () => {
      await expect(
        readinessService.assessDepartment({
          assessmentNumber: 'DRA-001',
          departmentId: 'dept-1',
          assessorIdentityId: 'identity-1',
          selfActivated: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('OperatorFunctionAccessService', () => {
    let functionAccessService: OperatorFunctionAccessService;
    const prisma = {
      operatorQualification: { findUnique: jest.fn() },
    };
    const trainingService = {
      isTrainingExpired: jest.fn().mockReturnValue(true),
    };

    beforeEach(async () => {
      jest.clearAllMocks();
      const module = await Test.createTestingModule({
        providers: [
          OperatorFunctionAccessService,
          ProductionReadinessBoundaryService,
          { provide: PrismaService, useValue: prisma },
          { provide: TrainingService, useValue: trainingService },
        ],
      }).compile();
      functionAccessService = module.get(OperatorFunctionAccessService);
    });

    it('blocks high-consequence access when training expired', async () => {
      prisma.operatorQualification.findUnique.mockResolvedValue({
        id: 'qual-1',
        functionAuthorityRecordId: 'far-1',
        scope: 'ROLE-A',
        status: OperatorQualificationStatus.QUALIFIED,
        effectiveUntil: null,
        isAiAssessed: false,
        trainingCompletions: [],
        operationalRoleRequirement: {
          isHighConsequence: true,
          professionalQualificationReference: null,
        },
      });

      await expect(
        functionAccessService.assertHighConsequenceAccess({
          operatorQualificationId: 'qual-1',
          requiredScope: 'ROLE-A',
          functionAuthorityRecordId: 'far-1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
