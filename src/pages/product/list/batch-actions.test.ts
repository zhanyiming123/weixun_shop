import { describe, expect, it } from 'vitest';
import {
  getBatchSellStatusBlockedMessage,
  SHARED_PRODUCT_BATCH_SELL_STATUS_MESSAGE,
} from './batch-actions';

describe('product list batch action helpers', () => {
  it('blocks batch sell status changes when the selection includes a shared product', () => {
    const productMap = new Map([
      [
        'shared_1',
        {
          storeView: {
            isShared: true,
          },
        },
      ],
      [
        'self_1',
        {
          storeView: {
            isShared: false,
          },
        },
      ],
    ]);

    expect(
      getBatchSellStatusBlockedMessage(['self_1', 'shared_1'], productMap)
    ).toBe(SHARED_PRODUCT_BATCH_SELL_STATUS_MESSAGE);
  });

  it('allows batch sell status changes when all selected products are self-built', () => {
    const productMap = new Map([
      [
        'self_1',
        {
          storeView: {
            isShared: false,
          },
        },
      ],
      [
        'self_2',
        {
          storeView: {
            isShared: false,
          },
        },
      ],
    ]);

    expect(
      getBatchSellStatusBlockedMessage(['self_1', 'self_2'], productMap)
    ).toBeNull();
  });
});
