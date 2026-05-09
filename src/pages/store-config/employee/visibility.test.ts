import { describe, expect, it } from 'vitest';
import {
  isStoreEmployeeCreateActionVisible,
  isStoreEmployeeRowActionVisible,
} from './visibility';

describe('store employee visibility rules', () => {
  it('hides create action in store management system view only', () => {
    expect(isStoreEmployeeCreateActionVisible('store')).toBe(false);
    expect(isStoreEmployeeCreateActionVisible('merchant')).toBe(true);
    expect(isStoreEmployeeCreateActionVisible()).toBe(true);
  });

  it('keeps only edit row action in store management system view', () => {
    expect(isStoreEmployeeRowActionVisible('编辑', 'store')).toBe(true);
    expect(isStoreEmployeeRowActionVisible('移除', 'store')).toBe(false);
    expect(isStoreEmployeeRowActionVisible('编辑', 'merchant')).toBe(true);
    expect(isStoreEmployeeRowActionVisible('移除', 'merchant')).toBe(true);
  });
});
