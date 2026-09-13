import { DecisionNoticeRightType } from '@prisma/client';

import { resolveConfiguredNoticeRights } from './decision-type-config.util';

describe('decision-type-config.util', () => {
  it('derives only configured review rights and does not invent routes', () => {
    const definition = {
      supportedNoticeRightCodes: ['INTERNAL_REVIEW'],
    } as never;

    const routes = [
      {
        routeCode: 'INTERNAL_REVIEW',
        label: 'Internal Review',
        description: 'Configured',
        contactReference: 'review@institution.gov',
      },
      {
        routeCode: 'STATUTORY_APPEAL',
        label: 'Statutory Appeal',
        description: 'Not configured for this decision type',
        contactReference: 'appeals@institution.gov',
      },
    ] as never[];

    const resolved = resolveConfiguredNoticeRights(definition, routes);
    expect(resolved).toHaveLength(1);
    expect(resolved[0]?.routeCode).toBe('INTERNAL_REVIEW');
    expect(resolved[0]?.rightType).toBe(DecisionNoticeRightType.INTERNAL_REVIEW);
  });
});
