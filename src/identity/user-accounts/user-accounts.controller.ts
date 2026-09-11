import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateUserAccountDto } from './dto/create-user-account.dto';
import { UserAccountResponseDto } from './dto/user-account-response.dto';
import { UserAccountsService } from './user-accounts.service';

@ApiTags('identity-user-accounts')
@Controller('identity/user-accounts')
export class UserAccountsController {
  constructor(private readonly userAccountsService: UserAccountsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a user account' })
  @ApiCreatedResponse({ type: UserAccountResponseDto })
  create(@Body() dto: CreateUserAccountDto): Promise<UserAccountResponseDto> {
    return this.userAccountsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user account by id' })
  @ApiOkResponse({ type: UserAccountResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserAccountResponseDto> {
    return this.userAccountsService.findOne(id);
  }
}
