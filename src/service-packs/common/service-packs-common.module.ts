import { Module } from '@nestjs/common';

import { ManifestValidatorService } from './manifest/manifest-validator.service';
import { ServicePacksBoundaryService } from './service-packs-boundary.service';

@Module({
  providers: [ManifestValidatorService, ServicePacksBoundaryService],
  exports: [ManifestValidatorService, ServicePacksBoundaryService],
})
export class ServicePacksCommonModule {}
