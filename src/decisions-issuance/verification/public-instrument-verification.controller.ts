import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  InstrumentVerificationService,
  PublicInstrumentVerificationResponse,
} from './instrument-verification.service';

@ApiTags('public-instruments')
@Controller('public/instruments')
export class PublicInstrumentVerificationController {
  constructor(private readonly verificationService: InstrumentVerificationService) {}

  @Get('verify/:verificationCode')
  @ApiOperation({
    summary: 'Publicly verify an issued instrument by opaque verification code',
  })
  @ApiOkResponse({ description: 'Approved non-sensitive verification fields only' })
  verify(
    @Param('verificationCode') verificationCode: string,
  ): Promise<PublicInstrumentVerificationResponse> {
    return this.verificationService.verifyPublic(verificationCode);
  }
}
