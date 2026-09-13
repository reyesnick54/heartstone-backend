import { BadRequestException } from '@nestjs/common';

import { ComplianceStatusBoundaryService } from './compliance-status-boundary.service';

describe('ComplianceStatusBoundaryService', () => {
  const service = new ComplianceStatusBoundaryService();

  it('blocks clients from setting compliance status directly', () => {
    expect(() => {
      service.assertClientCannotSetComplianceStatus({ status: 'SATISFACTORY' });
    }).toThrow(BadRequestException);
  });

  it('removes restricted holder dashboard fields', () => {
    const sanitized = service.sanitizeHolderDashboardResponse({
      status: 'MONITORING',
      internalPrivilegedNotes: 'secret',
      indicators: [],
    });

    expect(sanitized).not.toHaveProperty('internalPrivilegedNotes');
    expect(sanitized.status).toBe('MONITORING');
  });
});
