import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { InstrumentLifecycleBoundaryService } from './common/instrument-lifecycle-boundary.service';
import { GovernmentDecisionService } from './lifecycle/government-decision.service';
import { InstrumentLifecycleService } from './lifecycle/instrument-lifecycle.service';
import { InstrumentLifecycleGuardService } from './lifecycle/instrument-lifecycle-guard.service';
import { InstrumentVerificationService } from './lifecycle/instrument-verification.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    InstrumentLifecycleBoundaryService,
    InstrumentLifecycleGuardService,
    InstrumentVerificationService,
    GovernmentDecisionService,
    InstrumentLifecycleService,
  ],
  exports: [
    InstrumentLifecycleBoundaryService,
    InstrumentLifecycleGuardService,
    InstrumentVerificationService,
    GovernmentDecisionService,
    InstrumentLifecycleService,
  ],
})
export class InstrumentsModule {}
