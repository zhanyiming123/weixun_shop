import { describe, expect, it } from 'vitest';
import { getReceiveIssueDescriptions } from './index';

describe('coupon list helpers', () => {
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
    ).toEqual(['领取率 48%', '本店已领 12 张']);
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
    ).toEqual(['领取率 48%']);

    expect(
      getReceiveIssueDescriptions(
        {
          ownershipType: 'platform',
          localReceivedCount: 12,
          receiveRate: 48,
        },
        false
      )
    ).toEqual(['领取率 48%']);
  });
});
