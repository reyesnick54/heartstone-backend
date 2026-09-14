import { IsOptional, IsString, IsUUID } from 'class-validator';

export class ApproveSecurityExceptionDto {
  @IsUUID()
  approverIdentityId!: string;

  @IsOptional()
  @IsString()
  institutionalRiskAcceptanceReference?: string;
}
