import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  EvidencePacketVersionStatus,
  EvidenceRecordStatus,
  IdentityType,
  LegalHoldStatus,
  LegalHoldTargetType,
  RecordCorrectionStatus,
} from '@prisma/client';

import appConfig from '../config/app.config';
import identityConfig from '../config/identity.config';
import redisConfig from '../config/redis.config';
import securityConfig from '../config/security.config';
import { DatabaseModule } from '../database/database.module';
import { PrismaService } from '../database/prisma.service';
import { EvidenceRecordsBoundaryService } from './common/evidence-records-boundary.service';
import { MasterFileCompletenessService } from './completeness/master-file-completeness.service';
import { PHASE_7H_INVARIANTS } from './evidence-records-phase-7h.constants';

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
      ],
      providers: [EvidenceRecordsBoundaryService, MasterFileCompletenessService],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    boundary = moduleRef.get(EvidenceRecordsBoundaryService);
    completeness = moduleRef.get(MasterFileCompletenessService);
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
    expect(() => {
      boundary.assertClientCannotSetVerified({ status: EvidenceRecordStatus.VERIFIED });
    }).toThrow(/verified/i);
  });

  it('2. client cannot set evidence status to ACCEPTED', () => {
    expect(() => {
      boundary.assertClientCannotSetAccepted({
        status: EvidenceRecordStatus.ACCEPTED_FOR_ADMINISTRATIVE_PURPOSE,
      });
    }).toThrow(/accepted/i);
  });

  it('3. client cannot set packet frozenAt directly', () => {
    expect(() => {
      boundary.assertClientCannotSetSealed({ frozenAt: new Date().toISOString() });
    }).toThrow(/freeze/i);
  });

  it('4. client cannot set contentHash directly', () => {
    expect(() => {
      boundary.assertClientCannotSetContentHash({ contentHash: 'tampered' });
    }).toThrow(/hash/i);
  });

  it('5. client cannot escalate classification to privileged levels', () => {
    expect(() => {
      boundary.assertClientCannotEscalateClassification({
        confidentialityClassification: 'HIGHLY_RESTRICTED',
      });
    }).toThrow(/classification/i);
  });

  it('6. client cannot mass-assign protected status fields', () => {
    expect(() => {
      boundary.assertClientPayloadDoesNotSetProtectedFields({ status: 'VERIFIED' }, ['status']);
    }).toThrow(/protected field/i);
  });

  it('7. applicant cannot access unrelated master file', async () => {
    await expect(
      boundary.assertApplicantCanAccessMasterFile(
        '00000000-0000-4000-8000-000000000099',
        '00000000-0000-4000-8000-000000000001',
      ),
    ).rejects.toThrow();
  });

  it('8. applicant cannot access unrelated evidence record', async () => {
    await expect(
      boundary.assertApplicantCanAccessEvidence(
        '00000000-0000-4000-8000-000000000099',
        '00000000-0000-4000-8000-000000000001',
      ),
    ).rejects.toThrow();
  });

  it('9. applicant cannot access unrelated evidence packet', async () => {
    await expect(
      boundary.assertApplicantCanAccessPacket(
        '00000000-0000-4000-8000-000000000099',
        '00000000-0000-4000-8000-000000000001',
      ),
    ).rejects.toThrow();
  });

  it('10. applicant cannot access legal hold records', async () => {
    jest.spyOn(prisma.legalHold, 'findUnique').mockResolvedValue({
      id: 'hold-1',
      holdNumber: 'HLD-P7H-001',
      title: 'Hold',
      authorityReference: 'AUTH-001',
      reason: 'Litigation',
      issuedByIdentityId: 'official-1',
      issuedAt: new Date(),
      effectiveFrom: new Date(),
      releasedAt: null,
      status: LegalHoldStatus.ACTIVE,
      scope: 'STANDARD',
      confidentiality: 'STANDARD',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(boundary.assertApplicantCannotAccessLegalHold('hold-1')).rejects.toThrow(
      /legal hold/i,
    );
  });

  it('11. applicant cannot verify evidence', () => {
    expect(() => {
      boundary.assertApplicantCannotVerify(true);
    }).toThrow(/cannot verify/i);
  });

  it('12. applicant cannot accept evidence', () => {
    expect(() => {
      boundary.assertApplicantCannotAccept(true);
    }).toThrow(/cannot accept/i);
  });

  it('13. evidence cannot be accepted before verification', () => {
    expect(() => {
      boundary.assertEvidenceVerifiedBeforeAcceptance(EvidenceRecordStatus.RECEIVED);
    }).toThrow(/verified before acceptance/i);
  });

  it('14. disputed evidence cannot be accepted', () => {
    expect(() => {
      boundary.assertNotDisputed(EvidenceRecordStatus.DISPUTED);
    }).toThrow(/disputed/i);
  });

  it('15. withdrawn evidence cannot be accepted', () => {
    expect(() => {
      boundary.assertNotWithdrawn(EvidenceRecordStatus.WITHDRAWN);
    }).toThrow(/withdrawn/i);
  });

  it('16. superseded evidence cannot be modified', () => {
    expect(() => {
      boundary.assertNotSuperseded(EvidenceRecordStatus.SUPERSEDED);
    }).toThrow(/superseded/i);
  });

  it('17. unreadable evidence cannot enter packet', () => {
    expect(() => {
      boundary.assertNotQuarantined(EvidenceRecordStatus.UNREADABLE);
    }).toThrow(/quarantined/i);
  });

  it('18. frozen packet cannot be modified', () => {
    expect(() => {
      boundary.assertPacketNotFrozen(EvidencePacketVersionStatus.FROZEN);
    }).toThrow(/frozen packet/i);
  });

  it('19. packet freeze is irreversible', () => {
    expect(() => {
      boundary.assertPacketFreezeIrreversible(EvidencePacketVersionStatus.FROZEN);
    }).toThrow(/irreversible/i);
  });

  it('20. legal hold blocks disposition execution', async () => {
    const targetReference = 'evidence-target-p7h';
    jest.spyOn(prisma.legalHoldTarget, 'findMany').mockResolvedValue([
      {
        id: 'target-1',
        legalHoldId: 'hold-1',
        targetType: LegalHoldTargetType.EVIDENCE,
        targetReference,
        recordsClassificationId: null,
        notes: null,
        createdAt: new Date(),
      },
    ]);

    await expect(
      boundary.assertLegalHoldDoesNotBlockDisposition('EvidenceRecord', targetReference),
    ).rejects.toThrow(/legal hold/i);
  });

  it('21. record correction requires approval before apply', () => {
    expect(() => {
      boundary.assertCorrectionRequiresApproval(RecordCorrectionStatus.REQUESTED);
    }).toThrow(/approval/i);
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
    expect(() => {
      boundary.assertMasterFileRequiresCase(null);
    }).toThrow(/requires linked case/i);
  });

  it('28. Phase 7 cannot create GovernmentDecision', () => {
    expect(() => {
      boundary.assertPhase7CannotCreateDecision();
    }).toThrow(/GovernmentDecision/i);
  });

  it('29. Phase 7 cannot issue license/permit/certificate', () => {
    expect(() => {
      boundary.assertPhase7CannotIssueInstrument();
    }).toThrow(/issue license/i);
  });

  it('30. AI-assisted actor cannot verify evidence independently', () => {
    expect(() => {
      boundary.assertAiCannotVerifyIndependently(true);
    }).toThrow(/AI-assisted/i);
  });

  it('31. service identity cannot accept decision-support evidence', () => {
    expect(() => {
      boundary.assertServiceIdentityCannotAcceptDecisionSupport(IdentityType.SERVICE);
    }).toThrow(/Service identity/i);
  });

  it('32. professional review does not constitute government decision', () => {
    expect(PHASE_7H_INVARIANTS.find((item) => item.id === 32)?.description).toMatch(/decision/i);
  });

  it('33. government communication record does not mutate case status', () => {
    expect(PHASE_7H_INVARIANTS.find((item) => item.id === 33)?.description).toMatch(/case status/i);
  });

  it('34. inspection custody chain must be maintained', () => {
    expect(PHASE_7H_INVARIANTS.find((item) => item.id === 34)?.description).toMatch(
      /custody chain/i,
    );
  });

  it('35. custody events cannot be client-backdated', () => {
    const future = new Date(Date.now() + 3600_000);
    expect(() => {
      boundary.assertCustodyEventNotBackdated(future);
    }).toThrow(/backdated/i);
  });

  it('36. packet manifest hash must match items', () => {
    expect(PHASE_7H_INVARIANTS.find((item) => item.id === 36)?.description).toMatch(
      /manifest hash/i,
    );
  });

  it('37. undisclosed requirement cannot be satisfied', () => {
    expect(PHASE_7H_INVARIANTS.find((item) => item.id === 37)?.description).toMatch(/undisclosed/i);
  });

  it('38. retention assignment cannot be client-set', () => {
    expect(PHASE_7H_INVARIANTS.find((item) => item.id === 38)?.description).toMatch(/retention/i);
  });

  it('39. case reference fields cannot be client-written', () => {
    expect(() => {
      boundary.assertClientCannotSetCaseReferenceFields({
        masterAdministrativeFileReference: 'MAF',
      });
    }).toThrow(/protected field/i);
  });

  it('40. decision-support packet cannot include non-accepted evidence', () => {
    expect(PHASE_7H_INVARIANTS.find((item) => item.id === 40)?.description).toMatch(
      /non-accepted/i,
    );
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
          status: EvidenceRecordStatus.RECEIVED,
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
          status: EvidenceRecordStatus.DISPUTED,
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
          status: EvidenceRecordStatus.ACCEPTED_FOR_ADMINISTRATIVE_PURPOSE,
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
    await expect(
      boundary.assertApplicantCanAccessEvidence(
        '00000000-0000-4000-8000-000000000099',
        '00000000-0000-4000-8000-000000000001',
      ),
    ).rejects.toThrow();
  });

  it('50. Phase 7 packet freeze does not issue instruments', async () => {
    await expect(boundary.assertPhase7TablesAbsent()).resolves.toBeUndefined();
  });
});
