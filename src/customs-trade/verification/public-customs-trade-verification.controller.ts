import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../security/decorators/public.decorator';
import {
  type PublicCustomsTradeVerificationResponse,
  PublicCustomsTradeVerificationService,
} from './public-customs-trade-verification.service';

@ApiTags('customs-trade')
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
