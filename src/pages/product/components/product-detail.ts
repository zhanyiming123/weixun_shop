import { getProductStoreChannelConfig } from '@/lib/product';
import {
  PRODUCT_STORE_CHANNEL_STATUS_LABEL_MAP,
  PRODUCT_STORE_SELL_STATUS_LABEL_MAP,
  readProductStoreItems,
  type ProductStoreItem,
} from '@/pages/product/store-config/data';
import type {
  ProductItem,
  ProductListItem,
  ProductStoreChannelConfigItem,
  ProductStoreChannelProductPoolStoreConfigItem,
  ProductSpecMode,
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

export type ProductDetailField = {
  label: string;
  value: string;
};

export type ProductDetailSection = {
  key: 'basic' | 'spec' | 'detail-page' | 'store-channel';
  title: string;
  fields: ProductDetailField[];
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

export function getProductSpecModeLabel(specMode: ProductSpecMode) {
  return specMode === 'single' ? '单规格' : '多规格';
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

export function buildProductDetailContentState(
  product?: Pick<ProductItem, 'detailContent' | 'detailHtml'>
) {
  return {
    html:
      typeof product?.detailContent?.html === 'string'
        ? product.detailContent.html
        : typeof product?.detailHtml === 'string'
          ? product.detailHtml
          : '',
    fontSize:
      typeof product?.detailContent?.fontSize === 'string' &&
      product.detailContent.fontSize
        ? product.detailContent.fontSize
        : '16',
    lineHeight:
      typeof product?.detailContent?.lineHeight === 'string' &&
      product.detailContent.lineHeight
        ? product.detailContent.lineHeight
        : '1.75',
  };
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

export function buildProductDetailSections(
  product: ProductListItem,
  catalogFullLabel: string,
  ownershipFullLabel: string,
  storeItems: ProductStoreItem[] = readProductStoreItems()
) {
  const channelConfig = getProductChannelConfig(product);
  const channelRows = buildProductDetailChannelRows(product, storeItems);
  const sharedScopeText = getProductSharedScopeText(channelConfig, storeItems);
  const detailContent = buildProductDetailContentState(product);

  const sections: ProductDetailSection[] = [
    {
      key: 'basic',
      title: '基础信息',
      fields: [
        {
          label: '商品名称',
          value: product.storeView.currentName,
        },
        {
          label: '商品类型',
          value: getProductTypeLabel(product.productType),
        },
        {
          label: '商品编码',
          value: product.id,
        },
        {
          label: '商品来源',
          value: product.storeView.sourceLabel || '--',
        },
        {
          label: '商品类目',
          value: catalogFullLabel,
        },
        {
          label: '商品分类',
          value: ownershipFullLabel,
        },
        {
          label: '库存单位',
          value: product.inventoryUnit || '--',
        },
        {
          label: '限购规则',
          value: formatProductLimitRule(product),
        },
      ],
    },
    {
      key: 'spec',
      title: '规格与库存',
      fields: [
        {
          label: '商品规格',
          value: getProductSpecModeLabel(product.specMode),
        },
        {
          label: 'SKU数量',
          value: `${product.storeView.currentSkus.length}`,
        },
        {
          label: '默认规格',
          value:
            product.storeView.currentSkus.find((item) => item.isDefaultSelected)
              ?.specText || (product.specMode === 'single' ? '默认规格' : '--'),
        },
        {
          label: '总库存',
          value: `${product.stock}`,
        },
      ],
    },
    {
      key: 'detail-page',
      title: '商品详情页配置',
      fields: [
        {
          label: '详情内容',
          value: detailContent.html.trim() ? '已配置' : '未配置',
        },
        {
          label: '正文字号',
          value: `${detailContent.fontSize}px`,
        },
        {
          label: '行高',
          value: detailContent.lineHeight,
        },
      ],
    },
    {
      key: 'store-channel',
      title: '店铺渠道配置',
      fields: [
        {
          label: '店铺渠道',
          value: channelConfig ? '已开启' : '已关闭',
        },
        {
          label: '生效商品池',
          value: getProductChannelModeLabel(product),
        },
        {
          label: '渠道店铺数',
          value: channelRows.length ? `${channelRows.length} 家` : '--',
        },
        {
          label: '共享范围',
          value: sharedScopeText || '--',
        },
      ],
    },
  ];

  return sections;
}
