import { ProductionReliabilityBoundaryService } from './production-reliability-boundary.service';

describe('ProductionReliabilityBoundaryService', () => {
  const boundary = new ProductionReliabilityBoundaryService();

  it('allows valid approved target reference', () => {
    expect(() => {
      boundary.assertApprovedTargetReference('APPROVED-CONFIG-2026-001');
    }).not.toThrow();
  });

  it('allows dependency outage when unrelated capabilities remain usable', () => {
    expect(() => {
      boundary.assertDependencyOutageIsolated('payment-provider', [], 'PAYMENT_PROVIDER');
    }).not.toThrow();
  });
});
