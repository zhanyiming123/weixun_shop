import { describe, expect, it } from 'vitest';
import {
  buildEnterpriseRoleCopyDraft,
  getMerchantRoleEnabledSystemNames,
  getMerchantRoleLegacyPermissionState,
  getMerchantRolePermissionConfigs,
  getMerchantRoleSystemNames,
  getMerchantRolePermissionTitlesBySystem,
  getMerchantRolePermissionTree,
  getDefaultMerchantRolePermissionConfigs,
  isMerchantRolePermissionSystemConfigured,
  normalizeEnterpriseRolePermissionKeys,
  patchMerchantRolePermissionConfigs,
} from './data';

describe('merchant role permission tree', () => {
  it('keeps store-system menus and action-level permissions aligned with the marked UI', () => {
    expect(getMerchantRolePermissionTree('store')).toEqual([
      {
        key: 'store-system.product',
        title: '商品管理',
        children: [
          {
            key: 'product/list',
            title: '商品库',
            children: [
              { key: 'product/list/view', title: '查看商品' },
              { key: 'product/list/create', title: '新增商品' },
              { key: 'product/list/edit', title: '编辑商品' },
            ],
          },
          {
            key: 'product/combo',
            title: '组合商品',
            children: [
              { key: 'product/combo/view', title: '查看组合商品' },
              { key: 'product/combo/create', title: '新增组合商品' },
              { key: 'product/combo/edit', title: '编辑组合商品' },
            ],
          },
          {
            key: 'product/bundle',
            title: '商品套餐',
            children: [{ key: 'product/bundle/create', title: '新建套餐' }],
          },
          { key: 'product/share-pool', title: '商品共享池' },
        ],
      },
      {
        key: 'store-system.order',
        title: '订单管理',
        children: [{ key: 'order/list', title: '订单列表' }],
      },
      {
        key: 'store-system.after-sales',
        title: '售后管理',
        children: [{ key: 'after-sales/list', title: '售后列表' }],
      },
      {
        key: 'store-system.marketing',
        title: '营销管理',
        children: [
          {
            key: 'marketing/center',
            title: '营销中心',
            children: [
              { key: 'marketing/center/coupon/view', title: '查看优惠券' },
              { key: 'marketing/center/coupon/create', title: '新增优惠券' },
              { key: 'marketing/center/coupon/edit', title: '修改优惠券' },
              { key: 'marketing/center/coupon/void', title: '作废优惠券' },
            ],
          },
        ],
      },
      {
        key: 'store-system.config',
        title: '店铺配置',
        children: [
          {
            key: 'store-config/employee',
            title: '店铺员工',
            children: [
              { key: 'store-config/employee/create', title: '新建员工' },
              { key: 'store-config/employee/edit', title: '编辑员工' },
              { key: 'store-config/employee/remove', title: '移除员工' },
            ],
          },
          {
            key: 'store-config/role',
            title: '店铺角色',
            children: [
              { key: 'store-config/role/create', title: '新增角色' },
              { key: 'store-config/role/edit', title: '编辑角色' },
            ],
          },
          { key: 'store-config/department', title: '店铺组织' },
          { key: 'store-config/org-reference', title: '组织架构引用' },
          { key: 'store-config/basic', title: '店铺基础配置' },
        ],
      },
    ]);
  });

  it('keeps order and after-sales out of the merchant system tree', () => {
    expect(getMerchantRolePermissionTree('merchant')).toEqual([
      { key: 'merchant/organization', title: '店铺管理' },
      {
        key: 'merchant-system.product-config',
        title: '商品配置',
        children: [
          { key: 'product-config/category', title: '商品分类' },
          { key: 'product-config/catalog', title: '商品类目' },
          { key: 'product-config/attribute', title: '类目属性字段' },
          { key: 'product-config/attribute-template', title: '类目属性模板' },
          { key: 'product-config/spec', title: '商品规格' },
        ],
      },
      {
        key: 'merchant-system.marketing',
        title: '营销管理',
        children: [{ key: 'merchant/marketing/center', title: '营销中心' }],
      },
      {
        key: 'merchant-system.permission',
        title: '权限管理',
        children: [
          { key: 'merchant/employee', title: '员工管理' },
          { key: 'merchant/store-employee', title: '店铺员工' },
          { key: 'merchant/role', title: '员工角色' },
          { key: 'merchant/department', title: '部门管理' },
        ],
      },
      {
        key: 'merchant-system.system-settings',
        title: '系统设置',
        children: [
          { key: 'merchant/system-menu-config', title: '系统菜单配置' },
          {
            key: 'merchant/data-permission-module-config',
            title: '数据权限模块配置',
          },
        ],
      },
    ]);
  });

  it('maps legacy merchant order and after-sales permissions back to the store system', () => {
    expect(
      normalizeEnterpriseRolePermissionKeys(
        [
          'permission.order-management',
          'permission.after-sales-management',
          'merchant-system.order',
          'merchant/order/list',
          'merchant-system.after-sales',
          'merchant/after-sales/list',
          'order/list',
          'after-sales/list',
        ],
        'headquarter',
        'merchant'
      )
    ).toEqual([
      'store-system.order',
      'order/list',
      'store-system.after-sales',
      'after-sales/list',
    ]);
  });

  it('derives a single system label for merchant and store role datasets', () => {
    expect(
      getMerchantRoleSystemNames(
        ['merchant-system.permission', 'merchant/role', 'merchant/department'],
        'headquarter'
      )
    ).toEqual(['电商管理工作台']);

    expect(
      getMerchantRoleSystemNames(
        ['store-system.config', 'store-config/employee', 'store-config/role'],
        'store'
      )
    ).toEqual(['店铺运营工作台']);
  });

  it('migrates legacy merchant role permissions into per-system configs', () => {
    const configs = getMerchantRolePermissionConfigs({
      scope: 'headquarter',
      dataPermissions: { viewScope: 'all' },
      functionPermissionKeys: [
        'merchant-system.permission',
        'merchant/role',
        'store-system.config',
        'store-config/role',
      ],
    });

    expect(configs.merchant.dataPermissions.viewScope).toBe('all');
    expect(configs.store.dataPermissions.viewScope).toBe('all');
    expect(configs.merchant.dataPermissionModuleScopes).toEqual({
      module_merchant_goods: 'all',
      module_merchant_multi_goods: 'all',
    });
    expect(configs.store.dataPermissionModuleScopes).toEqual({
      module_store_sales_order: 'all',
    });
    expect(configs.merchant.functionPermissionKeys).toEqual([
      'merchant-system.permission',
      'merchant/employee',
      'merchant/store-employee',
      'merchant/role',
      'merchant/department',
    ]);
    expect(configs.store.functionPermissionKeys).toEqual([
      'store-system.config',
      'store-config/employee',
      'store-config/employee/create',
      'store-config/employee/edit',
      'store-config/employee/remove',
      'store-config/role',
      'store-config/role/create',
      'store-config/role/edit',
      'store-config/department',
      'store-config/org-reference',
      'store-config/basic',
    ]);
  });

  it('merges per-system configs back into the legacy permission snapshot', () => {
    const legacyPermissionState = getMerchantRoleLegacyPermissionState(
      {
        merchant: {
          dataPermissions: { viewScope: 'all' },
          dataPermissionModuleScopes: {},
          functionPermissionKeys: ['merchant-system.permission', 'merchant/role'],
        },
        store: {
          dataPermissions: { viewScope: 'department' },
          dataPermissionModuleScopes: {},
          functionPermissionKeys: ['store-system.config', 'store-config/role'],
        },
      },
      'headquarter'
    );

    expect(legacyPermissionState.dataPermissions.viewScope).toBe('all');
    expect(legacyPermissionState.functionPermissionKeys).toEqual([
      'store-system.config',
      'store-config/employee',
      'store-config/employee/create',
      'store-config/employee/edit',
      'store-config/employee/remove',
      'store-config/role',
      'store-config/role/create',
      'store-config/role/edit',
      'store-config/department',
      'store-config/org-reference',
      'store-config/basic',
      'merchant-system.permission',
      'merchant/employee',
      'merchant/store-employee',
      'merchant/role',
      'merchant/department',
    ]);
  });

  it('derives enabled systems and titles from the new merchant permission config model', () => {
    const role = {
      scope: 'headquarter' as const,
      dataPermissions: { viewScope: 'department' as const },
      functionPermissionKeys: [],
      merchantPermissionConfigs: {
        merchant: {
          dataPermissions: { viewScope: 'all' as const },
          dataPermissionModuleScopes: {},
          functionPermissionKeys: ['merchant-system.permission', 'merchant/role'],
        },
        store: {
          dataPermissions: { viewScope: 'department' as const },
          dataPermissionModuleScopes: {},
          functionPermissionKeys: ['store-system.config', 'store-config/role'],
        },
      },
    };

    expect(getMerchantRoleEnabledSystemNames(role)).toEqual([
      '电商管理工作台',
      '店铺运营工作台',
    ]);
    expect(getMerchantRolePermissionTitlesBySystem(role, 'merchant')).toEqual([
      '权限管理',
      '员工管理',
      '店铺员工',
      '员工角色',
      '部门管理',
    ]);
    expect(getMerchantRolePermissionTitlesBySystem(role, 'store')).toEqual([
      '店铺配置',
      '店铺员工',
      '新建员工',
      '编辑员工',
      '移除员工',
      '店铺角色',
      '新增角色',
      '编辑角色',
      '店铺组织',
      '组织架构引用',
      '店铺基础配置',
    ]);
  });

  it('keeps module data scopes unselected by default for new merchant role configs', () => {
    const configs = getDefaultMerchantRolePermissionConfigs('headquarter');

    expect(configs.merchant.dataPermissionModuleScopes).toEqual({});
    expect(configs.store.dataPermissionModuleScopes).toEqual({});
  });

  it('treats a system with only data ranges configured as enabled', () => {
    const role = {
      scope: 'headquarter' as const,
      dataPermissions: { viewScope: 'department' as const },
      functionPermissionKeys: [],
      merchantPermissionConfigs: {
        merchant: {
          dataPermissions: { viewScope: 'department' as const },
          dataPermissionModuleScopes: {
            module_merchant_goods: 'self' as const,
          },
          functionPermissionKeys: [],
        },
        store: {
          dataPermissions: { viewScope: 'department' as const },
          dataPermissionModuleScopes: {},
          functionPermissionKeys: [],
        },
      },
    };

    expect(isMerchantRolePermissionSystemConfigured(role, 'merchant')).toBe(true);
    expect(isMerchantRolePermissionSystemConfigured(role, 'store')).toBe(false);
    expect(getMerchantRoleEnabledSystemNames(role)).toEqual(['电商管理工作台']);
  });

  it('updates only the selected system when batch-setting data permission scopes', () => {
    const nextConfigs = patchMerchantRolePermissionConfigs(
      getDefaultMerchantRolePermissionConfigs('headquarter'),
      'merchant',
      {
        dataPermissionModuleScopes: {
          module_merchant_goods: 'department',
          module_merchant_multi_goods: 'department',
        },
      },
      'headquarter'
    );

    expect(nextConfigs.merchant.dataPermissionModuleScopes).toEqual({
      module_merchant_goods: 'department',
      module_merchant_multi_goods: 'department',
    });
    expect(nextConfigs.store.dataPermissionModuleScopes).toEqual({});
  });

  it('builds a copy draft with copied permissions and a suffix name', () => {
    const draft = buildEnterpriseRoleCopyDraft({
      id: 'role_merchant_marketing_admin',
      scope: 'headquarter',
      name: '营销管理员',
      description: '负责营销活动',
      employeeCount: 4,
      isDefault: true,
      dataPermissions: { viewScope: 'department' },
      functionPermissionKeys: ['merchant-system.marketing'],
      merchantPermissionConfigs: {
        merchant: {
          dataPermissions: { viewScope: 'department' },
          dataPermissionModuleScopes: {
            module_merchant_goods: 'self',
          },
          functionPermissionKeys: ['merchant-system.marketing'],
        },
        store: {
          dataPermissions: { viewScope: 'department' },
          dataPermissionModuleScopes: {},
          functionPermissionKeys: [],
        },
      },
      createdAt: '2026-04-08 09:30:00',
      updatedAt: '2026-04-08 09:30:00',
    });

    expect(draft.name).toBe('营销管理员-副本');
    expect(draft.description).toBe('负责营销活动');
    expect(draft.merchantPermissionConfigs?.merchant.dataPermissionModuleScopes).toEqual({
      module_merchant_goods: 'self',
    });
    expect(draft.merchantPermissionConfigs?.store.dataPermissionModuleScopes).toEqual({});
  });
});
