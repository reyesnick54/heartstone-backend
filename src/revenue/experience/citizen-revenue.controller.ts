import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PaginationQueryDto } from '../../experience/common/dto/pagination-query.dto';
import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { CitizenRevenueProjectionService } from './services/citizen-revenue-projection.service';

@ApiTags('citizen-revenue-experience')
@Controller('experience/citizen/revenue')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CitizenRevenueController {
  constructor(private readonly projections: CitizenRevenueProjectionService) {}

  @Get()
  @ApiOperation({ summary: 'Citizen revenue home derived from authoritative taxpayer state' })
  getHome(@CurrentSession() session: SessionContextDto) {
    return this.projections.getHome(session.identityId);
  }

  @Get('accounts')
  listAccounts(@CurrentSession() session: SessionContextDto) {
    return this.projections.listAccounts(session.identityId);
  }

  @Get('obligations')
  listObligations(@CurrentSession() session: SessionContextDto) {
    return this.projections.listObligations(session.identityId);
  }

  @Get('returns')
  listReturns(@CurrentSession() session: SessionContextDto, @Query() query: PaginationQueryDto) {
    return this.projections.listReturns(session.identityId, query);
  }

  @Get('assessments')
  listAssessments(@CurrentSession() session: SessionContextDto) {
    return this.projections.listAssessments(session.identityId);
  }

  @Get('payments')
  listPayments(@CurrentSession() session: SessionContextDto) {
    return this.projections.listPayments(session.identityId);
  }

  @Get('actions')
  @ApiOkResponse({ description: 'Action center derived from authoritative revenue state' })
  listActions(@CurrentSession() session: SessionContextDto) {
    return this.projections.listActions(session.identityId);
  }
}
