import { ApiProperty } from '@nestjs/swagger';
import { ServiceAppointmentStatus } from '@prisma/client';

/** Scalar columns of a persisted `ServiceAppointment` row as serialized to JSON. */
export class ServiceAppointmentRecordDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  appointmentReference!: string;

  @ApiProperty({ enum: ServiceAppointmentStatus })
  status!: ServiceAppointmentStatus;

  @ApiProperty()
  institutionId!: string;

  @ApiProperty({ type: String, nullable: true })
  departmentId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  governmentServiceId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  applicationId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  caseId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  organizationId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  appointmentReasonId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  appointmentSlotId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  appointmentLocationId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  assignedResourceId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  assignedOfficialIdentityId!: string | null;

  @ApiProperty({ type: String, nullable: true })
  assignedOfficialOfficeholderId!: string | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  scheduledStartsAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  scheduledEndsAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  confirmedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  completedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  cancelledAt!: Date | null;

  @ApiProperty()
  isVirtual!: boolean;

  @ApiProperty({ type: String, nullable: true })
  virtualMeetingUrl!: string | null;

  @ApiProperty({ type: String, nullable: true })
  operationalNotes!: string | null;

  @ApiProperty({ type: String, nullable: true })
  createdByIdentityId!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
