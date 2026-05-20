import { describe, expect, it } from 'vitest';
import type { OrganizationItem } from '@/pages/enterprise/organization/data';
import type { ProductStoreItem } from '../store-config/data';
import type { ProductItem } from '@/types/product';
import { buildSkuStatusTarget } from './sku-status-target';

function createStoreItem(id: string, name: string): ProductStoreItem {
  return {
    id,
    name,
    type: 'store',
    departmentId: 'dept_1',
    departmentName: '门店部',
    address: '上海',
    managerName: '测试',
    phone: '13800000000',
  };
}

function createOrganizationItem(storeId: string): OrganizationItem {
  return {
    id: `org_${storeId}`,
    type: 'store',
    name: `${storeId} 组织`,
    code: storeId,
    regionPath: ['east', storeId],
    regionLabel: '华东',
    address: '上海',
    contactPhone: '13800000000',
    managerName: '测试',
    managerPhone: '13800000000',
    selectedStoreIds: [storeId],
    status: 'enabled',
    capabilities: {
      selfBuiltProduct: true,
      selfBuiltMarketingActivity: true,
    },
    customProductInfoRules: [],
    createdAt: '2026-05-01 10:00:00',
    updatedAt: '2026-05-01 10:00:00',
  };
}

describe('buildSkuStatusTarget', () => {
  it('builds the latest sku statuses for the modal target in store scope', () => {
    const product: ProductItem = {
      id: 'product_1',
      name: '测试商品',
      productKind: 'standard',
      productCatalogId: 'catalog_1',
      productOwnershipId: 'ownership_1',
      productType: 'course',
      inventoryUnit: '份',
      specMode: 'multi',
      skus: [
        {
          id: 'sku_1',
          specText: '默认规格',
          price: 100,
          stock: 10,
          status: 'on',
        },
      ],
      status: 'on',
      price: 100,
      stock: 10,
      createdAt: '2026-05-01 10:00:00',
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
      ],
      storeOverrides: {
        store_target: {
          storeId: 'store_target',
          priceMode: 'follow',
          stockMode: 'follow',
          currentPrice: undefined,
          skuPriceOverrides: [],
          skuStockOverrides: [],
          skuSellStatusOverrides: [
            {
              skuId: 'sku_1',
              currentSellStatus: 'unsellable',
            },
          ],
          skuStatusOverrides: [],
          localSkuItems: [],
          nameMode: 'follow',
          overrideName: '',
          carouselMode: 'follow',
          overrideCarouselImages: [],
          updatedAt: '2026-05-19 10:00:00',
        },
      },
    };
    const sourceStoreItems = [
      createStoreItem('store_source', '来源店铺'),
      createStoreItem('store_target', '目标店铺'),
    ];
    const organizationItems = [
      createOrganizationItem('store_source'),
      createOrganizationItem('store_target'),
    ];

    const result = buildSkuStatusTarget(
      product,
      'store',
      ['store_target'],
      sourceStoreItems,
      organizationItems
    );

    expect(result.storeView.currentStoreId).toBe('store_target');
    expect(result.storeView.currentSkus).toEqual([
      expect.objectContaining({
        id: 'sku_1',
        currentSellStatus: 'unsellable',
        currentStatus: 'off',
      }),
    ]);
  });
});
