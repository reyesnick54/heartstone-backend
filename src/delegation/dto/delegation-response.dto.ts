import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DelegationStatus } from '@prisma/client';

export class DelegationPartyResponseDto {
  @ApiProperty({ enum: ['institution', 'office', 'officeholder'] })
  type!: 'institution' | 'office' | 'officeholder';

  @ApiProperty()
  id!: string;
}

export class DelegationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  referenceCode!: string;

  @ApiProperty()
  sourceReference!: string;

  @ApiProperty()
  scopeDescription!: string;

  @ApiProperty({ enum: DelegationStatus })
  status!: DelegationStatus;

  @ApiProperty()
  effectiveFrom!: Date;

  @ApiPropertyOptional()
  effectiveUntil?: Date | null;

  @ApiProperty({ type: DelegationPartyResponseDto })
  delegator!: DelegationPartyResponseDto;

  @ApiProperty({ type: DelegationPartyResponseDto })
  recipient!: DelegationPartyResponseDto;

  @ApiPropertyOptional()
  notes?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
