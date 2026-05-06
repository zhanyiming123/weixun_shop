import { readCouponListItems } from '@/pages/marketing/center/coupon/data';
import { hasStoreOperationData } from '@/pages/dashboard/workplace/data';
import {
  hasProductStoreIntersection,
  readProductItems,
} from '@/pages/product/list/data';

export type StoreCloseBlockingReason = 'product' | 'marketing' | 'operation';

export type StoreCloseCheckResult = {
  canClose: boolean;
  blockingReasons: StoreCloseBlockingReason[];
};

type StoreCloseCheckDependencies = {
  hasProductData?: (storeId: string) => boolean;
  hasMarketingData?: (storeId: string) => boolean;
  hasOperationData?: (storeId: string) => boolean;
};

export const STORE_CLOSE_BLOCKING_REASON_LABEL_MAP: Record<
  StoreCloseBlockingReason,
  string
> = {
  product: '商品数据',
  marketing: '营销数据',
  operation: '经营数据',
};

export function getStoreCloseCheckResult(
  storeId: string,
  dependencies: StoreCloseCheckDependencies = {}
): StoreCloseCheckResult {
  const blockingReasons: StoreCloseBlockingReason[] = [];
  const hasProductData =
    dependencies.hasProductData ||
    ((currentStoreId: string) =>
      readProductItems().some((item) =>
        hasProductStoreIntersection(item, [currentStoreId])
      ));
  const hasMarketingData =
    dependencies.hasMarketingData ||
    ((currentStoreId: string) => readCouponListItems([currentStoreId]).length > 0);
  const hasOperationData =
    dependencies.hasOperationData || ((currentStoreId: string) => hasStoreOperationData(currentStoreId));

  if (hasProductData(storeId)) {
    blockingReasons.push('product');
  }

  if (hasMarketingData(storeId)) {
    blockingReasons.push('marketing');
  }

  if (hasOperationData(storeId)) {
    blockingReasons.push('operation');
  }

  return {
    canClose: blockingReasons.length === 0,
    blockingReasons,
  };
}
