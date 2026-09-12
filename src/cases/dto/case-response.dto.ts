import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CaseLegalStatus, CasePriority, CaseStatus } from '@prisma/client';

export class CaseResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  caseNumber!: string;

  @ApiProperty()
  applicationId!: string;

  @ApiProperty()
  applicationSubmissionId!: string;

  @ApiProperty()
  governmentServiceId!: string;

  @ApiProperty()
  governmentServiceVersionId!: string;

  @ApiProperty()
  responsibleInstitutionId!: string;

  @ApiProperty()
  responsibleDepartmentId!: string;

  @ApiProperty({ enum: CaseStatus })
  caseStatus!: CaseStatus;

  @ApiProperty({ enum: CaseLegalStatus })
  legalStatus!: CaseLegalStatus;

  @ApiProperty({ enum: CasePriority })
  priority!: CasePriority;

  @ApiProperty()
  openedAt!: string;

  @ApiPropertyOptional()
  closedAt?: string | null;

  @ApiPropertyOptional()
  currentCaseManagerOfficeholderId?: string | null;

  @ApiPropertyOptional()
  currentAssignedOfficeId?: string | null;

  @ApiProperty()
  applicantIdentityId!: string;

  @ApiProperty()
  createdAt!: string;

  @ApiProperty()
  updatedAt!: string;
}
