import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../security/decorators/public.decorator';
import { CUSTOMS_TRADE_API_TAG } from '../customs-trade.constants';
import {
  type PublicCustomsTradeVerificationResponse,
  PublicCustomsTradeVerificationService,
} from './public-customs-trade-verification.service';

@ApiTags(CUSTOMS_TRADE_API_TAG)
@Public()
@Controller('public/customs-trade')
export class PublicCustomsTradeVerificationController {
  constructor(private readonly verificationService: PublicCustomsTradeVerificationService) {}

  @Get('verify/:reference')
  @ApiOperation({
    summary: 'Public customs trade profile verification (non-confidential facts only)',
  })
  @ApiOkResponse({ description: 'Policy-permitted customs trade facts only' })
  verify(@Param('reference') reference: string): Promise<PublicCustomsTradeVerificationResponse> {
    return this.verificationService.verify(reference);
  }
}
