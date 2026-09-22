import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../identity/auth/guards/session-auth.guard';
import { CUSTOMS_TRADE_API_TAG } from './customs-trade.constants';
import { CustomsDeclarationService } from './declarations/customs-declaration.service';
import { CustomsAssessmentPaymentService } from './payments/customs-assessment-payment.service';
import { CustomsReleaseService } from './release/customs-release.service';

@ApiTags(CUSTOMS_TRADE_API_TAG)
@Controller('customs-trade')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CustomsTradeController {
  constructor(
    private readonly declarations: CustomsDeclarationService,
    private readonly payments: CustomsAssessmentPaymentService,
    private readonly release: CustomsReleaseService,
  ) {}

  @Post('declarations/:id/versions')
  @ApiOperation({ summary: 'Submit or amend a customs declaration (does not release cargo)' })
  submitDeclaration(
    @CurrentSession() session: SessionContextDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      declarationData: Record<string, unknown>;
      isAmendment?: boolean;
    },
  ) {
    if (body.isAmendment) {
      return this.declarations.amendDeclaration({
        customsDeclarationId: id,
        declarationData: body.declarationData,
        submittedByIdentityId: session.identityId,
      });
    }

    return this.declarations.submitInitialVersion({
      customsDeclarationId: id,
      declarationData: body.declarationData,
      submittedByIdentityId: session.identityId,
    });
  }

  @Post('assessments/:id/payments')
  @ApiOperation({ summary: 'Record customs assessment payment (does not release cargo)' })
  recordPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      allocatedAmountCents: number;
      paymentReference: string;
    },
  ) {
    return this.payments.recordPayment({
      customsAssessmentId: id,
      allocatedAmountCents: body.allocatedAmountCents,
      paymentReference: body.paymentReference,
    });
  }

  @Get('shipments/:shipmentId/release/actions')
  @ApiOperation({
    summary:
      'Official release actions (eligibility evaluated server-side; re-evaluated on execute)',
  })
  releaseActions(
    @Param('shipmentId', ParseUUIDPipe) shipmentId: string,
    @Query('officeholderId') officeholderId?: string,
  ) {
    return this.release.getAvailableOfficialActions(shipmentId, officeholderId);
  }

  @Post('shipments/:shipmentId/release/execute')
  @ApiOperation({ summary: 'Execute cargo release after authoritative re-evaluation' })
  executeRelease(
    @Param('shipmentId', ParseUUIDPipe) shipmentId: string,
    @Body() body: { officeholderId: string },
  ) {
    return this.release.executeCargoRelease({
      shipmentId,
      officeholderId: body.officeholderId,
    });
  }
}
