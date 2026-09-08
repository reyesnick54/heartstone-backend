import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthResponseDto,
  ReadyResponseDto,
  VersionResponseDto,
} from './dto/system-response.dto';
import { SystemService } from './system.service';

@ApiTags('system')
@Controller()
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get('health')
  @ApiOperation({ summary: 'Verify the application process is alive' })
  @ApiOkResponse({ type: HealthResponseDto })
  getHealth(): HealthResponseDto {
    return this.systemService.getHealth();
  }

  @Get('ready')
  @ApiOperation({
    summary:
      'Report application readiness (dependency checks reserved for later)',
  })
  @ApiOkResponse({ type: ReadyResponseDto })
  getReady(): ReadyResponseDto {
    return this.systemService.getReady();
  }

  @Get('version')
  @ApiOperation({ summary: 'Return application and build metadata' })
  @ApiOkResponse({ type: VersionResponseDto })
  getVersion(): VersionResponseDto {
    return this.systemService.getVersion();
  }
}
