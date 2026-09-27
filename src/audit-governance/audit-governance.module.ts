import { Global, Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { AuditGovernanceController } from './audit-governance.controller';
import { GovernedConfigurationChangeService } from './configuration/governed-configuration-change.service';
import { CanonicalAuditRecorderService } from './ledger/canonical-audit-recorder.service';
import { GovernmentAuditLedgerService } from './ledger/government-audit-ledger.service';
import { GovernmentAuditLedgerVerificationService } from './ledger/government-audit-ledger-verification.service';

@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [AuditGovernanceController],
  providers: [
    GovernmentAuditLedgerService,
    GovernmentAuditLedgerVerificationService,
    CanonicalAuditRecorderService,
    GovernedConfigurationChangeService,
  ],
  exports: [
    GovernmentAuditLedgerService,
    GovernmentAuditLedgerVerificationService,
    CanonicalAuditRecorderService,
    GovernedConfigurationChangeService,
  ],
})
export class AuditGovernanceModule {}
