import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InstitutionExternalAuthorityRelationshipType, RecordStatus } from '@prisma/client';

export class InstitutionExternalAuthorityResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  institutionId!: string;

  @ApiProperty()
  externalAuthorityId!: string;

  @ApiProperty({ enum: InstitutionExternalAuthorityRelationshipType })
  relationshipType!: InstitutionExternalAuthorityRelationshipType;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: RecordStatus })
  status!: RecordStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
