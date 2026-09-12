import {
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';

export class ServiceNotStartableException extends UnprocessableEntityException {
  constructor(message = 'Service is not available for new applications') {
    super(message);
  }
}

export class VersionSupersededSubmissionException extends ConflictException {
  constructor(
    message = 'Service version or configuration fingerprint is no longer valid for submission',
  ) {
    super(message);
  }
}

export class InvalidFormVersionException extends UnprocessableEntityException {
  constructor(message = 'Form version is not valid for submission') {
    super(message);
  }
}

export class DuplicateSubmissionException extends ConflictException {
  constructor(message = 'Duplicate idempotency key for submission') {
    super(message);
  }
}

export class ImmutableSubmissionException extends ForbiddenException {
  constructor(message = 'Submitted application snapshot cannot be modified') {
    super(message);
  }
}

export class RepresentativeAuthorityInvalidException extends ForbiddenException {
  constructor(message = 'Representative authority is not valid for this submission') {
    super(message);
  }
}

export class CaseAccessDeniedException extends ForbiddenException {
  constructor(message = 'Access to this case is not permitted') {
    super(message);
  }
}

export class WorkflowGateBlockedException extends ForbiddenException {
  constructor(message = 'Workflow gate cannot proceed') {
    super(message);
  }
}

export class WorkflowSuspendedException extends ForbiddenException {
  constructor(message = 'Workflow is suspended and cannot accept runtime actions') {
    super(message);
  }
}

export class ConsequentialAuthorityRequiredException extends ForbiddenException {
  constructor(message = 'Consequential step requires institutional authority evaluation') {
    super(message);
  }
}

export class InvalidWorkflowTransitionException extends ForbiddenException {
  constructor(message = 'Requested workflow transition is not permitted') {
    super(message);
  }
}

export class WorkflowStepAlreadyCompletedException extends ConflictException {
  constructor(message = 'Workflow step has already been completed') {
    super(message);
  }
}

export class SafeHaltedWorkflowException extends ForbiddenException {
  constructor(message = 'Workflow is safe-halted and cannot continue normal processing') {
    super(message);
  }
}
