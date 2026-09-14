import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  GovernmentDecisionStatus,
  GovernmentDecisionType,
  InstrumentJurisdictionScope,
  OfficialInstrumentStatus,
  PriorVersionTreatment,
  ReviewStayStatus,
  SurrenderType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { InstrumentLifecycleBoundaryService } from '../common/instrument-lifecycle-boundary.service';
import { TECHNICAL_ADMIN_ROLE_MARKER } from '../instruments.constants';
import { GovernmentDecisionService } from './government-decision.service';
import { InstrumentLifecycleService } from './instrument-lifecycle.service';
import { InstrumentLifecycleGuardService } from './instrument-lifecycle-guard.service';
import { InstrumentVerificationService } from './instrument-verification.service';

describe('InstrumentLifecycleService', () => {
  let service: InstrumentLifecycleService;
  let boundary: InstrumentLifecycleBoundaryService;
  let guard: InstrumentLifecycleGuardService;
  let verification: InstrumentVerificationService;

  const prisma = {
    officialInstrument: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    officialInstrumentVersion: {
      create: jest.fn(),
      update: jest.fn(),
    },
    instrumentLifecycleEvent: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    instrumentLifecycleDecisionLink: {
      create: jest.fn(),
    },
    instrumentAmendmentRecord: { create: jest.fn() },
    instrumentRenewalRecord: { create: jest.fn() },
    instrumentSuspensionRecord: { create: jest.fn() },
    instrumentRevocationRecord: { create: jest.fn() },
    instrumentReinstatementRecord: { create: jest.fn() },
    instrumentSurrenderRecord: { create: jest.fn() },
    decisionReviewReference: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    governmentDecision: {
      findFirst: jest.fn(),
    },
  };

  const decisionService = {
    assertDecisionFinalized: jest.fn(),
    finalizeDecision: jest.fn(),
    createDecision: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstrumentLifecycleService,
        InstrumentLifecycleBoundaryService,
        InstrumentLifecycleGuardService,
        InstrumentVerificationService,
        { provide: PrismaService, useValue: prisma },
        { provide: GovernmentDecisionService, useValue: decisionService },
      ],
    }).compile();

    service = module.get(InstrumentLifecycleService);
    boundary = module.get(InstrumentLifecycleBoundaryService);
    guard = module.get(InstrumentLifecycleGuardService);
    verification = module.get(InstrumentVerificationService);
    jest.clearAllMocks();
  });

  describe('boundary guards', () => {
    it('rejects ordinary PATCH of instrument status', () => {
      expect(() => {
        boundary.assertClientCannotPatchInstrumentStatus({
          status: OfficialInstrumentStatus.REVOKED,
        });
      }).toThrow(ForbiddenException);
    });

    it('rejects clerical correction that alters substantive scope', () => {
      expect(() => {
        boundary.assertClericalCorrectionScope({ altersScope: true });
      }).toThrow(BadRequestException);
    });

    it('rejects technical admin creating suspension decision', () => {
      expect(() => {
        boundary.assertTechnicalAdminCannotCreateSuspensionDecision({
          actorRoleMarker: TECHNICAL_ADMIN_ROLE_MARKER,
          isCreatingDecision: true,
        });
      }).toThrow(ForbiddenException);
    });

    it('rejects ABSEZ revocation represented as national', () => {
      expect(() => {
        boundary.assertAbsezRevocationNotNational({
          jurisdictionScope: InstrumentJurisdictionScope.ABSEZ,
          representsNationalRevocation: true,
        });
      }).toThrow(/ABSEZ/i);
    });
  });

  describe('renewal guards', () => {
    it('requires current evidence for renewal', () => {
      expect(() => {
        guard.assertRenewalEligibility({
          currentEvidenceIds: [],
          identityVerified: true,
          ownershipVerified: true,
          conditionsPerformanceVerified: true,
          priorApprovalReliedUpon: false,
          paymentReceived: false,
          decisionFinalized: true,
        });
      }).toThrow(/current evidence/i);
    });

    it('rejects payment-only renewal', () => {
      expect(() => {
        guard.assertRenewalEligibility({
          currentEvidenceIds: ['ev-1'],
          identityVerified: true,
          ownershipVerified: true,
          conditionsPerformanceVerified: true,
          priorApprovalReliedUpon: false,
          paymentReceived: true,
          decisionFinalized: false,
        });
      }).toThrow(/payment alone/i);
    });
  });

  describe('reinstatement guards', () => {
    it('does not auto-reinstate on suspension expiry alone', () => {
      expect(() => {
        guard.assertReinstatementPrerequisitesResolved({
          priorSuspensionExpired: true,
          correctiveEvidenceProvided: true,
          inspectionVerified: true,
          professionalVerified: true,
          newDecisionFinalized: false,
        });
      }).toThrow(/does not automatically reinstate/i);
    });
  });

  describe('appeal and stay', () => {
    it('files review without auto-stay', async () => {
      prisma.decisionReviewReference.create.mockResolvedValue({
        id: 'review-1',
        stayStatus: ReviewStayStatus.NONE,
      });

      const review = await service.fileReviewReference({
        challengedDecisionId: 'decision-1',
        reviewRoute: 'ADMINISTRATIVE_REVIEW',
        reviewAuthority: 'Review Board',
        filedAt: new Date(),
      });

      expect(review.stayStatus).toBe(ReviewStayStatus.NONE);
      expect(prisma.decisionReviewReference.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            stayStatus: ReviewStayStatus.NONE,
          }) as Record<string, unknown>,
        }),
      );
    });

    it('represents explicit authorized stay', async () => {
      prisma.decisionReviewReference.findUnique.mockResolvedValue({ id: 'review-1' });
      prisma.decisionReviewReference.update.mockResolvedValue({
        id: 'review-1',
        stayStatus: ReviewStayStatus.INTERIM_STAY_AUTHORIZED,
      });

      const updated = await service.authorizeStay({
        reviewReferenceId: 'review-1',
        interimEffect: 'FULL_STAY',
        stayStatus: ReviewStayStatus.INTERIM_STAY_AUTHORIZED,
      });

      expect(updated.stayStatus).toBe(ReviewStayStatus.INTERIM_STAY_AUTHORIZED);
    });
  });

  describe('amendment preserves original version', () => {
    it('creates new version and supersedes prior without deleting', async () => {
      decisionService.assertDecisionFinalized.mockResolvedValue({
        id: 'decision-amend',
        decisionStatus: GovernmentDecisionStatus.FINALIZED,
        lifecycleDecisionType: GovernmentDecisionType.AMEND,
      });

      const activeInstrument = {
        id: 'inst-1',
        status: OfficialInstrumentStatus.EFFECTIVE,
        currentVersion: {
          id: 'v1',
          versionNumber: 1,
          scopeDescription: 'Original scope',
          rightsAndObligations: {},
          conditions: [],
        },
        lifecycleEvents: [],
      };
      const amendedInstrument = {
        id: 'inst-1',
        status: OfficialInstrumentStatus.AMENDED,
        versions: [{ id: 'v1' }, { id: 'v2' }],
        lifecycleEvents: [],
        currentVersion: { id: 'v2' },
      };

      prisma.officialInstrument.findUnique
        .mockResolvedValueOnce(activeInstrument)
        .mockResolvedValueOnce(activeInstrument)
        .mockResolvedValueOnce(amendedInstrument);

      prisma.governmentDecision.findFirst.mockResolvedValue(null);
      prisma.instrumentLifecycleEvent.findFirst.mockResolvedValue(null);
      prisma.officialInstrumentVersion.create.mockResolvedValue({ id: 'v2', versionNumber: 2 });
      prisma.instrumentAmendmentRecord.create.mockResolvedValue({ id: 'amend-1' });
      prisma.instrumentLifecycleEvent.create.mockResolvedValue({ id: 'event-1' });
      prisma.instrumentLifecycleDecisionLink.create.mockResolvedValue({ id: 'link-1' });
      prisma.officialInstrument.update.mockResolvedValue({});

      const result = await service.amendInstrument({
        instrumentId: 'inst-1',
        controllingDecisionId: 'decision-amend',
        authorityReference: 'auth-1',
        affectedScope: 'Expanded operating area',
        effectiveAt: new Date(),
        priorVersionTreatment: PriorVersionTreatment.SUPERSEDED,
        newContentReference: 'content-v2',
      });

      expect(prisma.officialInstrumentVersion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'v1' },
          data: expect.objectContaining({
            isCurrent: false,
            supersededByVersionId: 'v2',
          }) as Record<string, unknown>,
        }),
      );
      expect(result.status).toBe(OfficialInstrumentStatus.AMENDED);
    });
  });

  describe('surrender preserves obligations', () => {
    it('records continuing obligations in lifecycle metadata', async () => {
      decisionService.assertDecisionFinalized.mockResolvedValue({
        id: 'decision-surrender',
        status: GovernmentDecisionStatus.FINALIZED,
      });

      prisma.officialInstrument.findUnique.mockResolvedValue({
        id: 'inst-1',
        status: OfficialInstrumentStatus.EFFECTIVE,
      });

      prisma.instrumentSurrenderRecord.create.mockResolvedValue({ id: 'surrender-1' });
      prisma.instrumentLifecycleEvent.create.mockResolvedValue({ id: 'event-1' });
      prisma.instrumentLifecycleDecisionLink.create.mockResolvedValue({ id: 'link-1' });
      prisma.officialInstrument.update.mockResolvedValue({});

      await service.surrenderInstrument({
        instrumentId: 'inst-1',
        controllingDecisionId: 'decision-surrender',
        surrenderType: SurrenderType.APPLICANT_REQUEST,
        effectiveAt: new Date(),
        continuingObligations: [{ code: 'REPORTING', description: 'Annual report for 2 years' }],
      });

      expect(prisma.instrumentLifecycleEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            metadata: expect.objectContaining({
              continuingObligations: expect.arrayContaining([
                expect.objectContaining({ code: 'REPORTING' }) as Record<string, unknown>,
              ]) as unknown,
            }) as Record<string, unknown>,
          }) as Record<string, unknown>,
        }),
      );
    });
  });

  describe('public verification', () => {
    it('updates verification cache to non-current status after suspension', async () => {
      prisma.officialInstrument.update.mockResolvedValue({
        id: 'inst-1',
        publicVerificationStatus: 'SUSPENDED',
      });

      await verification.updateVerificationCache('inst-1', OfficialInstrumentStatus.SUSPENDED);

      expect(prisma.officialInstrument.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            publicVerificationStatus: 'SUSPENDED',
            status: OfficialInstrumentStatus.SUSPENDED,
          }) as Record<string, unknown>,
        }),
      );
    });
  });
});
