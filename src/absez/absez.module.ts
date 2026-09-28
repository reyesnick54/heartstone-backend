import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { CorporateRegistryModule } from '../corporate-registry/corporate-registry.module';
import { DatabaseModule } from '../database/database.module';
import { ImmigrationModule } from '../immigration/immigration.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { AbsezController } from './absez.controller';
import { AbsezBoundaryService } from './common/absez-boundary.service';
import { AbsezZoneEnterpriseConfigurationService } from './configuration/absez-zone-enterprise-configuration.service';
import { AbsezS18fController } from './s18f/absez-s18f.controller';
import { AbsezArticle9ServicePathMatrixService } from './s18f/article9/absez-article9-service-path-matrix.service';
import { FreeZoneCustomsAuthorityService } from './s18f/customs/free-zone-customs-authority.service';
import { FreeZoneCustomsBoundaryService } from './s18f/customs/free-zone-customs-boundary.service';
import { FreeZoneCustomsService } from './s18f/customs/free-zone-customs.service';
import { InvestorResidencyProgramService } from './s18f/immigration/investor-residency-program.service';
import { InvestorRelationsService } from './s18f/investor-relations/investor-relations.service';
import { ZoneLandLeaseService } from './s18f/land/zone-land-lease.service';
import { SezBusinessLicenceService } from './sez-licence/sez-business-licence.service';
import { ZoneEnterpriseService } from './zone-enterprise/zone-enterprise.service';

@Module({
  imports: [
    DatabaseModule,
    SessionsModule,
    AuthorityModule,
    CorporateRegistryModule,
    ImmigrationModule,
  ],
  controllers: [AbsezController, AbsezS18fController],
  providers: [
    AbsezBoundaryService,
    AbsezZoneEnterpriseConfigurationService,
    ZoneEnterpriseService,
    SezBusinessLicenceService,
    FreeZoneCustomsBoundaryService,
    FreeZoneCustomsAuthorityService,
    FreeZoneCustomsService,
    InvestorResidencyProgramService,
    ZoneLandLeaseService,
    InvestorRelationsService,
    AbsezArticle9ServicePathMatrixService,
  ],
  exports: [
    AbsezBoundaryService,
    AbsezZoneEnterpriseConfigurationService,
    ZoneEnterpriseService,
    SezBusinessLicenceService,
    FreeZoneCustomsService,
    InvestorResidencyProgramService,
    ZoneLandLeaseService,
    InvestorRelationsService,
    AbsezArticle9ServicePathMatrixService,
  ],
})
export class AbsezModule {}
