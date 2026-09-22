import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { BusinessTradeService } from './services/business-trade.service';

@ApiTags('business-experience')
@Controller('experience/business/organizations/:organizationId/trade')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class BusinessTradeController {
  constructor(private readonly tradeService: BusinessTradeService) {}

  @Get()
  getHome(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.tradeService.getHome(session.identityId, organizationId);
  }

  @Get('shipments')
  listShipments(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.tradeService.listShipments(session.identityId, organizationId, query);
  }

  @Get('declarations')
  listDeclarations(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.tradeService.listDeclarations(session.identityId, organizationId);
  }

  @Get('permits')
  listPermits(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.tradeService.listPermits(session.identityId, organizationId);
  }

  @Get('assessments')
  listAssessments(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.tradeService.listAssessments(session.identityId, organizationId);
  }

  @Get('holds')
  listHolds(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.tradeService.listHolds(session.identityId, organizationId);
  }

  @Get('actions')
  listActions(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.tradeService.listActions(session.identityId, organizationId);
  }
}
