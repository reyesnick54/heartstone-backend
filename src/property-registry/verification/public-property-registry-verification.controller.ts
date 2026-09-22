import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../security/decorators/public.decorator';
import { PublicPropertyRegistryVerificationService } from './public-property-registry-verification.service';

@ApiTags('public-property-registry')
@Controller('public/property-registry')
export class PublicPropertyRegistryVerificationController {
  constructor(private readonly verificationService: PublicPropertyRegistryVerificationService) {}

  @Public()
  @Get('verify/:reference')
  @ApiOperation({ summary: 'Controlled public property registry lookup when enabled by jurisdiction' })
  @ApiOkResponse({ description: 'Minimal public verification facts' })
  verify(@Param('reference') reference: string) {
    return this.verificationService.verify(reference);
  }
}
