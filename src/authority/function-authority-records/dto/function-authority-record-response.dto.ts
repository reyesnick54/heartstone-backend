import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AuthorityClassification,
  ControlledFunctionClass,
  FunctionAuthorityLifecycleStatus,
} from '@prisma/client';

export class FunctionAuthorityRecordResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  description!: string | null;

  @ApiProperty({ enum: AuthorityClassification })
  classification!: AuthorityClassification;

  @ApiProperty({ enum: ControlledFunctionClass })
  functionClass!: ControlledFunctionClass;

  @ApiProperty({ enum: FunctionAuthorityLifecycleStatus })
  lifecycleStatus!: FunctionAuthorityLifecycleStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  institutionId!: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  officeId!: string | null;

  @ApiProperty()
  requiresDelegation!: boolean;

  @ApiProperty()
  requiresAppointment!: boolean;

  @ApiPropertyOptional()
  activatedAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
