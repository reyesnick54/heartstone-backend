import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SubmitForAcceptanceDto {
  @ApiProperty()
  @IsUUID()
  servicePackVersionId!: string;
}
