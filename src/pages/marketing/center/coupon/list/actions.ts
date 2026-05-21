import { CouponListItem } from '../data';

export type CouponActionKey = 'edit' | 'copy' | 'void';

export function getCouponActionKeys(
  record: Pick<CouponListItem, 'ownershipType' | 'status'>,
  isStoreSystem: boolean
): CouponActionKey[] {
  const isStorePlatformCoupon =
    isStoreSystem && record.ownershipType === 'platform';

  if (isStorePlatformCoupon) {
    return ['copy'];
  }

  if (record.status === 'notStarted' || record.status === 'active') {
    return ['edit', 'copy', 'void'];
  }

  return ['copy'];
}
