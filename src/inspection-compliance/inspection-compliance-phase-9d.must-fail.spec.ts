import { ForbiddenException } from '@nestjs/common';
import { InspectionFindingSeverity, ProfessionalSignatureSource } from '@prisma/client';

import { InspectionComplianceBoundaryService } from './boundary/inspection-compliance-boundary.service';
import { InspectionCompletionService } from './completion/inspection-completion.service';
import { InspectionFindingService } from './finding/inspection-finding.service';
import {
  AI_CANNOT_CONFIRM_VIOLATION_MESSAGE,
  COMPLETION_DOES_NOT_SUSPEND_INSTRUMENT_MESSAGE,
  COMPLETION_IS_NOT_COMPLIANCE_CERTIFICATION_MESSAGE,
  FINDING_REQUIRES_REQUIREMENT_SOURCE_MESSAGE,
  OBSERVATION_IS_NOT_VIOLATION_MESSAGE,
  SCOPE_AMENDMENT_REQUIRES_APPROVAL_MESSAGE,
} from './inspection-compliance.constants';

describe('Phase 9D inspection compliance invariants (must-fail)', () => {
  const boundary = new InspectionComplianceBoundaryService();
  const completionService = new InspectionCompletionService({} as never, boundary);

  it('observation is not automatically a violation', () => {
    expect(() => {
      boundary.assertObservationIsNotViolation('The site is in violation of section 4.2');
    }).toThrow(OBSERVATION_IS_NOT_VIOLATION_MESSAGE);
    expect(() => {
      boundary.assertObservationIsNotViolation(
        'Visible sediment control measures were not installed',
      );
    }).not.toThrow();
  });

  it('finding severity does not constitute sanction', () => {
    expect(boundary.assertFindingIsNotSanction(InspectionFindingSeverity.CRITICAL)).toEqual({
      constitutesSanction: false,
      severity: InspectionFindingSeverity.CRITICAL,
    });
    expect(boundary.assertSeverityDoesNotImplySanction(InspectionFindingSeverity.MAJOR)).toEqual({
      constitutesSanction: false,
      severity: InspectionFindingSeverity.MAJOR,
    });
    expect(() =>
      boundary.assertSeverityDoesNotImplySanction(InspectionFindingSeverity.CRITICAL),
    ).not.toThrow();
  });

  it('AI cannot confirm violation', () => {
    expect(() => {
      boundary.assertAiCannotConfirmViolation(ProfessionalSignatureSource.AI_ASSISTANCE);
    }).toThrow(AI_CANNOT_CONFIRM_VIOLATION_MESSAGE);
    expect(() => {
      boundary.assertAiCannotConfirmViolation(
        ProfessionalSignatureSource.CONTROLLED_PROFESSIONAL_ACTION,
      );
    }).not.toThrow();
  });

  it('finding must reference requirement or governing source', () => {
    expect(() => {
      boundary.assertFindingReferencesRequirement(0);
    }).toThrow(FINDING_REQUIRES_REQUIREMENT_SOURCE_MESSAGE);
    expect(() => {
      boundary.assertFindingReferencesRequirement(1);
    }).not.toThrow();
  });

  it('finding without evidence can be marked unresolved', () => {
    expect(boundary.assertFindingWithoutEvidenceCanBeUnresolved(0)).toBe(true);
    expect(boundary.assertFindingWithoutEvidenceCanBeUnresolved(2)).toBe(false);
  });

  it('subject response preserves original finding and observation', () => {
    expect(boundary.assertResponseDoesNotOverwriteOriginal()).toEqual({ preservesOriginal: true });
  });

  it('scope expansion requires controlled amendment', () => {
    expect(() => {
      boundary.assertScopeExpansionRequiresAmendment({
        originalScope: 'Building A interior',
        requestedScope: 'Building A interior and exterior grounds',
        amendmentApproved: false,
      });
    }).toThrow(SCOPE_AMENDMENT_REQUIRES_APPROVAL_MESSAGE);
  });

  it('inspection completion is not compliance certification by default', () => {
    expect(() => {
      boundary.assertCompletionIsNotComplianceCertification(true);
    }).toThrow(COMPLETION_IS_NOT_COMPLIANCE_CERTIFICATION_MESSAGE);
  });

  it('inspection completion does not automatically suspend instrument', () => {
    expect(() => {
      completionService.assertDoesNotSuspendInstrument();
    }).toThrow(COMPLETION_DOES_NOT_SUSPEND_INSTRUMENT_MESSAGE);
  });

  it('rejects AI-confirmed finding confirmation attempt', async () => {
    const prisma = {
      inspectionFinding: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'finding-1',
          status: 'DRAFT',
          inspectionSession: { inspectionRecord: { id: 'insp-1' } },
        }),
      },
    };

    const service = new InspectionFindingService(prisma as never, {} as never, boundary);

    await expect(
      service.confirmFinding({
        findingId: 'finding-1',
        reviewerIdentityId: 'id-1',
        reviewerOfficeholderId: 'oh-1',
        functionAuthorityRecordId: 'far-1',
        signatureSource: ProfessionalSignatureSource.AI_ASSISTANCE,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
