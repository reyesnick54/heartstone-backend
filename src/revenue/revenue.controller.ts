import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthorityActionType, IdentityType, TaxAccessActorKind } from '@prisma/client';

import { ConsequentialAction } from '../authority/consequential-action/consequential-action.decorator';
import { ConsequentialActionGuard } from '../authority/consequential-action/consequential-action.guard';
import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { ControllerRouteAccess } from '../security/decorators/controller-route-access.decorator';
import { RouteClass } from '../security/route-class.enum';
import { TaxpayerAccountService } from './accounts/taxpayer-account.service';
import { TaxAssessmentService } from './assessments/tax-assessment.service';
import { TaxClearanceService } from './clearance/tax-clearance.service';
import { TaxRefundService } from './refunds/tax-refund.service';
import { TaxReturnService } from './returns/tax-return.service';
import { REVENUE_AUTHORITY_FUNCTION_CODES } from './revenue.constants';

@ApiTags('revenue')
@ControllerRouteAccess({
  routeClass: RouteClass.AUTHENTICATED_INSTITUTIONAL,
  authenticationRequired: true,
  scopeRequirement: "Government service domain actor scope with institutional boundaries",
  authorityRequirement: "ConsequentialActionGuard for final government outcomes",
  actorSource: "Session identity with domain access resolution",
  primarySecurityInvariant: "Application and submission endpoints do not confer official outcomes",
})
@Controller('revenue')
@UseGuards(SessionAuthGuard, ConsequentialActionGuard)
@ApiBearerAuth()
export class RevenueController {
  constructor(
    private readonly taxpayerAccounts: TaxpayerAccountService,
    private readonly taxReturns: TaxReturnService,
    private readonly taxRefunds: TaxRefundService,
    private readonly taxClearance: TaxClearanceService,
    private readonly taxAssessments: TaxAssessmentService,
  ) {}

  @Get('taxpayer-accounts/:id')
  @ApiOperation({ summary: 'Fetch taxpayer account with strict access isolation' })
  async getTaxpayerAccount(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.taxpayerAccounts.getAccountForAccessor(
      session.identityId,
      id,
      TaxAccessActorKind.TAXPAYER,
    );
  }

  @Post('tax-returns/:id/versions')
  @ApiOperation({ summary: 'Submit or amend a tax return version (immutable once filed)' })
  async submitReturnVersion(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { declarationData: Record<string, unknown>; isAmendment?: boolean },
  ) {
    return this.taxReturns.submitVersion({
      taxReturnId: id,
      declarationData: body.declarationData,
      submittedByIdentityId: session.identityId,
      isAmendment: body.isAmendment,
    });
  }

  @Post('tax-refund-claims')
  @ApiOperation({ summary: 'Request a tax refund (does not disburse funds)' })
  async requestRefund(
    @CurrentSession() session: SessionContextDto,
    @Body()
    body: {
      taxpayerAccountId: string;
      requestedAmountCents: number;
      currency?: string;
    },
  ) {
    return this.taxRefunds.requestRefund({
      taxpayerAccountId: body.taxpayerAccountId,
      requestedByIdentityId: session.identityId,
      requestedAmountCents: body.requestedAmountCents,
      currency: body.currency,
    });
  }

  @Post('tax-clearance-requests')
  @ApiOperation({ summary: 'Request a tax clearance certificate' })
  async requestClearance(
    @CurrentSession() session: SessionContextDto,
    @Body() body: { taxpayerAccountId: string },
  ) {
    return this.taxClearance.requestClearance({
      taxpayerAccountId: body.taxpayerAccountId,
      requestedByIdentityId: session.identityId,
    });
  }

  @Post('tax-assessments/issue')
  @ConsequentialAction({
    action: AuthorityActionType.ISSUE,
    functionCode: REVENUE_AUTHORITY_FUNCTION_CODES.TAX_ASSESSMENT_ISSUE,
  })
  @ApiOperation({ summary: 'Issue an authoritative tax assessment (consequential)' })
  async issueTaxAssessment(
    @Body()
    body: Omit<
      Parameters<TaxAssessmentService['issueAssessment']>[0],
      'actorIdentityType'
    >,
  ) {
    return this.taxAssessments.issueAssessment({
      ...body,
      actorIdentityType: IdentityType.INDIVIDUAL,
    });
  }
}
