import { CouponOwnershipType, CouponPageMode } from './data';

export function shouldShowApplicableStoresSection(
  isStoreSystem: boolean,
  mode: CouponPageMode,
  ownershipType?: CouponOwnershipType
) {
  void ownershipType;

  if (isStoreSystem && mode === 'detail') {
    return false;
  }

  return mode === 'detail' || !isStoreSystem;
}

export function getApplicableStoresActionText(mode: CouponPageMode) {
  return mode === 'detail' ? '查看店铺' : '选择店铺';
}

export function getApplicableStoresModalTitle(mode: CouponPageMode) {
  return mode === 'detail' ? '查看适用店铺' : '选择店铺';
}

export function getApplicableStoresEmptyDescription(mode: CouponPageMode) {
  return mode === 'detail'
    ? '点击右侧按钮查看优惠券可使用的店铺'
    : '点击右侧按钮选择优惠券可使用的店铺';
}
