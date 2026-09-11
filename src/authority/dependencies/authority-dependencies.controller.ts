import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { SessionAuthGuard } from '../../identity/auth/guards/session-auth.guard';
import { type VerifiedExternalDependencyResult } from '../contracts/verified-external-dependency-result.contract';
import { AuthorityDependenciesService } from './authority-dependencies.service';
import { RecordInstitutionalActDto } from './dto/record-institutional-act.dto';
import { RegisterExternalDeterminationDto } from './dto/register-external-determination.dto';

@ApiTags('authority-dependencies')
@Controller('authority-dependencies')
@UseGuards(SessionAuthGuard)
export class AuthorityDependenciesController {
  constructor(private readonly service: AuthorityDependenciesService) {}

  @Post('external-determinations')
  @ApiOperation({ summary: 'Register a verified external dependency determination' })
  @ApiCreatedResponse({ description: 'External determination registered' })
  registerExternalDetermination(
    @Body() dto: RegisterExternalDeterminationDto,
  ): Promise<VerifiedExternalDependencyResult> {
    return this.service.registerExternalDetermination(dto);
  }

  @Post('institutional-acts')
  @ApiOperation({ summary: 'Record a separate institutional authority act' })
  recordInstitutionalAct(@Body() dto: RecordInstitutionalActDto) {
    return this.service.recordInstitutionalAct(dto);
  }
}
