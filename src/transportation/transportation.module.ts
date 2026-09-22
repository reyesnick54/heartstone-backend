import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { OfficialModule } from '../experience/official/official.module';
import { SessionsModule } from '../identity/sessions/sessions.module';
import { TransportationAccessService } from './access/transportation-access.service';
import { DriverLicenseApplicationProfileService } from './applications/driver-license-application-profile.service';
import { TransportationExperienceBoundaryService } from './boundary/transportation-experience-boundary.service';
import { TransportationBoundaryService } from './common/transportation-boundary.service';
import { CitizenTransportationController } from './experience/citizen-transportation.controller';
import { OfficialTransportationController } from './experience/official-transportation.controller';
import { PublicVehicleVerificationController } from './experience/public-vehicle-verification.controller';
import { CitizenTransportationProjectionService } from './experience/services/citizen-transportation-projection.service';
import { OfficialTransportationProjectionService } from './experience/services/official-transportation-projection.service';
import { TransportationAvailableActionsService } from './experience/services/transportation-available-actions.service';
import { TransportationScopeService } from './experience/services/transportation-scope.service';
import { FleetAccessService } from './fleet/fleet-access.service';
import { VehicleInspectionLinkService } from './inspections/vehicle-inspection-link.service';
import { DriverLicenseRecordService } from './licensing/driver-license-record.service';
import { DriverMedicalReferenceService } from './medical/driver-medical-reference.service';
import { VehicleOwnershipService } from './ownership/vehicle-ownership.service';
import { DriverProfileService } from './profiles/driver-profile.service';
import { TransportationStatusService } from './status/transportation-status.service';
import { DriverTestRecordService } from './tests/driver-test-record.service';
import { TransportationController } from './transportation.controller';
import { PublicTransportationVerificationController } from './verification/public-transportation-verification.controller';
import { PublicTransportationVerificationService } from './verification/public-transportation-verification.service';
import { PublicVehicleVerificationService } from './verification/public-vehicle-verification.service';

@Module({
  imports: [DatabaseModule, AuthorityModule, SessionsModule, OfficialModule],
  controllers: [
    TransportationController,
    PublicVehicleVerificationController,
    PublicTransportationVerificationController,
    CitizenTransportationController,
    OfficialTransportationController,
  ],
  providers: [
    TransportationBoundaryService,
    TransportationExperienceBoundaryService,
    TransportationAccessService,
    DriverProfileService,
    DriverLicenseApplicationProfileService,
    DriverTestRecordService,
    DriverLicenseRecordService,
    VehicleOwnershipService,
    VehicleInspectionLinkService,
    FleetAccessService,
    DriverMedicalReferenceService,
    PublicVehicleVerificationService,
    PublicTransportationVerificationService,
    TransportationStatusService,
    TransportationScopeService,
    TransportationAvailableActionsService,
    CitizenTransportationProjectionService,
    OfficialTransportationProjectionService,
  ],
  exports: [
    TransportationBoundaryService,
    TransportationExperienceBoundaryService,
    TransportationAccessService,
    DriverProfileService,
    DriverLicenseApplicationProfileService,
    DriverTestRecordService,
    DriverLicenseRecordService,
    VehicleOwnershipService,
    VehicleInspectionLinkService,
    FleetAccessService,
    DriverMedicalReferenceService,
    PublicVehicleVerificationService,
    PublicTransportationVerificationService,
    TransportationStatusService,
    TransportationScopeService,
    CitizenTransportationProjectionService,
    OfficialTransportationProjectionService,
  ],
})
export class TransportationModule {}
