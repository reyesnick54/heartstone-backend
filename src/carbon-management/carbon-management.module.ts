import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { CarbonAdministrativeAuthorizationService } from './authorization/carbon-administrative-authorization.service';
import { CarbonManagementController } from './carbon-management.controller';
import { CarbonManagementAccessService } from './common/carbon-management-access.service';
import { CarbonManagementAuthorityService } from './common/carbon-management-authority.service';
import { CarbonManagementBoundaryService } from './common/carbon-management-boundary.service';
import { CarbonManagementComplianceReferenceService } from './compliance/carbon-management-compliance-reference.service';
import { CarbonManagementConfigurationService } from './configuration/carbon-management-configuration.service';
import { CarbonProgrammeService } from './programmes/carbon-programme.service';
import { CarbonProjectService } from './projects/carbon-project.service';
import { CarbonRegistryReferenceService } from './registry/carbon-registry-reference.service';
import { CarbonExternalVerificationService } from './verification/carbon-external-verification.service';

@Module({
  imports: [DatabaseModule, SessionsModule, AuthorityModule],
  controllers: [CarbonManagementController],
  providers: [
    CarbonManagementBoundaryService,
    CarbonManagementAccessService,
    CarbonManagementAuthorityService,
    CarbonManagementConfigurationService,
    CarbonProgrammeService,
    CarbonProjectService,
    CarbonExternalVerificationService,
    CarbonRegistryReferenceService,
    CarbonAdministrativeAuthorizationService,
    CarbonManagementComplianceReferenceService,
  ],
  exports: [
    CarbonManagementBoundaryService,
    CarbonManagementAccessService,
    CarbonManagementAuthorityService,
    CarbonManagementConfigurationService,
    CarbonProgrammeService,
    CarbonProjectService,
    CarbonExternalVerificationService,
    CarbonRegistryReferenceService,
    CarbonAdministrativeAuthorizationService,
    CarbonManagementComplianceReferenceService,
  ],
})
export class CarbonManagementModule {}
