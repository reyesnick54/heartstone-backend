import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class ServiceLoginDto {
  @ApiProperty({ description: 'Registered service identity code (identity displayName)' })
  @IsString()
  @MaxLength(255)
  clientId!: string;

  @ApiProperty({ description: 'Service API key secret' })
  @IsString()
  @MaxLength(512)
  clientSecret!: string;
}
