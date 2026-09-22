import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentSession } from '../../identity/auth/decorators/current-session.decorator';
import { SessionContextDto } from '../../identity/auth/dto/session-context.dto';
import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { CitizenTransportationProjectionService } from './services/citizen-transportation-projection.service';

@ApiTags('citizen-transportation-experience')
@Controller('experience/citizen')
@UseGuards(SessionAuthGuard)
@ApiBearerAuth()
export class CitizenTransportationController {
  constructor(private readonly projections: CitizenTransportationProjectionService) {}

  @Get('transportation')
  @ApiOperation({ summary: 'Citizen transportation home' })
  getTransportationHome(@CurrentSession() session: SessionContextDto) {
    return this.projections.getTransportationHome(session.identityId);
  }

  @Get('driver-licenses')
  listDriverLicenses(@CurrentSession() session: SessionContextDto) {
    return this.projections.listDriverLicenses(session.identityId);
  }

  @Get('vehicles')
  listVehicles(@CurrentSession() session: SessionContextDto) {
    return this.projections.listVehicles(session.identityId);
  }

  @Get('vehicle-applications')
  listVehicleApplications(@CurrentSession() session: SessionContextDto) {
    return this.projections.listVehicleApplications(session.identityId);
  }

  @Get('transportation/actions')
  listActions(@CurrentSession() session: SessionContextDto) {
    return this.projections.listActions(session.identityId);
  }
}
