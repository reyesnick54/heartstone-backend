import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../security/decorators/public.decorator';
import {
  type PublicLicenseVerificationResponse,
  type PublicOperatorVerificationResponse,
  PublicTransportationVerificationService,
} from './public-transportation-verification.service';

@ApiTags('public-transportation-verification')
@Public()
@Controller('public/transportation')
export class PublicTransportationVerificationController {
  constructor(private readonly verification: PublicTransportationVerificationService) {}

  @Get('verify/license/:reference')
  @ApiOperation({ summary: 'Public driver license status verification (minimal facts)' })
  @ApiOkResponse({ description: 'Policy-permitted license status only' })
  verifyLicense(@Param('reference') reference: string): Promise<PublicLicenseVerificationResponse> {
    return this.verification.verifyLicenseReference(reference);
  }

  @Get('verify/vehicle/:reference')
  @ApiOperation({ summary: 'Public vehicle registration status verification' })
  verifyVehicle(@Param('reference') reference: string): Promise<Record<string, unknown>> {
    return this.verification.verifyVehicleRegistration(reference);
  }

  @Get('verify/operator/:reference')
  @ApiOperation({ summary: 'Public commercial transport operator permit status verification' })
  verifyOperator(
    @Param('reference') reference: string,
  ): Promise<PublicOperatorVerificationResponse> {
    return this.verification.verifyTransportOperator(reference);
  }
}
