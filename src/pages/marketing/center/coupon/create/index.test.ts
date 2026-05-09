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

  it('keeps specific product scope in the store-system create flow', () => {
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
      productScope: 'specific',
      selectedSkuIds: ['sku-1'],
    });
  });

  it('replaces specific product scope in the merchant create flow', () => {
    expect(
      normalizeCreateModeFormValues(
        {
          ...DEFAULT_COUPON_FORM_VALUES,
          productScope: 'specific',
          selectedSkuIds: ['sku-1'],
        },
        false
      )
    ).toMatchObject({
      productScope: 'condition',
      conditionCategoryPaths: [],
      conditionOwnershipSelections: [],
      selectedSkuIds: [],
    });
  });

  it('normalizes create-mode timing to a custom minute-range flow', () => {
    expect(
      normalizeCreateModeFormValues(
        {
          ...DEFAULT_COUPON_FORM_VALUES,
          validityType: 'sameAsReceive',
          receiveTimeRange: ['2026/05/09 10:00:00', '2026/05/09 18:00:00'],
          customUseTimeRange: [],
        },
        true
      )
    ).toMatchObject({
      validityType: 'custom',
      validDays: undefined,
      receiveTimeRange: ['2026/05/09 10:00:00', '2026/05/09 18:00:00'],
      customUseTimeRange: ['2026/05/09 10:00:00', '2026/05/09 18:00:00'],
    });
  });

  it('replaces direct reduction with full reduction in the create flow', () => {
    expect(
      normalizeCreateModeFormValues(
        {
          ...DEFAULT_COUPON_FORM_VALUES,
          discountType: 'directReduction',
          directReductionAmount: 88,
        },
        true
      )
    ).toMatchObject({
      discountType: 'fullReduction',
      directReductionAmount: undefined,
    });
  });
});
