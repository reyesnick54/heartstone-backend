export type WorkflowConditionOperator = 'EQ' | 'NEQ' | 'IN' | 'NOT_IN';

export interface WorkflowConditionClauseV1 {
  field: string;
  op: WorkflowConditionOperator;
  value: string | string[];
}

export interface WorkflowConditionConfigV1 {
  version: 1;
  join: 'AND' | 'OR';
  rules: WorkflowConditionClauseV1[];
}
