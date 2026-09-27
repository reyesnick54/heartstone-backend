import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { ManifestValidatorService } from './manifest/manifest-validator.service';
import { ServicePackCanonicalGovernanceService } from './service-pack-canonical-governance.service';
import { ServicePacksBoundaryService } from './service-packs-boundary.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    ManifestValidatorService,
    ServicePacksBoundaryService,
    ServicePackCanonicalGovernanceService,
  ],
  exports: [
    ManifestValidatorService,
    ServicePacksBoundaryService,
    ServicePackCanonicalGovernanceService,
  ],
})
export class ServicePacksCommonModule {}
