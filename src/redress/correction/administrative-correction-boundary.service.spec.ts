import { RedressRouteType } from '@prisma/client';

import { AdministrativeCorrectionBoundaryService } from './administrative-correction-boundary.service';

describe('AdministrativeCorrectionBoundaryService', () => {
  const service = new AdministrativeCorrectionBoundaryService();

  it('permits clerical corrections that do not touch substantive attributes', () => {
    const result = service.evaluateCorrectionBoundary({
      requestedChanges: { contactEmail: 'corrected@example.gov', displayName: 'Jane Doe' },
    });

    expect(result.permitted).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('rejects correction that would alter final outcome', () => {
    const result = service.evaluateCorrectionBoundary({
      requestedChanges: { finalOutcome: 'APPROVED' },
    });

    expect(result.permitted).toBe(false);
    expect(result.violations).toContain('finalOutcome');
    expect(result.suggestedRoute).toBe(RedressRouteType.RECONSIDERATION);
    expect(result.routeGuidance).toContain('RECONSIDERATION');
  });

  it('routes substantive changes to configured alternate route when provided', () => {
    const result = service.evaluateCorrectionBoundary({
      requestedChanges: { materialReason: 'new reason' },
      configuredAlternateRoutes: [RedressRouteType.INTERNAL_REVIEW],
    });

    expect(result.permitted).toBe(false);
    expect(result.suggestedRoute).toBe(RedressRouteType.INTERNAL_REVIEW);
    expect(result.routeGuidance).toContain('INTERNAL_REVIEW');
  });

  it('detects alias fields such as outcome and reasons', () => {
    const result = service.evaluateCorrectionBoundary({
      requestedChanges: { outcome: 'DENIED', reasons: ['new ground'] },
    });

    expect(result.permitted).toBe(false);
    expect(result.violations).toEqual(expect.arrayContaining(['finalOutcome', 'materialReason']));
  });
});
