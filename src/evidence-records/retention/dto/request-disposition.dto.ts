import { ApiProperty } from '@nestjs/swagger';
import { RetentionDispositionAction } from '@prisma/client';
import { IsEnum, IsString, IsUUID, MinLength } from 'class-validator';

export class RequestDispositionDto {
  @ApiProperty()
  @IsUUID()
  recordRetentionAssignmentId!: string;

  @ApiProperty({ enum: RetentionDispositionAction })
  @IsEnum(RetentionDispositionAction)
  requestedAction!: RetentionDispositionAction;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  reason!: string;
}
