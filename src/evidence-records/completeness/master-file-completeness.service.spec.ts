import { EvidenceStatus, RecordIntegrityEventType } from '@prisma/client';

import { MasterFileCompletenessService } from './master-file-completeness.service';

describe('MasterFileCompletenessService', () => {
  const service = new MasterFileCompletenessService();
  const masterFileId = 'maf-001';
  const requiredCodes = ['IDENTITY_PROOF', 'BUSINESS_PLAN'];

  it('returns COMPLETE when all required evidence is accepted', () => {
    const result = service.assess({
      masterAdministrativeFileId: masterFileId,
      requiredRequirementCodes: requiredCodes,
      evidenceRecords: [
        {
          id: 'ev-1',
          status: EvidenceStatus.ACCEPTED,
          requirementLinks: [{ requirementCode: 'IDENTITY_PROOF', satisfied: true }],
        },
        {
          id: 'ev-2',
          status: EvidenceStatus.ACCEPTED,
          requirementLinks: [{ requirementCode: 'BUSINESS_PLAN', satisfied: true }],
        },
      ],
      integrityEvents: [],
      safeHalted: false,
    });

    expect(result.outcome).toBe('COMPLETE');
    expect(result.satisfiedEvidenceCount).toBe(2);
    expect(result.unresolvedEvidenceCount).toBe(0);
    expect(result.disputedEvidenceCount).toBe(0);
    expect(result.integrityFailureCount).toBe(0);
  });

  it('returns INCOMPLETE when disputed evidence exists', () => {
    const result = service.assess({
      masterAdministrativeFileId: masterFileId,
      requiredRequirementCodes: requiredCodes,
      evidenceRecords: [
        {
          id: 'ev-1',
          status: EvidenceStatus.DISPUTED,
          requirementLinks: [{ requirementCode: 'IDENTITY_PROOF', satisfied: false }],
        },
        {
          id: 'ev-2',
          status: EvidenceStatus.ACCEPTED,
          requirementLinks: [{ requirementCode: 'BUSINESS_PLAN', satisfied: true }],
        },
      ],
      integrityEvents: [],
      safeHalted: false,
    });

    expect(result.outcome).toBe('INCOMPLETE');
    expect(result.disputedEvidenceCount).toBe(1);
  });

  it('returns UNRESOLVED when required evidence is pending verification or acceptance', () => {
    const result = service.assess({
      masterAdministrativeFileId: masterFileId,
      requiredRequirementCodes: requiredCodes,
      evidenceRecords: [
        {
          id: 'ev-1',
          status: EvidenceStatus.VERIFIED,
          requirementLinks: [{ requirementCode: 'IDENTITY_PROOF', satisfied: false }],
        },
        {
          id: 'ev-2',
          status: EvidenceStatus.ACCEPTED,
          requirementLinks: [{ requirementCode: 'BUSINESS_PLAN', satisfied: true }],
        },
      ],
      integrityEvents: [],
      safeHalted: false,
    });

    expect(result.outcome).toBe('UNRESOLVED');
    expect(result.unresolvedEvidenceCount).toBeGreaterThan(0);
    expect(result.satisfiedEvidenceCount).toBe(1);
  });

  it('returns UNRESOLVED when required evidence is missing entirely', () => {
    const result = service.assess({
      masterAdministrativeFileId: masterFileId,
      requiredRequirementCodes: requiredCodes,
      evidenceRecords: [
        {
          id: 'ev-1',
          status: EvidenceStatus.ACCEPTED,
          requirementLinks: [{ requirementCode: 'IDENTITY_PROOF', satisfied: true }],
        },
      ],
      integrityEvents: [],
      safeHalted: false,
    });

    expect(result.outcome).toBe('UNRESOLVED');
    expect(result.unresolvedEvidenceCount).toBe(1);
  });

  it('returns SAFE_HALTED when integrity mismatch is detected', () => {
    const result = service.assess({
      masterAdministrativeFileId: masterFileId,
      requiredRequirementCodes: requiredCodes,
      evidenceRecords: [
        {
          id: 'ev-1',
          status: EvidenceStatus.ACCEPTED,
          requirementLinks: [{ requirementCode: 'IDENTITY_PROOF', satisfied: true }],
        },
      ],
      integrityEvents: [{ eventType: RecordIntegrityEventType.HASH_MISMATCH }],
      safeHalted: false,
    });

    expect(result.outcome).toBe('SAFE_HALTED');
    expect(result.integrityFailureCount).toBe(1);
  });

  it('returns SAFE_HALTED when workflow is safe-halted', () => {
    const result = service.assess({
      masterAdministrativeFileId: masterFileId,
      requiredRequirementCodes: requiredCodes,
      evidenceRecords: [],
      integrityEvents: [],
      safeHalted: true,
    });

    expect(result.outcome).toBe('SAFE_HALTED');
  });

  it('returns SAFE_HALTED on tamper detection even with complete evidence', () => {
    const result = service.assess({
      masterAdministrativeFileId: masterFileId,
      requiredRequirementCodes: requiredCodes,
      evidenceRecords: [
        {
          id: 'ev-1',
          status: EvidenceStatus.ACCEPTED,
          requirementLinks: [{ requirementCode: 'IDENTITY_PROOF', satisfied: true }],
        },
        {
          id: 'ev-2',
          status: EvidenceStatus.ACCEPTED,
          requirementLinks: [{ requirementCode: 'BUSINESS_PLAN', satisfied: true }],
        },
      ],
      integrityEvents: [{ eventType: RecordIntegrityEventType.TAMPER_DETECTED }],
      safeHalted: false,
    });

    expect(result.outcome).toBe('SAFE_HALTED');
    expect(result.integrityFailureCount).toBe(1);
  });
});
