import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AssuranceLevel, AuthenticationMethodType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateAuthenticationMethodDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  identityId!: string;

  @ApiProperty({ enum: AuthenticationMethodType })
  @IsEnum(AuthenticationMethodType)
  type!: AuthenticationMethodType;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ enum: AssuranceLevel, default: AssuranceLevel.NONE })
  @IsOptional()
  @IsEnum(AssuranceLevel)
  assuranceLevel?: AssuranceLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(512)
  oidcIssuer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  oidcClientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  oidcAudience?: string;
}
