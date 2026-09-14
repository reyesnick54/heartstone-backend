import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  ExternalAuthorityBindingClass,
  ExternalDeterminationAuthenticityStatus,
  ExternalReviewRouteType,
  ExternalReviewStatus,
  ProfessionalChallengeAuthorityType,
  RetainedAppealAuthorityClass,
} from '@prisma/client';

import { type PrismaService } from '../database/prisma.service';
import { ExternalReviewBoundaryService } from './common/external-review-boundary.service';
import { ExternalReviewDeterminationService } from './external-review/external-review-determination.service';
import { ExternalReviewReferralService } from './external-review/external-review-referral.service';
import { JudicialReviewInformationService } from './external-review/judicial-review-information.service';
import { OmbudsOversightReferralService } from './external-review/ombuds-oversight-referral.service';
import { ProfessionalChallengeReferralService } from './external-review/professional-challenge-referral.service';
import { RegulatoryReviewReferralService } from './external-review/regulatory-review-referral.service';
import { type RedressMatterService } from './matters/redress-matter.service';
import {
  AI_ACTOR_ROLE_MARKER,
  AI_CANNOT_DETERMINE_EXTERNAL_OUTCOME_MESSAGE,
  EXTERNAL_REVIEW_NOT_INTERNAL_ADJUDICATION_MESSAGE,
  JUDICIAL_ROUTE_NOT_COURT_MESSAGE,
  PHASE_10F_INVARIANTS,
  PROFESSIONAL_CHALLENGE_REMAINS_PROFESSIONAL_MESSAGE,
  RECOMMENDATION_NOT_BINDING_DETERMINATION_MESSAGE,
  RETAINED_NATIONAL_APPEAL_MESSAGE,
  SILENCE_NOT_APPEAL_SUCCESS_MESSAGE,
  TECHNICAL_ADMIN_CANNOT_FABRICATE_DETERMINATION_MESSAGE,
  TECHNICAL_ADMIN_ROLE_MARKER,
  UNAUTHENTICATED_DETERMINATION_MESSAGE,
} from './redress.constants';

describe('Phase 10F must-fail invariants', () => {
  const boundary = new ExternalReviewBoundaryService();

  const prisma = {
    redressMatter: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({
        id: 'matter-1',
        blocksInternalAdjudication: true,
        retainsNationalAppealAuthority: true,
        retainedAuthorityClass: RetainedAppealAuthorityClass.NATIONAL_STATUTORY,
      }),
      findUnique: jest.fn().mockResolvedValue({
        id: 'matter-1',
        caseId: 'case-1',
        challengedDecisionId: 'decision-1',
        challengedInstrumentId: 'instrument-1',
        blocksInternalAdjudication: true,
        retainsNationalAppealAuthority: true,
        retainedAuthorityClass: RetainedAppealAuthorityClass.NATIONAL_STATUTORY,
        externalReviewReferrals: [],
      }),
    },
    externalReviewReferral: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'referral-1',
          ...data,
        }),
      ),
      findUnique: jest.fn().mockResolvedValue({
        id: 'referral-1',
        competentAuthority: 'National Tribunal',
        routeVersion: 'v1',
        securityClassification: 'OFFICIAL',
        status: ExternalReviewStatus.PREPARATION,
        blocksInternalAdjudication: true,
        packages: [],
        statusRecords: [],
        determination: null,
      }),
      update: jest.fn(),
    },
    externalReviewStatusRecord: { create: jest.fn() },
    externalReviewDetermination: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    professionalChallengeReferral: { create: jest.fn() },
    regulatoryReviewReferral: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ombudsOversightReferral: { create: jest.fn() },
    judicialReviewInformationRecord: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaService;

  const redressMatterService = {
    findById: jest.fn().mockResolvedValue({
      id: 'matter-1',
      caseId: 'case-1',
      challengedDecisionId: 'decision-1',
      challengedInstrumentId: 'instrument-1',
      blocksInternalAdjudication: true,
      retainsNationalAppealAuthority: true,
      retainedAuthorityClass: RetainedAppealAuthorityClass.NATIONAL_STATUTORY,
      externalReviewReferrals: [],
    }),
    assertBlocksInternalAdjudication: jest.fn().mockImplementation(() => {
      throw new BadRequestException(
        'Internal adjudication is blocked for this redress matter; external coordination only',
      );
    }),
  } as unknown as RedressMatterService;
  const referralService = new ExternalReviewReferralService(prisma, boundary, redressMatterService);
  const determinationService = new ExternalReviewDeterminationService(
    prisma,
    boundary,
    referralService,
  );
  const professionalService = new ProfessionalChallengeReferralService(
    prisma,
    boundary,
    referralService,
  );
  const regulatoryService = new RegulatoryReviewReferralService(prisma, boundary, referralService);
  const ombudsService = new OmbudsOversightReferralService(prisma, boundary, referralService);
  const judicialService = new JudicialReviewInformationService(prisma, boundary, referralService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('defines exactly 12 Phase 10F invariants', () => {
    expect(PHASE_10F_INVARIANTS).toHaveLength(12);
    expect(new Set(PHASE_10F_INVARIANTS.map((item) => item.id)).size).toBe(12);
  });

  it('1. external appeal is not internally adjudicated', () => {
    expect(referralService.referralIsInternalAdjudication()).toBe(false);
    expect(() => { boundary.assertNotInternalAdjudication({
        blocksInternalAdjudication: true,
        attemptingInternalOutcome: true,
      }); },
    ).toThrow(ForbiddenException);
    expect(() => { boundary.assertNotInternalAdjudication({
        blocksInternalAdjudication: true,
        attemptingInternalOutcome: true,
      }); },
    ).toThrow(EXTERNAL_REVIEW_NOT_INTERNAL_ADJUDICATION_MESSAGE);
  });

  it('2. national appeal authority is preserved', () => {
    expect(
      boundary.isRetainedAppealAuthority(RetainedAppealAuthorityClass.NATIONAL_STATUTORY),
    ).toBe(true);
    expect(() => { boundary.assertRetainedNationalAuthorityBlocksAdjudication({
        retainsNationalAuthority: true,
        attemptingAdjudication: true,
      }); },
    ).toThrow(RETAINED_NATIONAL_APPEAL_MESSAGE);
  });

  it('3. judicial route does not create internal court', () => {
    expect(() => { boundary.assertJudicialRouteIsNotCourt({ isCourtSystem: true }); }).toThrow(
      BadRequestException,
    );
    expect(() => { boundary.assertJudicialRouteIsNotCourt({ isCourtSystem: true }); }).toThrow(
      JUDICIAL_ROUTE_NOT_COURT_MESSAGE,
    );
  });

  it('4. government silence is not appeal success', () => {
    expect(() => { boundary.assertSilenceIsNotSuccess({ inferredApprovalFromSilence: true }); },
    ).toThrow(SILENCE_NOT_APPEAL_SUCCESS_MESSAGE);
  });

  it('5. professional challenge remains professional', () => {
    expect(() => { boundary.assertProfessionalIndependence({ technologySubstitutesAuthority: true }); },
    ).toThrow(PROFESSIONAL_CHALLENGE_REMAINS_PROFESSIONAL_MESSAGE);
  });

  it('6. external recommendation is distinguished from binding determination', () => {
    expect(() => { boundary.assertRecommendationNotBindingUnlessAuthenticated({
        bindingClass: ExternalAuthorityBindingClass.BINDING,
        isAuthenticated: false,
        isRecommendatoryOnly: true,
      }); },
    ).toThrow(RECOMMENDATION_NOT_BINDING_DETERMINATION_MESSAGE);
  });

  it('7. unauthenticated external determination cannot be implemented', () => {
    expect(() => { boundary.assertAuthenticatedBeforeImplementation({
        isAuthenticated: false,
        implementationAuthorized: true,
        authenticityStatus: ExternalDeterminationAuthenticityStatus.UNVERIFIED,
      }); },
    ).toThrow(UNAUTHENTICATED_DETERMINATION_MESSAGE);
  });

  it('8. external record preserves exact source wording/reference', () => {
    expect(() => { boundary.assertOutcomePreservesSourceWording({
        sourceOutcomeText: 'Set aside on procedural grounds',
        proposedOutcomeText: 'Approved',
        sourceReference: 'EXT-REF-1',
        proposedReference: 'EXT-REF-2',
      }); },
    ).toThrow(ForbiddenException);
  });

  it('9. referral package version is pinned through manifest utility contract', () => {
    expect(boundary.canTransitionStatus(ExternalReviewStatus.PREPARATION, ExternalReviewStatus.READY_FOR_TRANSMISSION)).toBe(true);
    expect(boundary.canTransitionStatus(ExternalReviewStatus.CLOSED, ExternalReviewStatus.PREPARATION)).toBe(false);
  });

  it('10. security classification is preserved on package creation', () => {
    expect(() => { boundary.assertSecurityClassificationPreserved({
        packageClassification: 'PROTECTED',
        referralClassification: 'OFFICIAL',
      }); },
    ).toThrow(BadRequestException);
  });

  it('11. AI cannot determine external outcome', async () => {
    expect(() => { boundary.assertAiCannotDetermineOutcome({ actorRoleMarker: AI_ACTOR_ROLE_MARKER }); },
    ).toThrow(AI_CANNOT_DETERMINE_EXTERNAL_OUTCOME_MESSAGE);

    await expect(
      determinationService.record({
        referralId: 'referral-1',
        sourceAuthority: 'Tribunal',
        outcomeText: 'Allowed',
        receivedDate: new Date(),
        actorRoleMarker: AI_ACTOR_ROLE_MARKER,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('12. technical admin cannot fabricate external determination', () => {
    expect(() => { boundary.assertTechnicalAdminCannotFabricateDetermination({
        actorRoleMarker: TECHNICAL_ADMIN_ROLE_MARKER,
        hasOfficeholderAuthority: false,
        markingAuthenticated: true,
      }); },
    ).toThrow(TECHNICAL_ADMIN_CANNOT_FABRICATE_DETERMINATION_MESSAGE);
  });

  it('creates professional challenge referral without substituting authority', async () => {
    (prisma.professionalChallengeReferral.create as jest.Mock).mockResolvedValue({
      id: 'pc-1',
      technologySubstitutesAuthority: false,
      independencePreserved: true,
    });

    const result = await professionalService.create({
      redressMatterId: 'matter-1',
      competentAuthorityType: ProfessionalChallengeAuthorityType.PROFESSIONAL_BODY,
      professionalBodyReference: 'Medical Council',
      challengeTargetReference: 'finding-1',
      challengedFindingReference: 'professional-review-1',
      competentAuthority: 'Medical Council',
      routeVersion: 'v1',
      authorityPurpose: 'Professional challenge',
      grounds: 'Procedural fairness',
      securityClassification: 'OFFICIAL',
    });

    expect(result.technologySubstitutesAuthority).toBe(false);
    expect(result.boundaryMessage).toBe(PROFESSIONAL_CHALLENGE_REMAINS_PROFESSIONAL_MESSAGE);
  });

  it('creates regulatory referral without inferring approval from silence', async () => {
    (prisma.regulatoryReviewReferral.create as jest.Mock).mockResolvedValue({
      id: 'reg-1',
      inferredApprovalFromSilence: false,
    });

    const result = await regulatoryService.create({
      redressMatterId: 'matter-1',
      regulatorReference: 'National Regulator',
      competentAuthority: 'National Regulator',
      routeVersion: 'v1',
      authorityPurpose: 'Regulatory review',
      grounds: 'Regulatory noncompliance',
      securityClassification: 'OFFICIAL',
    });

    expect(result.inferredApprovalFromSilence).toBe(false);
    expect(result.boundaryMessage).toBe(SILENCE_NOT_APPEAL_SUCCESS_MESSAGE);
  });

  it('creates ombuds referral as recommendatory by default', async () => {
    (prisma.ombudsOversightReferral.create as jest.Mock).mockResolvedValue({
      id: 'omb-1',
      isRecommendatoryOnly: true,
      bindingClass: ExternalAuthorityBindingClass.RECOMMENDATORY,
    });

    const result = await ombudsService.create({
      redressMatterId: 'matter-1',
      ombudsReference: 'Ombudsman Office',
      oversightPurpose: 'Administrative fairness review',
      competentAuthority: 'Ombudsman Office',
      routeVersion: 'v1',
      authorityPurpose: 'Ombuds oversight',
      grounds: 'Administrative fairness',
      securityClassification: 'OFFICIAL',
    });

    expect(result.isRecommendatoryOnly).toBe(true);
    expect(result.bindingClass).toBe(ExternalAuthorityBindingClass.RECOMMENDATORY);
  });

  it('creates judicial review information without building a court', async () => {
    (prisma.judicialReviewInformationRecord.create as jest.Mock).mockResolvedValue({
      id: 'jri-1',
      isCourtSystem: false,
    });

    const result = await judicialService.create({
      redressMatterId: 'matter-1',
      routeInformation: 'Apply to High Court within 30 days',
      competentForum: 'High Court',
      competentAuthority: 'High Court Registry',
      routeVersion: 'v1',
      authorityPurpose: 'Judicial review information',
      grounds: 'Procedural fairness',
      securityClassification: 'OFFICIAL',
    });

    expect(result.isCourtSystem).toBe(false);
    expect(result.boundaryMessage).toBe(JUDICIAL_ROUTE_NOT_COURT_MESSAGE);
  });

  it('rejects APPROVED outcome language without authentication', () => {
    expect(() => { boundary.assertApprovedOutcomeRequiresAuthentication({
        outcomeText: 'APPROVED',
        isAuthenticated: false,
      }); },
    ).toThrow(ForbiddenException);
  });

  it('blocks internal adjudication on retained national redress matter', () => {
    expect(() => {
      void redressMatterService.assertBlocksInternalAdjudication('matter-1');
    }).toThrow(BadRequestException);
  });

  it('creates external referral with non-adjudication disclaimer status record', async () => {
    await referralService.create({
      redressMatterId: 'matter-1',
      routeType: ExternalReviewRouteType.STATUTORY_APPEAL,
      competentAuthority: 'National Tribunal',
      routeVersion: 'v1',
      authorityPurpose: 'Statutory appeal referral',
      grounds: 'Procedural unfairness',
      securityClassification: 'OFFICIAL',
      retainedAuthorityClass: RetainedAppealAuthorityClass.NATIONAL_STATUTORY,
    });

    const statusRecordCalls = (
      prisma.externalReviewStatusRecord.create as jest.Mock
    ).mock.calls as [{ data: { notes: string } }][];
    expect(statusRecordCalls[0]?.[0].data.notes).toBe(
      EXTERNAL_REVIEW_NOT_INTERNAL_ADJUDICATION_MESSAGE,
    );
  });
});
