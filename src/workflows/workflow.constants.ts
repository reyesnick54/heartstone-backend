import { WorkflowVersionStatus } from '@prisma/client';

export const NON_PRODUCTION_WORKFLOW_FIXTURE_MARKER = 'NON_PRODUCTION_WORKFLOW_TEST_ONLY';

export const IMMUTABLE_WORKFLOW_VERSION_STATUSES: readonly WorkflowVersionStatus[] = [
  WorkflowVersionStatus.APPROVED,
  WorkflowVersionStatus.SUSPENDED,
  WorkflowVersionStatus.SUPERSEDED,
];

export const WORKFLOW_INSTANCE_STARTABLE_STATUSES: readonly WorkflowVersionStatus[] = [
  WorkflowVersionStatus.APPROVED,
];

export const UNSAFE_CONDITION_KEYS = [
  'eval',
  'function',
  'script',
  'code',
  'javascript',
  'js',
  '__proto__',
  'constructor',
  'prototype',
] as const;

export const DECISION_AUTHORITY_ACTIONS = ['DECIDE', 'APPROVE', 'SIGN'] as const;
