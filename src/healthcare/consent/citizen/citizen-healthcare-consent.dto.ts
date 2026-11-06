import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HealthcareConsentRecordStatus, HealthcareConsentType } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';

/** Consent types a patient may grant for themselves. Guardian and research consents have their
 * own governed flows (guardian references, research protocols) and are not self-service. */
export const CITIZEN_GRANTABLE_CONSENT_TYPES = [
  HealthcareConsentType.DATA_SHARING,
  HealthcareConsentType.TREATMENT,
] as const;

export class GrantCitizenHealthConsentDto {
  @ApiProperty({ description: 'Consent purpose code from GET .../consents availablePurposes' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  purposeCode!: string;

  @ApiProperty({
    description:
      'Consent version code the citizen was shown. Must be the version currently in effect for the purpose.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  consentVersionCode!: string;

  @ApiProperty({ enum: CITIZEN_GRANTABLE_CONSENT_TYPES })
  @IsIn([...CITIZEN_GRANTABLE_CONSENT_TYPES])
  consentType!: (typeof CITIZEN_GRANTABLE_CONSENT_TYPES)[number];

  @ApiPropertyOptional({ type: [String], description: 'Data categories the consent covers' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  dataCategories?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Recipient codes the consent covers' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  recipientCodes?: string[];

  @ApiPropertyOptional({ format: 'date-time', description: 'When the consent lapses' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class WithdrawCitizenHealthConsentDto {
  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  reasonSummary?: string;
}

export class CitizenHealthConsentPurposeDto {
  @ApiProperty()
  purposeCode!: string;

  @ApiProperty()
  displayName!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ description: 'Version currently in effect; grant against this code' })
  currentVersionCode!: string;

  @ApiProperty({ type: String, nullable: true, description: 'Reference to the legal text' })
  legalTextRef!: string | null;
}

export class CitizenHealthConsentGrantDto {
  @ApiProperty({ format: 'uuid' })
  grantId!: string;

  @ApiProperty()
  grantReference!: string;

  @ApiProperty({ format: 'uuid' })
  consentId!: string;

  @ApiProperty()
  consentReference!: string;

  @ApiProperty({ enum: HealthcareConsentType })
  consentType!: HealthcareConsentType;

  @ApiProperty({ enum: HealthcareConsentRecordStatus })
  consentStatus!: HealthcareConsentRecordStatus;

  @ApiProperty()
  purposeCode!: string;

  @ApiProperty()
  purposeName!: string;

  @ApiProperty()
  consentVersionCode!: string;

  @ApiProperty({ description: 'True while the grant is active, unexpired and not withdrawn' })
  isActive!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  grantedAt!: string;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  expiresAt!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  withdrawnAt!: string | null;

  @ApiProperty({ type: [String] })
  dataCategories!: string[];

  @ApiProperty({ type: [String] })
  recipientCodes!: string[];
}

export class CitizenHealthConsentsDto {
  @ApiProperty({ type: () => [CitizenHealthConsentGrantDto] })
  items!: CitizenHealthConsentGrantDto[];

  @ApiProperty({ type: () => [CitizenHealthConsentPurposeDto] })
  availablePurposes!: CitizenHealthConsentPurposeDto[];

  @ApiProperty({
    description: 'False when no patient reference is established for this identity yet',
  })
  patientReferenceEstablished!: boolean;

  @ApiProperty()
  disclaimer!: string;
}
