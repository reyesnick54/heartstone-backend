import { ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  AdministrativeCorrectionMatterStatus,
  AuthorityEvaluationOutcome,
  AutomationChallengeDispositionType,
  AutomationChallengeGround,
  AutomationChallengeStatus,
  ClarificationRequestStatus,
  RecordCorrectionStatus,
  RedressRouteType,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { RecordCorrectionService } from '../evidence/correction/record-correction.service';
import { RecordsReplayService } from '../evidence/replay/records-replay.service';
import { AutomationChallengeService } from './automation/automation-challenge.service';
import { AutomationExplanationService } from './automation/automation-explanation.service';
import { ClarificationService } from './clarification/clarification.service';
import { ClarificationBoundaryService } from './clarification/clarification-boundary.service';
import { AdministrativeCorrectionService } from './correction/administrative-correction.service';
import { AdministrativeCorrectionBoundaryService } from './correction/administrative-correction-boundary.service';

describe('Phase 10D redress pathways', () => {
  let administrativeCorrectionService: AdministrativeCorrectionService;
  let clarificationService: ClarificationService;
  let automationChallengeService: AutomationChallengeService;
  let automationExplanationService: AutomationExplanationService;
  let clarificationBoundaryService: ClarificationBoundaryService;

  const prisma = {
    administrativeCorrectionMatter: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    clarificationRequest: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    clarificationResponse: {
      create: jest.fn(),
    },
    automationChallenge: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    automationExplanationRecord: {
      create: jest.fn(),
    },
    automationChallengeDisposition: {
      create: jest.fn(),
    },
    authorityEvaluationRecord: {
      findUnique: jest.fn(),
    },
    recordCorrection: {
      findUnique: jest.fn(),
    },
    masterAdministrativeFile: {
      findUnique: jest.fn(),
    },
  };

  const recordCorrectionService = {
    requestCorrection: jest.fn(),
    approveCorrection: jest.fn(),
    implementCorrection: jest.fn(),
    getOriginalRecord: jest.fn(),
  };

  const recordsReplayService = {
    replay: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdministrativeCorrectionBoundaryService,
        AdministrativeCorrectionService,
        ClarificationBoundaryService,
        ClarificationService,
        AutomationExplanationService,
        AutomationChallengeService,
        { provide: PrismaService, useValue: prisma },
        { provide: RecordCorrectionService, useValue: recordCorrectionService },
        { provide: RecordsReplayService, useValue: recordsReplayService },
      ],
    }).compile();

    administrativeCorrectionService = module.get(AdministrativeCorrectionService);
    clarificationService = module.get(ClarificationService);
    automationChallengeService = module.get(AutomationChallengeService);
    automationExplanationService = module.get(AutomationExplanationService);
    clarificationBoundaryService = module.get(ClarificationBoundaryService);
    jest.clearAllMocks();
  });

  it('correction cannot alter substantive decision and routes to reconsideration', async () => {
    prisma.administrativeCorrectionMatter.create.mockResolvedValue({
      id: 'matter-1',
      status: AdministrativeCorrectionMatterStatus.ROUTED_TO_ALTERNATE_REDRESS,
      routedToRoute: RedressRouteType.RECONSIDERATION,
      routedRouteGuidance: 'Use RECONSIDERATION',
    });

    const result = await administrativeCorrectionService.requestCorrection({
      category: 'CLERICAL_MISSTATEMENT',
      targetRecordType: 'EvidenceRecord',
      targetRecordId: 'evidence-1',
      requestedByIdentityId: 'identity-1',
      reason: 'Change outcome',
      requestedChangeDescription: 'Change decision outcome',
      requestedChanges: { finalOutcome: 'APPROVED' },
    });

    expect(result.status).toBe(AdministrativeCorrectionMatterStatus.ROUTED_TO_ALTERNATE_REDRESS);
    expect(result.routedToRoute).toBe(RedressRouteType.RECONSIDERATION);
    expect(recordCorrectionService.requestCorrection).not.toHaveBeenCalled();
  });

  it('clerical change can produce corrected output while preserving original', async () => {
    prisma.administrativeCorrectionMatter.create.mockResolvedValue({
      id: 'matter-2',
      status: AdministrativeCorrectionMatterStatus.REQUESTED,
    });
    prisma.administrativeCorrectionMatter.findUnique.mockResolvedValue({
      id: 'matter-2',
      status: AdministrativeCorrectionMatterStatus.REQUESTED,
      targetRecordType: 'EvidenceRecord',
      targetRecordId: 'evidence-1',
      requestedByIdentityId: 'identity-1',
      requestedChangeDescription: 'Fix typo in name',
      requestedChanges: { displayName: 'Correct Spelling' },
      supportingEvidenceIds: [],
      downstreamRecordsRequiringUpdate: ['presentation-1'],
      reason: 'Typo',
      recordCorrectionId: null,
      originalRecordSnapshot: { displayName: 'Corect Spelling' },
    });
    prisma.authorityEvaluationRecord.findUnique.mockResolvedValue({
      outcome: AuthorityEvaluationOutcome.ALLOW,
    });
    recordCorrectionService.requestCorrection.mockResolvedValue({ id: 'corr-1' });
    recordCorrectionService.approveCorrection.mockResolvedValue({ id: 'corr-1' });
    prisma.administrativeCorrectionMatter.update.mockResolvedValue({
      id: 'matter-2',
      status: AdministrativeCorrectionMatterStatus.APPROVED,
      recordCorrectionId: 'corr-1',
    });

    const approved = await administrativeCorrectionService.approveCorrection({
      matterId: 'matter-2',
      reviewerIdentityId: 'reviewer-1',
      authorityEvaluationRecordId: 'auth-1',
    });

    expect(approved.status).toBe(AdministrativeCorrectionMatterStatus.APPROVED);
    expect(recordCorrectionService.requestCorrection).toHaveBeenCalled();
    expect(recordCorrectionService.approveCorrection).toHaveBeenCalled();

    prisma.administrativeCorrectionMatter.findUnique.mockResolvedValue({
      id: 'matter-2',
      status: AdministrativeCorrectionMatterStatus.APPROVED,
      recordCorrectionId: 'corr-1',
      originalRecordSnapshot: { displayName: 'Corect Spelling' },
      correctedRecordReference: null,
    });
    recordCorrectionService.implementCorrection.mockResolvedValue({ newVersionId: 'version-2' });
    prisma.recordCorrection.findUnique.mockResolvedValue({
      id: 'corr-1',
      status: RecordCorrectionStatus.IMPLEMENTED,
    });
    recordCorrectionService.getOriginalRecord.mockResolvedValue({ displayName: 'Corect Spelling' });
    prisma.administrativeCorrectionMatter.update.mockResolvedValue({
      id: 'matter-2',
      status: AdministrativeCorrectionMatterStatus.IMPLEMENTED,
      correctedRecordReference: 'version-2',
      recordCorrection: { id: 'corr-1', status: RecordCorrectionStatus.IMPLEMENTED },
    });

    const implemented = await administrativeCorrectionService.implementCorrection({
      matterId: 'matter-2',
      actorIdentityId: 'reviewer-1',
      correctedContentReference: 'storage/ref',
      correctedContent: { displayName: 'Correct Spelling' },
    });

    expect(implemented.status).toBe(AdministrativeCorrectionMatterStatus.IMPLEMENTED);
    expect(implemented.correctedRecordReference).toBe('version-2');

    prisma.administrativeCorrectionMatter.findUnique.mockResolvedValue({
      id: 'matter-2',
      status: AdministrativeCorrectionMatterStatus.IMPLEMENTED,
      recordCorrectionId: 'corr-1',
      originalRecordSnapshot: { displayName: 'Corect Spelling' },
      correctedRecordReference: 'version-2',
    });

    const history = await administrativeCorrectionService.getMatterWithHistory('matter-2');
    expect(history.preservesOriginal).toBe(true);
    expect(history.originalRecord).toEqual({ displayName: 'Corect Spelling' });
    expect(history.correctedRecordReference).toBe('version-2');
  });

  it('clarification cannot manufacture new decision reasons', () => {
    expect(() => {
      clarificationBoundaryService.assertResponseWithinBounds({
        responseContent: 'Here is a new reason that cures the defect',
        newDecisionReasons: ['Previously unstated statutory ground'],
      });
    }).toThrow(ForbiddenException);
  });

  it('clarification can explain procedural meaning without changing outcome', async () => {
    prisma.clarificationRequest.create.mockResolvedValue({
      id: 'clar-1',
      status: ClarificationRequestStatus.REQUESTED,
    });
    prisma.clarificationRequest.findUnique.mockResolvedValue({
      id: 'clar-1',
      status: ClarificationRequestStatus.REQUESTED,
    });
    prisma.clarificationResponse.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'resp-1',
        ...data,
      }),
    );

    const response = await clarificationService.respond({
      clarificationRequestId: 'clar-1',
      responderIdentityId: 'official-1',
      responseContent: 'The notice means you must file within 30 days of receipt.',
      proceduralExplanation: 'Section 4.2 governs the referenced deadline.',
      referencedRequirement: 'Regulation 4.2',
      availableRoutes: ['RECONSIDERATION'],
      displayedDataExplanation: 'Status shown reflects the recorded decision date.',
      recordAccessGuidance: 'Request MAF section 17 for appeal records.',
    });

    expect(response.proceduralExplanation).toContain('Section 4.2');
    expect(prisma.clarificationRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: ClarificationRequestStatus.RESPONDED },
      }),
    );
  });

  it('AI challenge identifies model and system version in explanation', async () => {
    prisma.automationExplanationRecord.create.mockResolvedValue({
      id: 'expl-1',
      systemIdentifier: 'eligibility-scorer',
      modelIdentifier: 'risk-classifier-v3',
      version: '3.2.1',
      explanationSummary:
        'Automation system eligibility-scorer using model risk-classifier-v3 (version 3.2.1) performed the role "recommendation" for approved purpose: eligibility screening.',
      materialInputs: { applicantId: 'app-1' },
      output: { score: 0.72 },
      protectedRedactedElements: [],
      rerunAvailable: true,
      exclusionAvailable: true,
      workflowRole: 'recommendation',
      limitations: null,
      correctionRouteReference: null,
      reconsiderationRouteReference: null,
    });

    const explanation = await automationExplanationService.createExplanation({
      automationUsed: true,
      approvedPurpose: 'eligibility screening',
      systemIdentifier: 'eligibility-scorer',
      modelIdentifier: 'risk-classifier-v3',
      version: '3.2.1',
      materialInputs: { applicantId: 'app-1' },
      output: { score: 0.72 },
      workflowRole: 'recommendation',
      rerunAvailable: true,
      exclusionAvailable: true,
    });

    expect(explanation.systemIdentifier).toBe('eligibility-scorer');
    expect(explanation.modelIdentifier).toBe('risk-classifier-v3');
    expect(explanation.version).toBe('3.2.1');
  });

  it('AI cannot adjudicate AI challenge', async () => {
    prisma.automationChallenge.findUnique.mockResolvedValue({
      id: 'chal-1',
      status: AutomationChallengeStatus.FILED,
      grounds: AutomationChallengeGround.UNEXPLAINED_SCORE,
      description: 'Score unexplained',
      explanationRecord: null,
      disposition: null,
    });

    await expect(
      automationChallengeService.disposeChallenge({
        challengeId: 'chal-1',
        dispositionType: AutomationChallengeDispositionType.NO_DEFECT_FOUND,
        disposedByIdentityId: 'ai-assistant:bot-1',
        rationale: 'No defect',
      }),
    ).rejects.toThrow('AI cannot adjudicate');
  });

  it('meaningful explanation remains available when protected detail is redacted', async () => {
    prisma.automationExplanationRecord.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'expl-2',
        ...data,
      }),
    );

    const explanation = await automationExplanationService.createExplanation({
      automationUsed: true,
      approvedPurpose: 'identity matching',
      systemIdentifier: 'identity-matcher',
      modelIdentifier: 'matcher-prod',
      version: '1.0.0',
      materialInputs: { ssn: '123-45-6789', name: 'Jane Doe' },
      output: { matchScore: 0.91 },
      workflowRole: 'matching',
      protectedRedactedElements: [{ field: 'ssn', basis: 'PII protection under privacy policy' }],
    });

    const view = automationExplanationService.buildPublicView(explanation);
    expect(view.explanationSummary).toContain('identity-matcher');
    expect(view.explanationSummary).toContain('1 protected element');
    expect(view.materialInputs.ssn).toBe('[REDACTED]');
    expect(view.protectedRedactedElements[0]?.basis).toContain('PII');
  });

  it('false match can route to correction review', async () => {
    prisma.automationChallenge.findUnique.mockResolvedValue({
      id: 'chal-2',
      status: AutomationChallengeStatus.FILED,
      grounds: AutomationChallengeGround.FALSE_MATCH,
      description: 'Wrong person matched',
      explanationRecord: null,
      disposition: null,
    });
    prisma.automationChallenge.update.mockResolvedValue({
      id: 'chal-2',
      status: AutomationChallengeStatus.ROUTED_TO_CORRECTION,
    });

    const routed = await automationChallengeService.routeFalseMatchToCorrection(
      'chal-2',
      'matter-corr-1',
    );

    expect(routed.status).toBe(AutomationChallengeStatus.ROUTED_TO_CORRECTION);
  });

  it('faulty automated output can be excluded without erasing historical use', async () => {
    prisma.automationChallenge.findUnique.mockResolvedValue({
      id: 'chal-3',
      status: AutomationChallengeStatus.EXPLANATION_PROVIDED,
      grounds: AutomationChallengeGround.INCONSISTENT_RECOMMENDATION,
      description: 'Inconsistent output',
      explanationRecord: { id: 'expl-3' },
      disposition: null,
    });
    prisma.automationChallengeDisposition.create.mockResolvedValue({
      id: 'disp-1',
      dispositionType: AutomationChallengeDispositionType.EXCLUDE_FAULTY_OUTPUT,
      historicalOutputPreserved: true,
      excludedOutputReference: 'output-ref-1',
    });
    prisma.automationChallenge.update.mockResolvedValue({
      id: 'chal-3',
      status: AutomationChallengeStatus.ROUTED_TO_CORRECTION,
    });

    const disposition = await automationChallengeService.disposeChallenge({
      challengeId: 'chal-3',
      dispositionType: AutomationChallengeDispositionType.EXCLUDE_FAULTY_OUTPUT,
      disposedByIdentityId: 'reviewer-1',
      rationale: 'Exclude faulty score from downstream presentation',
      excludedOutputReference: 'output-ref-1',
    });

    expect(disposition.historicalOutputPreserved).toBe(true);
    expect(disposition.excludedOutputReference).toBe('output-ref-1');
  });

  it('human reviewer can dispose automation challenge', async () => {
    prisma.automationChallenge.findUnique.mockResolvedValue({
      id: 'chal-4',
      status: AutomationChallengeStatus.UNDER_REVIEW,
      grounds: AutomationChallengeGround.MISSING_HUMAN_REVIEW,
      description: 'No human review',
      explanationRecord: { id: 'expl-4' },
      disposition: null,
    });
    prisma.automationChallengeDisposition.create.mockResolvedValue({
      id: 'disp-2',
      dispositionType: AutomationChallengeDispositionType.REQUIRE_HUMAN_REVIEW,
      historicalOutputPreserved: false,
    });
    prisma.automationChallenge.update.mockResolvedValue({
      id: 'chal-4',
      status: AutomationChallengeStatus.DISPOSED,
    });

    const disposition = await automationChallengeService.disposeChallenge({
      challengeId: 'chal-4',
      dispositionType: AutomationChallengeDispositionType.REQUIRE_HUMAN_REVIEW,
      disposedByIdentityId: 'reviewer-2',
      rationale: 'Human review was not recorded before decision',
    });

    expect(disposition.dispositionType).toBe(
      AutomationChallengeDispositionType.REQUIRE_HUMAN_REVIEW,
    );
  });
});
