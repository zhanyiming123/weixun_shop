import { describe, expect, it } from 'vitest';
import { getProductStatusLabel, PRODUCT_STATUS_OPTIONS } from './index';

describe('marketing product selector helpers', () => {
  it('uses shelf-status labels in the marketing selector', () => {
    expect(PRODUCT_STATUS_OPTIONS).toEqual([
      { label: '全部', value: 'all' },
      { label: '已上架', value: 'on' },
      { label: '已下架', value: 'off' },
    ]);
    expect(getProductStatusLabel('on')).toBe('已上架');
    expect(getProductStatusLabel('off')).toBe('已下架');
  });
});
