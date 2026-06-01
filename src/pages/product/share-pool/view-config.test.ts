import { describe, expect, it } from 'vitest';
import {
  getSharePoolQueryStatus,
  getSharePoolTableColumnKeys,
  getSharePoolViewConfig,
} from '@/pages/product/share-pool/view-config';

describe('share pool view config', () => {
  it('keeps single-product tab on the current shared-pool scheme', () => {
    expect(getSharePoolViewConfig('standard')).toEqual({
      productKind: 'standard',
      showShareStatusFilter: true,
      showSubProductFilters: false,
      showSellStatusFilter: false,
      showSalesStoresColumn: true,
      showInventoryColumn: true,
      priceDisplayMode: 'range',
    });
  });

  it('uses combo-product list filters for combo tab', () => {
    expect(getSharePoolViewConfig('combo')).toEqual({
      productKind: 'combo',
      showShareStatusFilter: true,
      showSubProductFilters: true,
      showSellStatusFilter: true,
      showSalesStoresColumn: false,
      showInventoryColumn: false,
      priceDisplayMode: 'single',
    });
  });

  it('applies share status filtering on both single-product and combo tabs', () => {
    expect(getSharePoolQueryStatus('standard', 'pending')).toBe('pending');
    expect(getSharePoolQueryStatus('standard', 'all')).toBeUndefined();
    expect(getSharePoolQueryStatus('combo', 'pending')).toBe('pending');
    expect(getSharePoolQueryStatus('combo', 'referenced')).toBe('referenced');
    expect(getSharePoolQueryStatus('combo', 'all')).toBeUndefined();
  });

  it('uses the updated combo tab columns', () => {
    expect(getSharePoolTableColumnKeys('combo')).toEqual([
      'name',
      'comboDisplayOptions',
      'productCatalogId',
      'productOwnershipId',
      'sourceStoreName',
      'sellStatus',
      'price',
      'independent',
      'createdAt',
      'sharedAt',
      'operations',
    ]);
  });
});
