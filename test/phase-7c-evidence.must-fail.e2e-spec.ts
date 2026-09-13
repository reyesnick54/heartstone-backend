import {
  EvidenceAcceptancePurpose,
  EvidenceRecordStatus,
  EvidenceVerificationCategory,
  EvidenceVerificationMethod,
  EvidenceVerificationResult,
} from '@prisma/client';

import { FORBIDDEN_CLIENT_EVIDENCE_FIELDS } from '../src/evidence/evidence.constants';
import { EvidencePurposeAcceptanceService } from '../src/evidence/requirements/evidence-governance.service';
import { EvidenceVerificationService } from '../src/evidence/verification/evidence-verification.service';

describe('Phase 7C evidence invariants (must-fail)', () => {
  const verificationService = new EvidenceVerificationService(
    {} as never,
    {
      getById: jest.fn(),
    } as never,
  );

  const acceptanceService = new EvidencePurposeAcceptanceService(
    {} as never,
    {
      getById: jest.fn(),
    } as never,
  );

  it('documents that received status is not verified status', () => {
    expect(EvidenceRecordStatus.RECEIVED).not.toBe(EvidenceRecordStatus.VERIFIED);
  });

  it('documents that verified status is not accepted-for-purpose status', () => {
    expect(EvidenceRecordStatus.VERIFIED).not.toBe(
      EvidenceRecordStatus.ACCEPTED_FOR_ADMINISTRATIVE_PURPOSE,
    );
  });

  it('rejects client-supplied verified fields at the API boundary constants layer', () => {
    expect(FORBIDDEN_CLIENT_EVIDENCE_FIELDS).toContain('verified');
    expect(FORBIDDEN_CLIENT_EVIDENCE_FIELDS).toContain('isVerified');
  });

  it('rejects unknown verification methods fail-closed', async () => {
    await expect(
      verificationService.recordVerification('evidence-1', 'reviewer-1', {
        category: EvidenceVerificationCategory.INTEGRITY,
        whatWasVerified: 'checksum',
        verificationMethod: EvidenceVerificationMethod.UNKNOWN,
        verificationSource: 'SYSTEM',
        result: EvidenceVerificationResult.CONFIRMED,
        performedAt: new Date().toISOString(),
      }),
    ).rejects.toThrow('Unknown verification method');
  });

  it('separates integrity verification category from content fact verification category', () => {
    expect(EvidenceVerificationCategory.INTEGRITY).not.toBe(
      EvidenceVerificationCategory.CONTENT_FACT,
    );
  });

  it('separates issuer verification category from content fact verification category', () => {
    expect(EvidenceVerificationCategory.ISSUER).not.toBe(EvidenceVerificationCategory.CONTENT_FACT);
  });

  it('rejects AI finalization of purpose acceptance', async () => {
    await expect(
      acceptanceService.recordAcceptance(
        'evidence-1',
        'ai-identity',
        {
          purpose: EvidenceAcceptancePurpose.COMPLETENESS,
          decision: 'ACCEPTED',
          decidedAt: new Date().toISOString(),
        } as never,
        { isAiActor: true },
      ),
    ).rejects.toThrow('AI assistance cannot finalize evidence purpose acceptance');
  });

  it('documents purpose-specific acceptance purposes are distinct', () => {
    expect(EvidenceAcceptancePurpose.COMPLETENESS).not.toBe(
      EvidenceAcceptancePurpose.SUBSTANTIVE_REVIEW,
    );
  });
});
