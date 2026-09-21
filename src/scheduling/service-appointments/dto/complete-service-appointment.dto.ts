import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CompleteServiceAppointmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  outcomeNotes?: string;
}
