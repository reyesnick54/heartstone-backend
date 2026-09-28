import { Module } from '@nestjs/common';

import { DocumentTrustModule } from '../document-trust/document-trust.module';
import { S19IntegrationsReportingModule } from '../remediation/s19/s19-integrations-reporting.module';
import { HealthService } from './health.service';

@Module({
  imports: [DocumentTrustModule, S19IntegrationsReportingModule],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
