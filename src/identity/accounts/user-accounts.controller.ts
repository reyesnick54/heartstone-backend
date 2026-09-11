import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CredentialType, PrincipalKind } from '@prisma/client';

import { CredentialsService } from '../credentials/credentials.service';
import { CreateUserAccountDto } from './dto/create-user-account.dto';
import { UserAccountResponseDto } from './dto/user-account-response.dto';
import { UserAccountsService } from './user-accounts.service';

@ApiTags('identity-accounts')
@Controller('identity/accounts')
export class UserAccountsController {
  constructor(
    private readonly userAccounts: UserAccountsService,
    private readonly credentials: CredentialsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a user account (bootstrap/admin provisioning)' })
  @ApiCreatedResponse({ type: UserAccountResponseDto })
  async create(@Body() dto: CreateUserAccountDto): Promise<UserAccountResponseDto> {
    const account = await this.userAccounts.create({
      username: dto.username,
      displayName: dto.displayName,
      kind: dto.kind,
      actor: { kind: PrincipalKind.SYSTEM },
      source: 'api',
    });

    if (dto.password) {
      await this.credentials.create({
        userAccountId: account.id,
        type: CredentialType.PASSWORD,
        identifier: account.username,
        secret: dto.password,
        actor: { kind: PrincipalKind.SYSTEM },
        source: 'api',
      });
    }

    return UserAccountResponseDto.fromEntity(account);
  }
}
