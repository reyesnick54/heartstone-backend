import { DocumentAssociationRole, DocumentAssociationTargetType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AssociateDocumentDto {
  @IsUUID()
  documentVersionId!: string;

  @IsEnum(DocumentAssociationTargetType)
  targetType!: DocumentAssociationTargetType;

  @IsUUID()
  targetId!: string;

  @IsOptional()
  @IsEnum(DocumentAssociationRole)
  associationRole?: DocumentAssociationRole;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  targetReference?: string;
}
