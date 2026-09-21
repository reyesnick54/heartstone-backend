import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class RescheduleServiceAppointmentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  requestedStartsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  requestedEndsAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
