import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { OperationalSupportModule } from '../operational-support/operational-support.module';
import { InstrumentLifecycleBoundaryService } from './common/instrument-lifecycle-boundary.service';
import { GovernmentDecisionService } from './lifecycle/government-decision.service';
import {
  InstrumentRenewalMonitoringService,
  OperationalJobRunnerService,
} from './lifecycle/instrument-renewal-monitoring.service';
import { InstrumentLifecycleService } from './lifecycle/instrument-lifecycle.service';
import { InstrumentLifecycleGuardService } from './lifecycle/instrument-lifecycle-guard.service';
import { InstrumentPublicVerificationCacheService } from './lifecycle/instrument-public-verification-cache.service';

@Module({
  imports: [DatabaseModule, OperationalSupportModule],
  providers: [
    InstrumentLifecycleBoundaryService,
    InstrumentLifecycleGuardService,
    InstrumentPublicVerificationCacheService,
    GovernmentDecisionService,
    InstrumentLifecycleService,
    InstrumentRenewalMonitoringService,
    OperationalJobRunnerService,
  ],
  exports: [
    InstrumentLifecycleBoundaryService,
    InstrumentLifecycleGuardService,
    InstrumentPublicVerificationCacheService,
    GovernmentDecisionService,
    InstrumentLifecycleService,
    InstrumentRenewalMonitoringService,
    OperationalJobRunnerService,
  ],
})
export class InstrumentsModule {}
