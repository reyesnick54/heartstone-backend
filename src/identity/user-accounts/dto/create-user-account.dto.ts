import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateUserAccountDto {
  @ApiProperty({ example: 'jane.citizen@example.gov' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  loginIdentifier!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  personId?: string;

  @ApiPropertyOptional({ enum: AccountStatus, default: AccountStatus.PENDING })
  @IsOptional()
  @IsEnum(AccountStatus)
  status?: AccountStatus;
}
