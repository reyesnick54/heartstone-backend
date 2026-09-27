import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TechnicalAccessScopeType } from '@prisma/client';

export class TechnicalRoleAssignmentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  identityId!: string;

  @ApiProperty()
  roleCode!: string;

  @ApiProperty()
  roleName!: string;

  @ApiProperty({ enum: TechnicalAccessScopeType })
  scopeType!: TechnicalAccessScopeType;

  @ApiPropertyOptional()
  jurisdictionId?: string;

  @ApiPropertyOptional()
  institutionId?: string;

  @ApiPropertyOptional()
  governmentBodyId?: string;

  @ApiPropertyOptional()
  departmentId?: string;

  @ApiPropertyOptional()
  officeId?: string;

  @ApiPropertyOptional()
  effectiveFrom?: Date;

  @ApiPropertyOptional()
  effectiveUntil?: Date;

  @ApiProperty()
  createdAt!: Date;
}
