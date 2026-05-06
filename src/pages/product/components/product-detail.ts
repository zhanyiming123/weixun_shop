import { getProductStoreChannelConfig } from '@/lib/product';
import {
  PRODUCT_STORE_CHANNEL_STATUS_LABEL_MAP,
  PRODUCT_STORE_SELL_STATUS_LABEL_MAP,
  readProductStoreItems,
  type ProductStoreItem,
} from '@/pages/product/store-config/data';
import type {
  ProductItem,
  ProductStoreChannelConfigItem,
  ProductStoreChannelProductPoolStoreConfigItem,
  ProductType,
} from '@/types/product';

const PRODUCT_TYPE_LABEL_MAP: Record<ProductType, string> = {
  virtual: '虚拟商品',
  course: '课程商品',
  service: '服务商品',
};

export type ProductDetailChannelRow = {
  key: string;
  storeId: string;
  storeName: string;
  sellStatusLabel: string;
  channelStatusLabel: string;
  sellableSkuText: string;
  allowSelfPriceLabel: string;
};

function resolveStoreName(storeId: string, storeItems: ProductStoreItem[]) {
  return storeItems.find((item) => item.id === storeId)?.name || storeId;
}

function formatSellableSkuText(
  configItem: ProductStoreChannelProductPoolStoreConfigItem,
  totalSkuCount: number
) {
  const sellableSkuCount = configItem.sellableSkuIds?.length || 0;

  if (!sellableSkuCount) {
    return '--';
  }

  if (totalSkuCount > 0 && sellableSkuCount >= totalSkuCount) {
    return '全部规格';
  }

  return totalSkuCount > 0
    ? `${sellableSkuCount}/${totalSkuCount} 个规格`
    : `${sellableSkuCount} 个规格`;
}

export function getProductTypeLabel(productType: ProductType) {
  return PRODUCT_TYPE_LABEL_MAP[productType] || '虚拟商品';
}

export function formatProductLimitRule(product: Pick<ProductItem, 'isLimited' | 'limitCount'>) {
  if (product.isLimited !== true) {
    return '不限购';
  }

  const limitCount =
    typeof product.limitCount === 'number' && Number.isFinite(product.limitCount)
      ? Math.max(1, Math.floor(product.limitCount))
      : 1;

  return `每人限购 ${limitCount} 件`;
}

export function getProductChannelModeLabel(
  product: Pick<ProductItem, 'storeChannelConfig' | 'storeChannelRules' | 'shareTargets' | 'skus'>
) {
  const config = getProductStoreChannelConfig(product as ProductItem);

  if (!config) {
    return '未开启';
  }

  return config.shareMode === 'shared_pool' ? '商品共享池' : '商品库';
}

export function getProductChannelConfig(
  product: Pick<ProductItem, 'storeChannelConfig' | 'storeChannelRules' | 'shareTargets' | 'skus'>
) {
  return getProductStoreChannelConfig(product as ProductItem);
}

export function buildProductDetailChannelRows(
  product: Pick<ProductItem, 'storeChannelConfig' | 'storeChannelRules' | 'shareTargets' | 'skus'>,
  storeItems: ProductStoreItem[] = readProductStoreItems()
) {
  const config = getProductStoreChannelConfig(product as ProductItem);

  if (!config || config.shareMode !== 'product_pool') {
    return [] as ProductDetailChannelRow[];
  }

  const totalSkuCount = product.skus?.length || 0;

  return (config.productPoolStoreConfigs || []).map((item) => ({
    key: item.storeId,
    storeId: item.storeId,
    storeName: resolveStoreName(item.storeId, storeItems),
    sellStatusLabel: PRODUCT_STORE_SELL_STATUS_LABEL_MAP[item.sellStatus],
    channelStatusLabel:
      PRODUCT_STORE_CHANNEL_STATUS_LABEL_MAP[item.channelStatus || 'off'],
    sellableSkuText: formatSellableSkuText(item, totalSkuCount),
    allowSelfPriceLabel: item.allowSelfPrice === true ? '支持' : '不支持',
  }));
}

export function getProductSharedScopeText(
  config: ProductStoreChannelConfigItem | undefined,
  storeItems: ProductStoreItem[] = readProductStoreItems()
) {
  if (!config || config.shareMode !== 'shared_pool') {
    return '';
  }

  if (config.storeScope === 'allStores') {
    return '全部店铺';
  }

  const labels = (config.storeIds || [])
    .map((storeId) => resolveStoreName(storeId, storeItems))
    .filter(Boolean);

  return labels.join('、');
}
