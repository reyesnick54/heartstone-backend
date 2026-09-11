import { Module } from '@nestjs/common';

import { AuthorityModule } from '../../authority/authority.module';
import { OperationalServiceDiscoveryService } from './operational-service-discovery.service';
import { ServiceActivationService } from './service-activation.service';
import { ServicePublicationGovernanceService } from './service-publication-governance.service';
import { ServiceReadinessService } from './service-readiness.service';

@Module({
  imports: [AuthorityModule],
  providers: [
    ServiceReadinessService,
    ServiceActivationService,
    OperationalServiceDiscoveryService,
    ServicePublicationGovernanceService,
  ],
  exports: [
    ServiceReadinessService,
    ServiceActivationService,
    OperationalServiceDiscoveryService,
    ServicePublicationGovernanceService,
  ],
})
export class ActivationGovernanceModule {}
