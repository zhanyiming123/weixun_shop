import { describe, expect, it } from 'vitest';
import { applyEmployeeFilters } from './index';
import { StoreManagedEmployeeItem } from './data';

function createManagedEmployee(
  overrides: Partial<StoreManagedEmployeeItem>
): StoreManagedEmployeeItem {
  return {
    id: 'employee-1',
    name: '蔡雨桐',
    account: 'cai.yutong',
    contactPhone: '13912340001',
    isManagement: false,
    readonly: true,
    ownerEmployeeIds: [],
    ownerEmployeeNames: [],
    sourceType: 'external_import',
    sourceDepartmentPath: ['外部导入'],
    status: 'enabled',
    roleIds: ['role-clerk'],
    roleNames: ['店员'],
    manualIncludedEmployeeIds: [],
    manualExcludedEmployeeIds: [],
    autoVisibleEmployeeIds: [],
    autoVisibleEmployeeNames: [],
    effectiveVisibleEmployeeIds: [],
    effectiveVisibleEmployeeNames: [],
    ...overrides,
  };
}

describe('store employee page filters', () => {
  it('does not match employees by department text in the main search', () => {
    const employees = [
      createManagedEmployee({
        sourceDepartmentPath: ['唯寻广州'],
      }),
    ];

    expect(
      applyEmployeeFilters(employees, {
        keyword: '唯寻广州',
        roleId: 'all',
      })
    ).toHaveLength(0);
  });

  it('still matches employees by name, account, and phone', () => {
    const employees = [createManagedEmployee({})];

    expect(
      applyEmployeeFilters(employees, {
        keyword: '蔡雨桐',
        roleId: 'all',
      })
    ).toHaveLength(1);
    expect(
      applyEmployeeFilters(employees, {
        keyword: 'cai.yutong',
        roleId: 'all',
      })
    ).toHaveLength(1);
    expect(
      applyEmployeeFilters(employees, {
        keyword: '13912340001',
        roleId: 'all',
      })
    ).toHaveLength(1);
  });
});
