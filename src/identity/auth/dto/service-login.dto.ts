import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ServiceLoginDto {
  @ApiProperty({ description: 'Service client identifier (service identity display name)' })
  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @ApiProperty({ description: 'Service API key secret' })
  @IsString()
  @IsNotEmpty()
  clientSecret!: string;
}
