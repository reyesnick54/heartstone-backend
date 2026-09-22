import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { BusinessWorkforceService } from './services/business-workforce.service';

@ApiTags('business-experience')
@Controller('experience/business/organizations/:organizationId/workforce')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class BusinessWorkforceController {
  constructor(private readonly workforce: BusinessWorkforceService) {}

  @Get()
  getHome(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.workforce.getHome(session.identityId, organizationId);
  }

  @Get('employees')
  listEmployees(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.workforce.listEmployees(session.identityId, organizationId);
  }

  @Get('work-permits')
  listWorkPermits(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.workforce.listWorkPermits(session.identityId, organizationId);
  }

  @Get('declarations')
  listDeclarations(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.workforce.listDeclarations(session.identityId, organizationId);
  }

  @Get('compliance')
  listCompliance(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.workforce.listCompliance(session.identityId, organizationId);
  }

  @Get('actions')
  listActions(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.workforce.listActions(session.identityId, organizationId);
  }
}
