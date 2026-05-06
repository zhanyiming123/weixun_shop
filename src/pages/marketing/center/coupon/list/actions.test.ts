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
    ).toEqual(['view', 'edit', 'copy', 'void']);

    expect(
      getCouponActionKeys(
        {
          ownershipType: 'shop',
          status: 'active',
        },
        true
      )
    ).toEqual(['view', 'edit', 'copy', 'void']);
  });

  it('shows only view and copy for expired or voided shop coupons', () => {
    expect(
      getCouponActionKeys(
        {
          ownershipType: 'shop',
          status: 'expired',
        },
        true
      )
    ).toEqual(['view', 'copy']);

    expect(
      getCouponActionKeys(
        {
          ownershipType: 'shop',
          status: 'voided',
        },
        true
      )
    ).toEqual(['view', 'copy']);
  });

  it('shows only view and copy for platform coupons in the store system', () => {
    expect(
      getCouponActionKeys(
        {
          ownershipType: 'platform',
          status: 'active',
        },
        true
      )
    ).toEqual(['view', 'copy']);
  });
});
