import { describe, expect, it } from 'vitest';
import {
  shouldShowComboInventoryFields,
  type ProductCreateMode,
} from './inventory-field-visibility';

describe('shouldShowComboInventoryFields', () => {
  const cases: Array<[ProductCreateMode, boolean]> = [
    ['create', false],
    ['copy', false],
    ['edit', false],
  ];

  it.each(cases)(
    'returns %s for %s mode',
    (pageMode, expected) => {
      expect(shouldShowComboInventoryFields(pageMode)).toBe(expected);
    }
  );
});
