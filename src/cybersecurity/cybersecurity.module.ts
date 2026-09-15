import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { IdentityCommonModule } from '../identity/common/identity-common.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { CybersecurityBoundaryService } from './common/cybersecurity-boundary.service';
import { SecurityControlService } from './controls/security-control.service';
import { CryptographicService } from './cryptography/cryptographic.service';
import { CybersecurityController } from './cybersecurity.controller';
import { PrivilegedAccessService } from './privileged-access/privileged-access.service';
import { ProductionReadinessService } from './readiness/production-readiness.service';
import { SupplyChainService } from './supply-chain/supply-chain.service';
import { SecurityTestingService } from './testing/security-testing.service';
import { VulnerabilityService } from './vulnerability/vulnerability.service';

@Module({
  imports: [DatabaseModule, SessionsModule, IdentityCommonModule],
  controllers: [CybersecurityController],
  providers: [
    CybersecurityBoundaryService,
    SecurityControlService,
    VulnerabilityService,
    CryptographicService,
    SupplyChainService,
    PrivilegedAccessService,
    SecurityTestingService,
    ProductionReadinessService,
  ],
  exports: [
    CybersecurityBoundaryService,
    SecurityControlService,
    VulnerabilityService,
    CryptographicService,
    SupplyChainService,
    PrivilegedAccessService,
    SecurityTestingService,
    ProductionReadinessService,
  ],
})
export class CybersecurityModule {}
