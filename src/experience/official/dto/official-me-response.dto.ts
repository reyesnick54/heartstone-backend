import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IdentityType } from '@prisma/client';

class OfficialOfficeholderLinkDto {
  @ApiProperty({ format: 'uuid' })
  linkId!: string;

  @ApiProperty({ format: 'uuid' })
  officeholderId!: string;

  @ApiProperty()
  officeholderName!: string;

  @ApiProperty()
  officeholderCode!: string;

  @ApiProperty()
  status!: string;
}

class OfficialAppointmentDto {
  @ApiProperty({ format: 'uuid' })
  appointmentId!: string;

  @ApiProperty({ format: 'uuid' })
  officeholderId!: string;

  @ApiProperty({ format: 'uuid' })
  officeId!: string;

  @ApiProperty()
  officeName!: string;

  @ApiProperty({ format: 'uuid' })
  departmentId!: string;

  @ApiProperty()
  departmentName!: string;

  @ApiProperty({ format: 'uuid' })
  institutionId!: string;

  @ApiProperty()
  institutionName!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  effectiveFrom!: string;

  @ApiPropertyOptional()
  effectiveUntil!: string | null;
}

class OfficialDelegationDto {
  @ApiProperty({ format: 'uuid' })
  delegationId!: string;

  @ApiProperty({ format: 'uuid' })
  institutionId!: string;

  @ApiProperty()
  institutionName!: string;

  @ApiProperty()
  scopeDescription!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  effectiveFrom!: string;

  @ApiPropertyOptional()
  effectiveUntil!: string | null;
}

class OfficialInstitutionalContextDto {
  @ApiProperty({ type: [String] })
  institutionIds!: string[];

  @ApiProperty({ type: [String] })
  departmentIds!: string[];

  @ApiProperty({ type: [String] })
  officeIds!: string[];

  @ApiProperty({ type: [String] })
  jurisdictionIds!: string[];
}

class OfficialTechnicalCapabilitiesDto {
  @ApiProperty()
  canAccessOfficialWorkspace!: boolean;

  @ApiProperty()
  hasActiveAppointment!: boolean;

  @ApiProperty()
  hasOfficeholderLink!: boolean;

  @ApiProperty()
  substantiveAccessAllowed!: boolean;

  @ApiProperty()
  isServiceIdentity!: boolean;

  @ApiProperty()
  isTechnicalAdminOnly!: boolean;
}

export class OfficialMeResponseDto {
  @ApiProperty({ format: 'uuid' })
  identityId!: string;

  @ApiProperty({ enum: IdentityType })
  identityType!: IdentityType;

  @ApiProperty()
  displayName!: string;

  @ApiProperty()
  assuranceLevel!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  userAccountId!: string | null;

  @ApiProperty({ type: [OfficialOfficeholderLinkDto] })
  officeholderLinks!: OfficialOfficeholderLinkDto[];

  @ApiProperty({ type: [OfficialAppointmentDto] })
  activeAppointments!: OfficialAppointmentDto[];

  @ApiProperty({ type: [OfficialDelegationDto] })
  activeDelegations!: OfficialDelegationDto[];

  @ApiProperty({ type: OfficialInstitutionalContextDto })
  institutionalContext!: OfficialInstitutionalContextDto;

  @ApiProperty({ type: OfficialTechnicalCapabilitiesDto })
  technicalCapabilities!: OfficialTechnicalCapabilitiesDto;

  @ApiProperty({
    description: 'Explicit disclaimer that authentication does not confer universal authority',
  })
  authorityDisclaimer!: string;

  @ApiProperty({
    description: 'Always false — no blanket universal authority statement is issued',
  })
  hasUniversalAuthority!: false;
}
