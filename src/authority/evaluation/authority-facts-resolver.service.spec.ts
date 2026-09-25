import { Test, type TestingModule } from '@nestjs/testing';
import {
  AuthorityActionType,
  DecisionParticipantRole,
  InstitutionalActType,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma.service';
import { AuthorityFactsResolver } from './authority-facts-resolver.service';

describe('AuthorityFactsResolver', () => {
  let resolver: AuthorityFactsResolver;
  let prisma: {
    institutionalAuthorityAct: { findMany: jest.Mock };
    decisionReadinessAssessment: { findFirst: jest.Mock; findUnique: jest.Mock };
    decisionParticipant: { findMany: jest.Mock };
    evidencePacketItem: { findMany: jest.Mock };
    evidencePacket: { findFirst: jest.Mock };
    healthcareProfessionalLicense: { findMany: jest.Mock };
    educatorProfileReference: { findFirst: jest.Mock };
    professionalEducationQualificationReference: { findMany: jest.Mock };
    identityOfficeholderLink: { findFirst: jest.Mock };
    identity: { findUnique: jest.Mock };
    authorityEvaluationRecord: { findMany: jest.Mock };
    governmentDecision: { findMany: jest.Mock };
    case: { findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      institutionalAuthorityAct: { findMany: jest.fn().mockResolvedValue([]) },
      decisionReadinessAssessment: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
      },
      decisionParticipant: { findMany: jest.fn().mockResolvedValue([]) },
      evidencePacketItem: { findMany: jest.fn().mockResolvedValue([]) },
      evidencePacket: { findFirst: jest.fn().mockResolvedValue(null) },
      healthcareProfessionalLicense: { findMany: jest.fn().mockResolvedValue([]) },
      educatorProfileReference: { findFirst: jest.fn().mockResolvedValue(null) },
      professionalEducationQualificationReference: { findMany: jest.fn().mockResolvedValue([]) },
      identityOfficeholderLink: { findFirst: jest.fn().mockResolvedValue(null) },
      identity: { findUnique: jest.fn().mockResolvedValue({ personId: null }) },
      authorityEvaluationRecord: { findMany: jest.fn().mockResolvedValue([]) },
      governmentDecision: { findMany: jest.fn().mockResolvedValue([]) },
      case: { findUnique: jest.fn().mockResolvedValue(null) },
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [AuthorityFactsResolver, { provide: PrismaService, useValue: prisma }],
    }).compile();

    resolver = moduleRef.get(AuthorityFactsResolver);
  });

  it('derives consultation flags from institutional acts', async () => {
    prisma.institutionalAuthorityAct.findMany.mockResolvedValue([
      { id: 'act-1', actType: InstitutionalActType.CONSULTATION },
    ]);

    const result = await resolver.resolve({
      identityId: 'id-1',
      officeholderId: 'oh-1',
      functionAuthorityRecordId: 'fn-1',
      action: AuthorityActionType.APPROVE,
      at: new Date(),
    });

    expect(result.facts.hasConsultation).toBe(true);
    expect(result.sourceRefs.institutionalActIds).toEqual(['act-1']);
  });

  it('derives second approval from stored co-approver participants', async () => {
    prisma.decisionReadinessAssessment.findFirst.mockResolvedValue({ id: 'assess-1' });
    prisma.decisionParticipant.findMany.mockResolvedValue([
      {
        id: 'p-actor',
        identityId: 'id-1',
        officeholderId: 'oh-1',
        role: DecisionParticipantRole.DECISION_MAKER,
        isConflicted: false,
        isRecused: false,
      },
      {
        id: 'p-co',
        identityId: 'id-2',
        officeholderId: 'oh-2',
        role: DecisionParticipantRole.CO_APPROVER,
        hasApproved: true,
      },
    ]);

    const result = await resolver.resolve({
      identityId: 'id-1',
      officeholderId: 'oh-1',
      functionAuthorityRecordId: 'fn-1',
      action: AuthorityActionType.APPROVE,
      at: new Date(),
      resourceScope: { caseId: 'case-1' },
    });

    expect(result.facts.hasSecondApproval).toBe(true);
    expect(result.sourceRefs.decisionParticipantIds).toContain('p-co');
  });

  it('derives prior actions from allowed evaluation records', async () => {
    prisma.authorityEvaluationRecord.findMany.mockResolvedValue([
      {
        id: 'eval-1',
        action: AuthorityActionType.PREPARE,
        contextSnapshot: {},
      },
    ]);

    const result = await resolver.resolve({
      identityId: 'id-1',
      officeholderId: 'oh-1',
      functionAuthorityRecordId: 'fn-1',
      action: AuthorityActionType.APPROVE,
      at: new Date(),
    });

    expect(result.facts.priorActions).toContain(AuthorityActionType.PREPARE);
    expect(result.sourceRefs.priorAuthorityEvaluationRecordIds).toEqual(['eval-1']);
  });

  it('detects self-approval when actor is case applicant', async () => {
    prisma.case.findUnique.mockResolvedValue({ applicantIdentityId: 'id-1' });

    const result = await resolver.resolve({
      identityId: 'id-1',
      officeholderId: 'oh-1',
      functionAuthorityRecordId: 'fn-1',
      action: AuthorityActionType.APPROVE,
      at: new Date(),
      resourceScope: { caseId: 'case-1' },
    });

    expect(result.facts.isSelfApproval).toBe(true);
  });
});
