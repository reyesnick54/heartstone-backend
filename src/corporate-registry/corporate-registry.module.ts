import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { CorporateRegistryActorAccessService } from './access/corporate-registry-actor-access.service';
import { CorporateBeneficialOwnershipService } from './beneficial-ownership/corporate-beneficial-ownership.service';
import { CorporateCertificateService } from './certificates/corporate-certificate.service';
import { CorporateRegistryConfigurationService } from './configuration/corporate-registry-configuration.service';
import { CorporateRegistryController } from './corporate-registry.controller';
import { CorporateRegistryLifecycleService } from './lifecycle/corporate-registry-lifecycle.service';
import { CorporateRegistryOperationsService } from './operations/corporate-registry-operations.service';
import { CorporateRegistryProfileQueryService } from './profile/corporate-registry-profile-query.service';
import { PublicCorporateRegistryVerificationController } from './verification/public-corporate-registry-verification.controller';
import { PublicCorporateRegistryVerificationService } from './verification/public-corporate-registry-verification.service';
import { CorporateRegistryOfficialWorkspaceService } from './workspace/corporate-registry-official-workspace.service';

@Module({
  imports: [DatabaseModule, SessionsModule],
  controllers: [PublicCorporateRegistryVerificationController, CorporateRegistryController],
  providers: [
    CorporateRegistryConfigurationService,
    CorporateRegistryLifecycleService,
    CorporateCertificateService,
    CorporateRegistryProfileQueryService,
    PublicCorporateRegistryVerificationService,
    CorporateRegistryOfficialWorkspaceService,
    CorporateRegistryActorAccessService,
    CorporateBeneficialOwnershipService,
    CorporateRegistryOperationsService,
  ],
  exports: [
    CorporateRegistryLifecycleService,
    CorporateCertificateService,
    CorporateRegistryProfileQueryService,
    CorporateRegistryConfigurationService,
    CorporateRegistryOfficialWorkspaceService,
    PublicCorporateRegistryVerificationService,
    CorporateBeneficialOwnershipService,
    CorporateRegistryOperationsService,
  ],
})
export class CorporateRegistryModule {}
