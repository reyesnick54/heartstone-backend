import { Module } from '@nestjs/common';

import { InstitutionsModule } from './institutions/institutions.module';
import { JurisdictionsModule } from './jurisdictions/jurisdictions.module';
import { OfficeholdersModule } from './officeholders/officeholders.module';
import { OfficesModule } from './offices/offices.module';

@Module({
  imports: [JurisdictionsModule, InstitutionsModule, OfficesModule, OfficeholdersModule],
})
export class GovernmentModule {}
