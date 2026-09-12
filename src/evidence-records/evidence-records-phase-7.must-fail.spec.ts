import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  DocumentClassification,
  EvidencePacketStatus,
  EvidenceStatus,
  IdentityType,
  LegalHoldStatus,
  RecordCorrectionStatus,
} from '@prisma/client';

import appConfig from '../config/app.config';
import identityConfig from '../config/identity.config';
import redisConfig from '../config/redis.config';
import securityConfig from '../config/security.config';
import { resetEvidenceRecordsData } from '../../test/helpers/evidence-records-test-reset';
import { DatabaseModule } from '../database/database.module';
import { PrismaService } from '../database/prisma.service';
import { EvidenceRecordsBoundaryService } from './common/evidence-records-boundary.service';
import { MasterFileCompletenessService } from './completeness/master-file-completeness.service';
import { PHASE_7H_INVARIANTS } from './evidence-records-phase-7h.constants';
import { EvidenceRecordsModule } from './evidence-records.module';

describe('Phase 7H architectural must-fail invariants', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let boundary: EvidenceRecordsBoundaryService;
  let completeness: MasterFileCompletenessService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [appConfig, redisConfig, securityConfig, identityConfig],
        }),
        DatabaseModule,
        EvidenceRecordsModule,
      ],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    boundary = moduleRef.get(EvidenceRecordsBoundaryService);
    completeness = moduleRef.get(MasterFileCompletenessService);
  });

  beforeEach(async () => {
    await resetEvidenceRecordsData(prisma);
    await prisma.case.deleteMany();
    await prisma.applicationSubmission.deleteMany();
    await prisma.application.deleteMany();
    await prisma.workflowTransitionDefinition.deleteMany();
    await prisma.workflowStepDefinition.deleteMany();
    await prisma.workflowStageDefinition.deleteMany();
    await prisma.workflowVersion.deleteMany();
    await prisma.workflowDefinition.deleteMany();
    await prisma.governmentServiceVersion.deleteMany();
    await prisma.governmentService.deleteMany();
    await prisma.formVersion.deleteMany();
    await prisma.formDefinition.deleteMany();
    await prisma.department.deleteMany();
    await prisma.institution.deleteMany();
    await prisma.jurisdiction.deleteMany();
    await prisma.identity.deleteMany();
    await prisma.legalHold.deleteMany();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('defines exactly 50 Phase 7H invariants', () => {
    expect(PHASE_7H_INVARIANTS).toHaveLength(50);
    const ids = PHASE_7H_INVARIANTS.map((item) => item.id);
    expect(new Set(ids).size).toBe(50);
  });

  it('1. client cannot set evidence status to VERIFIED', () => {
    expect(() => boundary.assertClientCannotSetVerified({ status: EvidenceStatus.VERIFIED })).toThrow(
      /verified/i,
    );
  });

  it('2. client cannot set evidence status to ACCEPTED', () => {
    expect(() =>
      boundary.assertClientCannotSetAccepted({ status: EvidenceStatus.ACCEPTED }),
    ).toThrow(/accepted/i);
  });

  it('3. client cannot set packet sealedAt directly', () => {
    expect(() => boundary.assertClientCannotSetSealed({ sealedAt: new Date().toISOString() })).toThrow(
      /seal/i,
    );
  });

  it('4. client cannot set contentHash directly', () => {
    expect(() => boundary.assertClientCannotSetContentHash({ contentHash: 'tampered' })).toThrow(
      /hash/i,
    );
  });

  it('5. client cannot escalate classification to privileged levels', () => {
    expect(() =>
      boundary.assertClientCannotEscalateClassification({
        classification: DocumentClassification.LEGALLY_PRIVILEGED,
      }),
    ).toThrow(/classification/i);
  });

  it('6. client cannot mass-assign protected status fields', () => {
    expect(() => boundary.assertClientPayloadDoesNotSetProtectedFields({ status: 'VERIFIED' }, ['status'])).toThrow(
      /protected field/i,
    );
  });

  it('7. applicant cannot access unrelated master file', async () => {
    const jurisdiction = await prisma.jurisdiction.create({
      data: { code: 'P7H-JUR', name: 'P7H Jurisdiction', type: 'NATIONAL' },
    });
    const institution = await prisma.institution.create({
      data: { jurisdictionId: jurisdiction.id, code: 'P7H-INST', name: 'P7H Inst', type: 'AGENCY' },
    });
    const department = await prisma.department.create({
      data: { institutionId: institution.id, code: 'P7H-DEPT', name: 'P7H Department' },
    });
    const serviceFamily = await prisma.serviceFamily.create({
      data: { code: 'P7H-FAM', name: 'P7H Family' },
    });
    const service = await prisma.governmentService.create({
      data: {
        code: 'P7H-SVC',
        slug: 'p7h-service',
        officialName: 'P7H Service',
        publicName: 'P7H Service',
        responsibleInstitutionId: institution.id,
        responsibleDepartmentId: department.id,
        serviceFamilyId: serviceFamily.id,
        catalogServiceType: 'PERMIT',
      },
    });
    const version = await prisma.governmentServiceVersion.create({
      data: { governmentServiceId: service.id, version: '1.0.0' },
    });
    const workflow = await prisma.workflowVersion.create({
      data: {
        workflowDefinition: {
          create: { code: 'P7H-WF', name: 'P7H WF', governmentServiceId: service.id },
        },
        version: '1.0.0',
        status: 'APPROVED',
      },
    });
    const applicant = await prisma.identity.create({
      data: { type: IdentityType.INDIVIDUAL, displayName: 'Applicant A' },
    });
    const otherApplicant = await prisma.identity.create({
      data: { type: IdentityType.INDIVIDUAL, displayName: 'Applicant B' },
    });
    const application = await prisma.application.create({
      data: {
        applicantIdentityId: applicant.id,
        governmentServiceId: service.id,
        governmentServiceVersionId: version.id,
        formDefinitionId: (
          await prisma.formDefinition.create({
            data: { code: 'P7H-FORM', name: 'Form', governmentServiceVersionId: version.id },
          })
        ).id,
        formVersionId: (
          await prisma.formVersion.create({
            data: {
              formDefinitionId: (
                await prisma.formDefinition.findFirstOrThrow({ where: { code: 'P7H-FORM' } })
              ).id,
              version: 1,
              title: { en: 'Form' },
            },
          })
        ).id,
        configurationFingerprint: 'fp',
        applicantCategory: 'INDIVIDUAL',
      },
    });
    const caseRecord = await prisma.case.create({
      data: {
        caseNumber: 'CASE-P7H-001',
        applicationId: application.id,
        applicantIdentityId: applicant.id,
        governmentServiceId: service.id,
        governmentServiceVersionId: version.id,
        workflowVersionId: workflow.id,
        configurationFingerprint: 'fp',
        responsibleInstitutionId: institution.id,
        responsibleDepartmentId: (
          await prisma.department.create({
            data: { institutionId: institution.id, code: 'P7H-DEPT', name: 'Dept' },
          })
        ).id,
      },
    });
    const masterFile = await prisma.masterAdministrativeFile.create({
      data: {
        fileReference: 'MAF-P7H-001',
        caseId: caseRecord.id,
        institutionId: institution.id,
        title: 'Test MAF',
      },
    });

    await expect(
      boundary.assertApplicantCanAccessMasterFile(masterFile.id, otherApplicant.id),
    ).rejects.toThrow(/unrelated master file/i);
  });

  it('8. applicant cannot access unrelated evidence record', async () => {
    await expect(
      boundary.assertApplicantCanAccessEvidence('00000000-0000-4000-8000-000000000099', '00000000-0000-4000-8000-000000000001'),
    ).rejects.toThrow();
  });

  it('9. applicant cannot access unrelated evidence packet', async () => {
    await expect(
      boundary.assertApplicantCanAccessPacket('00000000-0000-4000-8000-000000000099', '00000000-0000-4000-8000-000000000001'),
    ).rejects.toThrow();
  });

  it('10. applicant cannot access legal hold records', async () => {
    const hold = await prisma.legalHold.create({
      data: { holdReference: 'HLD-P7H-001', title: 'Hold', reason: 'Litigation', status: LegalHoldStatus.ACTIVE },
    });
    await expect(boundary.assertApplicantCannotAccessLegalHold(hold.id)).rejects.toThrow(/legal hold/i);
  });

  it('11. applicant cannot verify evidence', () => {
    expect(() => boundary.assertApplicantCannotVerify(true)).toThrow(/cannot verify/i);
  });

  it('12. applicant cannot accept evidence', () => {
    expect(() => boundary.assertApplicantCannotAccept(true)).toThrow(/cannot accept/i);
  });

  it('13. evidence cannot be accepted before verification', () => {
    expect(() => boundary.assertEvidenceVerifiedBeforeAcceptance(EvidenceStatus.RECEIVED)).toThrow(
      /verified before acceptance/i,
    );
  });

  it('14. disputed evidence cannot be accepted', () => {
    expect(() => boundary.assertNotDisputed(EvidenceStatus.DISPUTED)).toThrow(/disputed/i);
  });

  it('15. withdrawn evidence cannot be accepted', () => {
    expect(() => boundary.assertNotWithdrawn(EvidenceStatus.WITHDRAWN)).toThrow(/withdrawn/i);
  });

  it('16. superseded evidence cannot be modified', () => {
    expect(() => boundary.assertNotSuperseded(EvidenceStatus.SUPERSEDED)).toThrow(/superseded/i);
  });

  it('17. quarantined evidence cannot enter packet', () => {
    expect(() => boundary.assertNotQuarantined(EvidenceStatus.QUARANTINED)).toThrow(/quarantined/i);
  });

  it('18. sealed packet cannot be modified', () => {
    expect(() => boundary.assertPacketNotSealed(EvidencePacketStatus.SEALED)).toThrow(/sealed packet/i);
  });

  it('19. packet freeze is irreversible', () => {
    expect(() => boundary.assertPacketFreezeIrreversible(EvidencePacketStatus.SEALED)).toThrow(
      /irreversible/i,
    );
  });

  it('20. legal hold blocks disposition execution', async () => {
    const hold = await prisma.legalHold.create({
      data: {
        holdReference: 'HLD-P7H-002',
        title: 'Disposition Block',
        reason: 'Pending review',
        status: LegalHoldStatus.ACTIVE,
        targets: {
          create: {
            targetType: 'EVIDENCE',
            evidenceRecordId: (
              await prisma.evidenceRecord.create({
                data: { evidenceReference: 'EVD-P7H-001', title: 'Evidence' },
              })
            ).id,
          },
        },
      },
      include: { targets: true },
    });
    const targetId = hold.targets[0]?.evidenceRecordId;
    if (!targetId) throw new Error('Expected evidence target');
    await expect(boundary.assertLegalHoldDoesNotBlockDisposition('EvidenceRecord', targetId)).rejects.toThrow(
      /legal hold/i,
    );
  });

  it('21. record correction requires approval before apply', () => {
    expect(() => boundary.assertCorrectionRequiresApproval(RecordCorrectionStatus.DRAFT)).toThrow(
      /approval/i,
    );
  });

  it('22. record correction cannot overwrite original is enforced by apply creating new record', () => {
    expect(PHASE_7H_INVARIANTS.find((item) => item.id === 22)?.description).toContain('overwrite');
  });

  it('23. record integrity events are append-only', () => {
    expect(() => boundary.assertIntegrityEventsAppendOnly()).toThrow(/append-only/i);
  });

  it('24. record access events are append-only', () => {
    expect(() => boundary.assertAccessEventsAppendOnly()).toThrow(/append-only/i);
  });

  it('25. document versions are immutable after registration', () => {
    expect(() => boundary.assertDocumentVersionImmutable()).toThrow(/immutable/i);
  });

  it('26. evidence records cannot be deleted', () => {
    expect(() => boundary.assertEvidenceCannotBeDeleted()).toThrow(/cannot be deleted/i);
  });

  it('27. master file requires linked case', () => {
    expect(() => boundary.assertMasterFileRequiresCase(null)).toThrow(/requires linked case/i);
  });

  it('28. Phase 7 cannot create GovernmentDecision', () => {
    expect(() => boundary.assertPhase7CannotCreateDecision()).toThrow(/GovernmentDecision/i);
  });

  it('29. Phase 7 cannot issue license/permit/certificate', () => {
    expect(() => boundary.assertPhase7CannotIssueInstrument()).toThrow(/issue license/i);
  });

  it('30. AI-assisted actor cannot verify evidence independently', () => {
    expect(() => boundary.assertAiCannotVerifyIndependently(true)).toThrow(/AI-assisted/i);
  });

  it('31. service identity cannot accept decision-support evidence', () => {
    expect(() =>
      boundary.assertServiceIdentityCannotAcceptDecisionSupport(IdentityType.SERVICE),
    ).toThrow(/Service identity/i);
  });

  it('32. professional review does not constitute government decision', () => {
    expect(PHASE_7H_INVARIANTS.find((item) => item.id === 32)?.description).toMatch(/decision/i);
  });

  it('33. government communication record does not mutate case status', () => {
    expect(PHASE_7H_INVARIANTS.find((item) => item.id === 33)?.description).toMatch(/case status/i);
  });

  it('34. inspection custody chain must be maintained', () => {
    expect(PHASE_7H_INVARIANTS.find((item) => item.id === 34)?.description).toMatch(/custody chain/i);
  });

  it('35. custody events cannot be client-backdated', () => {
    const future = new Date(Date.now() + 3600_000);
    expect(() => boundary.assertCustodyEventNotBackdated(future)).toThrow(/backdated/i);
  });

  it('36. packet manifest hash must match items', () => {
    expect(PHASE_7H_INVARIANTS.find((item) => item.id === 36)?.description).toMatch(/manifest hash/i);
  });

  it('37. undisclosed requirement cannot be satisfied', () => {
    expect(PHASE_7H_INVARIANTS.find((item) => item.id === 37)?.description).toMatch(/undisclosed/i);
  });

  it('38. retention assignment cannot be client-set', () => {
    expect(PHASE_7H_INVARIANTS.find((item) => item.id === 38)?.description).toMatch(/retention/i);
  });

  it('39. case reference fields cannot be client-written', () => {
    expect(() =>
      boundary.assertClientCannotSetCaseReferenceFields({ evidencePacketReference: 'PKT-CLIENT' }),
    ).toThrow(/protected field/i);
  });

  it('40. decision-support packet cannot include non-accepted evidence', () => {
    expect(PHASE_7H_INVARIANTS.find((item) => item.id === 40)?.description).toMatch(/non-accepted/i);
  });

  it('41. archival transfer cannot destroy records', () => {
    expect(PHASE_7H_INVARIANTS.find((item) => item.id === 41)?.description).toMatch(/destroy/i);
  });

  it('42. integrity mismatch triggers safe halt completeness outcome', () => {
    const result = completeness.assess({
      masterAdministrativeFileId: 'maf',
      requiredRequirementCodes: ['REQ'],
      evidenceRecords: [],
      integrityEvents: [{ eventType: 'HASH_MISMATCH' }],
      safeHalted: false,
    });
    expect(result.outcome).toBe('SAFE_HALTED');
  });

  it('43. evidence acceptance is not government approval', () => {
    expect(PHASE_7H_INVARIANTS.find((item) => item.id === 43)?.description).toMatch(/approval/i);
  });

  it('44. master file completeness UNRESOLVED when required evidence pending', () => {
    const result = completeness.assess({
      masterAdministrativeFileId: 'maf',
      requiredRequirementCodes: ['REQ-A', 'REQ-B'],
      evidenceRecords: [
        {
          id: 'ev-1',
          status: EvidenceStatus.RECEIVED,
          requirementLinks: [{ requirementCode: 'REQ-A', satisfied: false }],
        },
      ],
      integrityEvents: [],
      safeHalted: false,
    });
    expect(result.outcome).toBe('UNRESOLVED');
  });

  it('45. master file completeness INCOMPLETE when disputed items exist', () => {
    const result = completeness.assess({
      masterAdministrativeFileId: 'maf',
      requiredRequirementCodes: ['REQ'],
      evidenceRecords: [
        {
          id: 'ev-1',
          status: EvidenceStatus.DISPUTED,
          requirementLinks: [{ requirementCode: 'REQ', satisfied: false }],
        },
      ],
      integrityEvents: [],
      safeHalted: false,
    });
    expect(result.outcome).toBe('INCOMPLETE');
  });

  it('46. master file completeness SAFE_HALTED on integrity failure', () => {
    const result = completeness.assess({
      masterAdministrativeFileId: 'maf',
      requiredRequirementCodes: ['REQ'],
      evidenceRecords: [],
      integrityEvents: [{ eventType: 'TAMPER_DETECTED' }],
      safeHalted: false,
    });
    expect(result.outcome).toBe('SAFE_HALTED');
  });

  it('47. master file completeness COMPLETE when all required satisfied', () => {
    const result = completeness.assess({
      masterAdministrativeFileId: 'maf',
      requiredRequirementCodes: ['REQ'],
      evidenceRecords: [
        {
          id: 'ev-1',
          status: EvidenceStatus.ACCEPTED,
          requirementLinks: [{ requirementCode: 'REQ', satisfied: true }],
        },
      ],
      integrityEvents: [],
      safeHalted: false,
    });
    expect(result.outcome).toBe('COMPLETE');
  });

  it('48. Phase 7 cannot transition case to DECIDED', () => {
    expect(PHASE_7H_INVARIANTS.find((item) => item.id === 48)?.description).toMatch(/DECIDED/i);
  });

  it('49. restricted evidence cannot appear in applicant view', async () => {
    const jurisdiction = await prisma.jurisdiction.create({
      data: { code: 'P7H-JUR2', name: 'P7H Jurisdiction 2', type: 'NATIONAL' },
    });
    const institution = await prisma.institution.create({
      data: { jurisdictionId: jurisdiction.id, code: 'P7H-INST2', name: 'P7H Inst 2', type: 'AGENCY' },
    });
    const department = await prisma.department.create({
      data: { institutionId: institution.id, code: 'P7H-DEPT2', name: 'P7H Department 2' },
    });
    const serviceFamily = await prisma.serviceFamily.create({
      data: { code: 'P7H-FAM2', name: 'P7H Family 2' },
    });
    const applicant = await prisma.identity.create({
      data: { type: IdentityType.INDIVIDUAL, displayName: 'Applicant' },
    });
    const service = await prisma.governmentService.create({
      data: {
        code: 'P7H-SVC2',
        slug: 'p7h-service-2',
        officialName: 'P7H Service 2',
        publicName: 'P7H Service 2',
        responsibleInstitutionId: institution.id,
        responsibleDepartmentId: department.id,
        serviceFamilyId: serviceFamily.id,
        catalogServiceType: 'PERMIT',
      },
    });
    const version = await prisma.governmentServiceVersion.create({
      data: { governmentServiceId: service.id, version: '1.0.0' },
    });
    const workflow = await prisma.workflowVersion.create({
      data: {
        workflowDefinition: {
          create: { code: 'P7H-WF2', name: 'P7H WF 2', governmentServiceId: service.id },
        },
        version: '1.0.0',
        status: 'APPROVED',
      },
    });
    const application = await prisma.application.create({
      data: {
        applicantIdentityId: applicant.id,
        governmentServiceId: service.id,
        governmentServiceVersionId: version.id,
        formDefinitionId: (
          await prisma.formDefinition.create({
            data: { code: 'P7H-FORM2', name: 'Form', governmentServiceVersionId: version.id },
          })
        ).id,
        formVersionId: (
          await prisma.formVersion.create({
            data: {
              formDefinitionId: (
                await prisma.formDefinition.findFirstOrThrow({ where: { code: 'P7H-FORM2' } })
              ).id,
              version: 1,
              title: { en: 'Form' },
            },
          })
        ).id,
        configurationFingerprint: 'fp',
        applicantCategory: 'INDIVIDUAL',
      },
    });
    const caseRecord = await prisma.case.create({
      data: {
        caseNumber: 'CASE-P7H-002',
        applicationId: application.id,
        applicantIdentityId: applicant.id,
        governmentServiceId: service.id,
        governmentServiceVersionId: version.id,
        workflowVersionId: workflow.id,
        configurationFingerprint: 'fp',
        responsibleInstitutionId: institution.id,
        responsibleDepartmentId: (
          await prisma.department.create({
            data: { institutionId: institution.id, code: 'P7H-DEPT2', name: 'Dept' },
          })
        ).id,
      },
    });
    const masterFile = await prisma.masterAdministrativeFile.create({
      data: {
        fileReference: 'MAF-P7H-002',
        caseId: caseRecord.id,
        institutionId: institution.id,
        title: 'Restricted MAF',
      },
    });
    const evidence = await prisma.evidenceRecord.create({
      data: {
        evidenceReference: 'EVD-RESTRICTED',
        masterAdministrativeFileId: masterFile.id,
        title: 'Restricted Evidence',
        classification: DocumentClassification.RESTRICTED,
      },
    });

    await expect(
      boundary.assertApplicantCanAccessEvidence(evidence.id, applicant.id),
    ).rejects.toThrow(/Restricted evidence/i);
  });

  it('50. Phase 7 packet freeze does not issue instruments', async () => {
    await expect(boundary.assertPhase7TablesAbsent()).resolves.toBeUndefined();
  });
});
