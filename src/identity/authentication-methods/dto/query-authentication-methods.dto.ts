import { ApiPropertyOptional } from '@nestjs/swagger';
import { AuthenticationMethodType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';

export class QueryAuthenticationMethodsDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  identityId?: string;

  @ApiPropertyOptional({ enum: AuthenticationMethodType })
  @IsOptional()
  @IsEnum(AuthenticationMethodType)
  type?: AuthenticationMethodType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;
}
