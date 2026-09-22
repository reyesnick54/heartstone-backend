import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { PropertyRegistryAuditService } from './audit/property-registry-audit.service';
import { PropertyRegistryClassificationAccessService } from './common/property-registry-access.service';
import { PropertyRegistryBoundaryService } from './common/property-registry-boundary.service';
import { PropertyRegistryCorrectionService } from './corrections/property-registry-correction.service';
import { PropertyEncumbranceService } from './encumbrances/property-encumbrance.service';
import { PropertyTransferIntakeService } from './intake/property-transfer-intake.service';
import { PropertyRegistryController } from './property-registry.controller';
import { PropertyRegistryReadService } from './queries/property-registry-read.service';
import { PropertyTitleRegistrationService } from './registration/property-title-registration.service';
import { PropertyTransferPaymentService } from './transfers/property-transfer-payment.service';
import { PropertyRegistryVerificationService } from './verification/property-registry-verification.service';
import { PublicPropertyRegistryVerificationController } from './verification/public-property-registry-verification.controller';

@Module({
  imports: [DatabaseModule, SessionsModule, AuthorityModule],
  controllers: [PropertyRegistryController, PublicPropertyRegistryVerificationController],
  providers: [
    PropertyRegistryBoundaryService,
    PropertyRegistryClassificationAccessService,
    PropertyRegistryAuditService,
    PropertyTransferIntakeService,
    PropertyTransferPaymentService,
    PropertyTitleRegistrationService,
    PropertyEncumbranceService,
    PropertyRegistryCorrectionService,
    PropertyRegistryReadService,
    PropertyRegistryVerificationService,
  ],
  exports: [
    PropertyRegistryBoundaryService,
    PropertyRegistryClassificationAccessService,
    PropertyRegistryAuditService,
    PropertyTransferIntakeService,
    PropertyTransferPaymentService,
    PropertyTitleRegistrationService,
    PropertyEncumbranceService,
    PropertyRegistryCorrectionService,
    PropertyRegistryReadService,
    PropertyRegistryVerificationService,
  ],
})
export class PropertyRegistryModule {}
