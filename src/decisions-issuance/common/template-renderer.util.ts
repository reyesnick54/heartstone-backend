import { createHash } from 'node:crypto';

import { sanitizeFreeFormFieldValue } from './template-sanitizer.util';

export interface TemplateRenderInput {
  contentTemplate: string;
  controlledFields: Record<string, string>;
  computedFields: Record<string, string>;
  freeFormFields: Record<string, string>;
}

export function renderInstrumentTemplate(input: TemplateRenderInput): {
  renderedContent: string;
  contentHash: string;
} {
  let content = input.contentTemplate;

  const allFields = {
    ...input.controlledFields,
    ...input.computedFields,
    ...input.freeFormFields,
  };

  for (const [key, value] of Object.entries(allFields)) {
    const safeValue = sanitizeFreeFormFieldValue(value);
    content = content.replaceAll(`[[${key}]]`, safeValue);
  }

  const contentHash = createHash('sha256').update(content, 'utf8').digest('hex');
  return { renderedContent: content, contentHash };
}
