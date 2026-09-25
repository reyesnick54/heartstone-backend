import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CustomsDeclarationType } from '@prisma/client';

import { CustomsDeclarationService } from './declarations/customs-declaration.service';

@ApiTags('customs-trade')
@Controller('customs-trade')
export class CustomsTradeController {
  constructor(private readonly declarationService: CustomsDeclarationService) {}

  @Post('declarations')
  @ApiOkResponse({ description: 'Customs declaration submitted (does not release cargo)' })
  submitDeclaration(
    @Body()
    body: {
      traderAccountId: string;
      declarationType: CustomsDeclarationType;
      shipmentReferenceId?: string;
      submissionPayload?: Record<string, unknown>;
    },
  ) {
    return this.declarationService.submitDeclaration(body);
  }

  @Post('declarations/:id/amendments')
  @ApiOkResponse({ description: 'Amendment creates a new locked version; prior version preserved' })
  amendDeclaration(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { submissionPayload?: Record<string, unknown> },
  ) {
    return this.declarationService.amendDeclaration({
      customsDeclarationId: id,
      submissionPayload: body.submissionPayload,
    });
  }
}
