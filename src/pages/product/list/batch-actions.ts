export const SHARED_PRODUCT_BATCH_SELL_STATUS_MESSAGE =
  '引用商品不支持设置可售状态';

export function getBatchSellStatusBlockedMessage(
  productIds: string[],
  productMap: Map<string, { storeView: { isShared: boolean } }>
) {
  if (productIds.some((id) => productMap.get(id)?.storeView.isShared)) {
    return SHARED_PRODUCT_BATCH_SELL_STATUS_MESSAGE;
  }

  return null;
}
