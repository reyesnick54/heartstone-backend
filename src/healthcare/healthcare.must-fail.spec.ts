import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  HealthcareAccessDecision,
  HealthcareBreakGlassSessionStatus,
  HealthcareDataAccessPurpose,
  HealthcareDataCategory,
  HealthcareLicenseStatus,
  HealthcarePatientRelationshipKind,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { HealthcareBoundaryService } from './common/healthcare-boundary.service';
import {
  AI_ACTOR_MARKER,
  HEALTHCARE_REASON_CODES,
  PLATFORM_ADMIN_ROLE_MARKER,
} from './healthcare.constants';
import { PatientHealthIdentityBoundaryService } from './patient/patient-health-identity-boundary.service';
import { HealthcareAccessAuditService } from './privacy/healthcare-access-audit.service';
import { HealthcareBreakGlassService } from './privacy/healthcare-break-glass.service';
import { HealthcareDataAccessPolicyService } from './privacy/healthcare-data-access-policy.service';
import { HealthcarePrivacySearchService } from './privacy/healthcare-privacy-search.service';
import { HealthcareProfessionalLicensingService } from './professional/healthcare-professional-licensing.service';

describe('Healthcare must-fail gates', () => {
  describe('HealthcareDataAccessPolicyService', () => {
    let policy: HealthcareDataAccessPolicyService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [HealthcareBoundaryService, HealthcareDataAccessPolicyService],
      }).compile();
      policy = module.get(HealthcareDataAccessPolicyService);
    });

    it('generic citizen cannot access another patient data', () => {
      const result = policy.evaluateAccess({
        actorIdentityId: 'identity-citizen-a',
        patientHealthIdentityId: 'phi-b',
        patientLinkedPlatformIdentityId: 'identity-patient-b',
        accessPurpose: HealthcareDataAccessPurpose.PATIENT_SELF,
        dataCategory: HealthcareDataCategory.CLINICAL,
        relationshipKinds: [],
      });

      expect(result.decision).toBe(HealthcareAccessDecision.DENY);
      expect(result.reasonCode).toBe(HEALTHCARE_REASON_CODES.CROSS_PATIENT_ACCESS_DENIED);
    });

    it('platform administrator does not automatically receive clinical access', () => {
      expect(() => {
        policy.assertMayReadClinicalData({
          actorIdentityId: 'identity-admin',
          patientHealthIdentityId: 'phi-1',
          patientLinkedPlatformIdentityId: 'identity-patient',
          actorRoleMarker: PLATFORM_ADMIN_ROLE_MARKER,
          accessPurpose: HealthcareDataAccessPurpose.TREATING_PROVIDER,
          dataCategory: HealthcareDataCategory.CLINICAL,
          relationshipKinds: [HealthcarePatientRelationshipKind.TREATING_PROVIDER],
        });
      }).toThrow(ForbiddenException);
    });

    it('provider organization membership alone does not create patient access', () => {
      const result = policy.evaluateAccess({
        actorIdentityId: 'identity-staff',
        patientHealthIdentityId: 'phi-1',
        accessPurpose: HealthcareDataAccessPurpose.CARE_TEAM,
        dataCategory: HealthcareDataCategory.CLINICAL,
        relationshipKinds: [],
        hasOrganizationMembership: true,
      });

      expect(result.decision).toBe(HealthcareAccessDecision.DENY);
      expect(result.reasonCode).toBe(HEALTHCARE_REASON_CODES.ORG_MEMBERSHIP_INSUFFICIENT);
    });
  });

  describe('HealthcareProfessionalLicensingService', () => {
    let licensing: HealthcareProfessionalLicensingService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [HealthcareBoundaryService, HealthcareProfessionalLicensingService],
      }).compile();
      licensing = module.get(HealthcareProfessionalLicensingService);
    });

    it('unlicensed professional cannot be represented as licensed', () => {
      expect(() => {
        licensing.assertMayRepresentAsLicensed({ licenseStatus: HealthcareLicenseStatus.PENDING });
      }).toThrow(ForbiddenException);
    });

    it('expired professional license respected', () => {
      expect(() => {
        licensing.assertMayRepresentAsLicensed({
          licenseStatus: HealthcareLicenseStatus.ACTIVE,
          expiresAt: new Date('2020-01-01T00:00:00.000Z'),
          now: new Date('2026-01-01T00:00:00.000Z'),
        });
      }).toThrow(ForbiddenException);
    });
  });

  describe('PatientHealthIdentityBoundaryService', () => {
    let patientBoundary: PatientHealthIdentityBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [HealthcareBoundaryService, PatientHealthIdentityBoundaryService],
      }).compile();
      patientBoundary = module.get(PatientHealthIdentityBoundaryService);
    });

    it('patient identity cannot be client-substituted', () => {
      expect(() => {
        patientBoundary.rejectClientIdentitySubstitution({
          linkedPlatformIdentityId: 'identity-attacker',
        });
      }).toThrow(ForbiddenException);
    });
  });

  describe('HealthcareBreakGlassService', () => {
    const prisma = {
      healthcareBreakGlassAccessSession: {
        create: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const audit = {
      record: jest.fn(),
    };

    let breakGlass: HealthcareBreakGlassService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          HealthcareBreakGlassService,
          { provide: PrismaService, useValue: prisma },
          { provide: HealthcareAccessAuditService, useValue: audit },
        ],
      }).compile();

      breakGlass = module.get(HealthcareBreakGlassService);
      jest.clearAllMocks();
      prisma.healthcareBreakGlassAccessSession.create.mockResolvedValue({
        id: 'bg-1',
        requiresPostAccessReview: true,
      });
      audit.record.mockResolvedValue({ id: 'audit-1' });
    });

    it('break-glass requires reason', async () => {
      await expect(
        breakGlass.activateSession({
          actorIdentityId: 'identity-clinician',
          patientHealthIdentityId: 'phi-1',
          policyBasisReference: 'jurisdiction-pack:emergency',
          expiresAt: new Date(Date.now() + 60_000),
          sessionReference: 'BG-TEST',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('break-glass access audited on activation', async () => {
      await breakGlass.activateSession({
        actorIdentityId: 'identity-clinician',
        patientHealthIdentityId: 'phi-1',
        reasonSummary: 'Patient unconscious in emergency department',
        policyBasisReference: 'jurisdiction-pack:emergency',
        expiresAt: new Date(Date.now() + 60_000),
        sessionReference: 'BG-TEST',
      });

      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          breakGlassSessionId: 'bg-1',
        }),
      );
    });

    it('break-glass expires', () => {
      expect(() => {
        breakGlass.assertSessionActive({
          status: HealthcareBreakGlassSessionStatus.ACTIVE,
          expiresAt: new Date('2020-01-01T00:00:00.000Z'),
          now: new Date('2026-01-01T00:00:00.000Z'),
        });
      }).toThrow(ForbiddenException);
    });
  });

  describe('HealthcarePrivacySearchService', () => {
    let search: HealthcarePrivacySearchService;
    const audit = { record: jest.fn().mockResolvedValue({}) };

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          HealthcareBoundaryService,
          HealthcareDataAccessPolicyService,
          { provide: HealthcareAccessAuditService, useValue: audit },
          HealthcarePrivacySearchService,
        ],
      }).compile();
      search = module.get(HealthcarePrivacySearchService);
    });

    it('health data search respects classification and purpose', () => {
      const allowed = search.filterSearchResults(
        {
          actorIdentityId: 'identity-researcher',
          patientHealthIdentityId: 'phi-1',
          accessPurpose: HealthcareDataAccessPurpose.CLINICAL_RESEARCH,
          dataCategory: HealthcareDataCategory.RESEARCH,
          relationshipKinds: [HealthcarePatientRelationshipKind.CLINICAL_RESEARCH_CONTACT],
          policyAllowedPurposes: [HealthcareDataAccessPurpose.CLINICAL_RESEARCH],
          policyAllowedCategories: [HealthcareDataCategory.RESEARCH],
          hasExplicitConsent: true,
        },
        [
          { resourceId: 'r1', dataCategory: HealthcareDataCategory.RESEARCH },
          { resourceId: 'r2', dataCategory: HealthcareDataCategory.HIGHLY_RESTRICTED },
        ],
      );

      expect(allowed.map((entry) => entry.resourceId)).toEqual(['r1']);
    });
  });

  describe('HealthcareBoundaryService', () => {
    let boundary: HealthcareBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [HealthcareBoundaryService],
      }).compile();
      boundary = module.get(HealthcareBoundaryService);
    });

    it('healthcare organization cannot self-license', () => {
      expect(() => {
        boundary.assertOrganizationAccountIsNotLicense({
          mutatingFacilityLicense: true,
          actorOrganizationId: 'org-1',
          targetOrganizationId: 'org-1',
        });
      }).toThrow(ForbiddenException);
    });

    it('AI does not become a healthcare professional', () => {
      expect(() => {
        boundary.assertAiCannotActAsHealthcareProfessional({
          actorKind: AI_ACTOR_MARKER,
          action: 'REGISTER_AS_HEALTHCARE_PROFESSIONAL',
        });
      }).toThrow(ForbiddenException);
    });
  });
});
