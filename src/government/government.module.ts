import { Module } from '@nestjs/common';

import { InstitutionsModule } from './institutions/institutions.module';
import { JurisdictionsModule } from './jurisdictions/jurisdictions.module';

@Module({
  imports: [JurisdictionsModule, InstitutionsModule],
})
export class GovernmentModule {}
