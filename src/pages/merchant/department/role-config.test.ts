import { describe, expect, it } from 'vitest';
import { readProductStoreItems } from '@/pages/product/store-config/data';
import {
  ALL_STORES_TREE_VALUE,
  buildMerchantRoleLabelMap,
  buildMerchantRoleOptions,
  buildMerchantStoreTreeData,
  buildSelectableMerchantStoreTreeData,
  buildStoreRoleOptions,
  collectConfiguredStoreIds,
  getMerchantRoleDisplay,
  normalizeMerchantRoleIds,
  normalizeMerchantStoreScopeIds,
  validateMerchantStoreRoleBindings,
} from './role-config';

describe('merchant department role config helpers', () => {
  it('filters merchant and store role options by tab rules', () => {
    const merchantRoles = buildMerchantRoleOptions();
    const storeRoles = buildStoreRoleOptions();

    expect(
      merchantRoles.some((item) => item.value === 'role_merchant_super_admin')
    ).toBe(true);
    expect(merchantRoles.some((item) => item.value === 'role_store_manager')).toBe(
      false
    );
    expect(storeRoles.some((item) => item.value === 'role_store_manager')).toBe(
      true
    );
    expect(storeRoles.some((item) => item.value === 'role_merchant_super_admin')).toBe(
      false
    );
  });

  it('builds a store tree with the all stores root node', () => {
    const storeItems = readProductStoreItems();
    const treeData = buildMerchantStoreTreeData(storeItems);

    expect(treeData).toHaveLength(1);
    expect(treeData[0]).toMatchObject({
      key: ALL_STORES_TREE_VALUE,
      value: ALL_STORES_TREE_VALUE,
      title: '全部',
    });
    expect(treeData[0].children).toHaveLength(storeItems.length);
  });

  it('expands the all stores node to every store id', () => {
    const storeItems = readProductStoreItems();

    expect(
      normalizeMerchantStoreScopeIds([ALL_STORES_TREE_VALUE], storeItems)
    ).toEqual(storeItems.map((item) => item.id));
  });

  it('normalizes merchant role ids from string and array values', () => {
    expect(normalizeMerchantRoleIds('role_merchant_admin')).toEqual([
      'role_merchant_admin',
    ]);
    expect(
      normalizeMerchantRoleIds([
        'role_merchant_admin',
        { value: 'role_merchant_admin' },
        'role_merchant_ops',
      ])
    ).toEqual(['role_merchant_admin', 'role_merchant_ops']);
  });

  it('builds merchant role display text from configured role ids', () => {
    const roleLabelMap = buildMerchantRoleLabelMap();

    expect(getMerchantRoleDisplay(['role_merchant_super_admin'], roleLabelMap)).toBe(
      '商户超级管理员'
    );
    expect(
      getMerchantRoleDisplay(
        ['role_merchant_super_admin', 'role_merchant_permission_admin'],
        roleLabelMap
      )
    ).toBe('商户超级管理员、权限管理员');
  });

  it('collects configured stores from other bindings only', () => {
    expect(
      Array.from(
        collectConfiguredStoreIds(
          [
            {
              id: 'binding_1',
              storeIds: ['store_xiangmu'],
              storeRoleIds: ['role_store_manager'],
            },
            {
              id: 'binding_2',
              storeIds: ['store_qingshao'],
              storeRoleIds: ['role_store_sales'],
            },
          ],
          'binding_2',
          readProductStoreItems()
        )
      )
    ).toEqual(['store_xiangmu']);
  });

  it('disables stores already configured in other rows', () => {
    const treeData = buildSelectableMerchantStoreTreeData(
      [
        {
          id: 'binding_1',
          storeIds: ['store_xiangmu'],
          storeRoleIds: ['role_store_manager'],
        },
        {
          id: 'binding_2',
          storeIds: ['store_qingshao'],
          storeRoleIds: ['role_store_sales'],
        },
      ],
      'binding_2',
      readProductStoreItems()
    );
    const rootNode = treeData[0];
    const xiangmuNode = rootNode.children?.find(
      (item) => item.value === 'store_xiangmu'
    );
    const qingshaoNode = rootNode.children?.find(
      (item) => item.value === 'store_qingshao'
    );

    expect(rootNode.disabled).toBe(true);
    expect(xiangmuNode?.disabled).toBe(true);
    expect(qingshaoNode?.disabled).toBe(false);
  });

  it('rejects incomplete store role bindings', () => {
    expect(
      validateMerchantStoreRoleBindings(
        [
          {
            id: 'binding_1',
            storeIds: ['store_xiangmu'],
            storeRoleIds: [],
          },
        ],
        readProductStoreItems()
      ).errorCode
    ).toBe('incomplete');
  });

  it('rejects duplicate stores across bindings', () => {
    const result = validateMerchantStoreRoleBindings(
      [
        {
          id: 'binding_1',
          storeIds: ['store_xiangmu'],
          storeRoleIds: ['role_store_manager'],
        },
        {
          id: 'binding_2',
          storeIds: ['store_xiangmu'],
          storeRoleIds: ['role_store_sales'],
        },
      ],
      readProductStoreItems()
    );

    expect(result.errorCode).toBe('duplicate');
    expect(result.duplicateStoreIds).toEqual(['store_xiangmu']);
  });
});
