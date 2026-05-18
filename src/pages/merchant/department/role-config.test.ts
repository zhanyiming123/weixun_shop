import { describe, expect, it } from 'vitest';
import { readProductStoreItems } from '@/pages/product/store-config/data';
import {
  ALL_STORES_TREE_VALUE,
  buildMerchantRoleOptions,
  buildMerchantStoreTreeData,
  buildStoreRoleOptions,
  normalizeMerchantStoreScopeIds,
  summarizeStoreManagers,
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
      title: '全部店铺',
    });
    expect(treeData[0].children).toHaveLength(storeItems.length);
  });

  it('expands the all stores node to every store id', () => {
    const storeItems = readProductStoreItems();

    expect(
      normalizeMerchantStoreScopeIds([ALL_STORES_TREE_VALUE], storeItems)
    ).toEqual(storeItems.map((item) => item.id));
  });

  it('summarizes store managers with de-duplication', () => {
    expect(
      summarizeStoreManagers(
        ['store_xiangmu', 'store_xiangmu', 'store_qingshao'],
        readProductStoreItems()
      )
    ).toBe('宋知夏、顾言初');
  });
});
