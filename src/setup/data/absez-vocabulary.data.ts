import { SetupConfigurationLayer, SetupVocabularyKind } from '@prisma/client';

export interface AbsezVocabularyEntryDefinition {
  vocabularyKind: SetupVocabularyKind;
  code: string;
  label: string;
  meaning: string;
  layer: SetupConfigurationLayer;
  configuration?: Record<string, unknown>;
}

export const ABSEZ_SETUP_VOCABULARY: readonly AbsezVocabularyEntryDefinition[] = [
  {
    vocabularyKind: SetupVocabularyKind.CASE_STATUS,
    code: 'ABSEZ-CASE-RECEIVED',
    label: 'Received',
    meaning: 'Case received and awaiting triage.',
    layer: SetupConfigurationLayer.INSTITUTION,
  },
  {
    vocabularyKind: SetupVocabularyKind.CASE_STATUS,
    code: 'ABSEZ-CASE-IN-PROGRESS',
    label: 'In progress',
    meaning: 'Case under active processing.',
    layer: SetupConfigurationLayer.INSTITUTION,
  },
  {
    vocabularyKind: SetupVocabularyKind.CASE_STATUS,
    code: 'ABSEZ-CASE-PENDING-EXTERNAL',
    label: 'Pending external determination',
    meaning: 'Awaiting retained national or external authority outcome.',
    layer: SetupConfigurationLayer.INSTITUTION,
  },
  {
    vocabularyKind: SetupVocabularyKind.SERVICE_STATUS,
    code: 'ABSEZ-SVC-CONFIGURED',
    label: 'Configured',
    meaning: 'Service configuration loaded from setup package.',
    layer: SetupConfigurationLayer.INSTITUTION,
  },
  {
    vocabularyKind: SetupVocabularyKind.SERVICE_STATUS,
    code: 'ABSEZ-SVC-NOT-ACTIVATED',
    label: 'Not activated',
    meaning: 'Service definition present but not operationally activated.',
    layer: SetupConfigurationLayer.INSTITUTION,
  },
  {
    vocabularyKind: SetupVocabularyKind.READINESS_LABEL,
    code: 'ABSEZ-READY-CONFIG-ONLY',
    label: 'Configuration only',
    meaning: 'Institution configured; operational readiness not asserted.',
    layer: SetupConfigurationLayer.INSTITUTION,
  },
  {
    vocabularyKind: SetupVocabularyKind.WORKFLOW_LABEL,
    code: 'ABSEZ-WF-PROTOCOL-BASELINE',
    label: 'Protocol baseline workflow',
    meaning: 'Workflow selection key mapped from Implementation Protocol categories.',
    layer: SetupConfigurationLayer.INSTITUTION,
  },
  {
    vocabularyKind: SetupVocabularyKind.INSTITUTIONAL_LABEL,
    code: 'ABSEZ-LABEL-ZONE-AUTHORITY',
    label: 'Zone authority institution',
    meaning: 'Institution type label for ABSEZ authority configuration.',
    layer: SetupConfigurationLayer.INSTITUTION,
  },
] as const;
