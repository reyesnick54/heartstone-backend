import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { SCHEDULING_API_TAG } from '../scheduling.constants';
import { CancelServiceAppointmentDto } from './dto/cancel-service-appointment.dto';
import { CompleteServiceAppointmentDto } from './dto/complete-service-appointment.dto';
import { CreateServiceAppointmentDto } from './dto/create-service-appointment.dto';
import { RescheduleServiceAppointmentDto } from './dto/reschedule-service-appointment.dto';
import { ServiceAppointmentsService } from './service-appointments.service';

@ApiTags(SCHEDULING_API_TAG)
@ApiBearerAuth()
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_SELF_SERVICE,
  authenticationRequired: true,
  scopeRequirement: "Applicant-owned case/application scope or official institutional case scope",
  authorityRequirement: "Case access guard; official routes require institutional actor context",
  actorSource: "Session identity with applicant or official case access resolution",
  primarySecurityInvariant: "Access to a case does not confer decision authority",
})
@Controller('scheduling/appointments')
@UseGuards(SessionAuthGuard)
export class ServiceAppointmentsController {
  constructor(private readonly appointments: ServiceAppointmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a government service appointment (administrative scheduling)' })
  create(@CurrentSession() session: SessionContextDto, @Body() dto: CreateServiceAppointmentDto) {
    return this.appointments.create(dto, session.identityId);
  }

  @Get()
  @ApiOperation({ summary: 'List service appointments (administrative filter)' })
  list(
    @Query('institutionId') institutionId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('governmentServiceId') governmentServiceId?: string,
  ) {
    return this.appointments.list({
      ...(institutionId ? { institutionId } : {}),
      ...(departmentId ? { departmentId } : {}),
      ...(governmentServiceId ? { governmentServiceId } : {}),
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service appointment detail' })
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.appointments.findById(id);
  }

  @Post(':id/complete')
  @ApiOperation({
    summary: 'Mark appointment completed',
    description: 'Completion does not change case approval or issue instruments.',
  })
  complete(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteServiceAppointmentDto,
  ) {
    return this.appointments.complete(id, dto, session.identityId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a service appointment (administrative)' })
  cancel(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelServiceAppointmentDto,
  ) {
    return this.appointments.cancel(id, dto, session.identityId);
  }

  @Post(':id/reschedule/approve')
  @ApiOperation({ summary: 'Approve a pending reschedule request' })
  approveReschedule(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.appointments.approveReschedule(id, session.identityId);
  }

  @Post(':id/reschedule')
  @ApiOperation({ summary: 'Record an administrative reschedule' })
  reschedule(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleServiceAppointmentDto,
  ) {
    return this.appointments.requestReschedule(id, dto, session.identityId);
  }
}
