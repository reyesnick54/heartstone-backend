import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { PaginationQueryDto } from '../../experience/common/dto/pagination-query.dto';
import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import {
  CitizenRevenueActionsResponseDto,
  CitizenRevenueHomeResponseDto,
  CitizenTaxAccountsResponseDto,
  CitizenTaxObligationsResponseDto,
  CitizenTaxPaymentItemDto,
  CitizenTaxReturnsResponseDto,
  TaxAssessmentRecordDto,
} from './dto/citizen-revenue-response.dto';
import { CitizenRevenueProjectionService } from './services/citizen-revenue-projection.service';

@ApiTags('citizen-revenue-experience')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: 'Government service domain actor scope with institutional boundaries',
  authorityRequirement: 'ConsequentialActionGuard for final government outcomes',
  actorSource: 'Session identity with domain access resolution',
  primarySecurityInvariant: 'Application and submission endpoints do not confer official outcomes',
})
@Controller('experience/citizen/revenue')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CitizenRevenueController {
  constructor(private readonly projections: CitizenRevenueProjectionService) {}

  @Get()
  @ApiOperation({ summary: 'Citizen revenue home derived from authoritative taxpayer state' })
  @ApiOkResponse({ type: CitizenRevenueHomeResponseDto })
  getHome(@CurrentSession() session: SessionContextDto) {
    return this.projections.getHome(session.identityId);
  }

  @Get('accounts')
  @ApiOperation({ summary: 'List taxpayer accounts held by the authenticated citizen' })
  @ApiOkResponse({ type: CitizenTaxAccountsResponseDto })
  listAccounts(@CurrentSession() session: SessionContextDto) {
    return this.projections.listAccounts(session.identityId);
  }

  @Get('obligations')
  @ApiOperation({ summary: 'List tax obligations and outstanding balance for the citizen' })
  @ApiOkResponse({ type: CitizenTaxObligationsResponseDto })
  listObligations(@CurrentSession() session: SessionContextDto) {
    return this.projections.listObligations(session.identityId);
  }

  @Get('returns')
  @ApiOperation({ summary: 'List tax returns for the citizen (paginated)' })
  @ApiOkResponse({ type: CitizenTaxReturnsResponseDto })
  listReturns(@CurrentSession() session: SessionContextDto, @Query() query: PaginationQueryDto) {
    return this.projections.listReturns(session.identityId, query);
  }

  @Get('assessments')
  @ApiOperation({ summary: 'List tax assessments for the citizen' })
  @ApiOkResponse({ type: TaxAssessmentRecordDto, isArray: true })
  listAssessments(@CurrentSession() session: SessionContextDto) {
    return this.projections.listAssessments(session.identityId);
  }

  @Get('payments')
  @ApiOperation({ summary: 'List tax payment allocations for the citizen' })
  @ApiOkResponse({ type: CitizenTaxPaymentItemDto, isArray: true })
  listPayments(@CurrentSession() session: SessionContextDto) {
    return this.projections.listPayments(session.identityId);
  }

  @Get('actions')
  @ApiOperation({ summary: 'List revenue actions derived from authoritative taxpayer state' })
  @ApiOkResponse({
    type: CitizenRevenueActionsResponseDto,
    description: 'Action center derived from authoritative revenue state',
  })
  listActions(@CurrentSession() session: SessionContextDto) {
    return this.projections.listActions(session.identityId);
  }
}
