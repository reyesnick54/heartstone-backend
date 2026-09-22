import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { OfficialModule } from '../experience/official/official.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { PropertyCertificateService } from './certificates/property-certificate.service';
import { PropertyRegistryAccessService } from './common/property-registry-access.service';
import { PropertyRegistryBoundaryService } from './common/property-registry-boundary.service';
import { PropertyRegistryConfigurationService } from './configuration/property-registry-configuration.service';
import { PropertyEncumbranceService } from './encumbrances/property-encumbrance.service';
import { CitizenPropertyController } from './experience/citizen-property.controller';
import { DepartmentPropertyController } from './experience/department-property.controller';
import { OfficialPropertyController } from './experience/official-property.controller';
import { PropertyExperienceBoundaryService } from './experience/property-experience-boundary.service';
import { BusinessPropertyProjectionService } from './experience/services/business-property-projection.service';
import { CitizenPropertyProjectionService } from './experience/services/citizen-property-projection.service';
import { DepartmentPropertyProjectionService } from './experience/services/department-property-projection.service';
import { OfficialPropertyProjectionService } from './experience/services/official-property-projection.service';
import { PropertyScopeService } from './experience/services/property-scope.service';
import { PropertySurveyService } from './surveys/property-survey.service';
import { PropertyTransferService } from './transfers/property-transfer.service';
import { PublicPropertyRegistryVerificationController } from './verification/public-property-registry-verification.controller';
import { PublicPropertyRegistryVerificationService } from './verification/public-property-registry-verification.service';
import { PropertyRegistryOfficialWorkspaceService } from './workspace/property-registry-official-workspace.service';

@Module({
  imports: [DatabaseModule, SessionsModule, OfficialModule],
  controllers: [
    CitizenPropertyController,
    OfficialPropertyController,
    DepartmentPropertyController,
    PublicPropertyRegistryVerificationController,
  ],
  providers: [
    PropertyRegistryBoundaryService,
    PropertyRegistryAccessService,
    PropertyRegistryConfigurationService,
    PropertyExperienceBoundaryService,
    PropertyScopeService,
    CitizenPropertyProjectionService,
    BusinessPropertyProjectionService,
    OfficialPropertyProjectionService,
    DepartmentPropertyProjectionService,
    PropertyTransferService,
    PropertySurveyService,
    PropertyEncumbranceService,
    PropertyCertificateService,
    PropertyRegistryOfficialWorkspaceService,
    PublicPropertyRegistryVerificationService,
  ],
  exports: [
    PropertyRegistryBoundaryService,
    PropertyRegistryAccessService,
    PropertyRegistryConfigurationService,
    PropertyExperienceBoundaryService,
    PropertyScopeService,
    CitizenPropertyProjectionService,
    BusinessPropertyProjectionService,
    OfficialPropertyProjectionService,
    DepartmentPropertyProjectionService,
    PropertyTransferService,
    PropertySurveyService,
    PropertyEncumbranceService,
    PropertyCertificateService,
    PropertyRegistryOfficialWorkspaceService,
    PublicPropertyRegistryVerificationService,
  ],
})
export class PropertyRegistryModule {}
