import { Module } from '@nestjs/common';

import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { SessionsModule } from '../../identity/sessions/sessions.module';
import { SchedulingModule } from '../../scheduling/scheduling.module';
import { CitizenAccessService } from '../common/citizen-access.service';
import { BusinessAppointmentsController } from './business-appointments.controller';
import { BusinessAppointmentsService } from './services/business-appointments.service';

@Module({
  imports: [SessionsModule, SchedulingModule],
  controllers: [BusinessAppointmentsController],
  providers: [SessionAuthGuard, CitizenAccessService, BusinessAppointmentsService],
})
export class BusinessExperienceModule {}
