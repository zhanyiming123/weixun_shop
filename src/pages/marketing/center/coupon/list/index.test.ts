import { describe, expect, it } from 'vitest';
import {
  formatCouponListDateTime,
  formatCouponListTimeRange,
  getCouponListDiscountLabel,
  getReceiveIssueDescriptions,
} from './index';

describe('coupon list helpers', () => {
  it('renders every coupon type as full reduction in the list info cell', () => {
    expect(getCouponListDiscountLabel('fullReduction')).toBe('满减');
    expect(getCouponListDiscountLabel('directReduction')).toBe('满减');
    expect(getCouponListDiscountLabel('discount')).toBe('满减');
  });

  it('shows local receive count for platform coupons in the store system', () => {
    expect(
      getReceiveIssueDescriptions(
        {
          ownershipType: 'platform',
          localReceivedCount: 12,
          receiveRate: 48,
        },
        true
      )
    ).toEqual(['使用率 48%', '本店已使用 12 张']);
  });

  it('omits local receive count outside the store-system platform view', () => {
    expect(
      getReceiveIssueDescriptions(
        {
          ownershipType: 'shop',
          localReceivedCount: 12,
          receiveRate: 48,
        },
        true
      )
    ).toEqual(['使用率 48%']);

    expect(
      getReceiveIssueDescriptions(
        {
          ownershipType: 'platform',
          localReceivedCount: 12,
          receiveRate: 48,
        },
        false
      )
    ).toEqual(['使用率 48%']);
  });

  it('formats coupon list time to minute precision', () => {
    expect(formatCouponListDateTime('2026/05/09 10:08:59')).toBe('2026/05/09 10:08');
    expect(
      formatCouponListTimeRange('2026/05/09 10:08:59', '2026/05/10 18:22:01')
    ).toBe('2026/05/09 10:08 - 2026/05/10 18:22');
  });
});
