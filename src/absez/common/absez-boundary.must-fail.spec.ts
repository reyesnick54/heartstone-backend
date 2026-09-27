import { ForbiddenException } from '@nestjs/common';
import { AbsezZoneEnterpriseActorPersona } from '@prisma/client';

import { AbsezBoundaryService } from './absez-boundary.service';

describe('ABSEZ boundary invariants (must-fail)', () => {
  const boundary = new AbsezBoundaryService({} as never);

  it('payment system persona cannot issue SEZ business licences', () => {
    expect(() => {
      boundary.assertPaymentDoesNotIssueLicence(AbsezZoneEnterpriseActorPersona.PAYMENT_SYSTEM);
    }).toThrow(ForbiddenException);
  });
});
