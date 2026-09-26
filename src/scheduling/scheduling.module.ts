import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { CitizenAccessService } from '../experience/common/citizen-access.service';
import { SessionAuthGuardModule } from '../identity/auth/session-auth-guard.module';
import { OperationalSupportModule } from '../operational-support/operational-support.module';
import { ProductionReadinessModule } from '../production-readiness/production-readiness.module';
import { ServiceAppointmentAccessService } from './access/service-appointment-access.service';
import { ServiceAppointmentAuditService } from './audit/service-appointment-audit.service';
import { SchedulingBoundaryService } from './common/scheduling-boundary.service';
import { AppointmentLocationsController } from './locations/appointment-locations.controller';
import { AppointmentLocationsService } from './locations/appointment-locations.service';
import { AppointmentReasonsController } from './reasons/appointment-reasons.controller';
import { AppointmentReasonsService } from './reasons/appointment-reasons.service';
import { AppointmentReminderService } from './reminders/appointment-reminder.service';
import { AppointmentResourcesController } from './resources/appointment-resources.controller';
import { AppointmentResourcesService } from './resources/appointment-resources.service';
import { ServiceAppointmentsController } from './service-appointments/service-appointments.controller';
import { ServiceAppointmentsService } from './service-appointments/service-appointments.service';
import { AppointmentSlotsController } from './slots/appointment-slots.controller';
import { AppointmentSlotsService } from './slots/appointment-slots.service';

@Module({
  imports: [
    DatabaseModule,
    SessionAuthGuardModule,
    OperationalSupportModule,
    ProductionReadinessModule,
  ],
  controllers: [
    ServiceAppointmentsController,
    AppointmentSlotsController,
    AppointmentLocationsController,
    AppointmentResourcesController,
    AppointmentReasonsController,
  ],
  providers: [
    CitizenAccessService,
    SchedulingBoundaryService,
    ServiceAppointmentAuditService,
    ServiceAppointmentAccessService,
    AppointmentReminderService,
    ServiceAppointmentsService,
    AppointmentSlotsService,
    AppointmentLocationsService,
    AppointmentResourcesService,
    AppointmentReasonsService,
  ],
  exports: [
    ServiceAppointmentsService,
    ServiceAppointmentAccessService,
    ServiceAppointmentAuditService,
    SchedulingBoundaryService,
    AppointmentReminderService,
  ],
})
export class SchedulingModule {}
