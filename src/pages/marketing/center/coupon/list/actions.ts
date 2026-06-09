import { CouponListItem } from '../data';

export type CouponActionKey = 'view' | 'edit' | 'copy' | 'void';

export function getCouponActionKeys(
  record: Pick<CouponListItem, 'ownershipType' | 'status'>,
  isStoreSystem: boolean
): CouponActionKey[] {
  const isStorePlatformCoupon =
    isStoreSystem && record.ownershipType === 'platform';

  if (isStorePlatformCoupon) {
    return ['view'];
  }

  if (record.status === 'notStarted' || record.status === 'active') {
    return ['edit', 'copy', 'void', 'view'];
  }

  return ['copy', 'view'];
}
