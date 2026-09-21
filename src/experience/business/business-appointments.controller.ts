import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { CitizenAppointmentsResponseDto } from '../citizen/dto/citizen-appointment.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { BusinessAppointmentsService } from './services/business-appointments.service';

@ApiTags('business-experience')
@Controller('experience/business')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class BusinessAppointmentsController {
  constructor(private readonly appointments: BusinessAppointmentsService) {}

  @Get('organizations/:organizationId/appointments')
  @ApiOperation({
    summary: 'List service appointments for an organization within representative scope',
  })
  @ApiOkResponse({ type: CitizenAppointmentsResponseDto })
  listOrganizationAppointments(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: PaginationQueryDto,
  ): Promise<CitizenAppointmentsResponseDto> {
    return this.appointments.listOrganizationAppointments(
      session.identityId,
      organizationId,
      query,
    );
  }
}
