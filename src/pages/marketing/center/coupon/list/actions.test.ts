import { describe, expect, it } from 'vitest';
import { getCouponActionKeys } from './actions';

describe('coupon list action rules', () => {
  it('shows modify and void for shop coupons that are not started or active', () => {
    expect(
      getCouponActionKeys(
        {
          ownershipType: 'shop',
          status: 'notStarted',
        },
        true
      )
    ).toEqual(['edit', 'copy', 'void']);

    expect(
      getCouponActionKeys(
        {
          ownershipType: 'shop',
          status: 'active',
        },
        true
      )
    ).toEqual(['edit', 'copy', 'void']);
  });

  it('shows only copy for expired or voided shop coupons', () => {
    expect(
      getCouponActionKeys(
        {
          ownershipType: 'shop',
          status: 'expired',
        },
        true
      )
    ).toEqual(['copy']);

    expect(
      getCouponActionKeys(
        {
          ownershipType: 'shop',
          status: 'voided',
        },
        true
      )
    ).toEqual(['copy']);
  });

  it('shows only copy for platform coupons in the store system', () => {
    expect(
      getCouponActionKeys(
        {
          ownershipType: 'platform',
          status: 'active',
        },
        true
      )
    ).toEqual(['copy']);
  });
});
