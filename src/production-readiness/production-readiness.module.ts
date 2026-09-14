import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { ProductionReadinessBoundaryService } from './common/production-readiness-boundary.service';
import { LaunchGateService } from './launch/launch-gate.service';
import { LaunchReadinessSnapshotService } from './launch/launch-readiness-snapshot.service';
import { OperationalActivationService } from './launch/operational-activation.service';
import {
  CapabilityReplacementService,
  CapabilityRetirementService,
  DecommissioningService,
  ExitAcceptanceService,
} from './lifecycle/decommissioning.service';
import { ProductionReadinessController } from './production-readiness.controller';
import {
  ProductionDefectService,
  StabilizationService,
} from './stabilization/stabilization.service';
import {
  OperationalRevalidationService,
  OperationalSuspensionService,
} from './suspension/operational-suspension.service';

@Module({
  imports: [DatabaseModule, SessionsModule, AuthorityModule],
  controllers: [ProductionReadinessController],
  providers: [
    ProductionReadinessBoundaryService,
    LaunchReadinessSnapshotService,
    LaunchGateService,
    OperationalActivationService,
    StabilizationService,
    ProductionDefectService,
    OperationalSuspensionService,
    OperationalRevalidationService,
    CapabilityRetirementService,
    CapabilityReplacementService,
    DecommissioningService,
    ExitAcceptanceService,
  ],
  exports: [
    ProductionReadinessBoundaryService,
    LaunchReadinessSnapshotService,
    LaunchGateService,
    OperationalActivationService,
    StabilizationService,
    ProductionDefectService,
    OperationalSuspensionService,
    OperationalRevalidationService,
    CapabilityRetirementService,
    CapabilityReplacementService,
    DecommissioningService,
    ExitAcceptanceService,
  ],
})
export class ProductionReadinessModule {}
