import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { CorporateCertificateService } from './certificates/corporate-certificate.service';
import { CorporateRegistryConfigurationService } from './configuration/corporate-registry-configuration.service';
import { CorporateRegistryLifecycleService } from './lifecycle/corporate-registry-lifecycle.service';
import { CorporateRegistryProfileQueryService } from './profile/corporate-registry-profile-query.service';
import { PublicCorporateRegistryVerificationController } from './verification/public-corporate-registry-verification.controller';
import { PublicCorporateRegistryVerificationService } from './verification/public-corporate-registry-verification.service';
import { CorporateRegistryOfficialWorkspaceService } from './workspace/corporate-registry-official-workspace.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PublicCorporateRegistryVerificationController],
  providers: [
    CorporateRegistryConfigurationService,
    CorporateRegistryLifecycleService,
    CorporateCertificateService,
    CorporateRegistryProfileQueryService,
    PublicCorporateRegistryVerificationService,
    CorporateRegistryOfficialWorkspaceService,
  ],
  exports: [
    CorporateRegistryLifecycleService,
    CorporateCertificateService,
    CorporateRegistryProfileQueryService,
    CorporateRegistryConfigurationService,
    CorporateRegistryOfficialWorkspaceService,
    PublicCorporateRegistryVerificationService,
  ],
})
export class CorporateRegistryModule {}
