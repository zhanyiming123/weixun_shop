import { describe, expect, it } from 'vitest';
import { getCouponActionKeys } from './list/actions';
import {
  buildCouponFormValuesFromRecord,
  getCouponEditRuleSet,
  readCouponListItems,
  readCouponById,
  updateCouponById,
} from './data';

describe('coupon data helpers', () => {
  it('fills stacking defaults for records without stacking config', () => {
    const record = readCouponById('122661783991');

    expect(record).toBeTruthy();
    expect(buildCouponFormValuesFromRecord(record!)).toMatchObject({
      allowStacking: false,
      stackingCouponType: undefined,
      stackingUnlimited: false,
      stackingCount: 1,
    });
  });

  it('returns the expected edit rule set for not started and active coupons', () => {
    const notStartedRecord = readCouponById('122661783977');
    const activeRecord = readCouponById('122661783978');

    expect(notStartedRecord).toBeTruthy();
    expect(activeRecord).toBeTruthy();

    expect(getCouponEditRuleSet(notStartedRecord!)).toEqual({
      discountInfo: 'editable',
      storeIds: 'editable',
      productScope: 'editable',
      name: 'editable',
      issueCount: 'editable',
      limitPerUser: 'editable',
      receiveStartAt: 'editable',
      receiveEndAt: 'editable',
      validity: 'editable',
      stacking: 'editable',
    });

    expect(getCouponEditRuleSet(activeRecord!)).toEqual({
      discountInfo: 'readonly',
      storeIds: 'readonly',
      productScope: 'readonly',
      name: 'editable',
      issueCount: 'increaseOnly',
      limitPerUser: 'increaseOnly',
      receiveStartAt: 'readonly',
      receiveEndAt: 'editable',
      validity: 'readonly',
      stacking: 'readonly',
    });
  });

  it('persists stacking config and clears it after stacking is disabled', () => {
    const originalRecord = readCouponById('122661783977');

    expect(originalRecord).toBeTruthy();

    const originalValues = buildCouponFormValuesFromRecord(originalRecord!);

    try {
      const enabled = updateCouponById('122661783977', {
        ...originalValues,
        allowStacking: true,
        stackingCouponType: 'platformOnly',
        stackingUnlimited: false,
        stackingCount: 3,
      });

      expect(enabled).toMatchObject({
        allowStacking: true,
        stackingCouponType: 'platformOnly',
        stackingUnlimited: false,
        stackingCount: 3,
      });

      const disabled = updateCouponById('122661783977', {
        ...originalValues,
        allowStacking: false,
        stackingCouponType: 'platformOnly',
        stackingUnlimited: false,
        stackingCount: 3,
      });

      expect(disabled).toMatchObject({
        allowStacking: false,
        stackingCouponType: undefined,
        stackingUnlimited: false,
        stackingCount: undefined,
      });
    } finally {
      updateCouponById('122661783977', originalValues);
    }
  });

  it('keeps locked active fields unchanged while still allowing supported edits', () => {
    const originalRecord = readCouponById('122661783978');

    expect(originalRecord).toBeTruthy();

    const originalValues = buildCouponFormValuesFromRecord(originalRecord!);

    try {
      const updated = updateCouponById('122661783978', {
        ...originalValues,
        discountType: 'discount',
        discountRate: 7.5,
        productScope: 'all',
        selectedSkuIds: [],
        storeIds: ['store_guangzhou'],
        name: '生效中可改名',
        issueCount: originalValues.issueCount - 10,
        limitPerUser: originalValues.limitPerUser - 1,
        receiveTimeRange: [
          '2026/01/01 00:00:00',
          '2026/11/30 23:59:59',
        ],
        validityType: 'custom',
        customUseTimeRange: ['2026/11/01 00:00:00', '2026/11/30 23:59:59'],
        allowStacking: true,
        stackingCouponType: 'platformOnly',
        stackingUnlimited: false,
        stackingCount: 2,
      });

      expect(updated).toMatchObject({
        discountType: originalRecord!.discountType,
        selectedSkuIds: originalRecord!.selectedSkuIds,
        storeIds: originalRecord!.storeIds,
        name: '生效中可改名',
        issueCount: originalRecord!.issueCount,
        limitPerUser: originalRecord!.limitPerUser,
        receiveStartAt: originalRecord!.receiveStartAt,
        receiveEndAt: '2026/11/30 23:59:59',
        validityType: originalRecord!.validityType,
        customUseTimeRange: originalRecord!.customUseTimeRange,
        allowStacking: Boolean(originalRecord!.allowStacking),
      });
    } finally {
      updateCouponById('122661783978', originalValues);
    }
  });

  it('keeps representative platform coupon mocks for every list status', () => {
    const platformStatuses = new Set(
      readCouponListItems(undefined, { isStoreSystem: true })
        .filter((item) => item.ownershipType === 'platform')
        .map((item) => item.status)
    );

    expect(platformStatuses).toEqual(
      new Set(['notStarted', 'active', 'expired', 'voided'])
    );
  });

  it('does not expose cross-store shared shop coupons in the store system', () => {
    const guangzhouStoreCoupons = readCouponListItems(['store_guangzhou'], {
      isStoreSystem: true,
    }).filter((item) => item.ownershipType === 'shop');

    expect(
      guangzhouStoreCoupons.every((item) => item.ownershipStoreId === 'store_guangzhou')
    ).toBe(true);
    expect(
      guangzhouStoreCoupons.every((item) => item.sharedToStoreIds.length === 0)
    ).toBe(true);
  });

  it('shows modify and void for the guangzhou store shop coupons shown first in the store system', () => {
    const guangzhouList = readCouponListItems(['store_guangzhou'], {
      isStoreSystem: true,
    });
    const firstShopCoupons = guangzhouList.filter((item) =>
      ['122661784101', '122661784102', '122661784103'].includes(item.id)
    );

    expect(firstShopCoupons.map((item) => item.ownershipType)).toEqual([
      'shop',
      'shop',
      'shop',
    ]);
    expect(firstShopCoupons.map((item) => item.status)).toEqual([
      'active',
      'active',
      'notStarted',
    ]);
    expect(
      firstShopCoupons.map((item) => getCouponActionKeys(item, true))
    ).toEqual([
      ['view', 'edit', 'copy', 'void'],
      ['view', 'edit', 'copy', 'void'],
      ['view', 'edit', 'copy', 'void'],
    ]);
  });
});
