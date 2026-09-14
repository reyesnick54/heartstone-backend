import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { DepartmentReadinessService } from '../readiness/department-readiness.service';
import { OperationalRoleRequirementService } from './operational-role-requirement.service';
import { OperatorCompetencyAssessmentService } from './operator-competency-assessment.service';
import { OperatorQualificationService } from './operator-qualification.service';
import { OperatorReadinessProfileService } from './operator-readiness-profile.service';
import { TrainingService } from './training.service';

@Controller('production-readiness/workforce')
export class WorkforceController {
  constructor(
    private readonly roleRequirementService: OperationalRoleRequirementService,
    private readonly profileService: OperatorReadinessProfileService,
    private readonly qualificationService: OperatorQualificationService,
    private readonly competencyService: OperatorCompetencyAssessmentService,
    private readonly trainingService: TrainingService,
    private readonly departmentReadinessService: DepartmentReadinessService,
  ) {}

  @Post('role-requirements')
  createRoleRequirement(@Body() body: Parameters<OperationalRoleRequirementService['create']>[0]) {
    return this.roleRequirementService.create(body);
  }

  @Post('role-requirements/:id/activate')
  activateRoleRequirement(@Param('id') id: string) {
    return this.roleRequirementService.activate(id);
  }

  @Post('profiles')
  createProfile(@Body() body: Parameters<OperatorReadinessProfileService['create']>[0]) {
    return this.profileService.create(body);
  }

  @Post('qualifications')
  createQualification(@Body() body: Parameters<OperatorQualificationService['create']>[0]) {
    return this.qualificationService.create(body);
  }

  @Post('qualifications/:id/determine-status')
  determineQualificationStatus(
    @Param('id') id: string,
    @Body() body: Omit<Parameters<OperatorQualificationService['determineQualificationStatus']>[0], 'operatorQualificationId'>,
  ) {
    return this.qualificationService.determineQualificationStatus({
      operatorQualificationId: id,
      ...body,
    });
  }

  @Post('competency-assessments')
  recordCompetencyAssessment(
    @Body() body: Parameters<OperatorCompetencyAssessmentService['recordAssessment']>[0],
  ) {
    return this.competencyService.recordAssessment(body);
  }

  @Post('training-requirements')
  createTrainingRequirement(@Body() body: Parameters<TrainingService['createRequirement']>[0]) {
    return this.trainingService.createRequirement(body);
  }

  @Post('training-completions')
  recordTrainingCompletion(@Body() body: Parameters<TrainingService['recordCompletion']>[0]) {
    return this.trainingService.recordCompletion(body);
  }

  @Get('qualifications/:id')
  getQualification(@Param('id') id: string) {
    return this.qualificationService.findById(id);
  }
}
