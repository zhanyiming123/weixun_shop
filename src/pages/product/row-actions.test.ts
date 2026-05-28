import { describe, expect, it } from 'vitest';
import {
  getPrimaryProductRowActionKeys,
  type ProductRowActionKey,
} from './row-actions';

describe('product row action helpers', () => {
  const defaultActionKeys: ProductRowActionKey[] = [
    'detail',
    'channel-config',
    'store-setting',
    'copy',
    'sell-status',
    'channel-status',
    'sku-manage',
    'share',
  ];

  it('prioritizes channel-status into the direct actions for shared products', () => {
    expect(
      getPrimaryProductRowActionKeys(defaultActionKeys, {
        currentStoreId: 'mall_online',
        isShared: true,
        canManageStoreSettings: true,
      })
    ).toEqual(['detail', 'store-setting', 'channel-status']);
  });

  it('keeps the default ordering for self-built products', () => {
    expect(
      getPrimaryProductRowActionKeys(defaultActionKeys, {
        currentStoreId: 'mall_online',
        isShared: false,
        canManageStoreSettings: false,
      })
    ).toEqual(['detail', 'channel-config', 'store-setting']);
  });
});
