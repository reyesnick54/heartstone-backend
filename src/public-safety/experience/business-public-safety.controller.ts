import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { BusinessPublicSafetyProjectionService } from './services/business-public-safety-projection.service';

@ApiTags('business-public-safety-experience')
@Controller('experience/business/organizations/:organizationId/public-safety')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class BusinessPublicSafetyController {
  constructor(private readonly projections: BusinessPublicSafetyProjectionService) {}

  @Get()
  getHome(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.projections.buildHome(session.identityId, organizationId);
  }

  @Get('records')
  listRecords(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.projections.listScopedRecords(session.identityId, organizationId);
  }
}
