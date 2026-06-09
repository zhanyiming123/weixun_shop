import { describe, expect, it } from 'vitest';
import {
  getApplicableStoresActionText,
  getApplicableStoresEmptyDescription,
  getApplicableStoresModalTitle,
  shouldShowApplicableStoresSection,
} from './detail-view';

describe('coupon detail view helpers', () => {
  it('hides applicable stores in store-system detail pages', () => {
    expect(shouldShowApplicableStoresSection(false, 'create')).toBe(true);
    expect(shouldShowApplicableStoresSection(false, 'edit')).toBe(true);
    expect(shouldShowApplicableStoresSection(false, 'detail')).toBe(true);

    expect(shouldShowApplicableStoresSection(true, 'create')).toBe(false);
    expect(shouldShowApplicableStoresSection(true, 'edit')).toBe(false);
    expect(shouldShowApplicableStoresSection(true, 'detail', 'shop')).toBe(false);
    expect(shouldShowApplicableStoresSection(true, 'detail', 'platform')).toBe(false);
  });

  it('uses view wording in detail mode and select wording in editable modes', () => {
    expect(getApplicableStoresActionText('detail')).toBe('查看店铺');
    expect(getApplicableStoresModalTitle('detail')).toBe('查看适用店铺');
    expect(getApplicableStoresEmptyDescription('detail')).toBe(
      '点击右侧按钮查看优惠券可使用的店铺'
    );

    expect(getApplicableStoresActionText('create')).toBe('选择店铺');
    expect(getApplicableStoresModalTitle('edit')).toBe('选择店铺');
    expect(getApplicableStoresEmptyDescription('edit')).toBe(
      '点击右侧按钮选择优惠券可使用的店铺'
    );
  });
});
