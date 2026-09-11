import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CreateUserAccountDto } from './dto/create-user-account.dto';
import { QueryUserAccountsDto } from './dto/query-user-accounts.dto';
import { UpdateUserAccountDto } from './dto/update-user-account.dto';
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

  @Get()
  @ApiOperation({ summary: 'List user accounts' })
  @ApiOkResponse({ type: UserAccountResponseDto, isArray: true })
  findAll(@Query() query: QueryUserAccountsDto): Promise<UserAccountResponseDto[]> {
    return this.userAccountsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user account by id' })
  @ApiOkResponse({ type: UserAccountResponseDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<UserAccountResponseDto> {
    return this.userAccountsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user account metadata' })
  @ApiOkResponse({ type: UserAccountResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserAccountDto,
  ): Promise<UserAccountResponseDto> {
    return this.userAccountsService.update(id, dto);
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate a user account' })
  @ApiOkResponse({ type: UserAccountResponseDto })
  activate(@Param('id', ParseUUIDPipe) id: string): Promise<UserAccountResponseDto> {
    return this.userAccountsService.activate(id);
  }

  @Patch(':id/suspend')
  @ApiOperation({ summary: 'Suspend a user account' })
  @ApiOkResponse({ type: UserAccountResponseDto })
  suspend(@Param('id', ParseUUIDPipe) id: string): Promise<UserAccountResponseDto> {
    return this.userAccountsService.suspend(id);
  }

  @Patch(':id/revoke')
  @ApiOperation({ summary: 'Revoke a user account' })
  @ApiOkResponse({ type: UserAccountResponseDto })
  revoke(@Param('id', ParseUUIDPipe) id: string): Promise<UserAccountResponseDto> {
    return this.userAccountsService.revoke(id);
  }
}
