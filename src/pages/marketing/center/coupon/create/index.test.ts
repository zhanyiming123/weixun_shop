import { describe, expect, it } from 'vitest';
import { DEFAULT_COUPON_FORM_VALUES } from '../data';
import { normalizeCreateModeFormValues } from './index';

describe('coupon create form value normalization', () => {
  it('removes stacking config in the merchant system create flow', () => {
    expect(
      normalizeCreateModeFormValues(
        {
          ...DEFAULT_COUPON_FORM_VALUES,
          allowStacking: true,
          stackingCouponType: 'shopOnly',
        },
        false
      )
    ).toMatchObject({
      allowStacking: false,
      stackingCouponType: undefined,
    });
  });

  it('keeps store-system stacking defaults in the create flow', () => {
    expect(
      normalizeCreateModeFormValues(
        {
          ...DEFAULT_COUPON_FORM_VALUES,
          allowStacking: true,
        },
        true
      ).stackingCouponType
    ).toBe('platformOnly');
  });

  it('replaces specific product scope in the create flow', () => {
    expect(
      normalizeCreateModeFormValues(
        {
          ...DEFAULT_COUPON_FORM_VALUES,
          productScope: 'specific',
          selectedSkuIds: ['sku-1'],
        },
        true
      )
    ).toMatchObject({
      productScope: 'condition',
      conditionCategoryPaths: [],
      conditionOwnershipSelections: [],
      selectedSkuIds: [],
    });
  });
});
