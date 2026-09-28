import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { CannabisAdministrationController } from './cannabis-administration.controller';
import { CannabisAdministrationAccessService } from './common/cannabis-administration-access.service';
import { CannabisAdministrationAuthorityService } from './common/cannabis-administration-authority.service';
import { CannabisAdministrationBoundaryService } from './common/cannabis-administration-boundary.service';
import { CannabisAdministrationConfigurationService } from './configuration/cannabis-administration-configuration.service';
import { CannabisRegulatedEntityService } from './entities/cannabis-regulated-entity.service';
import { CannabisExternalDependencyService } from './external/cannabis-external-dependency.service';
import { CannabisLicenceRecordService } from './licences/cannabis-licence-record.service';
import { CannabisLicenceSuspensionService } from './licences/cannabis-licence-suspension.service';
import { CannabisRegulatoryReferenceService } from './regulatory/cannabis-regulatory-reference.service';
import { CannabisFacilitySiteReferenceService } from './sites/cannabis-facility-site-reference.service';

@Module({
  imports: [DatabaseModule, SessionsModule, AuthorityModule],
  controllers: [CannabisAdministrationController],
  providers: [
    CannabisAdministrationBoundaryService,
    CannabisAdministrationAccessService,
    CannabisAdministrationAuthorityService,
    CannabisAdministrationConfigurationService,
    CannabisRegulatedEntityService,
    CannabisFacilitySiteReferenceService,
    CannabisExternalDependencyService,
    CannabisLicenceRecordService,
    CannabisLicenceSuspensionService,
    CannabisRegulatoryReferenceService,
  ],
  exports: [
    CannabisAdministrationBoundaryService,
    CannabisAdministrationAccessService,
    CannabisAdministrationAuthorityService,
    CannabisAdministrationConfigurationService,
    CannabisRegulatedEntityService,
    CannabisFacilitySiteReferenceService,
    CannabisExternalDependencyService,
    CannabisLicenceRecordService,
    CannabisLicenceSuspensionService,
    CannabisRegulatoryReferenceService,
  ],
})
export class CannabisAdministrationModule {}
