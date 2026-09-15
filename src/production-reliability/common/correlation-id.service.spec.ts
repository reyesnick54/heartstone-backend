import { CorrelationIdService } from './correlation-id.service';

describe('CorrelationIdService', () => {
  const service = new CorrelationIdService();

  it('resolves incoming correlation ID from header', () => {
    expect(service.resolveIncomingId('corr-123')).toBe('corr-123');
  });

  it('generates correlation ID when header absent', () => {
    const id = service.resolveIncomingId(undefined);
    expect(id).toBeTruthy();
    expect(id.length).toBeGreaterThan(10);
  });

  it('propagates correlation context across async boundary', () => {
    const result = service.runWithContext({ correlationId: 'test-corr' }, () => {
      return service.getCorrelationId();
    });
    expect(result).toBe('test-corr');
  });

  it('propagates child context with workflow and integration IDs', () => {
    service.runWithContext({ correlationId: 'parent-corr' }, () => {
      const child = service.propagateToChild({
        workflowId: 'wf-1',
        integrationId: 'int-1',
      });
      expect(child.correlationId).toBe('parent-corr');
      expect(child.workflowId).toBe('wf-1');
      expect(child.integrationId).toBe('int-1');
    });
  });
});
