import { Controller, Get, Param } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { PublicVehicleVerificationService } from '../verification/public-vehicle-verification.service';

@ApiTags('transportation-public')
@Controller('api/v1/transportation/public')
export class PublicVehicleVerificationController {
  constructor(private readonly verificationService: PublicVehicleVerificationService) {}

  @Get('vehicles/verify/:publicVerificationToken')
  @ApiOkResponse({ description: 'Data-minimized public vehicle verification' })
  verifyVehicle(@Param('publicVerificationToken') publicVerificationToken: string) {
    return this.verificationService.verifyByPublicToken(publicVerificationToken);
  }
}
