import { Module } from '@nestjs/common';

import { S19IntegrationsReportingModule } from '../../remediation/s19/s19-integrations-reporting.module';
import { ApplicationProcessingValidationService } from './application-processing-validation.service';

@Module({
  imports: [S19IntegrationsReportingModule],
  providers: [ApplicationProcessingValidationService],
  exports: [ApplicationProcessingValidationService],
})
export class ApplicationProcessingCommonModule {}
