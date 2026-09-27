import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { DigitalAssetsAuthorizationService } from './authorization/digital-assets-authorization.service';
import { DigitalAssetsAccessService } from './common/digital-assets-access.service';
import { DigitalAssetsAuthorityService } from './common/digital-assets-authority.service';
import { DigitalAssetsBoundaryService } from './common/digital-assets-boundary.service';
import { DigitalAssetsComplianceReferenceService } from './compliance/digital-assets-compliance-reference.service';
import { DigitalAssetsConfigurationService } from './configuration/digital-assets-configuration.service';
import { DigitalAssetsController } from './digital-assets.controller';
import { DigitalAssetsRegulatedEntityService } from './entities/digital-assets-regulated-entity.service';
import { DigitalAssetsExternalDependencyService } from './external/digital-assets-external-dependency.service';
import { DigitalAssetsTechnicalReviewService } from './reviews/digital-assets-technical-review.service';

@Module({
  imports: [DatabaseModule, SessionsModule, AuthorityModule],
  controllers: [DigitalAssetsController],
  providers: [
    DigitalAssetsBoundaryService,
    DigitalAssetsAccessService,
    DigitalAssetsAuthorityService,
    DigitalAssetsConfigurationService,
    DigitalAssetsRegulatedEntityService,
    DigitalAssetsTechnicalReviewService,
    DigitalAssetsExternalDependencyService,
    DigitalAssetsAuthorizationService,
    DigitalAssetsComplianceReferenceService,
  ],
  exports: [
    DigitalAssetsBoundaryService,
    DigitalAssetsAccessService,
    DigitalAssetsAuthorityService,
    DigitalAssetsConfigurationService,
    DigitalAssetsRegulatedEntityService,
    DigitalAssetsTechnicalReviewService,
    DigitalAssetsExternalDependencyService,
    DigitalAssetsAuthorizationService,
    DigitalAssetsComplianceReferenceService,
  ],
})
export class DigitalAssetsModule {}
