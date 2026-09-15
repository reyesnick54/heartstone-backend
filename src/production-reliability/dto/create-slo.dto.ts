import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSloDto {
  @ApiProperty()
  @IsUUID()
  reliabilityDefinitionId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Approved configured target value — not an invented SLA' })
  @IsString()
  @IsNotEmpty()
  approvedTargetValue!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  approvedTargetUnit!: string;

  @ApiProperty({ description: 'Reference to approved configuration document' })
  @IsString()
  @IsNotEmpty()
  approvedTargetReference!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  evaluationWindow!: string;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  effectiveFrom!: Date;

  @ApiPropertyOptional()
  @Type(() => Date)
  @IsOptional()
  @IsDate()
  effectiveUntil?: Date;
}
