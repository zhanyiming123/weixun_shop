import { describe, expect, it } from 'vitest';
import {
  buildComboCreateStoreChannelProductPoolVisibleColumns,
  COMBO_CREATE_STORE_CHANNEL_PRODUCT_POOL_SHOW_SELLABLE_SKU,
} from './store-channel-product-pool-modal';

describe('buildComboCreateStoreChannelProductPoolVisibleColumns', () => {
  it('keeps the sellable sku column for combo-create sales-store modal', () => {
    const columns = [
      { dataIndex: 'name', title: '店铺名称' },
      { dataIndex: 'sellStatus', title: '可售状态' },
      { dataIndex: 'sellableSkuKeys', title: '可售 SKU' },
      { dataIndex: 'allowSelfPrice', title: '自主定价' },
    ];

    const result = buildComboCreateStoreChannelProductPoolVisibleColumns(columns);

    expect(COMBO_CREATE_STORE_CHANNEL_PRODUCT_POOL_SHOW_SELLABLE_SKU).toBe(true);
    expect(result).toEqual(columns);
  });
});
