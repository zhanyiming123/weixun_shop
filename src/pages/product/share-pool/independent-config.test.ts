import { describe, expect, it } from 'vitest';
import type { ProductSharePoolItem } from '@/types/product';
import {
  canShowIndependentPriceTag,
  getIndependentConfigLabel,
} from '@/pages/product/share-pool/independent-config';

function createSharePoolItem(
  overrides: Partial<ProductSharePoolItem> = {}
): ProductSharePoolItem {
  return {
    independentPriceRule: {
      enabled: true,
      skuRules: [],
    },
    shareTarget: {
      storeId: 'store_guangzhou',
      status: 'pending',
      sharedAt: '2026-05-02 11:00:00',
    },
    ...overrides,
  } as ProductSharePoolItem;
}

describe('share-pool independent config display', () => {
  it('shows allow tag when independent price rule is enabled', () => {
    const product = createSharePoolItem();

    expect(canShowIndependentPriceTag(product)).toBe(true);
    expect(getIndependentConfigLabel(product)).toBe('允许独立售价');
  });

  it('shows allow tag when current share target explicitly allows self price', () => {
    const product = createSharePoolItem({
      independentPriceRule: {
        enabled: false,
        skuRules: [],
      },
      shareTarget: {
        storeId: 'store_guangzhou',
        status: 'referenced',
        sharedAt: '2026-05-02 11:00:00',
        allowSelfPrice: true,
      },
    });

    expect(canShowIndependentPriceTag(product)).toBe(true);
    expect(getIndependentConfigLabel(product)).toBe('允许独立售价');
  });

  it('shows placeholder when independent price is not allowed', () => {
    const product = createSharePoolItem({
      independentPriceRule: {
        enabled: false,
        skuRules: [],
      },
    });

    expect(canShowIndependentPriceTag(product)).toBe(false);
    expect(getIndependentConfigLabel(product)).toBe('--');
  });

  it('shows placeholder when legacy mock data has no independent price rule', () => {
    const product = createSharePoolItem({
      independentPriceRule: undefined,
    });

    expect(canShowIndependentPriceTag(product)).toBe(false);
    expect(getIndependentConfigLabel(product)).toBe('--');
  });
});
