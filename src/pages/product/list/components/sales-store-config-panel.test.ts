import { describe, expect, it } from 'vitest';
import type { ProductStoreChannelProductPoolStoreConfigItem } from '@/types/product';
import {
  buildSalesStoreConfigPanelResult,
  buildSalesStoreConfigPanelVisibleColumns,
} from './sales-store-config-panel';

describe('sales-store-config-panel helpers', () => {
  it('hides sellable sku column for combo products', () => {
    const columns = [
      { dataIndex: 'name', title: '店铺名称' },
      { dataIndex: 'sellStatus', title: '可售状态' },
      { dataIndex: 'sellableSkuKeys', title: '可售 SKU' },
      { dataIndex: 'allowSelfPrice', title: '自主定价' },
    ];

    expect(buildSalesStoreConfigPanelVisibleColumns(columns, 'combo')).toEqual([
      { dataIndex: 'name', title: '店铺名称' },
      { dataIndex: 'sellStatus', title: '可售状态' },
      { dataIndex: 'allowSelfPrice', title: '自主定价' },
    ]);
  });

  it('forces combo sellable stores to share all available skus', () => {
    const result = buildSalesStoreConfigPanelResult(
      [
        {
          id: 'store_target',
          name: '目标店铺',
          type: 'store',
          departmentId: 'dept_target',
          departmentName: '目标部门',
          address: '上海市静安区测试路 1 号',
          managerName: '测试负责人',
          phone: '13800000000',
        },
      ],
      {
        store_target: {
          storeId: 'store_target',
          sellStatus: 'sellable',
          channelStatus: 'on',
          sellableSkuKeys: ['sku_1'],
          allowSelfPrice: true,
        },
      },
      ['sku_1', 'sku_2'],
      'combo'
    );

    expect(result).toEqual<ProductStoreChannelProductPoolStoreConfigItem[]>([
      {
        storeId: 'store_target',
        sellStatus: 'sellable',
        channelStatus: 'on',
        sellableSkuIds: ['sku_1', 'sku_2'],
        allowSelfPrice: true,
      },
    ]);
  });
});
