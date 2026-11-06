import { DocumentSourceType } from '@prisma/client';

import { normalizeCredentialConditions } from './credentials/citizen-credentials-projection.service';
import { deriveCitizenDocumentOrigin } from './documents/citizen-documents-projection.service';

describe('citizen projection normalizers', () => {
  describe('normalizeCredentialConditions', () => {
    it('projects only applicant-safe fields from recorded decision conditions', () => {
      const conditions = normalizeCredentialConditions([
        {
          id: 'c-1',
          governmentDecisionId: 'internal-decision',
          conditionType: 'CONTINUING',
          status: 'PENDING',
          description: 'Maintain insurance cover',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ]);

      expect(conditions).toEqual([
        {
          id: 'c-1',
          conditionType: 'CONTINUING',
          status: 'PENDING',
          description: 'Maintain insurance cover',
        },
      ]);
    });

    it('accepts plain strings and skips entries without readable text', () => {
      expect(normalizeCredentialConditions(['Display the licence', '', 42, null, {}])).toEqual([
        { description: 'Display the licence' },
      ]);
    });

    it('returns an empty list for non-array JSON', () => {
      expect(normalizeCredentialConditions({ description: 'x' })).toEqual([]);
      expect(normalizeCredentialConditions(undefined)).toEqual([]);
    });
  });

  describe('deriveCitizenDocumentOrigin', () => {
    it('marks the citizen’s own uploads as submitted by the citizen', () => {
      expect(deriveCitizenDocumentOrigin(DocumentSourceType.OTHER, 'me', 'me')).toBe(
        'SUBMITTED_BY_CITIZEN',
      );
      expect(deriveCitizenDocumentOrigin(DocumentSourceType.APPLICANT_UPLOAD, null, 'me')).toBe(
        'SUBMITTED_BY_CITIZEN',
      );
    });

    it('marks official and system documents as issued by government', () => {
      expect(deriveCitizenDocumentOrigin(DocumentSourceType.OFFICIAL_UPLOAD, 'off', 'me')).toBe(
        'ISSUED_BY_GOVERNMENT',
      );
      expect(deriveCitizenDocumentOrigin(DocumentSourceType.SYSTEM_GENERATED, null, 'me')).toBe(
        'ISSUED_BY_GOVERNMENT',
      );
    });

    it('distinguishes external authority documents', () => {
      expect(deriveCitizenDocumentOrigin(DocumentSourceType.EXTERNAL_AUTHORITY, null, 'me')).toBe(
        'EXTERNAL_AUTHORITY',
      );
      expect(deriveCitizenDocumentOrigin(DocumentSourceType.EMAIL_INGEST, null, 'me')).toBe(
        'OTHER',
      );
    });
  });
});
