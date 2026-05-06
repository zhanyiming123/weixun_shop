import { describe, expect, it } from 'vitest';
import { buildProductSalesStoreRows, getProductSalesStoreCount } from './sales-store-detail';
import type { ProductItem } from '@/types/product';

function createProduct(overrides: Partial<ProductItem> = {}): ProductItem {
  return {
    id: 'product_1',
    name: 'IG 冲刺课',
    productKind: 'standard',
    productCatalogId: 'catalog_1',
    productOwnershipId: 'ownership_1',
    productType: 'virtual',
    inventoryUnit: '份',
    specMode: 'multi',
    skus: [
      {
        id: 'sku_1',
        specText: '基础班',
        price: 100,
        stock: 10,
        status: 'on',
      },
      {
        id: 'sku_2',
        specText: '强化班',
        price: 120,
        stock: 8,
        status: 'on',
      },
    ],
    status: 'on',
    price: 100,
    stock: 18,
    createdAt: '2026-05-06 10:00:00',
    sourceType: 'store',
    sourceStoreId: 'store_source',
    storeConfigs: [
      {
        storeId: 'store_source',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
      {
        storeId: 'store_target',
        sellStatus: 'sellable',
        channelStatus: 'on',
      },
      {
        storeId: 'store_disabled',
        sellStatus: 'unsellable',
        channelStatus: 'off',
      },
    ],
    storeOverrides: {
      store_target: {
        storeId: 'store_target',
        priceMode: 'follow',
        stockMode: 'follow',
        skuPriceOverrides: [],
        skuStockOverrides: [],
        skuSellStatusOverrides: [
          {
            skuId: 'sku_2',
            currentSellStatus: 'unsellable',
          },
        ],
        skuStatusOverrides: [],
        localSkuItems: [],
        nameMode: 'override',
        overrideName: '店铺专属冲刺课',
        carouselMode: 'follow',
        overrideCarouselImages: [],
      },
    },
    ...overrides,
  };
}

describe('sales store detail helpers', () => {
  it('builds sellable store rows with store-specific sku and spu text', () => {
    const rows = buildProductSalesStoreRows(createProduct(), [
      {
        id: 'store_source',
        name: '源店铺',
        type: 'store',
        departmentId: 'dept_1',
        departmentName: '线下',
        address: '',
        managerName: '',
        phone: '',
      },
      {
        id: 'store_target',
        name: '目标店铺',
        type: 'store',
        departmentId: 'dept_1',
        departmentName: '线下',
        address: '',
        managerName: '',
        phone: '',
      },
      {
        id: 'store_disabled',
        name: '停用店铺',
        type: 'store',
        departmentId: 'dept_1',
        departmentName: '线下',
        address: '',
        managerName: '',
        phone: '',
      },
    ]);

    expect(rows).toEqual([
      {
        key: 'store_source',
        storeId: 'store_source',
        storeName: '源店铺',
        skuNamesText: '基础班、强化班',
      },
      {
        key: 'store_target',
        storeId: 'store_target',
        storeName: '目标店铺',
        skuNamesText: '基础班',
      },
    ]);
  });

  it('counts only sellable stores', () => {
    expect(getProductSalesStoreCount(createProduct())).toBe(2);
  });
});
