import {
  Controller,
  Get,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ReadinessCheckResult } from '../health/health.service';
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
  @ApiOperation({ summary: 'Verify required backend dependencies are available' })
  @ApiOkResponse({ type: ReadyResponseDto })
  async getReady(): Promise<ReadinessCheckResult> {
    const result = await this.systemService.getReady();

    if (result.status !== 'ready') {
      throw new ServiceUnavailableException(result);
    }

    return result;
  }

  @Get('version')
  @ApiOperation({ summary: 'Return application and build metadata' })
  @ApiOkResponse({ type: VersionResponseDto })
  getVersion(): VersionResponseDto {
    return this.systemService.getVersion();
  }
}
