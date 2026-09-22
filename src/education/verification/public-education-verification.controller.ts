import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../../security/decorators/public.decorator';
import { PublicEducationVerificationService } from './public-education-verification.service';

@ApiTags('public-education-verification')
@Controller('public/education/verify')
export class PublicEducationVerificationController {
  constructor(private readonly verification: PublicEducationVerificationService) {}

  @Public()
  @Get('accredited-institution/:token')
  @ApiOperation({ summary: 'Public verification of accredited institution (data-minimized)' })
  verifyAccreditedInstitution(@Param('token') token: string) {
    return this.verification.verifyAccreditedInstitution(token);
  }

  @Public()
  @Get('institution-license/:token')
  @ApiOperation({ summary: 'Public verification of institution license' })
  verifyInstitutionLicense(@Param('token') token: string) {
    return this.verification.verifyInstitutionLicense(token);
  }

  @Public()
  @Get('educator-license/:token')
  @ApiOperation({ summary: 'Public verification of educator license' })
  verifyEducatorLicense(@Param('token') token: string) {
    return this.verification.verifyEducatorLicense(token);
  }

  @Public()
  @Get('credential/:token')
  @ApiOperation({ summary: 'Public verification of government-recognized credential' })
  verifyCredential(@Param('token') token: string) {
    return this.verification.verifyGovernmentCredential(token);
  }
}
