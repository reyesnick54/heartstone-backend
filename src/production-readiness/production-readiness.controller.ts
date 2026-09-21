import { Controller, Get } from '@nestjs/common';

import { Public } from '../security/decorators/public.decorator';
import {
  PHASE_13_BOUNDARY_DISCLAIMERS,
  PRODUCTION_READINESS_BOUNDARY_DISCLAIMER,
} from './production-readiness.constants';

@Controller('production-readiness')
export class ProductionReadinessController {
  @Public()
  @Get('boundary-disclaimer')
  getBoundaryDisclaimer(): {
    disclaimer: string;
    invariants: typeof PHASE_13_BOUNDARY_DISCLAIMERS;
  } {
    return {
      disclaimer: PRODUCTION_READINESS_BOUNDARY_DISCLAIMER,
      invariants: PHASE_13_BOUNDARY_DISCLAIMERS,
    };
  }
}
