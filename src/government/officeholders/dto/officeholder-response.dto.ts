import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StructuralLifecycleStatus } from '@prisma/client';

export class OfficeholderResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'OH-2026-001' })
  referenceCode!: string;

  @ApiProperty({ example: 'Jane Q. Public' })
  displayName!: string;

  @ApiPropertyOptional({ nullable: true })
  givenName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  familyName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  titlePrefix!: string | null;

  @ApiPropertyOptional({ nullable: true })
  titleSuffix!: string | null;

  @ApiProperty({ enum: StructuralLifecycleStatus })
  status!: StructuralLifecycleStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
