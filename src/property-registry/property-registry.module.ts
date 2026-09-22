import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { OfficialModule } from '../experience/official/official.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { PropertyRegistryAuditService } from './audit/property-registry-audit.service';
import { PropertyCertificateService } from './certificates/property-certificate.service';
import { PropertyRegistryAccessService } from './common/property-registry-access.service';
import { PropertyRegistryBoundaryService } from './common/property-registry-boundary.service';
import { PropertyRegistryCadastreBoundaryService } from './common/property-registry-cadastre-boundary.service';
import { PropertyRegistryClassificationAccessService } from './common/property-registry-classification-access.service';
import { PropertyRegistryConfigurationService } from './configuration/property-registry-configuration.service';
import { PropertyRegistryCorrectionService } from './corrections/property-registry-correction.service';
import { CadastrePropertyEncumbranceService } from './encumbrances/cadastre-property-encumbrance.service';
import { PropertyEncumbranceService } from './encumbrances/property-encumbrance.service';
import { CitizenPropertyController } from './experience/citizen-property.controller';
import { DepartmentPropertyController } from './experience/department-property.controller';
import { OfficialPropertyController } from './experience/official-property.controller';
import { PropertyExperienceBoundaryService } from './experience/property-experience-boundary.service';
import { CitizenPropertyProjectionService } from './experience/services/citizen-property-projection.service';
import { DepartmentPropertyProjectionService } from './experience/services/department-property-projection.service';
import { OfficialPropertyProjectionService } from './experience/services/official-property-projection.service';
import { PropertyScopeService } from './experience/services/property-scope.service';
import { PropertyTransferIntakeService } from './intake/property-transfer-intake.service';
import { PropertyRegistryController } from './property-registry.controller';
import { PropertyRegistryReadService } from './queries/property-registry-read.service';
import { PropertyTitleRegistrationService } from './registration/property-title-registration.service';
import { PropertySurveyService } from './surveys/property-survey.service';
import { PropertyTransferService } from './transfers/property-transfer.service';
import { PropertyTransferPaymentService } from './transfers/property-transfer-payment.service';
import { PropertyRegistryVerificationService } from './verification/property-registry-verification.service';
import { PublicPropertyRegistryVerificationController } from './verification/public-property-registry-verification.controller';
import { PublicPropertyRegistryVerificationService } from './verification/public-property-registry-verification.service';
import { PropertyRegistryOfficialWorkspaceService } from './workspace/property-registry-official-workspace.service';

@Module({
  imports: [DatabaseModule, SessionsModule, OfficialModule, AuthorityModule],
  controllers: [
    PropertyRegistryController,
    CitizenPropertyController,
    OfficialPropertyController,
    DepartmentPropertyController,
    PublicPropertyRegistryVerificationController,
  ],
  providers: [
    PropertyRegistryBoundaryService,
    PropertyRegistryCadastreBoundaryService,
    PropertyRegistryAccessService,
    PropertyRegistryClassificationAccessService,
    PropertyRegistryConfigurationService,
    PropertyExperienceBoundaryService,
    PropertyScopeService,
    CitizenPropertyProjectionService,
    OfficialPropertyProjectionService,
    DepartmentPropertyProjectionService,
    PropertyTransferService,
    PropertyTransferIntakeService,
    PropertyTransferPaymentService,
    PropertyTitleRegistrationService,
    PropertySurveyService,
    PropertyEncumbranceService,
    CadastrePropertyEncumbranceService,
    PropertyRegistryCorrectionService,
    PropertyRegistryReadService,
    PropertyRegistryVerificationService,
    PropertyRegistryAuditService,
    PropertyCertificateService,
    PropertyRegistryOfficialWorkspaceService,
    PublicPropertyRegistryVerificationService,
  ],
  exports: [
    PropertyRegistryBoundaryService,
    PropertyRegistryCadastreBoundaryService,
    PropertyRegistryAccessService,
    PropertyRegistryClassificationAccessService,
    PropertyRegistryConfigurationService,
    PropertyExperienceBoundaryService,
    PropertyScopeService,
    CitizenPropertyProjectionService,
    OfficialPropertyProjectionService,
    DepartmentPropertyProjectionService,
    PropertyTransferService,
    PropertyTransferIntakeService,
    PropertyTransferPaymentService,
    PropertyTitleRegistrationService,
    PropertySurveyService,
    PropertyEncumbranceService,
    CadastrePropertyEncumbranceService,
    PropertyRegistryCorrectionService,
    PropertyRegistryReadService,
    PropertyRegistryVerificationService,
    PropertyRegistryAuditService,
    PropertyCertificateService,
    PropertyRegistryOfficialWorkspaceService,
    PublicPropertyRegistryVerificationService,
  ],
})
export class PropertyRegistryModule {}
