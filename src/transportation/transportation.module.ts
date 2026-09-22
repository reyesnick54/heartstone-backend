import { Module } from '@nestjs/common';

import { AuthorityModule } from '../authority/authority.module';
import { DatabaseModule } from '../database/database.module';
import { TransportationAccessService } from './access/transportation-access.service';
import { DriverLicenseApplicationProfileService } from './applications/driver-license-application-profile.service';
import { TransportationExperienceBoundaryService } from './boundary/transportation-experience-boundary.service';
import { TransportationBoundaryService } from './common/transportation-boundary.service';
import { PublicVehicleVerificationController } from './experience/public-vehicle-verification.controller';
import { FleetAccessService } from './fleet/fleet-access.service';
import { VehicleInspectionLinkService } from './inspections/vehicle-inspection-link.service';
import { DriverLicenseRecordService } from './licensing/driver-license-record.service';
import { DriverMedicalReferenceService } from './medical/driver-medical-reference.service';
import { VehicleOwnershipService } from './ownership/vehicle-ownership.service';
import { DriverProfileService } from './profiles/driver-profile.service';
import { TransportationStatusService } from './status/transportation-status.service';
import { DriverTestRecordService } from './tests/driver-test-record.service';
import { TransportationController } from './transportation.controller';
import { PublicVehicleVerificationService } from './verification/public-vehicle-verification.service';

@Module({
  imports: [DatabaseModule, AuthorityModule],
  controllers: [TransportationController, PublicVehicleVerificationController],
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
    TransportationStatusService,
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
    TransportationStatusService,
  ],
})
export class TransportationModule {}
