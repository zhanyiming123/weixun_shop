import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProductService } from '@/services/ProductService';
import { DEFAULT_PRODUCTS } from '@/repositories/product/defaultProducts';
import { ProductRepository } from './ProductRepository';

const persistentStateMocks = vi.hoisted(() => ({
  readPersistentValue: vi.fn(),
  writePersistentValue: vi.fn(),
}));

vi.mock('@/utils/usePersistentState', () => ({
  readPersistentValue: persistentStateMocks.readPersistentValue,
  writePersistentValue: persistentStateMocks.writePersistentValue,
}));

describe('ProductRepository seeded mock recovery', () => {
  beforeEach(() => {
    persistentStateMocks.readPersistentValue.mockReset();
    persistentStateMocks.writePersistentValue.mockReset();
  });

  it('keeps seeded chengdu store products visible when persisted seed snapshot is stale', () => {
    persistentStateMocks.readPersistentValue.mockReturnValue(
      DEFAULT_PRODUCTS.map((item) => ({
        ...item,
        storeConfigs: [],
        skus: [],
        sourceStoreId: item.sourceType === 'store' ? '' : item.sourceStoreId,
      }))
    );

    const service = new ProductService();
    const result = service.queryList({
      productKind: 'standard',
      tab: 'all',
      filters: {
        searchType: 'productName',
        keyword: '',
        sourceStoreIds: [],
        createdAtRange: [],
      },
      organizationScope: 'store',
      visibleStoreIds: ['store_chengdu'],
      page: 1,
      pageSize: 20,
    });

    expect(result.total).toBe(2);
    expect(result.items.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        'G_1215778084171681792',
        'G_1210998727024709632',
      ])
    );
  });

  it('removes retired seeded mock products from persisted snapshots while preserving custom items', () => {
    persistentStateMocks.readPersistentValue.mockReturnValue([
      {
        ...DEFAULT_PRODUCTS[0],
        id: 'G_1260413000000000001',
        name: '已退役共享商品',
      },
      {
        ...DEFAULT_PRODUCTS[0],
        id: 'custom_product_1',
        name: '自定义商品',
        createdAt: '2026-04-30 10:00:00',
      },
    ]);

    const service = new ProductService();
    const result = service.queryList({
      productKind: 'standard',
      tab: 'all',
      filters: {
        searchType: 'productName',
        keyword: '',
        sourceStoreIds: [],
        createdAtRange: [],
      },
      organizationScope: 'headquarter',
      visibleStoreIds: [],
      page: 1,
      pageSize: 20,
    });

    expect(result.items.map((item) => item.id)).not.toContain('G_1260413000000000001');
    expect(result.items.map((item) => item.id)).toContain('custom_product_1');
    expect(persistentStateMocks.writePersistentValue).toHaveBeenCalled();
    expect(
      persistentStateMocks.writePersistentValue.mock.calls[
        persistentStateMocks.writePersistentValue.mock.calls.length - 1
      ][1]
    ).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({
          id: 'G_1260413000000000001',
        }),
      ])
    );
  });

  it('normalizes persisted sku image and keeps only one visible default-selected sku', () => {
    persistentStateMocks.readPersistentValue.mockReturnValue([
      {
        ...DEFAULT_PRODUCTS[0],
        id: 'custom_product_2',
        name: '带规格图商品',
        skus: [
          {
            id: 'sku_1',
            specText: '年级：10年级 / 课程体系：IB',
            price: 199,
            stock: 10,
            status: 'on',
            image: {
              id: ' image_1 ',
              name: ' 主图 ',
              url: ' https://example.com/ib.png ',
            },
            isDefaultSelected: true,
          },
          {
            id: 'sku_2',
            specText: '年级：10年级 / 课程体系：IG',
            price: 299,
            stock: 8,
            status: 'off',
            isDefaultSelected: true,
          },
        ],
      },
    ]);

    const repository = new ProductRepository();
    const [product] = repository.readSnapshot().filter((item) => item.id === 'custom_product_2');

    expect(product.skus).toEqual([
      {
        id: 'sku_1',
        specText: '年级：10年级 / 课程体系：IB',
        price: 199,
        stock: 10,
        status: 'on',
        sellStatus: 'sellable',
        image: {
          id: 'image_1',
          name: '主图',
          url: 'https://example.com/ib.png',
        },
        isDefaultSelected: true,
      },
      {
        id: 'sku_2',
        specText: '年级：10年级 / 课程体系：IG',
        price: 299,
        stock: 8,
        status: 'off',
        sellStatus: 'sellable',
      },
    ]);
  });

  it('normalizes product detail fields for limit rule and rich content', () => {
    persistentStateMocks.readPersistentValue.mockReturnValue([
      {
        ...DEFAULT_PRODUCTS[0],
        id: 'custom_product_3',
        name: '详情字段商品',
        isLimited: true,
        limitCount: 2.8,
        detailHtml: '<p>图文详情</p>',
      },
      {
        ...DEFAULT_PRODUCTS[0],
        id: 'custom_product_4',
        name: '不限购商品',
        isLimited: false,
        detailHtml: undefined,
      },
    ]);

    const repository = new ProductRepository();
    const snapshot = repository.readSnapshot();
    const limitedProduct = snapshot.find((item) => item.id === 'custom_product_3');
    const unlimitedProduct = snapshot.find((item) => item.id === 'custom_product_4');

    expect(limitedProduct).toMatchObject({
      isLimited: true,
      limitCount: 2,
      detailHtml: '<p>图文详情</p>',
    });
    expect(unlimitedProduct).toMatchObject({
      isLimited: false,
      detailHtml: '',
    });
    expect(unlimitedProduct?.limitCount).toBeUndefined();
  });

  it('backfills newly seeded shared-pool products into stale persisted snapshots', () => {
    persistentStateMocks.readPersistentValue.mockReturnValue(
      DEFAULT_PRODUCTS.filter(
        (item) =>
          ![
            'G_1260601000000000010',
            'C_1260601000000000010',
            'G_1260601000000000011',
            'C_1260601000000000011',
            'G_1260601000000000012',
          ].includes(item.id)
      )
    );

    const repository = new ProductRepository();
    const snapshot = repository.readSnapshot();

    expect(snapshot.map((item) => item.id)).toEqual(
      expect.arrayContaining([
        'G_1260601000000000010',
        'C_1260601000000000010',
        'G_1260601000000000011',
        'C_1260601000000000011',
        'G_1260601000000000012',
      ])
    );
    expect(
      snapshot.find((item) => item.id === 'G_1260601000000000010')?.storeChannelConfig
    ).toMatchObject({
      shareMode: 'shared_pool',
      storeIds: ['mall_online', 'mall_mini_program'],
    });
    expect(
      snapshot.find((item) => item.id === 'G_1260601000000000012')?.storeChannelConfig
    ).toMatchObject({
      shareMode: 'product_pool',
      storeIds: ['store_beijing'],
    });
    expect(
      snapshot.find((item) => item.id === 'G_1260601000000000011')?.storeChannelConfig
    ).toMatchObject({
      shareMode: 'shared_pool',
      storeIds: ['store_beijing'],
    });
    expect(persistentStateMocks.writePersistentValue).toHaveBeenCalled();
  });

  it('ships enabled store-channel mock data for both product-pool and shared-pool modes', () => {
    const standardModes = DEFAULT_PRODUCTS.filter(
      (item) => item.productKind === 'standard' && item.storeChannelConfig
    ).map((item) => item.storeChannelConfig?.shareMode);
    const comboModes = DEFAULT_PRODUCTS.filter(
      (item) => item.productKind === 'combo' && item.storeChannelConfig
    ).map((item) => item.storeChannelConfig?.shareMode);

    expect(standardModes).toEqual(
      expect.arrayContaining(['product_pool', 'shared_pool'])
    );
    expect(comboModes).toEqual(
      expect.arrayContaining(['product_pool', 'shared_pool'])
    );
  });
});
