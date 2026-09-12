import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'eslint.config.mjs',
      'src/application-processing/cases/timeline/**',
      'src/application-processing/cases/case-foundation.service.ts',
      'src/applications/workflow/workflow-transition-evaluator.service.ts',
      'src/applications/workflow/workflow-transition-evaluator.service.spec.ts',
      'src/workflows/**',
      'src/applications/fixtures/**',
      'test/application-processing-phase-6g.integration-spec.ts',
      'test/applications-phase-6d.integration-spec.ts',
      'test/workflows.integration-spec.ts',
      'test/phase-6-applications-workflow.e2e-spec.ts',
      'test/phase-6-applications-workflow.must-fail.e2e-spec.ts',
      'test/applications-completeness-review.e2e-spec.ts',
      'test/helpers/phase-6-test-fixtures.ts',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  eslintConfigPrettier,
  {
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
        },
      ],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        {
          checksVoidReturn: {
            attributes: false,
          },
        },
      ],
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',
    },
  },
  {
    files: ['**/*.module.ts'],
    rules: {
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
);
