/** Five-level escalation framework (configuration only — not scattered constants). */
export interface AbsezEscalationLevelDefinition {
  levelNumber: number;
  code: string;
  label: string;
  policyConfiguration: Record<string, unknown>;
}

export const ABSEZ_ESCALATION_LEVELS: readonly AbsezEscalationLevelDefinition[] = [
  {
    levelNumber: 1,
    code: 'ABSEZ-ESC-L1',
    label: 'Level 1 — Case Officer',
    policyConfiguration: {
      ladderCode: 'ABSEZ-ESC-LADDER',
      notifyRoles: ['CASE_OFFICER'],
      autoEscalateOnSlaBreach: true,
    },
  },
  {
    levelNumber: 2,
    code: 'ABSEZ-ESC-L2',
    label: 'Level 2 — Team Supervisor',
    policyConfiguration: {
      ladderCode: 'ABSEZ-ESC-LADDER',
      notifyRoles: ['TEAM_SUPERVISOR'],
      requiresSupervisorAcknowledgement: true,
    },
  },
  {
    levelNumber: 3,
    code: 'ABSEZ-ESC-L3',
    label: 'Level 3 — Department Head',
    policyConfiguration: {
      ladderCode: 'ABSEZ-ESC-LADDER',
      notifyRoles: ['DEPARTMENT_HEAD'],
      requiresDepartmentHeadReview: true,
    },
  },
  {
    levelNumber: 4,
    code: 'ABSEZ-ESC-L4',
    label: 'Level 4 — Executive Management',
    policyConfiguration: {
      ladderCode: 'ABSEZ-ESC-LADDER',
      notifyRoles: ['EXECUTIVE_MANAGEMENT'],
      requiresExecutiveBrief: true,
    },
  },
  {
    levelNumber: 5,
    code: 'ABSEZ-ESC-L5',
    label: 'Level 5 — Chief Executive / Board Liaison',
    policyConfiguration: {
      ladderCode: 'ABSEZ-ESC-LADDER',
      notifyRoles: ['CHIEF_EXECUTIVE', 'ADVISORY_COMMITTEE_LIAISON'],
      requiresBoardLiaisonNotice: true,
    },
  },
] as const;
