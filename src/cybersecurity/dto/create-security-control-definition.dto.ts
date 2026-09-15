import { SecurityControlDomain } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateSecurityControlDefinitionDto {
  @IsOptional()
  @IsString()
  controlCode?: string;

  @IsString()
  @MaxLength(256)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(SecurityControlDomain)
  domain!: SecurityControlDomain;

  @IsString()
  requirementSource!: string;

  @IsUUID()
  ownerIdentityId!: string;

  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;
}
