import { describe, expect, it } from 'vitest';
import { buildProductListItem } from '@/lib/product';
import type { ProductItem } from '@/types/product';
import {
  buildProductDetailContentState,
  buildProductDetailSections,
  buildProductDetailChannelRows,
  formatProductLimitRule,
  getProductChannelModeLabel,
  getProductSharedScopeText,
} from './product-detail';

function createProduct(overrides: Partial<ProductItem> = {}): ProductItem {
  return {
    id: 'product_1',
    name: '测试商品',
    productKind: 'standard',
    productCatalogId: 'catalog_1',
    productOwnershipId: 'ownership_1',
    productType: 'virtual',
    inventoryUnit: '份',
    specMode: 'multi',
    skus: [
      {
        id: 'sku_1',
        specText: '规格一',
        price: 100,
        stock: 10,
        status: 'on',
      },
      {
        id: 'sku_2',
        specText: '规格二',
        price: 120,
        stock: 8,
        status: 'on',
      },
    ],
    status: 'on',
    price: 100,
    stock: 18,
    createdAt: '2026-05-05 10:00:00',
    sourceType: 'store',
    sourceStoreId: 'store_source',
    storeConfigs: [],
    ...overrides,
  };
}

describe('product detail helpers', () => {
  it('formats limited and unlimited rules', () => {
    expect(formatProductLimitRule(createProduct())).toBe('不限购');
    expect(
      formatProductLimitRule(
        createProduct({
          isLimited: true,
          limitCount: 3,
        })
      )
    ).toBe('每人限购 3 件');
  });

  it('builds product-pool sales store rows with full and partial sku coverage', () => {
    const rows = buildProductDetailChannelRows(
      createProduct({
        storeChannelConfig: {
          shareMode: 'product_pool',
          storeScope: 'specificStores',
          storeIds: ['mall_online', 'mall_mini_program'],
          productPoolStoreConfigs: [
            {
              storeId: 'mall_online',
              sellStatus: 'sellable',
              channelStatus: 'on',
              sellableSkuIds: ['sku_1', 'sku_2'],
              allowSelfPrice: true,
            },
            {
              storeId: 'mall_mini_program',
              sellStatus: 'sellable',
              channelStatus: 'off',
              sellableSkuIds: ['sku_1'],
            },
          ],
        },
      })
    );

    expect(rows).toEqual([
      expect.objectContaining({
        storeId: 'mall_online',
        sellableSkuText: '全部规格',
        allowSelfPriceLabel: '支持',
      }),
      expect.objectContaining({
        storeId: 'mall_mini_program',
        sellableSkuText: '1/2 个规格',
        allowSelfPriceLabel: '不支持',
      }),
    ]);
  });

  it('returns shared-pool scope text for specific stores only', () => {
    const product = createProduct({
      storeChannelConfig: {
        shareMode: 'shared_pool',
        storeScope: 'specificStores',
        storeIds: ['mall_online', 'mall_mini_program'],
        productPoolStoreConfigs: [],
      },
    });

    expect(getProductChannelModeLabel(product)).toBe('商品共享池');
    expect(getProductSharedScopeText(product.storeChannelConfig)).toBe(
      '唯寻线上商城、唯寻小程序商城'
    );
  });

  it('prefers detailContent config and exposes the four detail sections in order', () => {
    const product = buildProductListItem(
      createProduct({
        detailHtml: '<p>旧详情</p>',
        detailContent: {
          html: '<p>新详情</p>',
          fontSize: '18',
          lineHeight: '2',
        },
      }),
      'store',
      ['mall_online'],
      {
        sourceStoreName: '唯寻线上商城',
      }
    );

    expect(buildProductDetailContentState(product)).toEqual({
      html: '<p>新详情</p>',
      fontSize: '18',
      lineHeight: '2',
    });
    expect(
      buildProductDetailSections(product, '国际课程', '自建商品').map(
        (section) => section.key
      )
    ).toEqual(['basic', 'spec', 'detail-page', 'store-channel']);
  });
});
