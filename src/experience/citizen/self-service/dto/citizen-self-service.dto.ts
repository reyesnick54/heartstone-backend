import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CommunicationChannelType,
  DocumentAuthenticityStatus,
  GovernmentDecisionStatus,
  MalwareScanStatus,
  RecordCorrectionStatus,
  RedressMatterStatus,
  ReviewInterimEffect,
  ReviewStayStatus,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBase64,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import {
  CITIZEN_CONFIGURABLE_CHANNELS,
  CITIZEN_UPLOAD_CONTENT_TYPES,
  type CitizenConfigurableChannel,
} from '../citizen-self-service.constants';

// ---------------------------------------------------------------------------------------------
// Request for review / appeal of a decision on the citizen's own case
// ---------------------------------------------------------------------------------------------

export class CreateCitizenReviewRequestDto {
  @ApiProperty({ format: 'uuid', description: 'Decision on this case being challenged' })
  @IsUUID()
  decisionId!: string;

  @ApiProperty({
    description:
      'Review route code from GET .../review-requests (configured on the service version the case was opened under)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  routeCode!: string;

  @ApiProperty({
    description: "Grounds for review in the citizen's own words",
    minLength: 20,
    maxLength: 10000,
  })
  @IsString()
  @Length(20, 10000)
  groundsStatement!: string;
}

export class CitizenReviewableDecisionDto {
  @ApiProperty({ format: 'uuid' })
  decisionId!: string;

  @ApiProperty()
  decisionNumber!: string;

  @ApiProperty({ enum: GovernmentDecisionStatus })
  decisionStatus!: GovernmentDecisionStatus;

  @ApiProperty({ type: String, nullable: true })
  outcome!: string | null;

  @ApiProperty({ type: String, nullable: true })
  outcomeSummary!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  decidedAt!: string | null;

  @ApiProperty({
    description: 'False when an open request already exists for this decision',
  })
  reviewRequestAllowed!: boolean;
}

export class CitizenReviewRouteDto {
  @ApiProperty()
  routeCode!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({
    description:
      'True only when the route configuration itself suspends the decision on filing. Filing does not otherwise stay or reverse a decision.',
  })
  automaticStayOnFiling!: boolean;
}

export class CitizenReviewRequestDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Redress matter reference' })
  reference!: string;

  @ApiProperty({ enum: RedressMatterStatus })
  status!: RedressMatterStatus;

  @ApiProperty({ format: 'uuid' })
  decisionId!: string;

  @ApiProperty({ type: String, nullable: true })
  routeCode!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  filedAt!: string;

  @ApiProperty({ type: String, nullable: true })
  groundsStatement!: string | null;

  @ApiProperty({ enum: ReviewInterimEffect })
  interimEffect!: ReviewInterimEffect;

  @ApiProperty({ enum: ReviewStayStatus })
  stayStatus!: ReviewStayStatus;

  @ApiProperty()
  disclaimer!: string;
}

export class CitizenReviewOverviewDto {
  @ApiProperty({ format: 'uuid' })
  caseId!: string;

  @ApiProperty()
  caseReference!: string;

  @ApiProperty({ type: () => [CitizenReviewableDecisionDto] })
  reviewableDecisions!: CitizenReviewableDecisionDto[];

  @ApiProperty({ type: () => [CitizenReviewRouteDto] })
  routes!: CitizenReviewRouteDto[];

  @ApiProperty({ type: () => [CitizenReviewRequestDto] })
  requests!: CitizenReviewRequestDto[];

  @ApiProperty()
  disclaimer!: string;
}

// ---------------------------------------------------------------------------------------------
// Profile correction request (reviewed by an official; never a direct overwrite)
// ---------------------------------------------------------------------------------------------

export class CreateCitizenProfileCorrectionDto {
  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  givenName?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  familyName?: string;

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  displayName?: string;

  @ApiProperty({
    description: 'Why the current record is wrong',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString()
  @Length(10, 2000)
  reason!: string;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'Document ids the citizen uploaded that support the correction',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsUUID('all', { each: true })
  supportingDocumentIds?: string[];

  @ApiPropertyOptional({
    description: 'Client retry key; a retry with the same key returns the original request',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  idempotencyKey?: string;
}

export class CitizenProfileRequestedChangesDto {
  @ApiPropertyOptional()
  givenName?: string;

  @ApiPropertyOptional()
  familyName?: string;

  @ApiPropertyOptional()
  displayName?: string;
}

export class CitizenProfileCorrectionRequestDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: RecordCorrectionStatus })
  status!: RecordCorrectionStatus;

  @ApiProperty({ type: () => CitizenProfileRequestedChangesDto })
  requestedChanges!: CitizenProfileRequestedChangesDto;

  @ApiProperty()
  reason!: string;

  @ApiProperty({ type: [String] })
  supportingDocumentIds!: string[];

  @ApiProperty({ type: String, format: 'date-time' })
  requestedAt!: string;

  @ApiProperty()
  disclaimer!: string;
}

export class CitizenProfileCorrectionListDto {
  @ApiProperty({ type: () => [CitizenProfileCorrectionRequestDto] })
  items!: CitizenProfileCorrectionRequestDto[];
}

// ---------------------------------------------------------------------------------------------
// Communication preferences (self-service, direct)
// ---------------------------------------------------------------------------------------------

export class CitizenCommunicationPreferenceInputDto {
  @ApiProperty({ enum: CITIZEN_CONFIGURABLE_CHANNELS })
  @IsIn([...CITIZEN_CONFIGURABLE_CHANNELS])
  channelType!: CitizenConfigurableChannel;

  @ApiProperty()
  @IsBoolean()
  isEnabled!: boolean;

  @ApiPropertyOptional({ description: 'BCP 47 language tag, e.g. en or es-419', maxLength: 35 })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$/)
  locale?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Accessibility needs for this channel, e.g. LARGE_PRINT or SCREEN_READER',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  accessibilityRequirements?: string[];
}

export class UpdateCitizenCommunicationPreferencesDto {
  @ApiProperty({ type: () => [CitizenCommunicationPreferenceInputDto] })
  @IsArray()
  @ArrayMaxSize(CITIZEN_CONFIGURABLE_CHANNELS.length)
  @ValidateNested({ each: true })
  @Type(() => CitizenCommunicationPreferenceInputDto)
  preferences!: CitizenCommunicationPreferenceInputDto[];
}

export class CitizenCommunicationPreferenceItemDto {
  @ApiProperty({ enum: CommunicationChannelType })
  channelType!: CommunicationChannelType;

  @ApiProperty()
  isEnabled!: boolean;

  @ApiProperty({ type: String, nullable: true })
  locale!: string | null;

  @ApiProperty({ type: [String] })
  accessibilityRequirements!: string[];

  @ApiProperty({ description: 'False when no preference is recorded and the default applies' })
  isExplicit!: boolean;
}

export class CitizenCommunicationPreferencesDto {
  @ApiProperty({ type: () => [CitizenCommunicationPreferenceItemDto] })
  items!: CitizenCommunicationPreferenceItemDto[];

  @ApiProperty()
  disclaimer!: string;
}

// ---------------------------------------------------------------------------------------------
// Document upload to the citizen's own application
// ---------------------------------------------------------------------------------------------

export class UploadCitizenApplicationDocumentDto {
  @ApiProperty({ maxLength: 500 })
  @IsString()
  @Length(1, 500)
  title!: string;

  @ApiProperty({
    description: 'Document type label, e.g. the evidence requirement the file answers',
    maxLength: 200,
  })
  @IsString()
  @Length(1, 200)
  documentType!: string;

  @ApiProperty({ maxLength: 255 })
  @IsString()
  @Length(1, 255)
  originalFilename!: string;

  @ApiProperty({ enum: CITIZEN_UPLOAD_CONTENT_TYPES })
  @IsIn([...CITIZEN_UPLOAD_CONTENT_TYPES])
  contentType!: (typeof CITIZEN_UPLOAD_CONTENT_TYPES)[number];

  @ApiProperty({
    description: 'File content, base64-encoded. Subject to the deployment JSON body limit.',
  })
  @IsString()
  @IsBase64()
  contentBase64!: string;
}

export class CitizenApplicationDocumentUploadDto {
  @ApiProperty({ format: 'uuid' })
  documentId!: string;

  @ApiProperty()
  documentNumber!: string;

  @ApiProperty({ format: 'uuid' })
  documentVersionId!: string;

  @ApiProperty({ format: 'uuid' })
  applicationId!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  documentType!: string;

  @ApiProperty()
  originalFilename!: string;

  @ApiProperty()
  contentType!: string;

  @ApiProperty()
  sizeBytes!: number;

  @ApiProperty({ description: 'SHA-256 of the stored bytes. Integrity only; not authenticity.' })
  sha256!: string;

  @ApiProperty({ enum: MalwareScanStatus })
  malwareScanStatus!: MalwareScanStatus;

  @ApiProperty({
    enum: DocumentAuthenticityStatus,
    description: 'Always NOT_EVALUATED on upload; only an official can evaluate authenticity',
  })
  authenticityStatus!: DocumentAuthenticityStatus;

  @ApiProperty({
    description: 'True when the same file was already uploaded to this application by you',
  })
  duplicate!: boolean;

  @ApiProperty()
  disclaimer!: string;
}

// ---------------------------------------------------------------------------------------------
// Message read receipt
// ---------------------------------------------------------------------------------------------

export class CitizenMessageReadResponseDto {
  @ApiProperty({ format: 'uuid' })
  messageId!: string;

  @ApiProperty()
  read!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  readAt!: string;
}
