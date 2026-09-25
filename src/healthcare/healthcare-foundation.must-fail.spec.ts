import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AdverseEventCausalityStatus,
  HealthcareConsentRecordStatus,
  HealthDataRecordSensitivityClassification,
  IdentityType,
  ResearchDataAccessGrantStatus,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { type ActorContext } from '../identity/auth/context/actor-context.types';
import { HealthcareBoundaryService } from './common/healthcare-boundary.service';
import { HealthcareFoundationAccessPolicyService } from './common/healthcare-data-access-policy.service';
import { HealthcareConsentService } from './consent/healthcare-consent.service';
import { HealthcareConsentPolicyService } from './consent/healthcare-consent-policy.service';
import { HEALTHCARE_REASON_CODES, PLATFORM_ADMIN_ROLE_MARKER } from './healthcare.constants';
import { HealthcareInteropGatewayService } from './integrations/healthcare-interop-gateway.service';
import { ResearchDataGovernanceService } from './research/research-data-governance.service';
import { ClinicalSafetyService } from './safety/clinical-safety.service';

function buildActor(overrides?: Partial<ActorContext>): ActorContext {
  return {
    identityId: '11111111-1111-4111-8111-111111111111',
    userAccountId: null,
    personId: null,
    sessionId: 'session-1',
    identityType: IdentityType.INDIVIDUAL,
    assuranceLevel: 'HIGH',
    session: {
      sessionId: 'session-1',
      status: 'ACTIVE',
      assuranceLevel: 'HIGH',
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600_000),
      lastUsedAt: null,
      ipAddress: null,
      userAgent: null,
    },
    organizationMemberships: [],
    representativeAuthorities: [],
    officeholderLinks: [],
    activeAppointments: [],
    activeDelegations: [],
    institutionContexts: [],
    hasInstitutionalRelationships: false,
    ...overrides,
  };
}

describe('Healthcare must-fail gates', () => {
  describe('HealthcareBoundaryService', () => {
    let boundary: HealthcareBoundaryService;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [HealthcareBoundaryService],
      }).compile();
      boundary = module.get(HealthcareBoundaryService);
    });

    it('adverse event report does not automatically establish causality at filing', () => {
      expect(() => {
        boundary.assertReportDoesNotAutoEstablishCausality({
          causalityEstablished: true,
          causalityAssessmentStatus: AdverseEventCausalityStatus.NOT_ASSESSED,
        });
      }).toThrow();
    });

    it('AI cannot establish adverse-event causality', () => {
      expect(() => {
        boundary.assertAiCannotEstablishAdverseEventCausality(
          IdentityType.SERVICE,
          'ESTABLISH_ADVERSE_EVENT_CAUSALITY',
        );
      }).toThrow(ForbiddenException);
    });

    it('clinical safety record cannot be silently deleted', () => {
      expect(() => {
        boundary.assertSafetyRecordCannotBeSilentlyDeleted('delete');
      }).toThrow(ForbiddenException);
    });

    it('platform admin cannot bypass healthcare access policy marker', () => {
      expect(() => {
        boundary.assertPlatformAdminCannotBypassHealthcarePolicy(PLATFORM_ADMIN_ROLE_MARKER);
      }).toThrow(ForbiddenException);
    });

    it('external data discrepancy is surfaced instead of silently overwriting authoritative state', () => {
      expect(() => {
        boundary.assertDiscrepancyNotSilentOverwrite(true);
      }).toThrow();
    });

    it('integration failure does not fabricate successful clinical transaction', () => {
      expect(() => {
        boundary.assertIntegrationFailureNotFabricatedSuccess(false, 'SUCCEEDED');
      }).toThrow();
    });
  });

  describe('Healthcare consent and access policy', () => {
    let consentPolicy: HealthcareConsentPolicyService;
    let consentService: HealthcareConsentService;
    let accessPolicy: HealthcareFoundationAccessPolicyService;
    let prisma: {
      healthcareConsentPurposeDefinition: { findUnique: jest.Mock };
      healthcareConsentGrant: {
        findFirst: jest.Mock;
        findUnique: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
      };
      healthcareConsent: { create: jest.Mock; findUnique: jest.Mock };
      healthcareConsentWithdrawal: { create: jest.Mock };
      healthcarePatientReference: { findUnique: jest.Mock };
      healthcareDataAccessAudit: { create: jest.Mock };
      healthDataRecordReference: { findUnique: jest.Mock; create: jest.Mock };
      healthDataAccessRecord: { create: jest.Mock };
    };

    beforeEach(async () => {
      prisma = {
        healthcareConsentPurposeDefinition: { findUnique: jest.fn() },
        healthcareConsentGrant: {
          findFirst: jest.fn(),
          findUnique: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
        healthcareConsent: { create: jest.fn(), findUnique: jest.fn() },
        healthcareConsentWithdrawal: { create: jest.fn() },
        healthcarePatientReference: { findUnique: jest.fn() },
        healthcareDataAccessAudit: { create: jest.fn().mockResolvedValue({}) },
        healthDataRecordReference: { findUnique: jest.fn(), create: jest.fn() },
        healthDataAccessRecord: { create: jest.fn().mockResolvedValue({}) },
      };

      const module = await Test.createTestingModule({
        providers: [
          HealthcareBoundaryService,
          HealthcareConsentPolicyService,
          HealthcareConsentService,
          HealthcareFoundationAccessPolicyService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      consentPolicy = module.get(HealthcareConsentPolicyService);
      consentService = module.get(HealthcareConsentService);
      accessPolicy = module.get(HealthcareFoundationAccessPolicyService);
    });

    it('revoked consent blocks purpose requiring that consent', async () => {
      prisma.healthcareConsentPurposeDefinition.findUnique.mockResolvedValue({
        id: 'purpose-1',
        purposeCode: 'TREATMENT',
      });
      prisma.healthcareConsentGrant.findFirst.mockResolvedValue(null);

      await expect(
        consentPolicy.assertActiveConsentForPurpose({
          patientReferenceId: 'patient-1',
          purposeCode: 'TREATMENT',
        }),
      ).rejects.toThrow(HEALTHCARE_REASON_CODES.CONSENT_REVOKED);
    });

    it('one consent purpose cannot be reused for unrelated purpose', async () => {
      prisma.healthcareConsentGrant.findUnique.mockResolvedValue({
        id: 'grant-1',
        purpose: { purposeCode: 'TREATMENT' },
      });

      await expect(
        consentPolicy.assertPurposeNotReusedForUnrelatedGrant({
          grantId: 'grant-1',
          requestedPurposeCode: 'RESEARCH',
        }),
      ).rejects.toThrow(HEALTHCARE_REASON_CODES.PURPOSE_MISMATCH);
    });

    it('consent withdrawal preserves history', async () => {
      prisma.healthcareConsentGrant.findUnique.mockResolvedValue({
        id: 'grant-1',
        consentId: 'consent-1',
        patientReferenceId: 'patient-ref-1',
        consent: { id: 'consent-1' },
        withdrawal: null,
      });
      prisma.healthcarePatientReference.findUnique.mockResolvedValue({
        id: 'patient-ref-1',
        patientIdentityId: '11111111-1111-4111-8111-111111111111',
      });
      prisma.healthcareConsentWithdrawal.create.mockResolvedValue({ preservesHistory: true });
      prisma.healthcareConsentGrant.update.mockResolvedValue({});
      prisma.healthcareConsent.findUnique.mockResolvedValue({
        id: 'consent-1',
        status: HealthcareConsentRecordStatus.ACTIVE,
      });

      const result = await consentService.withdrawConsentGrant(buildActor(), 'grant-1');
      expect(result.withdrawal.preservesHistory).toBe(true);
      expect(result.historicalConsent?.status).toBe(HealthcareConsentRecordStatus.ACTIVE);
    });

    it('health data access is audited when denied for platform admin', async () => {
      prisma.healthcarePatientReference.findUnique.mockResolvedValue({
        id: 'patient-1',
        patientIdentityId: 'other',
      });

      await expect(
        accessPolicy.assertMayAccessHealthcareData(buildActor(), {
          patientReferenceId: 'patient-1',
          purposeCode: 'TREATMENT',
          classification: HealthDataRecordSensitivityClassification.GENETIC,
          endpoint: 'test',
          roleMarker: PLATFORM_ADMIN_ROLE_MARKER,
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.healthcareDataAccessAudit.create).toHaveBeenCalled();
    });

    it('external provider cannot access unrelated patient scope', async () => {
      await expect(
        accessPolicy.assertMayAccessHealthcareData(buildActor(), {
          patientReferenceId: 'patient-1',
          purposeCode: 'TREATMENT',
          classification: HealthDataRecordSensitivityClassification.GENERAL,
          endpoint: 'test',
          externalProviderOrganizationId: 'org-a',
          allowedExternalProviderOrganizationId: 'org-b',
        }),
      ).rejects.toThrow(HEALTHCARE_REASON_CODES.EXTERNAL_PROVIDER_SCOPE_DENIED);
    });

    it('restricted genetic classification obeys access policy for non-subject', async () => {
      prisma.healthcarePatientReference.findUnique.mockResolvedValue({
        id: 'patient-1',
        patientIdentityId: '22222222-2222-4222-8222-222222222222',
      });

      await expect(
        accessPolicy.assertMayAccessHealthcareData(buildActor(), {
          patientReferenceId: 'patient-1',
          purposeCode: 'TREATMENT',
          classification: HealthDataRecordSensitivityClassification.GENETIC,
          endpoint: 'test',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Research and safety services', () => {
    it('research access expires', async () => {
      const prisma = {
        researchDataAccessGrant: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'grant-1',
            researcherIdentityId: '11111111-1111-4111-8111-111111111111',
            status: ResearchDataAccessGrantStatus.ACTIVE,
            expiresAt: new Date(Date.now() - 60_000),
            datasetId: 'dataset-1',
          }),
        },
        researchDatasetVersion: { findFirst: jest.fn() },
      };

      const module = await Test.createTestingModule({
        providers: [
          ResearchDataGovernanceService,
          HealthcareFoundationAccessPolicyService,
          HealthcareConsentPolicyService,
          HealthcareBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      const research = module.get(ResearchDataGovernanceService);
      await expect(research.assertResearcherDatasetAccess(buildActor(), 'grant-1')).rejects.toThrow(
        HEALTHCARE_REASON_CODES.RESEARCH_ACCESS_EXPIRED,
      );
    });

    it('researcher cannot browse arbitrary patient data outside dataset', async () => {
      const prisma = {
        researchDataAccessGrant: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'grant-1',
            researcherIdentityId: '11111111-1111-4111-8111-111111111111',
            status: ResearchDataAccessGrantStatus.ACTIVE,
            expiresAt: new Date(Date.now() + 60_000),
            datasetId: 'dataset-1',
          }),
          findUniqueOrThrow: jest.fn().mockResolvedValue({
            id: 'grant-1',
            researcherIdentityId: '11111111-1111-4111-8111-111111111111',
            status: ResearchDataAccessGrantStatus.ACTIVE,
            expiresAt: new Date(Date.now() + 60_000),
            datasetId: 'dataset-1',
          }),
        },
        researchDatasetVersion: {
          findFirst: jest.fn().mockResolvedValue({
            recordLinks: [{ recordReference: { patientReferenceId: 'allowed-patient' } }],
          }),
        },
      };

      const module = await Test.createTestingModule({
        providers: [
          ResearchDataGovernanceService,
          HealthcareFoundationAccessPolicyService,
          HealthcareConsentPolicyService,
          HealthcareBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      const research = module.get(ResearchDataGovernanceService);
      await expect(
        research.assertResearcherCannotBrowseArbitraryPatient(
          buildActor(),
          'other-patient',
          'grant-1',
        ),
      ).rejects.toThrow(HEALTHCARE_REASON_CODES.ARBITRARY_PATIENT_BROWSE_DENIED);
    });

    it('pseudonymized dataset retains provenance on create', async () => {
      const prisma = {
        researchDataPurpose: {
          findUnique: jest.fn().mockResolvedValue({ id: 'purpose-1', purposeCode: 'TRIAL-A' }),
        },
        researchDataset: {
          create: jest.fn().mockResolvedValue({ id: 'dataset-1' }),
        },
      };

      const module = await Test.createTestingModule({
        providers: [
          ResearchDataGovernanceService,
          HealthcareFoundationAccessPolicyService,
          HealthcareConsentPolicyService,
          HealthcareBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      const research = module.get(ResearchDataGovernanceService);
      await research.createDatasetWithProvenance({
        datasetReference: 'DS-1',
        purposeCode: 'TRIAL-A',
      });

      const createArgCall = prisma.researchDataset.create.mock.calls[0] as
        | [
            {
              data: {
                claimsAnonymous: boolean;
                pseudonymizationRecords: { create: { provenanceSummary: object } };
              };
            },
          ]
        | undefined;
      const createArg = createArgCall?.[0];
      expect(createArg?.data.claimsAnonymous).toBe(false);
      expect(createArg?.data.pseudonymizationRecords.create.provenanceSummary).toMatchObject({
        note: 'Provenance retained for pseudonymized dataset',
      });
    });

    it('AI cannot establish adverse-event causality in clinical safety service', async () => {
      const prisma = {
        adverseEventAssessment: { create: jest.fn() },
        adverseEventReport: { update: jest.fn() },
      };

      const module = await Test.createTestingModule({
        providers: [
          ClinicalSafetyService,
          HealthcareBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      const safety = module.get(ClinicalSafetyService);
      await expect(
        safety.recordProfessionalCausalityAssessment(
          buildActor({ identityType: IdentityType.SERVICE }),
          {
            reportId: 'report-1',
            causalityStatus: AdverseEventCausalityStatus.CONFIRMED,
          },
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('HealthcareInteropGatewayService', () => {
    it('interop import records source provenance and open discrepancy', async () => {
      const prisma = {
        sourceDiscrepancy: { create: jest.fn().mockResolvedValue({ id: 'disc-1' }) },
        healthcareIntegrationExchangeRecord: {
          create: jest.fn().mockResolvedValue({ id: 'ex-1', succeeded: false }),
        },
      };

      const module = await Test.createTestingModule({
        providers: [
          HealthcareInteropGatewayService,
          HealthcareBoundaryService,
          { provide: PrismaService, useValue: prisma },
        ],
      }).compile();

      const interop = module.get(HealthcareInteropGatewayService);
      await interop.recordInboundImportWithDiscrepancy({
        adapterId: 'adapter-1',
        exchangeReference: 'EX-1',
        inboundProvenance: { sourceSystem: 'FHIR-LAB' },
        integrationDefinitionId: 'def-1',
        fieldReference: 'patient.mrn',
        localValue: 'local-1',
        externalValue: 'external-9',
      });

      const exchangeArgCall = prisma.healthcareIntegrationExchangeRecord.create.mock.calls[0] as
        [{ data: { inboundProvenance: { sourceSystem: string }; succeeded: boolean } }] | undefined;
      const exchangeArg = exchangeArgCall?.[0];
      expect(exchangeArg?.data.inboundProvenance.sourceSystem).toBe('FHIR-LAB');
      expect(exchangeArg?.data.succeeded).toBe(false);
    });
  });
});
