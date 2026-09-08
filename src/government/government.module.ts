import { Module } from '@nestjs/common';

import { AppointmentsModule } from './appointments/appointments.module';
import { DelegationsModule } from './delegations/delegations.module';
import { DepartmentsModule } from './departments/departments.module';
import { ExternalAuthoritiesModule } from './external-authorities/external-authorities.module';
import { GovernmentBodiesModule } from './government-bodies/government-bodies.module';
import { InstitutionExternalAuthoritiesModule } from './institution-external-authorities/institution-external-authorities.module';
import { InstitutionsModule } from './institutions/institutions.module';
import { JurisdictionsModule } from './jurisdictions/jurisdictions.module';
import { OfficeholdersModule } from './officeholders/officeholders.module';
import { OfficesModule } from './offices/offices.module';
import { GovernmentStructureModule } from './structure/government-structure.module';

@Module({
  imports: [
    JurisdictionsModule,
    InstitutionsModule,
    GovernmentBodiesModule,
    DepartmentsModule,
    OfficesModule,
    OfficeholdersModule,
    AppointmentsModule,
    DelegationsModule,
    ExternalAuthoritiesModule,
    InstitutionExternalAuthoritiesModule,
    GovernmentStructureModule,
  ],
})
export class GovernmentModule {}
