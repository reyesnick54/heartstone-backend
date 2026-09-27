import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppointmentLocationKind } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { SCHEDULING_API_TAG } from '../scheduling.constants';
import { AppointmentLocationsService } from './appointment-locations.service';

class CreateAppointmentLocationDto {
  @IsString()
  name!: string;

  @IsEnum(AppointmentLocationKind)
  kind!: AppointmentLocationKind;

  @IsOptional()
  @IsUUID()
  institutionId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  virtualMeetingUrl?: string;
}

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
@Controller('scheduling/locations')
@UseGuards(SessionAuthGuard)
export class AppointmentLocationsController {
  constructor(private readonly locations: AppointmentLocationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an appointment location' })
  create(@Body() dto: CreateAppointmentLocationDto) {
    return this.locations.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List appointment locations' })
  list(
    @Query('institutionId') institutionId?: string,
    @Query('departmentId') departmentId?: string,
  ) {
    return this.locations.list({ institutionId, departmentId });
  }
}
