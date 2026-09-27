import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { SCHEDULING_API_TAG } from '../scheduling.constants';
import { AppointmentReasonsService } from './appointment-reasons.service';

class CreateAppointmentReasonDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  institutionId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  governmentServiceId?: string;
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
@Controller('scheduling/reasons')
@UseGuards(SessionAuthGuard)
export class AppointmentReasonsController {
  constructor(private readonly reasons: AppointmentReasonsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an appointment reason' })
  create(@Body() dto: CreateAppointmentReasonDto) {
    return this.reasons.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List appointment reasons' })
  list(
    @Query('institutionId') institutionId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('governmentServiceId') governmentServiceId?: string,
  ) {
    return this.reasons.list({ institutionId, departmentId, governmentServiceId });
  }
}
