import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AuthorityEvaluationOutcome,
  CaseStatus,
  DecisionReadinessOutcome,
  DecisionTypeVersionStatus,
  EvidencePacketVersionStatus,
  GovernmentDecisionStatus,
  IdentityType,
} from '@prisma/client';

import { CaseStatusService } from '../../application-processing/cases/case-status.service';
import { AuthorityEvaluationService } from '../../authority/evaluation/authority-evaluation.service';
import { InstitutionalActorResolver } from '../../authority/institutional-actor/institutional-actor-resolver.service';
import { PrismaService } from '../../database/prisma.service';
import { DecisionExecutionService } from './decision-execution.service';

describe('DecisionExecutionService', () => {
  let service: DecisionExecutionService;
  let prisma: {
    decisionReadinessAssessment: { findUnique: jest.Mock };
    case: { findUnique: jest.Mock };
    identity: { findUnique: jest.Mock };
    appointment: { findUnique: jest.Mock };
    delegation: { findUnique: jest.Mock };
    evidencePacketVersion: { findUnique: jest.Mock };
    governmentDecision: { create: jest.Mock; count: jest.Mock };
    $transaction: jest.Mock;
  };
  let authorityEvaluation: { evaluate: jest.Mock };
  let actorResolver: { isHumanActor: jest.Mock };
  let caseStatus: { transition: jest.Mock };

  const baseInput = {
    caseId: 'case-1',
    decisionTypeVersionId: 'dtv-1',
    decisionReadinessAssessmentId: 'assessment-1',
    evidencePacketVersionId: 'packet-version-1',
    decisionMakerIdentityId: 'identity-1',
    decisionMakerOfficeholderId: 'officeholder-1',
    appointmentId: 'appointment-1',
    matterDecided: 'License application',
    outcome: 'APPROVED',
    explicitIntentConfirmed: true,
  };

  beforeEach(async () => {
    prisma = {
      decisionReadinessAssessment: { findUnique: jest.fn() },
      case: { findUnique: jest.fn() },
      identity: { findUnique: jest.fn() },
      appointment: { findUnique: jest.fn() },
      delegation: { findUnique: jest.fn() },
      evidencePacketVersion: { findUnique: jest.fn() },
      governmentDecision: {
        create: jest.fn().mockResolvedValue({
          id: 'decision-1',
          decisionNumber: 'DEC-2026-000001',
          decisionStatus: GovernmentDecisionStatus.RECORDED,
          outcome: 'APPROVED',
        }),
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          governmentDecision: prisma.governmentDecision,
        }),
      ),
    };

    authorityEvaluation = {
      evaluate: jest.fn().mockResolvedValue({
        evaluationId: 'eval-fresh-1',
        outcome: AuthorityEvaluationOutcome.ALLOW,
      }),
    };

    actorResolver = { isHumanActor: jest.fn().mockReturnValue(true) };
    caseStatus = { transition: jest.fn().mockResolvedValue({}) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DecisionExecutionService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuthorityEvaluationService, useValue: authorityEvaluation },
        { provide: InstitutionalActorResolver, useValue: actorResolver },
        { provide: CaseStatusService, useValue: caseStatus },
      ],
    }).compile();

    service = moduleRef.get(DecisionExecutionService);

    prisma.decisionReadinessAssessment.findUnique.mockResolvedValue({
      id: 'assessment-1',
      caseId: 'case-1',
      outcome: DecisionReadinessOutcome.READY,
      decisionTypeVersion: {
        id: 'dtv-1',
        status: DecisionTypeVersionStatus.ACTIVE,
        functionAuthorityRecordId: 'far-1',
        permissibleOutcomes: ['APPROVED', 'REFUSED'],
      },
    });

    prisma.case.findUnique.mockResolvedValue({
      id: 'case-1',
      status: CaseStatus.DECISION_PENDING,
      version: 1,
      responsibleInstitutionId: 'inst-1',
      responsibleDepartmentId: 'dept-1',
      masterAdministrativeFile: { id: 'maf-1' },
    });

    prisma.identity.findUnique.mockResolvedValue({ id: 'identity-1', type: IdentityType.INDIVIDUAL });
    prisma.identity.findUnique.mockResolvedValue({
      id: 'identity-1',
      type: IdentityType.INDIVIDUAL,
    });

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
    });
  });

  it('requires explicit intent to decide', async () => {
    await expect(
      service.executeDecision({ ...baseInput, explicitIntentConfirmed: false }),
    ).rejects.toThrow(BadRequestException);
  });

  it('requires fresh authority evaluation ALLOW', async () => {
    authorityEvaluation.evaluate.mockResolvedValue({
      evaluationId: 'eval-deny',
      outcome: AuthorityEvaluationOutcome.DENY,
    });

    await expect(service.executeDecision(baseInput)).rejects.toThrow(ForbiddenException);
    expect(authorityEvaluation.evaluate).toHaveBeenCalled();
  });

  it('creates GovernmentDecision and transitions case to DECIDED', async () => {
    const decision = await service.executeDecision(baseInput);

    expect(decision.outcome).toBe('APPROVED');
    expect(prisma.governmentDecision.create).toHaveBeenCalled();
    expect(caseStatus.transition).toHaveBeenCalledWith(
      'case-1',
      CaseStatus.DECIDED,
      expect.stringContaining('DEC-'),
      'identity-1',
    );
  });

  it('rejects stale readiness assessment', async () => {
    prisma.decisionReadinessAssessment.findUnique.mockResolvedValue({
      id: 'assessment-1',
      caseId: 'case-1',
      outcome: DecisionReadinessOutcome.NOT_READY,
      decisionTypeVersion: {
        status: DecisionTypeVersionStatus.ACTIVE,
        functionAuthorityRecordId: 'far-1',
        permissibleOutcomes: ['APPROVED'],
      },
    });

    await expect(service.executeDecision(baseInput)).rejects.toThrow(ConflictException);
  });

  it('rejects non-permissible outcome at execution', async () => {
    await expect(service.executeDecision({ ...baseInput, outcome: 'INVALID' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('asserts immutable decision fields cannot be updated', () => {
    expect(() => {
      service.assertDecisionImmutable(
        {
          id: 'decision-1',
          outcome: 'APPROVED',
          decisionMakerIdentityId: 'identity-1',
          decisionMakerOfficeholderId: 'officeholder-1',
          evidencePacketVersionId: 'packet-version-1',
          authorityEvaluationRecordId: 'eval-1',
          decisionTypeVersionId: 'dtv-1',
          decidedAt: new Date(),
        } as never,
        { outcome: 'REFUSED' },
      );
    }).toThrow(/immutable/i);
  });
});
