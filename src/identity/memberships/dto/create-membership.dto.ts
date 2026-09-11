import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MembershipStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateMembershipDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  organizationId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  identityId!: string;

  @ApiPropertyOptional({ example: 'member' })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  roleLabel?: string;

  @ApiPropertyOptional({ enum: MembershipStatus, default: MembershipStatus.ACTIVE })
  @IsOptional()
  @IsEnum(MembershipStatus)
  status?: MembershipStatus;
}
