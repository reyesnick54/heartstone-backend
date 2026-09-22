import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../security/decorators/public.decorator';
import { CivilRegistryVerificationService } from './civil-registry-verification.service';

@ApiTags('public-civil-registry')
@Public()
@Controller('public/civil-registry')
export class PublicCivilRegistryVerificationController {
  constructor(private readonly verificationService: CivilRegistryVerificationService) {}

  @Get('verify/:verificationCode')
  @ApiOperation({
    summary: 'Publicly verify an issued civil certificate by opaque verification code',
  })
  @ApiOkResponse({ description: 'Minimal non-sensitive verification fields only' })
  verifyByCode(@Param('verificationCode') verificationCode: string) {
    return this.verificationService.verifyPublic(verificationCode);
  }

  @Get('verify-reference/:verificationReference')
  @ApiOperation({
    summary: 'Publicly verify an issued civil certificate by verification reference',
  })
  verifyByReference(@Param('verificationReference') verificationReference: string) {
    return this.verificationService.verifyByReference(verificationReference);
  }
}
