import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateWorkflowDefinitionDto {
  @ApiProperty({ example: 'CORP-REG-WORKFLOW' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @ApiProperty({ example: 'Corporate Registration Workflow' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ format: 'uuid', description: 'Government service id' })
  @IsUUID()
  serviceId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  responsibleDepartmentId!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  institutionalOwnerOfficeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;
}
