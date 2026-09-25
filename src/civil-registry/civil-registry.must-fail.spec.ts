import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  AuthorityEvaluationOutcome,
  CivilRecordAmendmentBasis,
  CivilRecordCorrectionRequestStatus,
  CivilRegistryAccessClassification,
  VitalEventRegistrationStatus,
  VitalEventType,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { CivilRecordAmendmentService } from './amendments/civil-record-amendment.service';
import { CivilRegistryAuditService } from './audit/civil-registry-audit.service';
import { CivilRegistryCertificateService } from './certificates/civil-registry-certificate.service';
import { PLATFORM_ADMIN_ROLE_MARKER } from './civil-registry.constants';
import { CivilRegistryClassificationAccessService } from './common/civil-registry-access.service';
import { CivilRegistryBoundaryService } from './common/civil-registry-boundary.service';
import { CivilRegistryCanonicalPathService } from './common/civil-registry-canonical-path.service';
import { CivilRecordCorrectionService } from './corrections/civil-record-correction.service';
import { VitalEventIntakeService } from './intake/vital-event-intake.service';
import { CivilRegistryReadService } from './queries/civil-registry-read.service';
import { CivilRegistryRegistrationService } from './registration/civil-registry-registration.service';

// TRUNCATED - need full file
