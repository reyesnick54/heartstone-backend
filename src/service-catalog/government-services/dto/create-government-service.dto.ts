import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateGovernmentServiceDto {
  @ApiProperty()
import { GovernmentServiceStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateGovernmentServiceDto {
  @ApiProperty({ example: 'BUSINESS-LICENSE' })
  @IsString()
  @MinLength(1)
  code!: string;

  @ApiProperty()
  @ApiProperty({ example: 'Business License Application' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsUUID()
  responsibleInstitutionId!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  institutionId?: string;

  @ApiPropertyOptional({ enum: GovernmentServiceStatus })
  @IsOptional()
  @IsEnum(GovernmentServiceStatus)
  status?: GovernmentServiceStatus;
import { IsNotEmpty, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class CreateGovernmentServiceDto {
  @ApiProperty({ example: 'CORP-REG-001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @ApiProperty({ example: 'corporate-registration' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase alphanumeric with optional hyphens',
  })
  slug!: string;

  @ApiProperty({ example: 'Corporate Registration Service' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  officialName!: string;

  @ApiProperty({ example: 'Register Your Business' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  publicName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  summary?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  responsibleInstitutionId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  responsibleDepartmentId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  serviceFamilyId!: string;
}
