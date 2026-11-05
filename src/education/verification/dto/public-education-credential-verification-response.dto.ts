import { ApiProperty } from '@nestjs/swagger';
import { AcademicCredentialLifecycleStatus } from '@prisma/client';

/**
 * Minimal public academic credential verification. Grades, transcripts and student identity
 * are removed by EducationBoundaryService.sanitizePublicVerificationPayload.
 */
export class PublicEducationCredentialVerificationResponseDto {
  @ApiProperty()
  credentialReference!: string;

  @ApiProperty({ enum: AcademicCredentialLifecycleStatus })
  lifecycleStatus!: AcademicCredentialLifecycleStatus;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  issuedAt!: Date | null;

  @ApiProperty({ enum: ['REFERENCE_LOCATED'] })
  verificationOutcome!: 'REFERENCE_LOCATED';
}
