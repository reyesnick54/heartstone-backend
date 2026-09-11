import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateMembershipDto } from './dto/create-membership.dto';
import { MembershipResponseDto } from './dto/membership-response.dto';
import { MembershipsService } from './memberships.service';

@ApiTags('identity-memberships')
@Controller('identity/memberships')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an organization membership' })
  @ApiCreatedResponse({ type: MembershipResponseDto })
  create(@Body() dto: CreateMembershipDto): Promise<MembershipResponseDto> {
    return this.membershipsService.create(dto);
  }
}
