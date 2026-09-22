import { Module } from '@nestjs/common';

import { ClinicalResearchModule } from './research/clinical-research.module';

@Module({
  imports: [ClinicalResearchModule],
  exports: [ClinicalResearchModule],
})
export class HealthcareModule {}
