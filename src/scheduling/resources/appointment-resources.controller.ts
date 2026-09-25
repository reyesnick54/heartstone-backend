import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import { SCHEDULING_API_TAG } from '../scheduling.constants';
import { AppointmentResourcesService } from './appointment-resources.service';

class CreateAppointmentResourceDto {
  @IsString()
  name!: string;

  @IsString()
  resourceType!: string;

  @IsOptional()
  @IsUUID()
  officeholderId?: string;

  @IsOptional()
  @IsUUID()
  identityId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;
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
@Controller('scheduling/resources')
@UseGuards(SessionAuthGuard)
export class AppointmentResourcesController {
  constructor(private readonly resources: AppointmentResourcesService) {}

  @Post()
  @ApiOperation({ summary: 'Create an appointment resource' })
  create(@Body() dto: CreateAppointmentResourceDto) {
    return this.resources.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List appointment resources' })
  list(@Query('departmentId') departmentId?: string) {
    return this.resources.list({ departmentId });
  }
}
