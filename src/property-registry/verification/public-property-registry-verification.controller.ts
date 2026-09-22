import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../security/decorators/public.decorator';
import { PropertyRegistryVerificationService } from './property-registry-verification.service';

@ApiTags('public-property-registry')
@Public()
@Controller('public/property-registry')
export class PublicPropertyRegistryVerificationController {
  constructor(private readonly verificationService: PropertyRegistryVerificationService) {}

  @Get('verify/:publicVerificationCode')
  @ApiOperation({
    summary: 'Publicly verify property registry entry metadata by opaque verification code',
  })
  @ApiOkResponse({ description: 'Minimal permitted registry verification fields only' })
  verifyByCode(@Param('publicVerificationCode') publicVerificationCode: string) {
    return this.verificationService.verifyPublic(publicVerificationCode);
  }
}
