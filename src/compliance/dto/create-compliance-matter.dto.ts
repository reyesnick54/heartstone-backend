import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class CreateComplianceMatterDto {
  @ApiProperty()
  @IsUUID()
  masterAdministrativeFileId!: string;

  @ApiProperty()
  @IsUUID()
  officialInstrumentId!: string;

  @ApiProperty()
  @IsUUID()
  responsibleInstitutionId!: string;

  @ApiProperty()
  @IsUUID()
  responsibleDepartmentId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  caseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  holderIdentityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  holderOrganizationId?: string;
}
