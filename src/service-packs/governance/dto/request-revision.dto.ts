import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class RequestRevisionDto {
  @ApiProperty()
  @IsString()
  @MaxLength(4000)
  summary!: string;
}
