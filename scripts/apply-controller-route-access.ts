#!/usr/bin/env ts-node
/**
 * Inserts @ControllerRouteAccess on NestJS controllers using domain security profiles.
 *
 * Run: ./node_modules/.bin/ts-node scripts/apply-controller-route-access.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  controllerRouteAccessDecoratorLiteral,
} from '../src/security/route-security-metadata';
import { resolveControllerDomain } from '../src/security/route-access/resolve-controller-domain';

const PROJECT_ROOT = path.resolve(__dirname, '..');
const SRC_ROOT = path.join(PROJECT_ROOT, 'src');

function findControllerFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findControllerFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith('.controller.ts')) {
      results.push(fullPath);
    }
  }
  return results.sort();
}

function collectLeadingDecorators(content: string, controllerIndex: number): string {
  const prefix = content.slice(0, controllerIndex);
  const lines = prefix.split('\n');
  const decoratorLines: string[] = [];

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const trimmed = lines[index]?.trim() ?? '';
    if (!trimmed) {
      if (decoratorLines.length > 0) {
        break;
      }
      continue;
    }
    if (trimmed.startsWith('@')) {
      decoratorLines.unshift(lines[index] ?? '');
      continue;
    }
    break;
  }

  return decoratorLines.join('\n');
}

function relativeImportPath(fromFile: string, toFile: string): string {
  let relative = path.relative(path.dirname(fromFile), toFile).replace(/\\/g, '/');
  if (!relative.startsWith('.')) {
    relative = `./${relative}`;
  }
  return relative.replace(/\.ts$/, '');
}

function ensureImports(content: string, sourceFile: string): string {
  const controllerRouteAccessImportPath = relativeImportPath(
    sourceFile,
    path.join(SRC_ROOT, 'security/decorators/controller-route-access.decorator.ts'),
  );
  const routeClassImportPath = relativeImportPath(
    sourceFile,
    path.join(SRC_ROOT, 'security/route-class.enum.ts'),
  );

  let updated = content;

  if (!/import\s+\{[^}]*ControllerRouteAccess[^}]*\}\s+from/.test(updated)) {
    const importLine = `import { ControllerRouteAccess } from '${controllerRouteAccessImportPath}';\n`;
    updated = insertAfterLastImport(updated, importLine);
  }

  if (!/import\s+\{[^}]*RouteClass[^}]*\}\s+from/.test(updated)) {
    const importLine = `import { RouteClass } from '${routeClassImportPath}';\n`;
    updated = insertAfterLastImport(updated, importLine);
  }

  return updated;
}

function insertAfterLastImport(content: string, importLine: string): string {
  const importPattern = /^import .+;\s*$/gm;
  let lastImportEnd = 0;
  let match: RegExpExecArray | null;
  while ((match = importPattern.exec(content)) !== null) {
    lastImportEnd = match.index + match[0].length;
  }

  if (lastImportEnd === 0) {
    return `${importLine}${content}`;
  }

  return `${content.slice(0, lastImportEnd)}\n${importLine}${content.slice(lastImportEnd)}`;
}

function applyControllerRouteAccess(sourceFile: string): boolean {
  const original = fs.readFileSync(sourceFile, 'utf8');
  if (/@ControllerRouteAccess\s*\(/.test(original)) {
    return false;
  }

  const relativeFromSrc = path.relative(SRC_ROOT, sourceFile).replace(/\\/g, '/');
  const domain = resolveControllerDomain(relativeFromSrc);
  const decoratorLiteral = controllerRouteAccessDecoratorLiteral(domain);

  let content = original;
  let updated = false;
  const controllerIndices: number[] = [];
  const controllerPattern = /@Controller(?!RouteAccess)/g;
  let match: RegExpExecArray | null;

  while ((match = controllerPattern.exec(original)) !== null) {
    controllerIndices.push(match.index);
  }

  for (let index = controllerIndices.length - 1; index >= 0; index -= 1) {
    const controllerIndex = controllerIndices[index] ?? 0;
    const leading = collectLeadingDecorators(content, controllerIndex);
    if (/@ControllerRouteAccess\s*\(/.test(leading)) {
      continue;
    }

    const insertion = `${decoratorLiteral}\n`;
    content = `${content.slice(0, controllerIndex)}${insertion}${content.slice(controllerIndex)}`;
    updated = true;
  }

  if (!updated) {
    return false;
  }

  content = ensureImports(content, sourceFile);
  fs.writeFileSync(sourceFile, content, 'utf8');
  return true;
}

function main(): void {
  const controllerFiles = findControllerFiles(SRC_ROOT);
  let updatedCount = 0;

  for (const file of controllerFiles) {
    if (applyControllerRouteAccess(file)) {
      updatedCount += 1;
      console.log(`Updated ${path.relative(PROJECT_ROOT, file)}`);
    }
  }

  console.log(`Applied @ControllerRouteAccess to ${updatedCount} controller file(s).`);
}

main();
