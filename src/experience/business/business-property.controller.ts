import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { BusinessPropertyProjectionService } from '../../property-registry/experience/services/business-property-projection.service';

@ApiTags('business-experience')
@Controller('experience/business/organizations/:organizationId/property')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class BusinessPropertyController {
  constructor(private readonly propertyService: BusinessPropertyProjectionService) {}

  @Get()
  @ApiOperation({ summary: 'Business property registry home for authorized organization interests' })
  getHome(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.propertyService.getHome(session.identityId, organizationId);
  }

  @Get('interests')
  listInterests(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.propertyService.listInterests(session.identityId, organizationId);
  }

  @Get('transactions')
  listTransactions(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.propertyService.listTransactions(session.identityId, organizationId);
  }

  @Get('actions')
  listActions(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.propertyService.listActions(session.identityId, organizationId);
  }
}
