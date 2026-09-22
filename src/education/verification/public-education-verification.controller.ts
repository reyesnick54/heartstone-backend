import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { PublicEducationVerificationService } from './public-education-verification.service';

@ApiTags('education-public-verification')
@Controller('api/v1/public/education')
export class PublicEducationVerificationController {
  constructor(private readonly verificationService: PublicEducationVerificationService) {}

  @Get('credentials/:credentialReference/verify')
  @ApiOkResponse({ description: 'Minimal public credential verification' })
  verifyCredential(@Param('credentialReference') credentialReference: string) {
    return this.verificationService.verifyCredentialPublicly(credentialReference);
  }
}
