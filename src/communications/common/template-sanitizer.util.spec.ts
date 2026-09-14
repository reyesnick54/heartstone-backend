import { TemplateInjectionException } from './communications.exceptions';
import { assertSafeTemplateContent } from './template-sanitizer.util';

describe('communication template sanitizer', () => {
  it('rejects template injection patterns', () => {
    expect(() => {
      assertSafeTemplateContent('body', '<script>alert(1)</script>');
    }).toThrow(TemplateInjectionException);
    expect(() => {
      assertSafeTemplateContent('body', '{{userInput}}');
    }).toThrow(TemplateInjectionException);
  });
});
