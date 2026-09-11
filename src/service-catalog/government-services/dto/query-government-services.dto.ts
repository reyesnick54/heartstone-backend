import { ApiPropertyOptional } from '@nestjs/swagger';
import { GovernmentServiceStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class QueryGovernmentServicesDto {
  @ApiPropertyOptional({ enum: GovernmentServiceStatus })
  @IsOptional()
  @IsEnum(GovernmentServiceStatus)
  status?: GovernmentServiceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  institutionId?: string;
import { IsOptional, IsUUID } from 'class-validator';

export class QueryGovernmentServicesDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  responsibleInstitutionId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  responsibleDepartmentId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  serviceFamilyId?: string;
}
