import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UserLoginDto {
  @ApiProperty()
  @IsString()
  username!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password!: string;
}

export class ServiceLoginDto {
  @ApiProperty()
  @IsString()
  code!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  apiKey!: string;
}
