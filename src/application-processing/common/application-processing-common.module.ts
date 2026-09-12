import { Module } from '@nestjs/common';

import { ApplicationProcessingValidationService } from './application-processing-validation.service';

@Module({
  providers: [ApplicationProcessingValidationService],
  exports: [ApplicationProcessingValidationService],
})
export class ApplicationProcessingCommonModule {}
