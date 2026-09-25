import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ReadinessCheckResult } from '../health/health.service';
import { ControllerRouteAccess } from '../security/decorators/controller-route-access.decorator';
import { Public } from '../security/decorators/public.decorator';
import { RouteClass } from '../security/route-class.enum';
import { HealthResponseDto, ReadyResponseDto, VersionResponseDto } from './dto/system-response.dto';
import { SystemService } from './system.service';

@ApiTags('system')
@ControllerRouteAccess({
  routeClass: RouteClass.SYSTEM_HEALTH,
  authenticationRequired: false,
  scopeRequirement: "Process and dependency health probes",
  authorityRequirement: "None",
  actorSource: "Anonymous monitor",
  primarySecurityInvariant: "Health endpoints expose no protected domain data",
})
@Controller()
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Verify the application process is alive' })
  @ApiOkResponse({ type: HealthResponseDto })
  getHealth(): HealthResponseDto {
    return this.systemService.getHealth();
  }

  @Public()
  @Get('ready')
  @ApiOperation({ summary: 'Verify required backend dependencies are available' })
  @ApiOkResponse({ type: ReadyResponseDto })
  async getReady(): Promise<ReadinessCheckResult> {
    const result = await this.systemService.getReady();

    if (result.status !== 'ready') {
      throw new ServiceUnavailableException(result);
    }

    return result;
  }

  @Public()
  @Get('version')
  @ApiOperation({ summary: 'Return application and build metadata' })
  @ApiOkResponse({ type: VersionResponseDto })
  getVersion(): VersionResponseDto {
    return this.systemService.getVersion();
  }
}
