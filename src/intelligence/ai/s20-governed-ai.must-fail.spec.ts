import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  AiAgentDefinitionStatus,
  AiGovernedDataClass,
  AiHumanReviewOutcome,
  AiModelStatus,
  AiSuspensionSubjectType,
  IdentityType,
  InstitutionType,
  JurisdictionType,
  StructuralLifecycleStatus,
} from '@prisma/client';

import appConfig from '../../config/app.config';
import { resetAuditGovernanceData } from '../../database/audit-governance-test-reset';
import { DatabaseModule } from '../../database/database.module';
import { resetGovernedAiData } from '../../database/governed-ai-test-reset';
import { PrismaService } from '../../database/prisma.service';
import { DeterministicGovernedAiAdapter } from './adapters/deterministic-governed-ai.adapter';
import { AI_POLICY_REASON_CODES, FORBIDDEN_AI_GOVERNMENT_ACTIONS } from './governed-ai.constants';
import { GovernedAiModule } from './governed-ai.module';
import { AiCallRuntimeService } from './services/ai-call-runtime.service';
import { AiConsequentialDefenseService } from './services/ai-consequential-defense.service';
import { AiGovernedRegistryService } from './services/ai-governed-registry.service';
import { AiPolicyGateService } from './services/ai-policy-gate.service';
import { GovernedAiProductionGateService } from './services/governed-ai-production-gate.service';

describe('Remediation S20 governed AI must-fail invariants', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let runtime: AiCallRuntimeService;
  let registry: AiGovernedRegistryService;
  let policyGate: AiPolicyGateService;
  let consequential: AiConsequentialDefenseService;
  let productionGate: GovernedAiProductionGateService;

  let institutionId: string;
  let humanIdentityId: string;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [appConfig] }),
        DatabaseModule,
        GovernedAiModule,
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    runtime = moduleRef.get(AiCallRuntimeService);
    registry = moduleRef.get(AiGovernedRegistryService);
    policyGate = moduleRef.get(AiPolicyGateService);
    consequential = moduleRef.get(AiConsequentialDefenseService);
    productionGate = moduleRef.get(GovernedAiProductionGateService);
  });

  beforeEach(async () => {
    await resetGovernedAiData(prisma);
    await resetAuditGovernanceData(prisma);

    const jurisdiction = await prisma.jurisdiction.create({
      data: {
        code: `S20-JUR-${String(Date.now())}`,
        name: 'S20 Test Jurisdiction',
        type: JurisdictionType.NATIONAL,
        status: StructuralLifecycleStatus.ACTIVE,
      },
    });

    const institution = await prisma.institution.create({
      data: {
        jurisdictionId: jurisdiction.id,
        code: `S20-INST-${String(Date.now())}`,
        name: 'S20 Test Institution',
        type: InstitutionType.MINISTRY,
        status: StructuralLifecycleStatus.ACTIVE,
      },
    });
    institutionId = institution.id;

    const human = await prisma.identity.create({
      data: {
        type: IdentityType.INDIVIDUAL,
        displayName: 'S20 Human Actor',
      },
    });
    humanIdentityId = human.id;
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  async function registerActiveFixture(agentCode = 's20-test-agent') {
    return registry.registerApprovedFixture({
      institutionId,
      responsibleOwnerIdentityId: humanIdentityId,
      initiatorIdentityId: humanIdentityId,
      agentCode,
      modelCode: 's20-test-model',
      providerCode: 's20-deterministic-provider',
      toolCodes: ['SEARCH_RECORDS'],
      dataClasses: [AiGovernedDataClass.OFFICIAL],
    });
  }

  it('1. rejects unregistered agent', async () => {
    await expect(
      runtime.execute({
        agentDefinitionId: '00000000-0000-4000-8000-000000000099',
        institutionId,
        initiatorIdentityId: humanIdentityId,
        purpose: 'test',
        instructions: 'hello',
        dataClassification: AiGovernedDataClass.OFFICIAL,
        modelVersionId: '00000000-0000-4000-8000-000000000088',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('2. rejects inactive agent', async () => {
    const fixture = await registerActiveFixture('inactive-agent');
    await prisma.aiAgentDefinition.update({
      where: { id: fixture.agentDefinitionId },
      data: { status: AiAgentDefinitionStatus.DRAFT },
    });

    const policy = await policyGate.evaluate({
      agentDefinitionId: fixture.agentDefinitionId,
      institutionId,
      initiatorIdentityId: humanIdentityId,
      purpose: 'test',
      dataClassification: AiGovernedDataClass.OFFICIAL,
      policyServiceAvailable: true,
    });

    expect(policy.outcome).toBe('DENY');
    expect(policy.reasonCodes).toContain(AI_POLICY_REASON_CODES.AGENT_INACTIVE);
  });

  it('3. rejects unapproved model', async () => {
    const fixture = await registerActiveFixture('unapproved-model-agent');
    await prisma.aiModelDefinition.update({
      where: { id: fixture.modelDefinitionId },
      data: { status: AiModelStatus.DRAFT },
    });

    const policy = await policyGate.evaluate({
      agentDefinitionId: fixture.agentDefinitionId,
      institutionId,
      initiatorIdentityId: humanIdentityId,
      purpose: 'test',
      dataClassification: AiGovernedDataClass.OFFICIAL,
      policyServiceAvailable: true,
    });

    expect(policy.outcome).toBe('DENY');
    expect(policy.reasonCodes).toContain(AI_POLICY_REASON_CODES.MODEL_NOT_APPROVED);
  });

  it('4. rejects disallowed provider', async () => {
    const fixture = await registerActiveFixture('bad-provider-agent');
    await prisma.aiModelProviderRegistry.update({
      where: { id: fixture.providerRegistryId },
      data: { status: 'DRAFT' },
    });

    const policy = await policyGate.evaluate({
      agentDefinitionId: fixture.agentDefinitionId,
      institutionId,
      initiatorIdentityId: humanIdentityId,
      purpose: 'test',
      dataClassification: AiGovernedDataClass.OFFICIAL,
      policyServiceAvailable: true,
    });

    expect(policy.outcome).toBe('DENY');
    expect(policy.reasonCodes).toContain(AI_POLICY_REASON_CODES.PROVIDER_NOT_APPROVED);
  });

  it('5. rejects forbidden data class', async () => {
    const fixture = await registerActiveFixture('data-class-agent');

    const policy = await policyGate.evaluate({
      agentDefinitionId: fixture.agentDefinitionId,
      institutionId,
      initiatorIdentityId: humanIdentityId,
      purpose: 'test',
      dataClassification: AiGovernedDataClass.HIGHLY_RESTRICTED,
      policyServiceAvailable: true,
    });

    expect(policy.outcome).toBe('DENY');
    expect(policy.reasonCodes).toContain(AI_POLICY_REASON_CODES.DATA_CLASS_FORBIDDEN);
  });

  it('6. denies when policy cannot establish permission (inactive identity)', async () => {
    const fixture = await registerActiveFixture('identity-inactive');
    await prisma.aiAgentIdentity.update({
      where: { id: fixture.aiAgentIdentityId },
      data: { status: 'SUSPENDED' },
    });

    const policy = await policyGate.evaluate({
      agentDefinitionId: fixture.agentDefinitionId,
      institutionId,
      initiatorIdentityId: humanIdentityId,
      purpose: 'test',
      dataClassification: AiGovernedDataClass.OFFICIAL,
      policyServiceAvailable: true,
    });

    expect(policy.outcome).toBe('DENY');
  });

  it('7. policy-system failure fails closed', async () => {
    const fixture = await registerActiveFixture('policy-down');

    await expect(
      policyGate.evaluate({
        agentDefinitionId: fixture.agentDefinitionId,
        institutionId,
        initiatorIdentityId: humanIdentityId,
        purpose: 'test',
        dataClassification: AiGovernedDataClass.OFFICIAL,
        policyServiceAvailable: false,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('8–13. successful call creates complete audit chain with provenance, output, edit, and review', async () => {
    const fixture = await registerActiveFixture('audit-chain-agent');

    const result = await runtime.execute({
      agentDefinitionId: fixture.agentDefinitionId,
      institutionId,
      initiatorIdentityId: humanIdentityId,
      purpose: 'case summary',
      instructions: 'Summarize case 42',
      dataClassification: AiGovernedDataClass.OFFICIAL,
      modelVersionId: fixture.modelVersionId,
      sourceReferences: [{ sourceType: 'Case', sourceId: 'case-42', sourceLabel: 'Case 42' }],
    });

    expect(result.status).toBe('COMPLETED');
    expect(result.output?.outputHash).toBeTruthy();

    const call = await prisma.aiCallRecord.findUnique({
      where: { id: result.callRecordId },
      include: {
        inputRecord: true,
        outputRecord: true,
        sourceReferences: true,
        modelVersion: true,
      },
    });

    if (!call?.outputRecord) {
      throw new Error('Expected completed AI call audit chain');
    }
    const auditedCall = call;
    const auditedOutput = call.outputRecord;
    expect(auditedCall.governmentAuditLedgerEntryId).toBeTruthy();
    expect(auditedCall.modelVersion).toBeTruthy();
    expect(auditedCall.modelVersion.versionLabel).toBe('1.0.0');
    expect(auditedCall.inputRecord?.instructions).toContain('Summarize');
    expect(auditedCall.sourceReferences).toHaveLength(1);
    expect(auditedOutput.rawOutput).toBeTruthy();

    await runtime.recordHumanEdit({
      callRecordId: result.callRecordId,
      editorIdentityId: humanIdentityId,
      editedOutput: 'Edited summary',
      editReason: 'Clarified wording',
    });

    const outputRecordId = auditedOutput.id;
    const edits = await prisma.aiCallOutputEdit.findMany({
      where: { outputRecordId },
    });
    expect(edits).toHaveLength(1);
    const originalOutput = auditedOutput.rawOutput;
    expect(originalOutput).toBeTruthy();
    expect(originalOutput).not.toBe('Edited summary');

    await runtime.recordHumanReview({
      callRecordId: result.callRecordId,
      reviewerIdentityId: humanIdentityId,
      reviewOutcome: AiHumanReviewOutcome.ACCEPTED,
      governmentRecordReference: 'draft-memo-1',
    });

    const review = await prisma.aiCallReviewRecord.findUnique({
      where: { callRecordId: result.callRecordId },
    });
    expect(review?.reviewOutcome).toBe(AiHumanReviewOutcome.ACCEPTED);
  });

  for (const action of ['APPROVE', 'SIGN', 'ISSUE', 'ENFORCE'] as const) {
    it(`14–17. AI cannot ${action}`, () => {
      expect(() => {
        consequential.assertAiCannotPerformGovernmentAction(action);
      }).toThrow(ForbiddenException);
    });
  }

  it('18. rejects tool outside allowlist', async () => {
    const fixture = await registerActiveFixture('tool-agent');

    await expect(
      runtime.execute({
        agentDefinitionId: fixture.agentDefinitionId,
        institutionId,
        initiatorIdentityId: humanIdentityId,
        purpose: 'tool test',
        instructions: 'run tool',
        dataClassification: AiGovernedDataClass.OFFICIAL,
        modelVersionId: fixture.modelVersionId,
        requestedToolCode: 'ISSUE_PERMIT',
      }),
    ).rejects.toMatchObject({
      response: { code: AI_POLICY_REASON_CODES.TOOL_NOT_ALLOWLISTED },
    });
  });

  it('19. suspended model stops new calls', async () => {
    const fixture = await registerActiveFixture('suspended-model-agent');
    await prisma.aiGovernanceSuspension.create({
      data: {
        subjectType: AiSuspensionSubjectType.MODEL,
        subjectId: fixture.modelDefinitionId,
        reason: 'evaluation hold',
      },
    });

    const policy = await policyGate.evaluate({
      agentDefinitionId: fixture.agentDefinitionId,
      institutionId,
      initiatorIdentityId: humanIdentityId,
      purpose: 'test',
      dataClassification: AiGovernedDataClass.OFFICIAL,
      policyServiceAvailable: true,
    });

    expect(policy.reasonCodes).toContain(AI_POLICY_REASON_CODES.MODEL_SUSPENDED);
  });

  it('20. provider failure does not corrupt completed audit shell', async () => {
    const fixture = await registerActiveFixture('provider-fail-agent');
    const adapter = moduleRef.get(DeterministicGovernedAiAdapter);
    jest.spyOn(adapter, 'complete').mockRejectedValueOnce(new Error('provider unavailable'));

    const result = await runtime.execute({
      agentDefinitionId: fixture.agentDefinitionId,
      institutionId,
      initiatorIdentityId: humanIdentityId,
      purpose: 'external attempt',
      instructions: 'test',
      dataClassification: AiGovernedDataClass.OFFICIAL,
      modelVersionId: fixture.modelVersionId,
    });

    expect(result.status).toBe('PROVIDER_FAILED');
    const call = await prisma.aiCallRecord.findUnique({ where: { id: result.callRecordId } });
    expect(call?.governmentAuditLedgerEntryId).toBeTruthy();
  });

  it('21. external model adapter cannot run without production configuration', () => {
    const gate = productionGate.evaluateExternalAdapter();
    expect(gate.externalProviderEnabled).toBe(false);
    expect(productionGate.isExternalInvocationAllowed()).toBe(false);
  });

  it('22. no AI output reaches user without governance chain', async () => {
    const fixture = await registerActiveFixture('output-gate-agent');

    const result = await runtime.execute({
      agentDefinitionId: fixture.agentDefinitionId,
      institutionId,
      initiatorIdentityId: humanIdentityId,
      purpose: 'user output',
      instructions: 'draft',
      dataClassification: AiGovernedDataClass.OFFICIAL,
      modelVersionId: fixture.modelVersionId,
    });

    await expect(runtime.getUserFacingOutput(result.callRecordId)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    await runtime.recordHumanReview({
      callRecordId: result.callRecordId,
      reviewerIdentityId: humanIdentityId,
      reviewOutcome: AiHumanReviewOutcome.ACCEPTED,
    });

    const delivered = await runtime.getUserFacingOutput(result.callRecordId);
    expect(delivered.rawOutput).toBeTruthy();
  });

  it('documents forbidden consequential AI actions catalog', () => {
    expect(FORBIDDEN_AI_GOVERNMENT_ACTIONS).toEqual(
      expect.arrayContaining(['APPROVE', 'SIGN', 'ISSUE', 'ENFORCE', 'HEAR_REVIEW']),
    );
  });
});
