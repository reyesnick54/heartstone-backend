import { Module } from '@nestjs/common';

import { ServicePacksCommonModule } from '../../service-packs/common/service-packs-common.module';
import { ServicePackGovernanceModule } from '../../service-packs/governance/service-pack-governance.module';
import { ActivationGovernanceModule } from '../activation-governance/activation-governance.module';
import { ServicePackActivationService } from './service-pack-activation.service';
import { ServicePackDeploymentService } from './service-pack-deployment.service';
import { ServicePackDeploymentAuditService } from './service-pack-deployment-audit.service';
import { ServicePackRollbackService } from './service-pack-rollback.service';
import { ServicePackRuntimeCompilerService } from './service-pack-runtime-compiler.service';

@Module({
  imports: [ActivationGovernanceModule, ServicePackGovernanceModule, ServicePacksCommonModule],
  providers: [
    ServicePackDeploymentAuditService,
    ServicePackDeploymentService,
    ServicePackRollbackService,
    ServicePackActivationService,
    ServicePackRuntimeCompilerService,
  ],
  exports: [
    ServicePackDeploymentAuditService,
    ServicePackDeploymentService,
    ServicePackRollbackService,
    ServicePackActivationService,
    ServicePackRuntimeCompilerService,
  ],
})
export class ServicePackDeploymentModule {}
