import { BadRequestException } from '@nestjs/common';

import { assertNotTerminal, assertStatusTransition } from './lifecycle-transition.util';

describe('lifecycle-transition.util', () => {
  it('allows valid status transitions', () => {
    expect(() => {
      assertStatusTransition('PENDING', ['PENDING', 'SUSPENDED'], 'ACTIVE', 'user account');
    }).not.toThrow();
  });

  it('rejects invalid status transitions', () => {
    expect(() => {
      assertStatusTransition('REVOKED', ['ACTIVE'], 'SUSPENDED', 'user account');
    }).toThrow(BadRequestException);
  });

  it('rejects operations on terminal statuses', () => {
    expect(() => {
      assertNotTerminal('REVOKED', ['REVOKED'], 'user account');
    }).toThrow(BadRequestException);
  });
});
