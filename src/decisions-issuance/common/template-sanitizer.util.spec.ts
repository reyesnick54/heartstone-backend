import { TemplateInjectionException } from './exceptions/issuance.exceptions';
import { assertSafeTemplateContent, validateFreeFormFields } from './template-sanitizer.util';

describe('template sanitizer', () => {
  it('rejects script injection in free-form fields', () => {
    expect(() => {
      assertSafeTemplateContent('holderName', '<script>alert(1)</script>');
    }).toThrow(TemplateInjectionException);
  });

  it('sanitizes allowed free-form fields only', () => {
    const result = validateFreeFormFields({ holderName: 'Acme Ltd', extra: 'ignored' }, [
      'holderName',
    ]);

    expect(result).toEqual({ holderName: 'Acme Ltd' });
    expect(result.extra).toBeUndefined();
  });
});
