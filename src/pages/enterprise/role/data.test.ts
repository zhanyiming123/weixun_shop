import { describe, expect, it } from 'vitest';
import {
  getMerchantRoleSystemNames,
  getMerchantRolePermissionTree,
  normalizeEnterpriseRolePermissionKeys,
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
          { key: 'product-config/attribute', title: '类目属性' },
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
    ).toEqual(['商户管理系统']);

    expect(
      getMerchantRoleSystemNames(
        ['store-system.config', 'store-config/employee', 'store-config/role'],
        'store'
      )
    ).toEqual(['店铺管理系统']);
  });
});
