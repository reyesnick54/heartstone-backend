import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../../security/route-class.enum';
import {
  BenefitAwardRecordDto,
  BenefitDisbursementReferenceRecordDto,
  CitizenBenefitApplicationItemDto,
  CitizenBenefitProgramItemDto,
  CitizenBenefitsActionsResponseDto,
  CitizenBenefitsHomeResponseDto,
} from './dto/citizen-benefits-response.dto';
import { CitizenBenefitsProjectionService } from './services/citizen-benefits-projection.service';

@ApiTags('citizen-benefits-experience')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: 'Government service domain actor scope with institutional boundaries',
  authorityRequirement: 'ConsequentialActionGuard for final government outcomes',
  actorSource: 'Session identity with domain access resolution',
  primarySecurityInvariant: 'Application and submission endpoints do not confer official outcomes',
})
@Controller('experience/citizen/benefits')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CitizenBenefitsController {
  constructor(private readonly projections: CitizenBenefitsProjectionService) {}

  @Get()
  @ApiOperation({
    summary: 'Get the citizen benefits home summary for the authenticated applicant',
  })
  @ApiOkResponse({ type: CitizenBenefitsHomeResponseDto })
  getHome(@CurrentSession() session: SessionContextDto) {
    return this.projections.getHome(session.identityId);
  }

  @Get('programs')
  @ApiOperation({
    summary: 'List benefit programs available for preliminary (non-authoritative) matching',
  })
  @ApiOkResponse({ type: CitizenBenefitProgramItemDto, isArray: true })
  listPrograms(@CurrentSession() session: SessionContextDto) {
    return this.projections.listPrograms(session.identityId);
  }

  @Get('applications')
  @ApiOperation({ summary: 'List benefit applications linked to the authenticated applicant' })
  @ApiOkResponse({ type: CitizenBenefitApplicationItemDto, isArray: true })
  listApplications(@CurrentSession() session: SessionContextDto) {
    return this.projections.listApplications(session.identityId);
  }

  @Get('awards')
  @ApiOperation({ summary: 'List benefit awards recorded for the authenticated applicant' })
  @ApiOkResponse({ type: BenefitAwardRecordDto, isArray: true })
  listAwards(@CurrentSession() session: SessionContextDto) {
    return this.projections.listAwards(session.identityId);
  }

  @Get('payments')
  @ApiOperation({ summary: 'List benefit disbursement references for the authenticated applicant' })
  @ApiOkResponse({ type: BenefitDisbursementReferenceRecordDto, isArray: true })
  listPayments(@CurrentSession() session: SessionContextDto) {
    return this.projections.listPayments(session.identityId);
  }

  @Get('actions')
  @ApiOperation({ summary: 'List self-service benefit actions available to the applicant' })
  @ApiOkResponse({ type: CitizenBenefitsActionsResponseDto })
  listActions(@CurrentSession() session: SessionContextDto) {
    return this.projections.listActions(session.identityId);
  }
}
