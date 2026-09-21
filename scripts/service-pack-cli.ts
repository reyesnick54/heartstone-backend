#!/usr/bin/env ts-node
/**
 * HeartStone Service-Pack authoring CLI.
 *
 * Commands:
 *   validate   Validate one or more service-pack manifest files
 *   format     Deterministically format a manifest file
 *   fingerprint Calculate deterministic fingerprint for a manifest
 *   compile    Validate and emit a human-readable compilation report
 *   diff       Compare two manifest versions and flag high-risk changes
 *   compare    Version comparison with fingerprint delta
 *   deps       Generate dependency report
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import { calculateServicePackFingerprint } from '../src/service-catalog/service-packs/calculate-service-pack-fingerprint';
import { formatServicePackManifest } from '../src/service-catalog/service-packs/canonical-json.util';
import { compareServicePackVersions, diffServicePacks } from '../src/service-catalog/service-packs/diff-service-packs';
import { generateCompilationReport } from '../src/service-catalog/service-packs/generate-compilation-report';
import { generateDependencyReport } from '../src/service-catalog/service-packs/generate-dependency-report';
import {
  parseServicePackManifest,
  validateServicePackRaw,
} from '../src/service-catalog/service-packs/validate-service-pack';

const PROJECT_ROOT = path.resolve(__dirname, '..');

function readManifest(filePath: string): unknown {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(PROJECT_ROOT, filePath);
  const raw = fs.readFileSync(absolutePath, 'utf8');
  return JSON.parse(raw) as unknown;
}

function writeFormattedManifest(filePath: string, manifest: unknown): void {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(PROJECT_ROOT, filePath);
  fs.writeFileSync(absolutePath, formatServicePackManifest(manifest), 'utf8');
}

function printJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function usage(): never {
  console.error(`Usage:
  npm run service-pack:validate -- <file...>
  npm run service-pack:format -- <file>
  npm run service-pack:fingerprint -- <file>
  npm run service-pack:compile -- <file>
  npm run service-pack:diff -- <before-file> <after-file>
  npm run service-pack:compare -- <before-file> <after-file>
  npm run service-pack:deps -- <file>
  npm run service-pack:write-templates`);
  process.exit(1);
}

function commandValidate(files: string[]): void {
  let hasErrors = false;

  for (const file of files) {
    const result = validateServicePackRaw(readManifest(file));
    printJson(result);
    if (!result.valid) {
      hasErrors = true;
    }
  }

  if (hasErrors) {
    process.exit(1);
  }
}

function commandFormat(file: string): void {
  const manifest = readManifest(file);
  writeFormattedManifest(file, manifest);
  process.stdout.write(`Formatted ${file}\n`);
}

function commandFingerprint(file: string): void {
  const manifest = parseServicePackManifest(readManifest(file));
  const fingerprint = calculateServicePackFingerprint(manifest);
  printJson({ packId: manifest.packId, packVersion: manifest.packVersion, fingerprint });
}

function commandCompile(file: string): void {
  const manifest = parseServicePackManifest(readManifest(file));
  const report = generateCompilationReport(manifest);
  printJson(report);
}

function commandDiff(beforeFile: string, afterFile: string): void {
  const before = parseServicePackManifest(readManifest(beforeFile));
  const after = parseServicePackManifest(readManifest(afterFile));
  printJson(diffServicePacks(before, after));
}

function commandCompare(beforeFile: string, afterFile: string): void {
  const before = parseServicePackManifest(readManifest(beforeFile));
  const after = parseServicePackManifest(readManifest(afterFile));
  printJson(compareServicePackVersions(before, after));
}

function commandDeps(file: string): void {
  const manifest = parseServicePackManifest(readManifest(file));
  printJson(generateDependencyReport(manifest));
}

function commandWriteTemplates(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { CANONICAL_SERVICE_PACK_TEMPLATES, CANONICAL_TEMPLATE_FILE_NAMES } = require('../src/service-catalog/service-packs/canonical-templates') as {
    CANONICAL_SERVICE_PACK_TEMPLATES: unknown[];
    CANONICAL_TEMPLATE_FILE_NAMES: readonly string[];
  };

  const templatesDir = path.join(PROJECT_ROOT, 'service-packs', 'templates');
  const examplesDir = path.join(PROJECT_ROOT, 'service-packs', 'examples');

  fs.mkdirSync(templatesDir, { recursive: true });
  fs.mkdirSync(examplesDir, { recursive: true });

  CANONICAL_SERVICE_PACK_TEMPLATES.forEach((manifest, index) => {
    const fileName = CANONICAL_TEMPLATE_FILE_NAMES[index];
    if (!fileName) {
      throw new Error(`Missing template file name for index ${index}`);
    }

    const templatePath = path.join(templatesDir, fileName);
    fs.writeFileSync(templatePath, formatServicePackManifest(manifest), 'utf8');

    const examplePath = path.join(examplesDir, fileName);
    fs.writeFileSync(examplePath, formatServicePackManifest(manifest), 'utf8');
  });

  process.stdout.write(`Wrote ${CANONICAL_SERVICE_PACK_TEMPLATES.length} templates and examples.\n`);
}

function main(): void {
  const [, , command, ...args] = process.argv;

  switch (command) {
    case 'validate':
      if (args.length === 0) {
        usage();
      }
      commandValidate(args);
      break;
    case 'format':
      if (args.length !== 1) {
        usage();
      }
      commandFormat(args[0]!);
      break;
    case 'fingerprint':
      if (args.length !== 1) {
        usage();
      }
      commandFingerprint(args[0]!);
      break;
    case 'compile':
      if (args.length !== 1) {
        usage();
      }
      commandCompile(args[0]!);
      break;
    case 'diff':
      if (args.length !== 2) {
        usage();
      }
      commandDiff(args[0]!, args[1]!);
      break;
    case 'compare':
      if (args.length !== 2) {
        usage();
      }
      commandCompare(args[0]!, args[1]!);
      break;
    case 'deps':
      if (args.length !== 1) {
        usage();
      }
      commandDeps(args[0]!);
      break;
    case 'write-templates':
      commandWriteTemplates();
      break;
    default:
      usage();
  }
}

main();
