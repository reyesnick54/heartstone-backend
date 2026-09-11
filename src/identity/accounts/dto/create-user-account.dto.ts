import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserAccountKind } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserAccountDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  username!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ enum: UserAccountKind })
  @IsOptional()
  @IsEnum(UserAccountKind)
  kind?: UserAccountKind;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
