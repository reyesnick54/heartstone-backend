import { Controller, Get } from '@nestjs/common';

import { PHASE_11C_INVARIANTS } from './phase-11c-invariants.constants';

@Controller('payments')
export class PaymentsController {
  @Get('invariants')
  listInvariants() {
    return { invariants: PHASE_11C_INVARIANTS };
  }
}
