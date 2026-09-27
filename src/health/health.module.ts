import { Module } from '@nestjs/common';

import { DocumentTrustModule } from '../document-trust/document-trust.module';
import { HealthService } from './health.service';

@Module({
  imports: [DocumentTrustModule],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
