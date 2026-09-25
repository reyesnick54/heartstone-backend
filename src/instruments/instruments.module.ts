import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { InstrumentLifecycleBoundaryService } from './common/instrument-lifecycle-boundary.service';
import { GovernmentDecisionService } from './lifecycle/government-decision.service';
import { InstrumentLifecycleService } from './lifecycle/instrument-lifecycle.service';
import { InstrumentLifecycleGuardService } from './lifecycle/instrument-lifecycle-guard.service';
import { InstrumentPublicVerificationCacheService } from './lifecycle/instrument-public-verification-cache.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    InstrumentLifecycleBoundaryService,
    InstrumentLifecycleGuardService,
    InstrumentPublicVerificationCacheService,
    GovernmentDecisionService,
    InstrumentLifecycleService,
  ],
  exports: [
    InstrumentLifecycleBoundaryService,
    InstrumentLifecycleGuardService,
    InstrumentPublicVerificationCacheService,
    GovernmentDecisionService,
    InstrumentLifecycleService,
  ],
})
export class InstrumentsModule {}
