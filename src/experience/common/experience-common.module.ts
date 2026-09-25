import { Module } from '@nestjs/common';

import { AuthorityModule } from '../../authority/authority.module';
import { DatabaseModule } from '../../database/database.module';
import { SessionAuthGuardModule } from '../../identity/auth/session-auth-guard.module';
import { CitizenExperienceModule } from '../citizen/citizen-experience.module';
import { OfficialModule } from '../official/official.module';
import { ExperienceCommonController } from './controllers/experience-common.controller';
import { ExperienceActionCenterService } from './services/experience-action-center.service';
import { ExperienceActorResolverService } from './services/experience-actor-resolver.service';
import { ExperienceDeepLinkService } from './services/experience-deep-link.service';
import { ExperienceInboxService } from './services/experience-inbox.service';
import { ExperienceLocalizationContract } from './services/experience-localization.contract';
import { ExperienceNavigationService } from './services/experience-navigation.service';
import { ExperienceResponseMetadataService } from './services/experience-response-metadata.service';
import { UnifiedExperienceSearchService } from './services/unified-experience-search.service';

@Module({
  imports: [
    DatabaseModule,
    SessionAuthGuardModule,
    AuthorityModule,
    CitizenExperienceModule,
    OfficialModule,
  ],
  controllers: [ExperienceCommonController],
  providers: [
    ExperienceLocalizationContract,
    ExperienceResponseMetadataService,
    ExperienceActorResolverService,
    UnifiedExperienceSearchService,
    ExperienceNavigationService,
    ExperienceInboxService,
    ExperienceActionCenterService,
    ExperienceDeepLinkService,
  ],
  exports: [
    ExperienceLocalizationContract,
    ExperienceResponseMetadataService,
    ExperienceActorResolverService,
    UnifiedExperienceSearchService,
    ExperienceNavigationService,
    ExperienceInboxService,
    ExperienceActionCenterService,
    ExperienceDeepLinkService,
  ],
})
export class ExperienceCommonModule {}
