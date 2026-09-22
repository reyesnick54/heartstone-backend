import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { BusinessRevenueService } from './services/business-revenue.service';

@ApiTags('business-experience')
@Controller('experience/business/organizations/:organizationId/revenue')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class BusinessRevenueController {
  constructor(private readonly revenueService: BusinessRevenueService) {}

  @Get()
  getHome(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.revenueService.getHome(session.identityId, organizationId);
  }

  @Get('returns')
  listReturns(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.revenueService.listReturns(session.identityId, organizationId, query);
  }

  @Get('assessments')
  listAssessments(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.revenueService.listAssessments(session.identityId, organizationId);
  }

  @Get('payments')
  listPayments(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.revenueService.listPayments(session.identityId, organizationId);
  }

  @Get('compliance')
  listCompliance(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.revenueService.listCompliance(session.identityId, organizationId);
  }

  @Get('actions')
  listActions(
    @CurrentSession() session: SessionContextDto,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ) {
    return this.revenueService.listActions(session.identityId, organizationId);
  }
}
