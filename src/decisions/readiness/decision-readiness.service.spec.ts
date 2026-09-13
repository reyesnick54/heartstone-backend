import { Test } from '@nestjs/testing';
import {
  AuthorityEvaluationOutcome,
  CaseStatus,
  DecisionReadinessOutcome,
  DecisionTypeVersionStatus,
  EvidencePacketVersionStatus,
  IdentityType,
} from '@prisma/client';

import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { InstitutionalActorResolver } from '../../authority/institutional-actor/institutional-actor-resolver.service';
import { PrismaService } from '../../database/prisma.service';
import { MasterFileCompletenessAssessmentService } from '../../records/completeness/master-file-completeness-assessment.service';
import { DECISION_READINESS_REASON_CODES } from '../decisions.constants';
import { DecisionReadinessService } from './decision-readiness.service';

describe('DecisionReadinessService', () => {
  let service: DecisionReadinessService;
  let prisma: {
    case: { findUnique: jest.Mock };
    decisionTypeVersion: { findUnique: jest.Mock };
    governmentServiceVersion: { findUnique: jest.Mock };
    identity: { findUnique: jest.Mock };
    appointment: { findUnique: jest.Mock };
    delegation: { findUnique: jest.Mock };
    evidencePacketVersion: { findUnique: jest.Mock; findFirst: jest.Mock };
    decisionReadinessAssessment: { create: jest.Mock; count: jest.Mock };
  };
  let authorityEvaluation: { evaluate: jest.Mock };
  let actorResolver: { isHumanActor: jest.Mock };
  let masterFileCompleteness: { assess: jest.Mock };

  const baseInput = {
    caseId: 'case-1',
    decisionTypeVersionId: 'dtv-1',
    proposedDecisionMakerIdentityId: 'identity-1',
    proposedDecisionMakerOfficeholderId: 'officeholder-1',
    appointmentId: 'appointment-1',
    requestedOutcome: 'APPROVED',
    evidencePacketVersionId: 'packet-version-1',
  };

  beforeEach(async () => {
    prisma = {
      case: { findUnique: jest.fn() },
      decisionTypeVersion: { findUnique: jest.fn() },
      governmentServiceVersion: { findUnique: jest.fn() },
      identity: { findUnique: jest.fn() },
      appointment: { findUnique: jest.fn() },
      delegation: { findUnique: jest.fn() },
      evidencePacketVersion: { findUnique: jest.fn(), findFirst: jest.fn() },
      decisionReadinessAssessment: {
        create: jest.fn().mockResolvedValue({
          id: 'assessment-1',
          assessmentNumber: 'DRA-2026-000001',
          outcome: DecisionReadinessOutcome.READY,
        }),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    authorityEvaluation = {
      evaluate: jest.fn().mockResolvedValue({
        evaluationId: 'eval-1',
        outcome: AuthorityEvaluationOutcome.ALLOW,
      }),
    };

    actorResolver = {
      isHumanActor: jest.fn().mockReturnValue(true),
    };

    masterFileCompleteness = {
      assess: jest.fn().mockResolvedValue({
        masterAdministrativeFileId: 'maf-1',
        outcome: 'COMPLETE',
        requiredEvidenceCount: 0,
        satisfiedEvidenceCount: 0,
        disputedEvidenceCount: 0,
        unresolvedEvidenceCount: 0,
        integrityFailureCount: 0,
        explanationCodes: [],
      }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DecisionReadinessService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthorityEvaluationService, useValue: authorityEvaluation },
        { provide: InstitutionalActorResolver, useValue: actorResolver },
        { provide: MasterFileCompletenessAssessmentService, useValue: masterFileCompleteness },
      ],
    }).compile();

    service = moduleRef.get(DecisionReadinessService);

    prisma.case.findUnique.mockResolvedValue({
      id: 'case-1',
      status: CaseStatus.DECISION_PENDING,
      governmentServiceVersionId: 'gsv-1',
      masterAdministrativeFile: { id: 'maf-1' },
      professionalReviews: [],
      inspectionRecords: [],
      governmentCommunications: [],
      departmentalReviews: [],
      currentCaseManagerOfficeholderId: null,
    });

    prisma.decisionTypeVersion.findUnique.mockResolvedValue({
      id: 'dtv-1',
      status: DecisionTypeVersionStatus.ACTIVE,
      governmentServiceVersionId: 'gsv-1',
      functionAuthorityRecordId: 'far-1',
      permissibleOutcomes: ['APPROVED', 'REFUSED'],
      requirementsConfig: {},
      decisionType: { id: 'dt-1' },
    });

    prisma.governmentServiceVersion.findUnique.mockResolvedValue({
      id: 'gsv-1',
      maturityStatus: 'ACTIVE',
    });

    prisma.identity.findUnique.mockResolvedValue({ id: 'identity-1', type: IdentityType.INDIVIDUAL });

    prisma.appointment.findUnique.mockResolvedValue({
      id: 'appointment-1',
      status: 'ACTIVE',
      officeholderId: 'officeholder-1',
      effectiveFrom: new Date('2020-01-01'),
      effectiveUntil: null,
    });

    prisma.evidencePacketVersion.findUnique.mockResolvedValue({
      id: 'packet-version-1',
      status: EvidencePacketVersionStatus.FROZEN,
      readyForDecisionReview: true,
      packet: {
        id: 'packet-1',
        purpose: 'DECISION_SUPPORT',
        masterAdministrativeFileId: 'maf-1',
        caseId: 'case-1',
      },
    });
  });

  it('returns READY for a fully satisfied case', async () => {
    const result = await service.assess(baseInput);
    expect(result.outcome).toBe(DecisionReadinessOutcome.READY);
    expect(result.reasonCodes).toEqual([]);
  });

  it('fails when case is not DECISION_PENDING', async () => {
    prisma.case.findUnique.mockResolvedValue({
      id: 'case-1',
      status: CaseStatus.SUBSTANTIVE_REVIEW,
      governmentServiceVersionId: 'gsv-1',
      masterAdministrativeFile: { id: 'maf-1' },
      professionalReviews: [],
      inspectionRecords: [],
      governmentCommunications: [],
      departmentalReviews: [],
    });

    const result = await service.assess(baseInput);
    expect(result.reasonCodes).toContain(DECISION_READINESS_REASON_CODES.CASE_NOT_DECISION_PENDING);
  });

  it('fails when master file is SAFE_HALTED', async () => {
    masterFileCompleteness.assess.mockResolvedValue({
      masterAdministrativeFileId: 'maf-1',
      outcome: 'SAFE_HALTED',
      requiredEvidenceCount: 1,
      satisfiedEvidenceCount: 0,
      disputedEvidenceCount: 0,
      unresolvedEvidenceCount: 0,
      integrityFailureCount: 1,
      explanationCodes: ['INTEGRITY_MISMATCH_SAFE_HALT'],
    });

    const result = await service.assess(baseInput);
    expect(result.outcome).toBe(DecisionReadinessOutcome.SAFE_HALT);
    expect(result.reasonCodes).toContain(DECISION_READINESS_REASON_CODES.MASTER_FILE_SAFE_HALTED);
  });

  it('fails when evidence packet is not frozen', async () => {
    prisma.evidencePacketVersion.findUnique.mockResolvedValue({
      id: 'packet-version-1',
      status: EvidencePacketVersionStatus.DRAFT,
      readyForDecisionReview: false,
      packet: {
        purpose: 'DECISION_SUPPORT',
        masterAdministrativeFileId: 'maf-1',
        caseId: 'case-1',
      },
    });

    const result = await service.assess(baseInput);
    expect(result.reasonCodes).toContain(DECISION_READINESS_REASON_CODES.EVIDENCE_PACKET_NOT_FROZEN);
  });

  it('fails when outcome is not permissible', async () => {
    const result = await service.assess({ ...baseInput, requestedOutcome: 'INVALID' });
    expect(result.reasonCodes).toContain(DECISION_READINESS_REASON_CODES.OUTCOME_NOT_PERMISSIBLE);
  });

  it('fails when decision-maker is conflicted', async () => {
    const result = await service.assess({ ...baseInput, isConflicted: true });
    expect(result.outcome).toBe(DecisionReadinessOutcome.BLOCKED);
    expect(result.reasonCodes).toContain(DECISION_READINESS_REASON_CODES.DECISION_MAKER_CONFLICTED);
  });

  it('fails when decision-maker is recused', async () => {
    const result = await service.assess({ ...baseInput, isRecused: true });
    expect(result.outcome).toBe(DecisionReadinessOutcome.BLOCKED);
    expect(result.reasonCodes).toContain(DECISION_READINESS_REASON_CODES.DECISION_MAKER_RECUSED);
  });

  it('fails when actor is non-human', async () => {
    actorResolver.isHumanActor.mockReturnValue(false);
    prisma.identity.findUnique.mockResolvedValue({ id: 'identity-1', type: IdentityType.SERVICE });

    const result = await service.assess(baseInput);
    expect(result.outcome).toBe(DecisionReadinessOutcome.BLOCKED);
    expect(result.reasonCodes).toContain(DECISION_READINESS_REASON_CODES.NON_HUMAN_ACTOR);
  });

  it('fails when authority evaluation denies', async () => {
    authorityEvaluation.evaluate.mockResolvedValue({
      evaluationId: 'eval-1',
      outcome: AuthorityEvaluationOutcome.DENY,
    });

    const result = await service.assess(baseInput);
    expect(result.outcome).toBe(DecisionReadinessOutcome.BLOCKED);
    expect(result.reasonCodes).toContain(DECISION_READINESS_REASON_CODES.AUTHORITY_DENIED);
  });

  it('persists readiness assessment for audit trail', async () => {
    await service.assess(baseInput);
    expect(prisma.decisionReadinessAssessment.create).toHaveBeenCalled();
    const [[createArgs]] = prisma.decisionReadinessAssessment.create.mock.calls as [
      [{ data: { caseId: string; requestedOutcome: string } }],
    ];
    expect(createArgs.data.caseId).toBe('case-1');
    expect(createArgs.data.requestedOutcome).toBe('APPROVED');
  });
});
