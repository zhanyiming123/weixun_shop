import { describe, expect, it } from 'vitest';
import {
  filterMerchantRoleItems,
  getMerchantRoleCreateScope,
  getMerchantRoleListTabPath,
  getMerchantRoleScopeByType,
  getMerchantRoleTypeByScope,
  normalizeMerchantRoleTab,
  supportsMerchantRoleBatchSelection,
} from './tab-config';

describe('merchant role tab config', () => {
  it('maps scope-style query values back to the expected tab', () => {
    expect(normalizeMerchantRoleTab('merchant')).toBe('merchant');
    expect(normalizeMerchantRoleTab('headquarter')).toBe('merchant');
    expect(normalizeMerchantRoleTab('region')).toBe('merchant');
    expect(normalizeMerchantRoleTab('store')).toBe('store');
    expect(normalizeMerchantRoleTab(undefined)).toBe('merchant');
  });

  it('filters role items by tab and keeps default roles first', () => {
    const items = filterMerchantRoleItems(
      [
        {
          id: 'region-role',
          scope: 'region',
          name: '区域运营',
          description: '',
          employeeCount: 2,
          isDefault: false,
          dataPermissions: { viewScope: 'department' },
          functionPermissionKeys: [],
          createdAt: '2026-04-08 09:00:00',
          updatedAt: '2026-04-08 09:00:00',
        },
        {
          id: 'store-role',
          scope: 'store',
          name: '店长',
          description: '',
          employeeCount: 3,
          isDefault: true,
          dataPermissions: { viewScope: 'department' },
          functionPermissionKeys: [],
          createdAt: '2026-04-08 10:00:00',
          updatedAt: '2026-04-08 10:00:00',
        },
        {
          id: 'merchant-default',
          scope: 'headquarter',
          name: '商户管理员',
          description: '',
          employeeCount: 1,
          isDefault: true,
          dataPermissions: { viewScope: 'department' },
          functionPermissionKeys: [],
          merchantPermissionConfigs: {
            merchant: {
              dataPermissions: { viewScope: 'department' },
              dataPermissionModuleScopes: {},
              functionPermissionKeys: ['merchant-system.permission'],
            },
            store: {
              dataPermissions: { viewScope: 'department' },
              dataPermissionModuleScopes: {},
              functionPermissionKeys: [],
            },
          },
          createdAt: '2026-04-08 11:00:00',
          updatedAt: '2026-04-08 11:00:00',
        },
        {
          id: 'role_merchant_region_director',
          scope: 'region',
          name: '区域经营总监',
          description: '',
          employeeCount: 4,
          isDefault: true,
          dataPermissions: { viewScope: 'department' },
          functionPermissionKeys: [],
          createdAt: '2026-04-08 11:10:00',
          updatedAt: '2026-04-08 11:10:00',
        },
      ],
      'merchant'
    );

    expect(items.map((item) => item.id)).toEqual(['role_merchant_region_director']);
  });

  it('keeps only store-scope items in the store tab', () => {
    const items = filterMerchantRoleItems(
      [
        {
          id: 'role_store_manager',
          scope: 'store',
          name: '店长',
          description: '',
          employeeCount: 3,
          isDefault: true,
          dataPermissions: { viewScope: 'department' },
          functionPermissionKeys: [],
          createdAt: '2026-04-08 10:00:00',
          updatedAt: '2026-04-08 10:00:00',
        },
        {
          id: 'role_merchant_super_admin',
          scope: 'headquarter',
          name: '商户超级管理员',
          description: '',
          employeeCount: 1,
          isDefault: true,
          dataPermissions: { viewScope: 'all' },
          functionPermissionKeys: [],
          createdAt: '2026-04-08 11:00:00',
          updatedAt: '2026-04-08 11:00:00',
        },
      ],
      'store'
    );

    expect(items.map((item) => item.id)).toEqual(['role_store_manager']);
  });

  it('returns the correct create scope and tab path', () => {
    expect(getMerchantRoleCreateScope('merchant')).toBe('headquarter');
    expect(getMerchantRoleCreateScope('store')).toBe('store');
    expect(getMerchantRoleTypeByScope('headquarter')).toBe('merchant');
    expect(getMerchantRoleTypeByScope('store')).toBe('store');
    expect(getMerchantRoleScopeByType('merchant')).toBe('headquarter');
    expect(getMerchantRoleScopeByType('store')).toBe('store');
    expect(getMerchantRoleListTabPath('/merchant/role', 'store')).toBe(
      '/merchant/role?tab=store'
    );
  });

  it('enables batch selection only for the merchant tab', () => {
    expect(supportsMerchantRoleBatchSelection('merchant')).toBe(true);
    expect(supportsMerchantRoleBatchSelection('store')).toBe(false);
  });
});
