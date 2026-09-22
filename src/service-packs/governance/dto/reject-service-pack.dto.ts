import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength } from 'class-validator';

export class RejectServicePackDto {
  @ApiProperty()
  @IsUUID()
  servicePackVersionId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(4000)
  reason!: string;
}
