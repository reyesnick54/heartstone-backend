import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IdentityOfficeholderLinkStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class CreateOfficeholderLinkDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  identityId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  officeholderId!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    deprecated: true,
    description: 'Ignored — linking administrator identity is derived from the authenticated session',
  })
  @IsOptional()
  @IsUUID()
  linkedByIdentityId?: string;

  @ApiPropertyOptional({
    enum: IdentityOfficeholderLinkStatus,
    default: IdentityOfficeholderLinkStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(IdentityOfficeholderLinkStatus)
  status?: IdentityOfficeholderLinkStatus;
}
