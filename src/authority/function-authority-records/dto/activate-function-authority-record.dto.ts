import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class ActivateFunctionAuthorityRecordDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  actorIdentityId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
