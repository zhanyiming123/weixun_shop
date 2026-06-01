import { describe, expect, it } from 'vitest';
import type { ProductListItem } from '@/types/product';
import {
  buildComboProductCreateLocation,
  canEditComboProduct,
} from './edit';

function createComboProduct(
  overrides: Partial<ProductListItem> = {}
): ProductListItem {
  return {
    id: 'combo_1',
    name: '组合商品',
    productKind: 'combo',
    productCatalogId: 'catalog_1',
    productOwnershipId: 'ownership_1',
    productType: 'virtual',
    inventoryUnit: '份',
    specMode: 'single',
    skus: [],
    status: 'on',
    price: 100,
    stock: 10,
    createdAt: '2026-05-01 10:00:00',
    sourceType: 'headquarter',
    sourceStoreId: undefined,
    storeConfigs: [],
    storeView: {
      currentStoreId: undefined,
      currentStoreSellStatus: undefined,
      currentStoreChannelStatus: undefined,
      resolvedSourceStoreId: undefined,
      sourceLabel: '总部创建',
      sourceStoreName: '',
      sourceRegionName: '',
      showOwnershipTag: false,
      ownershipTag: undefined,
      canManageStoreStatus: false,
      canManageStoreSettings: false,
      canManageIndependentPrice: false,
      isShared: false,
      isSelfBuilt: false,
      hasStoreSetting: false,
      salesStatusCounts: {
        selling: 0,
        off: 0,
      },
      priceMode: 'follow',
      stockMode: 'follow',
      nameMode: 'follow',
      carouselMode: 'follow',
      originalName: '组合商品',
      currentName: '组合商品',
      originalPrice: 100,
      originalSkus: [],
      originalComboOptions: [],
      originalCarouselImages: [],
      currentCarouselImages: [],
      currentSkus: [],
      currentComboOptions: [],
      currentPrice: 100,
    },
    ...overrides,
  };
}

describe('combo edit helpers', () => {
  it('allows headquarter users to edit combo products', () => {
    expect(
      canEditComboProduct(createComboProduct(), 'headquarter', [])
    ).toBe(true);
  });

  it('allows store users to edit self-built combo products', () => {
    expect(
      canEditComboProduct(
        createComboProduct({
          sourceType: 'store',
          sourceStoreId: 'store_1',
        }),
        'store',
        ['store_1']
      )
    ).toBe(true);
  });

  it('blocks store users from editing shared combo products', () => {
    expect(
      canEditComboProduct(
        createComboProduct({
          sourceType: 'store',
          sourceStoreId: 'store_2',
        }),
        'store',
        ['store_1']
      )
    ).toBe(false);
  });

  it('blocks editing non-combo products', () => {
    expect(
      canEditComboProduct(
        createComboProduct({
          productKind: 'standard',
        }),
        'headquarter',
        []
      )
    ).toBe(false);
  });

  it('builds the combo edit page location payload', () => {
    const product = createComboProduct({
      id: 'combo_123',
    });

    expect(buildComboProductCreateLocation('edit', product)).toEqual({
      pathname: '/product/combo/create',
      search: '?mode=edit&sourceId=combo_123',
      state: {
        mode: 'edit',
        sourceProduct: product,
      },
    });
  });
});
