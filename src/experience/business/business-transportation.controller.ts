import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { BusinessTransportationService } from './services/business-transportation.service';

@ApiTags('business-experience')
@Controller('experience/business/organizations/:organizationId')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class BusinessTransportationController {
  constructor(private readonly transportation: BusinessTransportationService) {}

  @Get('transportation')
  getHome(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.transportation.getHome(session.identityId, organizationId);
  }

  @Get('fleet')
  listFleet(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.transportation.listFleet(session.identityId, organizationId);
  }

  @Get('transport-permits')
  listPermits(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.transportation.listTransportPermits(session.identityId, organizationId);
  }

  @Get('transportation/actions')
  listActions(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.transportation.listActions(session.identityId, organizationId);
  }
}
