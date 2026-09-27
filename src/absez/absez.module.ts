import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { CorporateRegistryModule } from '../corporate-registry/corporate-registry.module';
import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { AbsezController } from './absez.controller';
import { AbsezBoundaryService } from './common/absez-boundary.service';
import { AbsezZoneEnterpriseConfigurationService } from './configuration/absez-zone-enterprise-configuration.service';
import { SezBusinessLicenceService } from './sez-licence/sez-business-licence.service';
import { ZoneEnterpriseService } from './zone-enterprise/zone-enterprise.service';

@Module({
  imports: [DatabaseModule, SessionsModule, AuthorityModule, CorporateRegistryModule],
  controllers: [AbsezController],
  providers: [
    AbsezBoundaryService,
    AbsezZoneEnterpriseConfigurationService,
    ZoneEnterpriseService,
    SezBusinessLicenceService,
  ],
  exports: [
    AbsezBoundaryService,
    AbsezZoneEnterpriseConfigurationService,
    ZoneEnterpriseService,
    SezBusinessLicenceService,
  ],
})
export class AbsezModule {}
