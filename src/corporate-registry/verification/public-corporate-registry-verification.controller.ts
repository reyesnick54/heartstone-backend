import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../security/decorators/public.decorator';
import { CORPORATE_REGISTRY_API_TAG } from '../corporate-registry.constants';
import {
  type PublicCorporateRegistryVerificationResponse,
  PublicCorporateRegistryVerificationService,
} from './public-corporate-registry-verification.service';

@ApiTags(CORPORATE_REGISTRY_API_TAG)
@Public()
@Controller('public/corporate-registry')
export class PublicCorporateRegistryVerificationController {
  constructor(private readonly verificationService: PublicCorporateRegistryVerificationService) {}

  @Get('verify/:reference')
  @ApiOperation({
    summary: 'Publicly verify a corporate registry record by opaque reference',
  })
  @ApiOkResponse({ description: 'Policy-permitted corporate registry facts only' })
  verify(
    @Param('reference') reference: string,
  ): Promise<PublicCorporateRegistryVerificationResponse> {
    return this.verificationService.verify(reference);
  }
}
