import {
  FunctionSourceInterpretationStatus,
  GoverningSourceStatus,
  GoverningSourceType,
  SourceAuthenticationStatus,
  SourceFoundationValidity,
} from '@prisma/client';

import { SourceFoundationEvaluatorService } from './source-foundation-evaluator.service';

describe('SourceFoundationEvaluatorService', () => {
  const service = new SourceFoundationEvaluatorService(null as never);
  const now = new Date('2026-06-01');

  function makeSource(overrides: Record<string, unknown> = {}) {
    return {
      id: 'source-1',
      sourceCode: 'ACT-001',
      title: 'Test Act',
      sourceType: GoverningSourceType.LEGISLATION,
      issuer: null,
      jurisdictionId: null,
      instrumentDate: null,
      effectiveDate: null,
      commencementDate: new Date('2020-01-01'),
      expiryDate: null,
      authenticationStatus: SourceAuthenticationStatus.AUTHENTICATED,
      sourceStatus: GoverningSourceStatus.IN_FORCE,
      officialLocationRef: null,
      documentFingerprint: null,
      classificationMetadata: null,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
  }

  function makeLink(
    sourceOverrides: Record<string, unknown> = {},
    linkOverrides: Record<string, unknown> = {},
  ) {
    const governingSource = makeSource(sourceOverrides);
    return {
      governingSource,
      isPrimary: true,
      interpretationStatus: FunctionSourceInterpretationStatus.RESOLVED,
      ...linkOverrides,
    };
  }

  it('returns VALID for authenticated in-force primary source', () => {
    const result = service.evaluateLinks([makeLink()], now);
    expect(result.validity).toBe(SourceFoundationValidity.VALID);
  });

  it('returns INVALID when source is unauthenticated', () => {
    const result = service.evaluateLinks(
      [makeLink({ authenticationStatus: SourceAuthenticationStatus.UNVERIFIED })],
      now,
    );
    expect(result.validity).toBe(SourceFoundationValidity.INVALID);
  });

  it('returns EXPIRED when source expiry date has passed', () => {
    const result = service.evaluateLinks([makeLink({ expiryDate: new Date('2025-01-01') })], now);
    expect(result.validity).toBe(SourceFoundationValidity.EXPIRED);
  });

  it('returns INVALID when source is revoked', () => {
    const result = service.evaluateLinks(
      [makeLink({ sourceStatus: GoverningSourceStatus.REVOKED })],
      now,
    );
    expect(result.validity).toBe(SourceFoundationValidity.INVALID);
  });

  it('returns SUPERSEDED when source status is superseded', () => {
    const result = service.evaluateLinks(
      [makeLink({ sourceStatus: GoverningSourceStatus.SUPERSEDED })],
      now,
    );
    expect(result.validity).toBe(SourceFoundationValidity.SUPERSEDED);
  });

  it('returns INVALID when commencement is in the future', () => {
    const result = service.evaluateLinks(
      [makeLink({ commencementDate: new Date('2027-01-01') })],
      now,
    );
    expect(result.validity).toBe(SourceFoundationValidity.INVALID);
  });

  it('returns CONFLICTING when multiple valid primary sources exist', () => {
    const result = service.evaluateLinks(
      [
        makeLink({ id: 'source-1', sourceCode: 'ACT-001' }),
        makeLink({ id: 'source-2', sourceCode: 'ACT-002' }),
      ],
      now,
    );
    expect(result.validity).toBe(SourceFoundationValidity.CONFLICTING);
  });

  it('returns UNRESOLVED when interpretation is contested', () => {
    const result = service.evaluateLinks(
      [makeLink({}, { interpretationStatus: FunctionSourceInterpretationStatus.CONTESTED })],
      now,
    );
    expect(result.validity).toBe(SourceFoundationValidity.UNRESOLVED);
  });

  it('supportsActiveUse only for VALID foundation', () => {
    expect(
      service.supportsActiveUse({
        validity: SourceFoundationValidity.VALID,
        reasons: [],
        evaluatedAt: now,
        primarySourceIds: [],
        blockingSourceIds: [],
      }),
    ).toBe(true);

    expect(
      service.supportsActiveUse({
        validity: SourceFoundationValidity.UNRESOLVED,
        reasons: [],
        evaluatedAt: now,
        primarySourceIds: [],
        blockingSourceIds: [],
      }),
    ).toBe(false);
  });
});
