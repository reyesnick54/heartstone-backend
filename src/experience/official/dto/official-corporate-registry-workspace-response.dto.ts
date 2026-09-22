import { ApiProperty } from '@nestjs/swagger';

export class OfficialCorporateRegistryWorkspaceResponseDto {
  @ApiProperty()
  generatedAt!: string;

  @ApiProperty({ type: [Object] })
  nameReservationQueue!: Record<string, unknown>[];

  @ApiProperty({ type: [Object] })
  incorporationQueue!: Record<string, unknown>[];

  @ApiProperty({ type: [Object] })
  amendmentQueue!: Record<string, unknown>[];

  @ApiProperty({ type: [Object] })
  annualFilingIssues!: Record<string, unknown>[];

  @ApiProperty({ type: [Object] })
  beneficialOwnershipReview!: Record<string, unknown>[];

  @ApiProperty({ type: [Object] })
  dissolutionRestoration!: Record<string, unknown>[];

  @ApiProperty({ type: [Object] })
  certificateIssuance!: Record<string, unknown>[];

  @ApiProperty({ type: [Object] })
  suspectedInconsistencies!: Record<string, unknown>[];

  @ApiProperty({ type: [Object] })
  slaRisks!: Record<string, unknown>[];

  @ApiProperty()
  assignmentDoesNotImplyAuthority!: true;
}
