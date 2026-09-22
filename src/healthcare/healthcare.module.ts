import { Module } from '@nestjs/common';

import { TreatmentModule } from './treatment/treatment.module';

@Module({
  imports: [TreatmentModule],
  exports: [TreatmentModule],
})
export class HealthcareModule {}
