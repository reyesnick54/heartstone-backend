import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { DepartmentReadinessService } from './department-readiness.service';

@Controller('production-readiness/readiness')
export class ReadinessController {
  constructor(private readonly departmentReadinessService: DepartmentReadinessService) {}

  @Post('department-assessments')
  assessDepartment(@Body() body: Parameters<DepartmentReadinessService['assessDepartment']>[0]) {
    return this.departmentReadinessService.assessDepartment(body);
  }

  @Post('staffing-assessments')
  assessStaffing(@Body() body: Parameters<DepartmentReadinessService['assessStaffing']>[0]) {
    return this.departmentReadinessService.assessStaffing(body);
  }

  @Get('department-assessments/:id')
  getDepartmentAssessment(@Param('id') id: string) {
    return this.departmentReadinessService.findById(id);
  }
}
