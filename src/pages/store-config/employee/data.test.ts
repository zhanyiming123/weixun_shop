import { describe, expect, it } from 'vitest';
import {
  buildStoreManagedEmployees,
  buildStoreEmployeeSourceEmployees,
  readStoreExternalEmployeeItems,
  removeStoreEmployeeBinding,
} from './data';
import {
  buildStoreReferencedEmployees,
  getStoreOrgReferenceConfigByStoreId,
} from '@/pages/store-config/org-reference/data';

describe('store employee mock data', () => {
  it('seeds shanghai store employees for the merchant store employee list', () => {
    const shanghaiEmployees = readStoreExternalEmployeeItems('org_store_shanghai_001');

    expect(shanghaiEmployees).toHaveLength(5);
    expect(
      shanghaiEmployees.map((item) => ({
        id: item.id,
        status: item.status,
      }))
    ).toEqual([
      { id: 'store_external_shanghai_002', status: 'enabled' },
      { id: 'store_external_shanghai_003', status: 'enabled' },
      { id: 'store_external_shanghai_005', status: 'disabled' },
      { id: 'store_external_shanghai_001', status: 'enabled' },
      { id: 'store_external_shanghai_004', status: 'enabled' },
    ]);
  });

  it('shows seeded role assignments in the shanghai managed employee list', () => {
    const shanghaiEmployees = buildStoreManagedEmployees('org_store_shanghai_001');
    const seededEmployees = shanghaiEmployees
      .filter((item) => item.id.startsWith('store_external_shanghai_'))
      .map((item) => ({
        id: item.id,
        roleNames: item.roleNames,
      }));

    expect(seededEmployees).toEqual([
      {
        id: 'store_external_shanghai_002',
        roleNames: ['收银员'],
      },
      {
        id: 'store_external_shanghai_003',
        roleNames: ['店员'],
      },
      {
        id: 'store_external_shanghai_005',
        roleNames: ['店员'],
      },
      {
        id: 'store_external_shanghai_001',
        roleNames: ['店长'],
      },
      {
        id: 'store_external_shanghai_004',
        roleNames: ['收银员', '店员'],
      },
    ]);
  });

  it('removes an external employee from the current store while keeping the history record', () => {
    const result = removeStoreEmployeeBinding('org_store_shanghai_001', {
      id: 'store_external_shanghai_002',
      sourceType: 'external_import',
    });
    const removedEmployee = result.externalEmployeeItems.find(
      (item) => item.id === 'store_external_shanghai_002'
    );
    const remainingEmployeeIds = buildStoreEmployeeSourceEmployees(
      'org_store_shanghai_001',
      buildStoreReferencedEmployees('org_store_shanghai_001'),
      result.externalEmployeeItems.filter(
        (item) => item.storeId === 'org_store_shanghai_001' && !item.removedAt
      )
    ).map((item) => item.id);

    expect(removedEmployee?.storeId).toBe('org_store_shanghai_001');
    expect(removedEmployee?.removedAt).toBeTruthy();
    expect(remainingEmployeeIds).not.toContain('store_external_shanghai_002');
    expect(
      result.permissionConfigItems.find(
        (item) =>
          item.storeId === 'org_store_shanghai_001' &&
          item.employeeId === 'store_external_shanghai_002'
      )
    ).toBeUndefined();
  });

  it('excludes an hr-referenced employee from the current store after removal', () => {
    const currentStoreId = 'org_store_suzhou_001';
    const currentEmployee = buildStoreManagedEmployees(currentStoreId).find(
      (item) => item.sourceType === 'hr_reference'
    );

    expect(currentEmployee).toBeTruthy();

    const result = removeStoreEmployeeBinding(currentStoreId, {
      id: currentEmployee!.id,
      sourceType: 'hr_reference',
    });
    const nextConfig = getStoreOrgReferenceConfigByStoreId(
      currentStoreId,
      result.orgConfigItems
    );
    const nextReferencedEmployees = buildStoreReferencedEmployees(
      currentStoreId,
      nextConfig
    );

    expect(nextConfig?.excludedEmployeeIds).toContain(currentEmployee!.id);
    expect(nextReferencedEmployees.map((item) => item.id)).not.toContain(
      currentEmployee!.id
    );
    expect(
      result.permissionConfigItems.find(
        (item) =>
          item.storeId === currentStoreId && item.employeeId === currentEmployee!.id
      )
    ).toBeUndefined();
  });
});
