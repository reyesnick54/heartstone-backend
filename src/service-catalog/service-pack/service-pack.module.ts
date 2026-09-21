import { Module } from '@nestjs/common';

import { ServicePackCompilerService } from './service-pack-compiler.service';
import { ServicePackConflictDetector } from './service-pack-conflict-detector.service';
import { ServicePackDependencyResolver } from './service-pack-dependency-resolver.service';
import { ServicePackValidationService } from './service-pack-validation.service';

@Module({
  providers: [
    ServicePackDependencyResolver,
    ServicePackConflictDetector,
    ServicePackValidationService,
    ServicePackCompilerService,
  ],
  exports: [ServicePackCompilerService],
})
export class ServicePackModule {}
