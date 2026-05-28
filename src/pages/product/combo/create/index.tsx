import React, { useEffect, useMemo, useRef, useState } from 'react';
import qs from 'query-string';
import {
  Alert,
  Button,
  Card,
  Cascader,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Message,
  Modal,
  Radio,
  Select,
  Switch,
  Table,
  Tag,
  TreeSelect,
  Typography,
  Upload,
} from '@arco-design/web-react';
import { UploadItem } from '@arco-design/web-react/es/Upload/interface';
import {
  IconAlignCenter,
  IconAlignLeft,
  IconAlignRight,
  IconApps,
  IconBgColors,
  IconBold,
  IconCheckSquare,
  IconFontColors,
  IconImage,
  IconItalic,
  IconLink,
  IconMore,
  IconOrderedList,
  IconPlus,
  IconRedo,
  IconUnderline,
  IconUndo,
  IconUnorderedList,
  IconVideoCamera,
} from '@arco-design/web-react/icon';
import { useSelector } from 'react-redux';
import { useHistory, useLocation } from 'react-router-dom';
import styles from './index.module.less';
import {
  applyUnsellableWhenNoSellableSku,
  sanitizeStoreShareSettingMapByEnabledSkuKeys,
  type ProductChannelShareMode,
  type StoreShareSettingItem,
} from './share-config';
import {
  buildComboCreateStoreChannelProductPoolVisibleColumns,
  COMBO_CREATE_STORE_CHANNEL_PRODUCT_POOL_SHOW_SELLABLE_SKU,
} from './store-channel-product-pool-modal';
import {
  buildComboCreateStoreChannelShareModePatch,
  COMBO_CREATE_SHARED_POOL_SHOW_SELLABLE_SKU,
} from './store-channel-shared-pool-config';
import {
  buildStoreChannelPayloadFromSkuMetaItems,
  buildStoreChannelCreateSkuPayload,
  buildStoreChannelSkuMetaItems,
  createStoreChannelConfigDraftFromProductConfig,
  createEmptyStoreChannelConfig,
  createDefaultStoreChannelProductPoolStoreConfig,
  syncStoreChannelConfigDraft,
  syncStoreChannelSkuDraftMap,
  validateStoreChannelSkuDraftMap,
  type StoreChannelConfigDraftItem,
  type StoreChannelProductPoolStoreConfigDraftItem,
  type StoreChannelSkuDraftItem,
  type StoreChannelSkuDraftMap,
  type StoreChannelSkuMetaItem,
  STORE_CHANNEL_SINGLE_SKU_KEY,
} from './store-channel';
import {
  buildProductCatalogCascaderOptions,
  getProductCatalogIdFromPath,
  getProductCatalogPathById,
  readProductCatalogItems,
} from '../../catalog/data';
import {
  buildProductOwnershipCascaderOptions,
  getProductOwnershipIdFromPath,
  getProductOwnershipPathById,
  readProductOwnershipItems,
} from '../../category/data';
import {
  readProductCatalogAttributes,
} from '../../attribute/data';
import {
  buildProductCatalogAttributesFromTemplate,
  getEnabledProductCatalogAttributeTemplateByCatalogId,
  readProductCatalogAttributeTemplates,
  type ProductCatalogTemplateResolvedAttribute,
} from '../../attribute-template/data';
import {
  DEFAULT_INVENTORY_UNIT,
  INVENTORY_UNIT_OPTIONS,
  createProductId,
  createProductSkuId,
  formatProductCreatedAt,
  ProductItem,
  ProductSkuItem,
  useProductItems,
} from '../data';
import {
  buildProductStoreDepartmentOptions,
  createDefaultProductStoreConfig,
  getProductStoreSummary,
  normalizeProductStoreConfigs,
  ProductStoreChannelStatus,
  PRODUCT_STORE_SELL_STATUS_LABEL_MAP,
  PRODUCT_STORE_TYPE_LABEL_MAP,
  ProductStoreConfigItem,
  ProductStoreItem,
  ProductStoreSellStatus,
  ProductStoreType,
  readProductStoreItems,
} from '../../store-config/data';
import {
  createDefaultProductStoreOverride,
  getProductStoreChannelConfig,
  getProductStatusByStoreConfigs,
} from '@/lib/product';
import { formatPriceNumber } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import type {
  ProductBundleComponentItem,
  ProductCarouselImage,
  ProductComboOptionItem,
  ProductIndependentPriceRule,
  ProductItem as DomainProductItem,
  ProductListItem as DomainProductListItem,
  ProductShareTargetItem,
  ProductStoreOverrideMap,
} from '@/types/product';
import { GlobalState } from '@/store';
import { filterStoreItemsByIds } from '@/utils/organization';
import { ProductService } from '@/services/ProductService';
import CouponStoreSelector from '@/pages/marketing/center/components/store-selector';
import ComboProductConfigCard, {
  createDefaultComboOption,
} from '@/pages/product/components/combo-product-config-card';
import { syncComboOptionProductRequiredState } from '@/pages/product/components/combo-product-config-card.utils';
import { canEditComboProduct } from '../edit';
import {
  shouldShowComboInventoryFields,
  type ProductCreateMode,
} from './inventory-field-visibility';

type CarouselImage = {
  uid: string;
  name: string;
  url?: string;
};

type SpecItem = {
  id: number;
  name: string;
  value: string;
};

type SpecMode = 'single' | 'multi';
type ProductCreateLocationState = {
  mode?: Exclude<ProductCreateMode, 'create'>;
  sourceProduct?: ProductItem;
};

type StoreConfigFilterType = 'all' | ProductStoreType;
type StoreConfigFilterStatus = 'all' | ProductStoreSellStatus;
type StoreChannelProductPoolFilterStatus =
  | 'all'
  | ProductStoreSellStatus;
type StoreConfigTableItem = ProductStoreItem & ProductStoreConfigItem & StoreShareSettingItem;
type StoreChannelProductPoolTableItem = ProductStoreItem &
  StoreChannelProductPoolStoreConfigDraftItem & {
    shareMode: ProductChannelShareMode;
  };
type ChannelSkuDraftItem = {
  disabled?: boolean;
};
type ChannelSkuDraftMap = Record<string, ChannelSkuDraftItem>;
type ChannelSkuTableItem = {
  key: string;
  specLabel: string;
  disabled: boolean;
};
type EditSkuDraftItem = {
  price?: number;
  stock?: number;
  status?: 'on' | 'off';
  image?: ProductCarouselImage;
  isDefaultSelected?: boolean;
};
type EditSkuDraftMap = Record<string, EditSkuDraftItem>;
type EditSkuTableItem = {
  id: string;
  index: number;
  specText: string;
  price: number;
  stock: number;
};
type IndependentPriceRuleDraftField = 'minPrice' | 'maxPrice';
type IndependentPriceRuleDraftItem = {
  minPrice?: number;
  maxPrice?: number;
};
type IndependentPriceRuleDraftMap = Record<string, IndependentPriceRuleDraftItem>;
type IndependentPriceRuleTableItem = {
  key: string;
  specLabel: string;
  sourcePrice?: number;
  minPrice?: number;
  maxPrice?: number;
  disabled: boolean;
};

const PRODUCT_TYPE_OPTIONS = [
  {
    label: '实物商品',
    value: 'physical',
  },
  {
    label: '虚拟商品',
    value: 'virtual',
  },
];

function getStoreChannelProductPoolSellState(
  sellStatus: ProductStoreSellStatus
) {
  return sellStatus === 'sellable' ? 'sellable' : 'unsellable';
}

function normalizePath(value: (string | string[])[] | undefined): string[] {
  if (!Array.isArray(value) || !value.length) {
    return [];
  }

  const firstValue = value[0];
  if (Array.isArray(firstValue)) {
    return firstValue;
  }

  return value as string[];
}

function moveArrayItem<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...list];
  const [picked] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, picked);
  return next;
}

function buildUploadFileListFromCarouselImages(
  images: { id: string; name: string; url: string }[] = []
): UploadItem[] {
  return images.map((item) => ({
    uid: item.id,
    name: item.name,
    url: item.url,
    status: 'done',
  }));
}

function buildCarouselImageState(
  images: { id: string; name: string; url: string }[] = []
): CarouselImage[] {
  return images.map((item) => ({
    uid: item.id,
    name: item.name,
    url: item.url,
  }));
}

function buildSubmitCarouselImages(images: CarouselImage[] = []) {
  return images.flatMap((item, index) => {
    if (!item.url) {
      return [];
    }

    return [
      {
        id: item.uid || `carousel_${index + 1}`,
        name: item.name?.trim() || `图片${index + 1}`,
        url: item.url,
      },
    ];
  });
}

function buildDefaultCreateStoreConfigs(
  items: ProductStoreItem[],
  ownStoreIds: string[]
): ProductStoreConfigItem[] {
  const defaultSellableStoreIds =
    ownStoreIds.length > 0 ? ownStoreIds : items.map((item) => item.id);
  const sellableStoreIdSet = new Set(defaultSellableStoreIds);

  return items.map((item) => ({
    storeId: item.id,
    sellStatus: sellableStoreIdSet.has(item.id) ? 'sellable' : 'unsellable',
    channelStatus: 'off',
  }));
}

function isCreateStoreConfigDefault(
  storeConfigs: ProductStoreConfigItem[],
  items: ProductStoreItem[],
  ownStoreIds: string[]
) {
  if (!items.length || storeConfigs.length !== items.length) {
    return false;
  }

  const defaultSellableStoreIds =
    ownStoreIds.length > 0 ? ownStoreIds : items.map((item) => item.id);
  const sellableStoreIdSet = new Set(defaultSellableStoreIds);
  const storeConfigMap = new Map(storeConfigs.map((item) => [item.storeId, item]));

  return items.every((item) => {
    const config = storeConfigMap.get(item.id);
    if (!config) {
      return false;
    }

    if (sellableStoreIdSet.has(item.id)) {
      return config.sellStatus === 'sellable' && config.channelStatus === 'off';
    }

    return config.sellStatus === 'unsellable' && config.channelStatus === 'off';
  });
}

const DEFAULT_DETAIL_HTML =
  '';

const DETAIL_BLOCK_OPTIONS = [
  { label: '正文', value: 'p' },
  { label: '标题 1', value: 'h1' },
  { label: '标题 2', value: 'h2' },
  { label: '标题 3', value: 'h3' },
];

const DETAIL_FONT_SIZE_OPTIONS = [
  { label: '默认字号', value: '16' },
  { label: '14px', value: '14' },
  { label: '18px', value: '18' },
  { label: '20px', value: '20' },
];

const DETAIL_LINE_HEIGHT_OPTIONS = [
  { label: '默认行高', value: '1.75' },
  { label: '1.5', value: '1.5' },
  { label: '2.0', value: '2.0' },
];

const COPY_PRODUCT_NAME_SUFFIX = '（副本）';
const STORE_CONFIG_PAGE_SIZE_OPTIONS = [20, 50];
const EMPTY_STORE_IDS: string[] = [];
const CHANNEL_SINGLE_SKU_KEY = 'single';
const SKU_TREE_ROOT_KEY = '__all_skus__';
const PRODUCT_CHANNEL_SHARE_MODE_LABEL_MAP: Record<ProductChannelShareMode, string> = {
  product_pool: '店铺商品池',
  shared_pool: '店铺商品共享池',
};
const PRODUCT_FORM_LAYOUT = {
  layout: 'horizontal' as const,
  labelCol: { flex: '120px' },
  wrapperCol: { flex: '1' },
  requiredSymbol: true,
};
const { useForm } = Form;
const ONLINE_MALL_EXAMPLE_PLACEHOLDER = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 720">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f8fafc" />
        <stop offset="100%" stop-color="#eef2ff" />
      </linearGradient>
    </defs>
    <rect width="960" height="720" rx="24" fill="url(#bg)" />
    <rect x="48" y="48" width="864" height="80" rx="20" fill="#ffffff" />
    <rect x="88" y="76" width="220" height="24" rx="12" fill="#dbeafe" />
    <rect x="708" y="74" width="152" height="28" rx="14" fill="#e5e7eb" />
    <rect x="48" y="160" width="280" height="512" rx="24" fill="#ffffff" />
    <rect x="360" y="160" width="552" height="512" rx="24" fill="#ffffff" />
    <rect x="80" y="204" width="216" height="216" rx="18" fill="#e0e7ff" />
    <rect x="392" y="208" width="240" height="28" rx="14" fill="#c7d2fe" />
    <rect x="392" y="256" width="472" height="18" rx="9" fill="#e5e7eb" />
    <rect x="392" y="292" width="420" height="18" rx="9" fill="#e5e7eb" />
    <rect x="392" y="338" width="180" height="40" rx="20" fill="#2563eb" />
    <rect x="392" y="414" width="488" height="12" rx="6" fill="#e5e7eb" />
    <rect x="392" y="442" width="456" height="12" rx="6" fill="#e5e7eb" />
    <rect x="392" y="470" width="432" height="12" rx="6" fill="#e5e7eb" />
    <text x="480" y="600" text-anchor="middle" font-size="30" font-family="Arial, sans-serif" fill="#64748b">
      Online Mall Preview Placeholder
    </text>
  </svg>
`)}`;

function buildCopyProductName(name: string) {
  const maxLength = 15;
  const baseLength = maxLength - COPY_PRODUCT_NAME_SUFFIX.length;

  if (name.length <= baseLength) {
    return `${name}${COPY_PRODUCT_NAME_SUFFIX}`;
  }

  return `${name.slice(0, baseLength)}${COPY_PRODUCT_NAME_SUFFIX}`;
}

function buildSpecText(item: SpecItem, index: number) {
  return (
    [item.name.trim(), item.value.trim()].filter(Boolean).join('：') ||
    `规格${index + 1}`
  );
}

function buildIndependentPriceRuleDraftMap(
  rule: ProductIndependentPriceRule | undefined,
  skus: ProductSkuItem[] = []
): IndependentPriceRuleDraftMap {
  const ruleMap = new Map(
    (rule?.skuRules || []).map((item) => [item.skuId, item])
  );

  return skus.reduce<IndependentPriceRuleDraftMap>((result, sku) => {
    const matchedRule = ruleMap.get(sku.id);
    const key = skus.length === 1 ? CHANNEL_SINGLE_SKU_KEY : sku.id;

    result[key] = {
      minPrice: matchedRule?.minPrice,
      maxPrice: matchedRule?.maxPrice,
    };

    return result;
  }, {});
}

function uniqueStringArray(values: string[] = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

function buildPurchaseLimitState(
  product?: Pick<
    DomainProductItem,
    'purchaseLimit' | 'isLimited' | 'limitCount'
  >
) {
  const enabled =
    product?.purchaseLimit?.enabled === true || product?.isLimited === true;
  const count =
    enabled &&
    typeof (product?.purchaseLimit?.count ?? product?.limitCount) === 'number' &&
    Number.isFinite(product.purchaseLimit?.count ?? product?.limitCount) &&
    Number(product.purchaseLimit?.count ?? product?.limitCount) > 0
      ? Math.floor(Number(product.purchaseLimit?.count ?? product?.limitCount))
      : 1;

  return {
    enabled,
    count,
  };
}

function buildDetailContentState(
  product?: Pick<
    DomainProductItem,
    'detailContent' | 'detailHtml'
  >
) {
  return {
    html:
      typeof product?.detailContent?.html === 'string'
        ? product.detailContent.html
        : typeof product?.detailHtml === 'string'
          ? product.detailHtml
        : DEFAULT_DETAIL_HTML,
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

function resolveCatalogAttributesByCatalogId(
  catalogId: string | undefined,
  catalogAttributeTemplates: ReturnType<typeof readProductCatalogAttributeTemplates>,
  catalogAttributes: ReturnType<typeof readProductCatalogAttributes>
) {
  return buildProductCatalogAttributesFromTemplate(
    getEnabledProductCatalogAttributeTemplateByCatalogId(
      catalogAttributeTemplates,
      catalogId
    ),
    catalogAttributes
  );
}

function buildCatalogAttributeDraftValues(
  attributes: ProductCatalogTemplateResolvedAttribute[],
  productName = ''
) {
  return attributes.reduce<Record<string, unknown>>((result, attribute) => {
    const field = `catalogAttributeValue_${attribute.id}`;

    if (attribute.type === 'single') {
      result[field] = attribute.values[0] || undefined;
      return result;
    }

    if (attribute.type === 'multi') {
      result[field] = attribute.values[0] ? [attribute.values[0]] : undefined;
      return result;
    }

    if (attribute.type === 'number') {
      result[field] = 1;
      return result;
    }

    result[field] = productName ? `${productName}相关说明` : '相关说明';
    return result;
  }, {});
}

function buildEmptyCatalogAttributeDraftValues(
  attributes: ProductCatalogTemplateResolvedAttribute[]
) {
  return attributes.reduce<Record<string, undefined>>((result, attribute) => {
    result[`catalogAttributeValue_${attribute.id}`] = undefined;
    return result;
  }, {});
}

function buildStoreShareSettingMapFromProduct(
  product: ProductItem,
  storeItems: ProductStoreItem[],
  enabledSkuKeys: string[]
) {
  const shareTargetMap = new Map(
    (product.shareTargets || []).map((item) => [item.storeId, item])
  );
  const enabledSkuKeySet = new Set(enabledSkuKeys);

  return storeItems.reduce<Record<string, StoreShareSettingItem>>((result, item) => {
    const shareTarget = shareTargetMap.get(item.id);
    const isSourceStore = Boolean(product.sourceStoreId) && item.id === product.sourceStoreId;
    const sellableSkuKeys = isSourceStore
      ? [...enabledSkuKeys]
      : uniqueStringArray(
          (shareTarget?.sellableSkuIds || []).filter((skuKey) =>
            enabledSkuKeySet.has(skuKey)
          )
        );

    result[item.id] = {
      shareMode:
        isSourceStore || shareTarget?.status === 'referenced'
          ? ('product_pool' as const)
          : ('shared_pool' as const),
      sellableSkuKeys,
    };
    return result;
  }, {});
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return uniqueStringArray(
    value
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }

        if (item && typeof item === 'object' && typeof (item as { value?: unknown }).value === 'string') {
          return (item as { value: string }).value;
        }

        return '';
      })
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function normalizeTreeSelectSkuKeys(value: unknown, availableSkuKeys: string[]) {
  const normalizedAvailableSkuKeys = uniqueStringArray(availableSkuKeys);
  const normalizedValue = normalizeStringArray(value);

  if (normalizedValue.includes(SKU_TREE_ROOT_KEY)) {
    return normalizedAvailableSkuKeys;
  }

  const availableSkuKeySet = new Set(normalizedAvailableSkuKeys);
  return normalizedValue.filter((skuKey) => availableSkuKeySet.has(skuKey));
}

function buildTreeSelectDisplaySkuKeys(
  selectedSkuKeys: string[],
  availableSkuKeys: string[]
) {
  const normalizedAvailableSkuKeys = uniqueStringArray(availableSkuKeys);
  const availableSkuKeySet = new Set(normalizedAvailableSkuKeys);
  const normalizedSelectedSkuKeys = uniqueStringArray(
    selectedSkuKeys.filter((skuKey) => availableSkuKeySet.has(skuKey))
  );

  if (
    normalizedAvailableSkuKeys.length > 0 &&
    normalizedSelectedSkuKeys.length === normalizedAvailableSkuKeys.length
  ) {
    return [SKU_TREE_ROOT_KEY];
  }

  return normalizedSelectedSkuKeys;
}

function buildDefaultStoreShareSetting(enabledSkuKeys: string[]): StoreShareSettingItem {
  return {
    shareMode: 'product_pool',
    sellableSkuKeys: uniqueStringArray(enabledSkuKeys),
  };
}

function buildStoreChannelProductPoolConfigDraftMap(
  storeItems: ProductStoreItem[],
  productPoolStoreConfigs: StoreChannelProductPoolStoreConfigDraftItem[] = [],
  allowedSkuKeys: string[] = []
) {
  const allowedSkuKeySet = new Set(uniqueStringArray(allowedSkuKeys));
  const configMap = new Map(
    productPoolStoreConfigs.map((item) => [item.storeId, item])
  );

  return storeItems.reduce<
    Record<string, StoreChannelProductPoolStoreConfigDraftItem>
  >((result, item) => {
    const current =
      configMap.get(item.id) ||
      createDefaultStoreChannelProductPoolStoreConfig(item.id);
    const normalizedSellableSkuKeys = uniqueStringArray(
      current.sellableSkuKeys || []
    ).filter((skuKey) => allowedSkuKeySet.has(skuKey));
    const isSellable = current.sellStatus === 'sellable';
    const nextSellableSkuKeys = isSellable
      ? normalizedSellableSkuKeys.length
        ? normalizedSellableSkuKeys
        : Array.from(allowedSkuKeySet)
      : [];

    result[item.id] = {
      ...current,
      sellStatus: isSellable ? ('sellable' as const) : ('unsellable' as const),
      channelStatus:
        isSellable && current.channelStatus === 'on' ? ('on' as const) : ('off' as const),
      sellableSkuKeys: nextSellableSkuKeys,
      allowSelfPrice:
        isSellable && nextSellableSkuKeys.length > 0 && current.allowSelfPrice === true,
    };
    return result;
  }, {});
}

function renderCatalogAttributeField(
  attribute: ProductCatalogTemplateResolvedAttribute,
  className: string,
  disabled = false
) {
  if (attribute.type === 'text') {
    return (
      <Input
        className={className}
        placeholder={`请输入${attribute.name}`}
        disabled={disabled}
        maxLength={attribute.textMaxLength}
        showWordLimit={Boolean(attribute.textMaxLength)}
        allowClear
      />
    );
  }

  if (attribute.type === 'number') {
    const precision =
      attribute.numberMode === 'decimalAllowed' ? attribute.numberPrecision : 0;

    return (
      <InputNumber
        className={className}
        disabled={disabled}
        min={0}
        precision={precision}
        placeholder={`请输入${attribute.name}`}
      />
    );
  }

  if (attribute.type === 'single') {
    return (
      <Select
        className={className}
        disabled={disabled}
        placeholder={`请选择${attribute.name}`}
        allowClear
      >
        {attribute.values.map((value) => (
          <Select.Option key={value} value={value}>
            {value}
          </Select.Option>
        ))}
      </Select>
    );
  }

  return (
    <Checkbox.Group className={styles.attributeCheckboxGroup} disabled={disabled}>
      {attribute.values.map((value) => (
        <Checkbox key={value} disabled={disabled} value={value}>
          {value}
        </Checkbox>
      ))}
    </Checkbox.Group>
  );
}

function getBundleCombinationPrice(
  components: ProductBundleComponentItem[],
  products: DomainProductListItem[]
) {
  const productMap = new Map(products.map((product) => [product.id, product]));

  return components.reduce((sum, item) => {
    const sku = productMap
      .get(item.productId)
      ?.skus.find((candidate) => candidate.id === item.skuId);

    if (!sku) {
      return sum;
    }

    return sum + sku.price;
  }, 0);
}

function flattenComboOptions(
  options: ProductComboOptionItem[] = []
): ProductBundleComponentItem[] {
  return options.flatMap((option) =>
    option.items.map((item) => ({
      productId: item.productId,
      skuId: item.skuId,
    }))
  );
}

function getSourceComboOptionSkuIds(sourceProduct?: ProductItem) {
  if (!sourceProduct) {
    return [];
  }

  if ((sourceProduct.comboOptions || []).length) {
    return uniqueStringArray(
      sourceProduct.comboOptions.flatMap((option) =>
        option.items.map((item) => item.skuId)
      )
    );
  }

  return uniqueStringArray(
    (sourceProduct.bundleComponents || []).map((item) => item.skuId)
  );
}

function buildLegacyComboOptions(
  sourceProduct: ProductItem,
  products: DomainProductListItem[],
  fallbackProducts: ProductItem[]
): ProductComboOptionItem[] {
  if ((sourceProduct.comboOptions || []).length) {
    return sourceProduct.comboOptions || [];
  }

  const legacyComponents = sourceProduct.bundleComponents || [];
  if (!legacyComponents.length) {
    return [createDefaultComboOption(1)];
  }

  const productMap = new Map(products.map((product) => [product.id, product]));
  const fallbackProductMap = new Map(
    fallbackProducts.map((product) => [product.id, product])
  );

  return [
    {
      id: 'option_1',
      title: '选项1',
      required: true,
      selectionLimit: legacyComponents.length,
      items: legacyComponents.map((item) => {
        const sku = productMap
          .get(item.productId)
          ?.skus.find((candidate) => candidate.id === item.skuId);
        const fallbackSku = fallbackProductMap
          .get(item.productId)
          ?.skus.find((candidate) => candidate.id === item.skuId);

        return {
          productId: item.productId,
          skuId: item.skuId,
          comboPrice: sku?.price ?? fallbackSku?.price ?? 0,
          quantity: 1,
          required: true,
          listed: true,
        };
      }),
    },
  ];
}

function getCatalogAttributeRules(attribute: ProductCatalogTemplateResolvedAttribute) {
  const rules: Array<Record<string, unknown>> = attribute.required
    ? [
        {
          required: true,
          message:
            attribute.type === 'text' || attribute.type === 'number'
              ? `请输入${attribute.name}`
              : `请选择${attribute.name}`,
        },
      ]
    : [];

  if (attribute.type === 'text' && attribute.textMaxLength) {
    rules.push({
      max: attribute.textMaxLength,
      message: `${attribute.name}最多支持 ${attribute.textMaxLength} 个字符`,
    });
  }

  return rules.length ? rules : undefined;
}

function ProductCreatePage() {
  const productService = useMemo(() => new ProductService(), []);
  const [baseForm] = useForm();
  const history = useHistory();
  const location = useLocation<ProductCreateLocationState>();
  const currentOrganization = useSelector(
    (state: GlobalState) => state.currentOrganization
  );
  const isHeadquarter = currentOrganization?.scope === 'headquarter';
  const [productItems] = useProductItems();
  const catalogItems = useMemo(() => readProductCatalogItems(), []);
  const ownershipItems = useMemo(() => readProductOwnershipItems(), []);
  const catalogAttributes = useMemo(() => readProductCatalogAttributes(), []);
  const catalogAttributeTemplates = useMemo(
    () => readProductCatalogAttributeTemplates(catalogAttributes),
    [catalogAttributes]
  );
  const storeItems = useMemo(() => readProductStoreItems(), []);
  const visibleStoreIds = currentOrganization?.storeIds || EMPTY_STORE_IDS;
  const currentStoreId =
    currentOrganization?.scope === 'store' && visibleStoreIds.length === 1
      ? visibleStoreIds[0]
      : undefined;
  const scopedStoreItems = useMemo(() => {
    if (isHeadquarter) {
      return storeItems;
    }

    const scopedItems = filterStoreItemsByIds(storeItems, visibleStoreIds);
    const missingItems = storeItems.filter(
      (item) => item.type === 'store' && !scopedItems.some((candidate) => candidate.id === item.id)
    );

    return [...scopedItems, ...missingItems];
  }, [isHeadquarter, storeItems, visibleStoreIds]);
  const storeDepartmentOptions = useMemo(
    () => buildProductStoreDepartmentOptions(scopedStoreItems),
    [scopedStoreItems]
  );
  const locationQuery = useMemo(
    () => qs.parse(location.search),
    [location.search]
  );
  const pageMode = useMemo<ProductCreateMode>(() => {
    const rawMode = location.state?.mode || locationQuery.mode;

    return rawMode === 'edit' || rawMode === 'copy' ? rawMode : 'create';
  }, [location.state, locationQuery.mode]);
  const isEditMode = pageMode === 'edit';
  const showInventoryFields = shouldShowComboInventoryFields(pageMode);
  const isStoreScopedCreatePage =
    currentOrganization?.scope === 'store' && pageMode === 'create';
  const channelEnabled =
    Boolean(currentStoreId) && !isEditMode && !isStoreScopedCreatePage;
  const sourceProductId = useMemo(() => {
    if (typeof locationQuery.sourceId === 'string') {
      return locationQuery.sourceId;
    }

    return location.state?.sourceProduct?.id || '';
  }, [location.state, locationQuery.sourceId]);
  const sourceProduct = useMemo(() => {
    if (!sourceProductId) {
      return undefined;
    }

    return (
      productItems.find((item) => item.id === sourceProductId) ||
      location.state?.sourceProduct
    );
  }, [location.state, productItems, sourceProductId]);
  const hasInvalidEditSource = useMemo(() => {
    if (!isEditMode || !currentOrganization?.scope) {
      return false;
    }

    return !sourceProduct || !canEditComboProduct(
      sourceProduct,
      currentOrganization.scope,
      visibleStoreIds
    );
  }, [
    currentOrganization?.scope,
    isEditMode,
    sourceProduct,
    visibleStoreIds,
  ]);
  const sourceComboOptionSkuIds = useMemo(
    () => (isEditMode ? getSourceComboOptionSkuIds(sourceProduct) : []),
    [isEditMode, sourceProduct]
  );
  const isStoreScopedOwnedEditPage =
    currentOrganization?.scope === 'store' &&
    isEditMode &&
    Boolean(currentStoreId) &&
    sourceProduct?.sourceType === 'store' &&
    sourceProduct?.sourceStoreId === currentStoreId;
  const useStoreScopedChannelConfig =
    isStoreScopedCreatePage || isStoreScopedOwnedEditPage;
  const productCatalogOptions = useMemo(
    () => buildProductCatalogCascaderOptions(catalogItems),
    [catalogItems]
  );
  const productOwnershipOptions = useMemo(
    () => buildProductOwnershipCascaderOptions(ownershipItems),
    [ownershipItems]
  );
  const [productCatalogId, setProductCatalogId] = useState<string>();
  const [productOwnershipId, setProductOwnershipId] = useState<string>();
  const [productName, setProductName] = useState('');
  const [uploadFileList, setUploadFileList] = useState<UploadItem[]>([]);
  const [carouselImages, setCarouselImages] = useState<CarouselImage[]>([]);
  const [draggingUid, setDraggingUid] = useState<string>('');
  const [inventoryUnit, setInventoryUnit] = useState(DEFAULT_INVENTORY_UNIT);
  const [specMode, setSpecMode] = useState<SpecMode>('single');
  const [specItems, setSpecItems] = useState<SpecItem[]>([]);
  const [singleSpecFileList, setSingleSpecFileList] = useState<UploadItem[]>([]);
  const [singleSpecPrice, setSingleSpecPrice] = useState<number | undefined>();
  const [singleSpecStock, setSingleSpecStock] = useState<number | undefined>(0);
  const [comboOptions, setComboOptions] = useState<ProductComboOptionItem[]>([
    createDefaultComboOption(1),
  ]);
  const [standardProductOptions, setStandardProductOptions] = useState<
    DomainProductListItem[]
  >([]);
  const [storeChannelEnabled, setStoreChannelEnabled] = useState(true);
  const [storeChannelSkuDraftMap, setStoreChannelSkuDraftMap] =
    useState<StoreChannelSkuDraftMap>({});
  const [storeChannelConfigDraft, setStoreChannelConfigDraft] =
    useState<StoreChannelConfigDraftItem>(createEmptyStoreChannelConfig());
  const [storeChannelStoreSelectorVisible, setStoreChannelStoreSelectorVisible] =
    useState(false);
  const [
    storeChannelProductPoolModalVisible,
    setStoreChannelProductPoolModalVisible,
  ] = useState(false);
  const [
    draftStoreChannelProductPoolConfigMap,
    setDraftStoreChannelProductPoolConfigMap,
  ] = useState<Record<string, StoreChannelProductPoolStoreConfigDraftItem>>({});
  const [
    storeChannelProductPoolSelectedStoreKeys,
    setStoreChannelProductPoolSelectedStoreKeys,
  ] = useState<(string | number)[]>([]);
  const [
    storeChannelProductPoolStatusFilter,
    setStoreChannelProductPoolStatusFilter,
  ] = useState<StoreChannelProductPoolFilterStatus>('all');
  const [
    storeChannelProductPoolKeyword,
    setStoreChannelProductPoolKeyword,
  ] = useState('');
  const [storeChannelProductPoolPage, setStoreChannelProductPoolPage] = useState(1);
  const [storeChannelProductPoolPageSize, setStoreChannelProductPoolPageSize] =
    useState(20);
  const [
    storeChannelProductPoolBatchSellStatus,
    setStoreChannelProductPoolBatchSellStatus,
  ] = useState<ProductStoreSellStatus>();
  const [
    storeChannelProductPoolBatchSellableSkuKeys,
    setStoreChannelProductPoolBatchSellableSkuKeys,
  ] = useState<string[]>([]);
  const [
    storeChannelProductPoolBatchAllowSelfPrice,
    setStoreChannelProductPoolBatchAllowSelfPrice,
  ] = useState<'on' | 'off'>();
  const [channelSkuDraftMap, setChannelSkuDraftMap] =
    useState<ChannelSkuDraftMap>({});
  const [editSkuDraftMap, setEditSkuDraftMap] = useState<EditSkuDraftMap>({});
  const [independentPriceEnabled, setIndependentPriceEnabled] = useState(true);
  const [independentStockEnabled, setIndependentStockEnabled] = useState(true);
  const [independentPriceRuleDraftMap, setIndependentPriceRuleDraftMap] =
    useState<IndependentPriceRuleDraftMap>({});
  const [isLimited, setIsLimited] = useState(false);
  const [limitCount, setLimitCount] = useState<number | undefined>(1);
  const [detailHtml, setDetailHtml] = useState(DEFAULT_DETAIL_HTML);
  const [detailBlockType, setDetailBlockType] = useState('p');
  const [detailFontSize, setDetailFontSize] = useState('16');
  const [detailLineHeight, setDetailLineHeight] = useState('1.75');
  const [onlineMallExampleVisible, setOnlineMallExampleVisible] = useState(false);
  const [productStoreConfigs, setProductStoreConfigs] = useState<
    ProductStoreConfigItem[]
  >([]);
  const [hiddenStoreConfigs, setHiddenStoreConfigs] = useState<
    ProductStoreConfigItem[]
  >([]);
  const [storeConfigModalVisible, setStoreConfigModalVisible] = useState(false);
  const [selectedStoreKeys, setSelectedStoreKeys] = useState<(string | number)[]>(
    []
  );
  const [draftStoreConfigMap, setDraftStoreConfigMap] = useState<
    Record<string, ProductStoreConfigItem>
  >({});
  const [storeShareSettingMap, setStoreShareSettingMap] = useState<
    Record<string, StoreShareSettingItem>
  >({});
  const [draftStoreShareSettingMap, setDraftStoreShareSettingMap] = useState<
    Record<string, StoreShareSettingItem>
  >({});
  const [storeTypeFilter, setStoreTypeFilter] =
    useState<StoreConfigFilterType>('all');
  const [storeDepartmentFilter, setStoreDepartmentFilter] = useState('all');
  const [storeStatusFilter, setStoreStatusFilter] =
    useState<StoreConfigFilterStatus>('all');
  const [storeKeyword, setStoreKeyword] = useState('');
  const [storeConfigPage, setStoreConfigPage] = useState(1);
  const [storeConfigPageSize, setStoreConfigPageSize] = useState(20);
  const [storeBatchSellStatus, setStoreBatchSellStatus] =
    useState<ProductStoreSellStatus>();
  const objectUrlMapRef = useRef<Map<string, string>>(new Map());
  const invalidEditRedirectedRef = useRef(false);
  const detailEditorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const objectUrlMap = objectUrlMapRef.current;
    return () => {
      objectUrlMap.forEach((url) => URL.revokeObjectURL(url));
      objectUrlMap.clear();
    };
  }, []);

  useEffect(() => {
    if (!hasInvalidEditSource || invalidEditRedirectedRef.current) {
      return;
    }

    invalidEditRedirectedRef.current = true;
    Message.error('未找到可编辑的组合商品');
    history.replace('/product/combo');
  }, [hasInvalidEditSource, history]);

  useEffect(() => {
    if (!detailEditorRef.current) {
      return;
    }

    if (detailEditorRef.current.innerHTML !== detailHtml) {
      detailEditorRef.current.innerHTML = detailHtml;
    }
  }, [detailHtml]);

  useEffect(() => {
    if (!currentOrganization?.scope) {
      setStandardProductOptions([]);
      return;
    }

    const queryResult = productService.queryList({
      productKind: 'standard',
      tab: 'all',
      filters: {
        searchType: 'productName',
        keyword: '',
        productCatalogId: undefined,
        productOwnershipId: undefined,
        productSourceType: undefined,
        sourceStoreIds: [],
        minPrice: undefined,
        maxPrice: undefined,
        createdAtRange: [],
      },
      organizationScope: currentOrganization.scope,
      visibleStoreIds,
      page: 1,
      pageSize: 500,
    });

    setStandardProductOptions(queryResult.items);
  }, [currentOrganization?.scope, productService, visibleStoreIds]);

  const bundleComponents = useMemo(
    () => flattenComboOptions(comboOptions),
    [comboOptions]
  );

  const bundleCombinationPrice = useMemo(
    () => getBundleCombinationPrice(bundleComponents, standardProductOptions),
    [bundleComponents, standardProductOptions]
  );

  useEffect(() => {
    const visibleStoreIdSet = new Set(scopedStoreItems.map((item) => item.id));

    if (!sourceProduct) {
      const draftCatalogAttributes = resolveCatalogAttributesByCatalogId(
        productCatalogId,
        catalogAttributeTemplates,
        catalogAttributes
      );
      baseForm.setFieldsValue(
        buildEmptyCatalogAttributeDraftValues(draftCatalogAttributes)
      );
      setProductCatalogId(undefined);
      setProductOwnershipId(undefined);
      setProductName('');
      setUploadFileList([]);
      setCarouselImages([]);
      setInventoryUnit(DEFAULT_INVENTORY_UNIT);
      setSpecMode('single');
      setSpecItems([]);
      setSingleSpecFileList([]);
      setSingleSpecPrice(undefined);
      setSingleSpecStock(0);
      setComboOptions([createDefaultComboOption(1)]);
      setStoreChannelEnabled(true);
      setStoreChannelSkuDraftMap({});
      setStoreChannelConfigDraft(createEmptyStoreChannelConfig());
      setStoreChannelStoreSelectorVisible(false);
      setStoreChannelProductPoolModalVisible(false);
      setDraftStoreChannelProductPoolConfigMap({});
      setStoreChannelProductPoolSelectedStoreKeys([]);
      setStoreChannelProductPoolStatusFilter('all');
      setStoreChannelProductPoolKeyword('');
      setStoreChannelProductPoolPage(1);
      setStoreChannelProductPoolPageSize(20);
      setStoreChannelProductPoolBatchSellStatus(undefined);
      setStoreChannelProductPoolBatchSellableSkuKeys([]);
      setStoreChannelProductPoolBatchAllowSelfPrice(undefined);
      setChannelSkuDraftMap({});
      setEditSkuDraftMap({});
      setIndependentPriceEnabled(true);
      setIndependentPriceRuleDraftMap({});
      setIsLimited(false);
      setLimitCount(1);
      setDetailHtml(DEFAULT_DETAIL_HTML);
      setDetailFontSize('16');
      setDetailLineHeight('1.75');
      setStoreShareSettingMap({});
      setDraftStoreShareSettingMap({});
      setProductStoreConfigs(
        buildDefaultCreateStoreConfigs(scopedStoreItems, visibleStoreIds)
      );
      setHiddenStoreConfigs([]);
      return;
    }

    setProductCatalogId(sourceProduct.productCatalogId);
    setProductOwnershipId(sourceProduct.productOwnershipId);
    const nextProductName =
      pageMode === 'copy'
        ? buildCopyProductName(sourceProduct.name)
        : sourceProduct.name;
    setProductName(nextProductName);
    setUploadFileList(
      buildUploadFileListFromCarouselImages(sourceProduct.carouselImages || [])
    );
    setCarouselImages(buildCarouselImageState(sourceProduct.carouselImages || []));
    setInventoryUnit(sourceProduct.inventoryUnit || DEFAULT_INVENTORY_UNIT);
    setSpecMode('single');
    setSpecItems([]);
    setSingleSpecFileList([]);
    setSingleSpecPrice(sourceProduct.price);
    setSingleSpecStock(sourceProduct.stock);
    setComboOptions(
      buildLegacyComboOptions(sourceProduct, standardProductOptions, productItems)
    );
    const sourceStoreChannelConfig = getProductStoreChannelConfig(
      sourceProduct as DomainProductItem
    );
    const sourceStoreChannelSkuMetaItems = (sourceProduct.skus || []).map((sku, index) => ({
      key: sku.id,
      skuId: sku.id,
      specLabel: sku.specText || (index === 0 ? '默认规格' : `规格${index + 1}`),
      sourcePrice: sku.price,
      sourceStock: sku.stock,
    }));
    const sourceCurrentStoreConfig = (sourceProduct.storeConfigs || []).find(
      (item) => item.storeId === currentStoreId
    );
    setStoreChannelEnabled(
      isStoreScopedOwnedEditPage
        ? sourceCurrentStoreConfig?.channelStatus !== 'off'
        : true
    );
    setStoreChannelSkuDraftMap({});
    setStoreChannelConfigDraft(
      isStoreScopedOwnedEditPage
        ? createStoreChannelConfigDraftFromProductConfig(
            sourceStoreChannelConfig,
            sourceStoreChannelSkuMetaItems,
            storeChannelTargetStoreIds
          )
        : createEmptyStoreChannelConfig()
    );
    setStoreChannelStoreSelectorVisible(false);
    setStoreChannelProductPoolModalVisible(false);
    setDraftStoreChannelProductPoolConfigMap({});
    setStoreChannelProductPoolSelectedStoreKeys([]);
    setStoreChannelProductPoolStatusFilter('all');
    setStoreChannelProductPoolKeyword('');
    setStoreChannelProductPoolPage(1);
    setStoreChannelProductPoolPageSize(20);
    setStoreChannelProductPoolBatchSellStatus(undefined);
    setStoreChannelProductPoolBatchSellableSkuKeys([]);
    setStoreChannelProductPoolBatchAllowSelfPrice(undefined);
    setChannelSkuDraftMap({});
    setEditSkuDraftMap(
      (sourceProduct.skus || []).reduce((result, sku) => {
        result[sku.id] = {
          price: sku.price,
          stock: sku.stock,
        };
        return result;
      }, {} as EditSkuDraftMap)
    );
    setIndependentPriceEnabled(sourceProduct.independentPriceRule?.enabled !== false);
    setIndependentPriceRuleDraftMap(
      buildIndependentPriceRuleDraftMap(
        sourceProduct.independentPriceRule,
        sourceProduct.skus || []
      )
    );
    const purchaseLimitState = buildPurchaseLimitState(
      sourceProduct as DomainProductItem
    );
    const detailContentState = buildDetailContentState(
      sourceProduct as DomainProductItem
    );
    const sourceCatalogAttributes = resolveCatalogAttributesByCatalogId(
      sourceProduct.productCatalogId,
      catalogAttributeTemplates,
      catalogAttributes
    );
    baseForm.setFieldsValue(
      buildCatalogAttributeDraftValues(sourceCatalogAttributes, nextProductName)
    );
    setIsLimited(purchaseLimitState.enabled);
    setLimitCount(purchaseLimitState.count);
    setDetailHtml(detailContentState.html);
    setDetailFontSize(detailContentState.fontSize);
    setDetailLineHeight(detailContentState.lineHeight);
    setProductStoreConfigs(
      normalizeProductStoreConfigs(
        (sourceProduct.storeConfigs || []).filter((item) =>
          visibleStoreIdSet.has(item.storeId)
        ),
        scopedStoreItems
      )
    );
    setHiddenStoreConfigs(
      (sourceProduct.storeConfigs || []).filter(
        (item) => !visibleStoreIdSet.has(item.storeId)
      )
    );
    const enabledSkuKeys = (sourceProduct.skus || []).map((sku) => sku.id);
    const nextStoreShareSettingMap = buildStoreShareSettingMapFromProduct(
      sourceProduct,
      scopedStoreItems,
      enabledSkuKeys
    );
    setStoreShareSettingMap(nextStoreShareSettingMap);
    setDraftStoreShareSettingMap(nextStoreShareSettingMap);
  }, [
    baseForm,
    catalogAttributeTemplates,
    catalogAttributes,
    pageMode,
    productCatalogId,
    productItems,
    scopedStoreItems,
    sourceProduct,
    standardProductOptions,
    visibleStoreIds,
  ]);

  useEffect(() => {
    if (isEditMode || !isStoreScopedCreatePage) {
      return;
    }

    setStoreChannelSkuDraftMap((previous) => {
      const syncedDraftMap = syncStoreChannelSkuDraftMap(previous, specMode, specItems);

      if (specMode !== 'single') {
        return syncedDraftMap;
      }

      const singleDraft = syncedDraftMap[STORE_CHANNEL_SINGLE_SKU_KEY] || {};

      return {
        ...syncedDraftMap,
        [STORE_CHANNEL_SINGLE_SKU_KEY]: {
          sourcePrice: bundleCombinationPrice,
          sourceStock:
            typeof singleSpecStock === 'number' && Number.isFinite(singleSpecStock)
              ? Math.max(0, Math.floor(singleSpecStock))
              : typeof singleDraft.sourceStock === 'number' &&
                  Number.isFinite(singleDraft.sourceStock)
                ? Math.max(0, Math.floor(singleDraft.sourceStock))
                : 0,
        },
      };
    });
  }, [
    bundleCombinationPrice,
    isEditMode,
    isStoreScopedCreatePage,
    singleSpecStock,
    specItems,
    specMode,
  ]);

  useEffect(() => {
    if (!useStoreScopedChannelConfig) {
      return;
    }

    const nextTargetStoreIds = scopedStoreItems
      .filter((item) => item.type === 'store' && item.id !== currentStoreId)
      .map((item) => item.id);

    const nextSkuKeys =
      isStoreScopedOwnedEditPage && sourceProduct
        ? (sourceProduct.skus || []).map((item) => item.id)
        : specMode === 'single'
          ? [STORE_CHANNEL_SINGLE_SKU_KEY]
          : specItems.map((item) => String(item.id));

    setStoreChannelConfigDraft((previous) =>
      syncStoreChannelConfigDraft(
        previous,
        nextSkuKeys,
        nextTargetStoreIds
      )
    );
  }, [
    currentStoreId,
    isStoreScopedOwnedEditPage,
    scopedStoreItems,
    sourceProduct,
    specItems,
    specMode,
    useStoreScopedChannelConfig,
  ]);

  function revokeObjectUrl(uid: string) {
    const target = objectUrlMapRef.current.get(uid);
    if (target) {
      URL.revokeObjectURL(target);
      objectUrlMapRef.current.delete(uid);
    }
  }

  function toCarouselImages(nextFiles: UploadItem[], previous: CarouselImage[]) {
    const previousMap = new Map(previous.map((item) => [item.uid, item]));
    const nextImages = nextFiles.map((item, index) => {
      const cached = previousMap.get(item.uid);
      if (cached) {
        return {
          ...cached,
          name: item.name || cached.name || `图片${index + 1}`,
        };
      }

      if (item.url) {
        return {
          uid: item.uid,
          name: item.name || `图片${index + 1}`,
          url: item.url,
        };
      }

      if (item.originFile) {
        const objectUrl = URL.createObjectURL(item.originFile);
        objectUrlMapRef.current.set(item.uid, objectUrl);
        return {
          uid: item.uid,
          name: item.name || `图片${index + 1}`,
          url: objectUrl,
        };
      }

      return {
        uid: item.uid,
        name: item.name || `图片${index + 1}`,
      };
    });

    previous.forEach((image) => {
      if (!nextImages.find((item) => item.uid === image.uid)) {
        revokeObjectUrl(image.uid);
      }
    });

    return nextImages;
  }

  function handleUploadChange(nextFileList: UploadItem[]) {
    const trimmed = nextFileList.slice(0, 8).map((item) => ({
      ...item,
      status: 'done' as const,
    }));
    setUploadFileList(trimmed);
    setCarouselImages((previous) => toCarouselImages(trimmed, previous));
  }

  function handleRemoveImage(uid: string) {
    setUploadFileList((previous) => previous.filter((item) => item.uid !== uid));
    setCarouselImages((previous) =>
      previous.filter((item) => item.uid !== uid)
    );
    revokeObjectUrl(uid);
  }

  function handleDropTo(uid: string) {
    if (!draggingUid || draggingUid === uid) {
      setDraggingUid('');
      return;
    }

    setCarouselImages((previous) => {
      const fromIndex = previous.findIndex((item) => item.uid === draggingUid);
      const toIndex = previous.findIndex((item) => item.uid === uid);
      if (fromIndex === -1 || toIndex === -1) {
        return previous;
      }
      return moveArrayItem(previous, fromIndex, toIndex);
    });

    setUploadFileList((previous) => {
      const fromIndex = previous.findIndex((item) => item.uid === draggingUid);
      const toIndex = previous.findIndex((item) => item.uid === uid);
      if (fromIndex === -1 || toIndex === -1) {
        return previous;
      }
      return moveArrayItem(previous, fromIndex, toIndex);
    });

    setDraggingUid('');
  }

  function handleSingleSpecUploadChange(nextFileList: UploadItem[]) {
    const latestFiles = nextFileList.slice(-1);

    setSingleSpecFileList((previous) => {
      previous.forEach((item) => {
        if (!latestFiles.find((nextItem) => nextItem.uid === item.uid)) {
          revokeObjectUrl(item.uid);
        }
      });

      return latestFiles.map((item) => {
        const nextItem = {
          ...item,
          status: 'done' as const,
        };

        if (nextItem.url) {
          return nextItem;
        }

        if (item.originFile) {
          const cachedUrl = objectUrlMapRef.current.get(item.uid);
          const objectUrl = cachedUrl || URL.createObjectURL(item.originFile);

          if (!cachedUrl) {
            objectUrlMapRef.current.set(item.uid, objectUrl);
          }

          return {
            ...nextItem,
            url: objectUrl,
          };
        }

        return nextItem;
      });
    });
  }

  function handleSingleSpecRemove(file: UploadItem) {
    revokeObjectUrl(file.uid);
    setSingleSpecFileList((previous) =>
      previous.filter((item) => item.uid !== file.uid)
    );
    return true;
  }

  function handleAddSpec() {
    setSpecItems((previous) => [
      ...previous,
      {
        id: Date.now(),
        name: '',
        value: '',
      },
    ]);
  }

  function handleSpecChange(id: number, field: 'name' | 'value', value: string) {
    setSpecItems((previous) =>
      previous.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  function handleRemoveSpec(id: number) {
    setSpecItems((previous) => previous.filter((item) => item.id !== id));
  }

  function handleStoreChannelSkuDraftChange(
    key: string,
    field: keyof StoreChannelSkuDraftItem,
    value?: number
  ) {
    const nextValue =
      typeof value === 'number' && Number.isFinite(value) ? value : undefined;

    if (isStoreScopedOwnedEditPage && (field === 'sourcePrice' || field === 'sourceStock')) {
      setEditSkuDraftMap((previous) => ({
        ...previous,
        [key]: {
          ...previous[key],
          [field === 'sourcePrice' ? 'price' : 'stock']: nextValue,
        },
      }));
      return;
    }

    setStoreChannelSkuDraftMap((previous) => ({
      ...previous,
      [key]: {
        ...previous[key],
        [field]: nextValue,
      },
    }));
  }

  function patchStoreChannelConfig(
    patch: Partial<StoreChannelConfigDraftItem>
  ) {
    setStoreChannelConfigDraft((previous) =>
      syncStoreChannelConfigDraft(
        {
          ...previous,
          ...patch,
        },
        specMode === 'single'
          ? [STORE_CHANNEL_SINGLE_SKU_KEY]
          : specItems.map((item) => String(item.id)),
        storeChannelTargetStoreIds
      )
    );
  }

  function openStoreChannelStoreSelector() {
    setStoreChannelStoreSelectorVisible(true);
  }

  function handleStoreChannelStoreSelectorConfirm(storeIds: string[]) {
    patchStoreChannelConfig({
      storeIds,
    });
    setStoreChannelStoreSelectorVisible(false);
  }

  function handleChannelSkuDisabledToggle(key: string) {
    setChannelSkuDraftMap((previous) => {
      const nextDisabled = !previous[key]?.disabled;
      const nextMap = {
        ...previous,
        [key]: {
          ...previous[key],
          disabled: nextDisabled,
        },
      };
      const nextEnabledSkuKeySet = new Set(
        channelSkuTableData
          .map((item) =>
            item.key === key
              ? {
                  ...item,
                  disabled: nextDisabled,
                }
              : item
          )
          .filter((item) => !item.disabled)
          .map((item) => item.key)
      );
      const nextEnabledSkuKeys = Array.from(nextEnabledSkuKeySet);

      setStoreShareSettingMap((previousShareSetting) =>
        sanitizeStoreShareSettingMapByEnabledSkuKeys(
          previousShareSetting,
          nextEnabledSkuKeys
        )
      );
      setDraftStoreShareSettingMap((previousShareSetting) =>
        sanitizeStoreShareSettingMapByEnabledSkuKeys(
          previousShareSetting,
          nextEnabledSkuKeys
        )
      );
      setProductStoreConfigs((previousStoreConfigs) =>
        applyUnsellableWhenNoSellableSku(
          previousStoreConfigs,
          storeShareSettingMap,
          nextEnabledSkuKeys
        )
      );
      setDraftStoreConfigMap((previousDraftStoreConfigMap) =>
        applyUnsellableWhenNoSellableSku(
          Object.values(previousDraftStoreConfigMap),
          draftStoreShareSettingMap,
          nextEnabledSkuKeys
        ).reduce<Record<string, ProductStoreConfigItem>>((result, config) => {
          result[config.storeId] = config;
          return result;
        }, {})
      );

      return nextMap;
    });
  }

  function handleEditSkuDraftChange(
    skuId: string,
    field: keyof EditSkuDraftItem,
    value?: number
  ) {
    setEditSkuDraftMap((previous) => ({
      ...previous,
      [skuId]: {
        ...previous[skuId],
        [field]:
          typeof value === 'number' && Number.isFinite(value) ? value : undefined,
      },
    }));
  }

  function handleIndependentPriceRuleDraftChange(
    key: string,
    field: IndependentPriceRuleDraftField,
    value?: number
  ) {
    setIndependentPriceRuleDraftMap((previous) => ({
      ...previous,
      [key]: {
        ...previous[key],
        [field]:
          typeof value === 'number' && Number.isFinite(value) ? value : undefined,
      },
    }));
  }

  function syncDetailHtml() {
    if (!detailEditorRef.current) {
      return;
    }
    setDetailHtml(detailEditorRef.current.innerHTML);
  }

  function handleDetailInput() {
    syncDetailHtml();
  }

  function escapeHtmlValue(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function runDetailCommand(command: string, value?: string) {
    if (!detailEditorRef.current) {
      return;
    }
    detailEditorRef.current.focus();
    document.execCommand(command, false, value);
    syncDetailHtml();
  }

  function handleInsertImage() {
    const imageUrl = window.prompt('请输入图片 URL');
    if (!imageUrl) {
      return;
    }
    runDetailCommand('insertImage', imageUrl);
  }

  function handleInsertLink() {
    const linkUrl = window.prompt('请输入链接 URL');
    if (!linkUrl) {
      return;
    }
    runDetailCommand('createLink', linkUrl);
  }

  function handleInsertVideo() {
    const videoUrl = window.prompt('请输入视频 URL');
    if (!videoUrl) {
      return;
    }
    const safeUrl = escapeHtmlValue(videoUrl);
    runDetailCommand(
      'insertHTML',
      `<p><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeUrl}</a></p>`
    );
  }

  function handleInsertTable() {
    runDetailCommand(
      'insertHTML',
      '<table border="1" style="width:100%; border-collapse: collapse;"><tbody><tr><td>表头1</td><td>表头2</td></tr><tr><td>内容1</td><td>内容2</td></tr></tbody></table>'
    );
  }

  function handleDetailBlockChange(value: string) {
    setDetailBlockType(value);
    runDetailCommand('formatBlock', `<${value}>`);
  }

  function handleDetailFontSizeChange(value: string) {
    setDetailFontSize(value);
  }

  function handleDetailLineHeightChange(value: string) {
    setDetailLineHeight(value);
  }

  function resetStoreConfigFilters() {
    setStoreTypeFilter('all');
    setStoreDepartmentFilter('all');
    setStoreStatusFilter('all');
    setStoreKeyword('');
    setStoreConfigPage(1);
    setStoreConfigPageSize(20);
    setStoreBatchSellStatus(undefined);
  }

  function resetStoreChannelProductPoolFilters() {
    setStoreChannelProductPoolStatusFilter('all');
    setStoreChannelProductPoolKeyword('');
    setStoreChannelProductPoolPage(1);
    setStoreChannelProductPoolPageSize(20);
    setStoreChannelProductPoolBatchSellStatus(undefined);
    setStoreChannelProductPoolBatchSellableSkuKeys([]);
    setStoreChannelProductPoolBatchAllowSelfPrice(undefined);
  }

  function closeStoreChannelProductPoolModal() {
    setStoreChannelProductPoolModalVisible(false);
    setDraftStoreChannelProductPoolConfigMap({});
    setStoreChannelProductPoolSelectedStoreKeys([]);
    resetStoreChannelProductPoolFilters();
  }

  function openStoreChannelProductPoolModal() {
    setDraftStoreChannelProductPoolConfigMap(
      buildStoreChannelProductPoolConfigDraftMap(
        storeChannelTargetStoreItems,
        storeChannelConfigDraft.productPoolStoreConfigs || [],
        storeChannelSourceTableData.map((item) => item.key)
      )
    );
    setStoreChannelProductPoolSelectedStoreKeys([]);
    resetStoreChannelProductPoolFilters();
    setStoreChannelProductPoolModalVisible(true);
  }

  function updateStoreChannelProductPoolDraftItem(
    storeId: string,
    updater: (
      current: StoreChannelProductPoolStoreConfigDraftItem
    ) => StoreChannelProductPoolStoreConfigDraftItem
  ) {
    setDraftStoreChannelProductPoolConfigMap((previous) => {
      const current =
        previous[storeId] ||
        createDefaultStoreChannelProductPoolStoreConfig(storeId);

      return {
        ...previous,
        [storeId]: updater(current),
      };
    });
  }

  function buildStoreChannelProductPoolDraftItem(
    current: StoreChannelProductPoolStoreConfigDraftItem,
    sellState: ProductStoreSellStatus,
    allowedSkuKeys: string[]
  ) {
    if (sellState === 'unsellable') {
      return {
        ...current,
        sellStatus: 'unsellable' as const,
        channelStatus: 'off' as const,
        sellableSkuKeys: [],
        allowSelfPrice: false,
      };
    }

    const normalizedSellableSkuKeys = uniqueStringArray(
      current.sellableSkuKeys.filter((skuKey) => allowedSkuKeys.includes(skuKey))
    );
    const nextSellableSkuKeys = normalizedSellableSkuKeys.length
      ? normalizedSellableSkuKeys
      : [...allowedSkuKeys];

    return {
      ...current,
      sellStatus: 'sellable' as const,
      channelStatus: 'on' as const,
      sellableSkuKeys: nextSellableSkuKeys,
      allowSelfPrice:
        nextSellableSkuKeys.length > 0 && current.allowSelfPrice === true,
    };
  }

  function handleStoreChannelProductPoolSellStatusChange(
    storeId: string,
    sellState: ProductStoreSellStatus
  ) {
    updateStoreChannelProductPoolDraftItem(storeId, (current) =>
      buildStoreChannelProductPoolDraftItem(
        current,
        sellState,
        storeChannelSourceTableData.map((item) => item.key)
      )
    );
  }

  function handleStoreChannelProductPoolSellableSkuKeysChange(
    storeId: string,
    skuKeys: string[]
  ) {
    const allowedSkuKeySet = new Set(
      storeChannelSourceTableData.map((item) => item.key)
    );
    const normalizedSkuKeys = uniqueStringArray(
      skuKeys.filter((skuKey) => allowedSkuKeySet.has(skuKey))
    );

    updateStoreChannelProductPoolDraftItem(storeId, (current) => ({
      ...current,
      sellStatus: current.sellStatus,
      sellableSkuKeys: normalizedSkuKeys,
      allowSelfPrice: normalizedSkuKeys.length
        ? current.allowSelfPrice === true
        : false,
    }));
  }

  function handleStoreChannelProductPoolAllowSelfPriceChange(
    storeId: string,
    checked: boolean
  ) {
    updateStoreChannelProductPoolDraftItem(storeId, (current) => ({
      ...current,
      allowSelfPrice: current.sellStatus === 'sellable' && checked,
    }));
  }

  function handleStoreChannelProductPoolSelectionChange(
    keys: (string | number)[]
  ) {
    setStoreChannelProductPoolSelectedStoreKeys(keys.map(String));
  }

  function updateSelectedStoreChannelProductPoolConfigs(
    sellState: ProductStoreSellStatus
  ) {
    if (!storeChannelProductPoolSelectedStoreKeys.length) {
      Message.warning('请先选择需要批量设置的店铺');
      return;
    }

    setDraftStoreChannelProductPoolConfigMap((previous) => {
      const next = { ...previous };

      storeChannelProductPoolSelectedStoreKeys.map(String).forEach((storeId) => {
        const current =
          next[storeId] ||
          createDefaultStoreChannelProductPoolStoreConfig(storeId);
        next[storeId] = buildStoreChannelProductPoolDraftItem(
          current,
          sellState,
          storeChannelSourceTableData.map((item) => item.key)
        );
      });

      return next;
    });
  }

  function handleStoreChannelProductPoolBatchSellStatusChange(value?: string) {
    if (!value) {
      return;
    }

    updateSelectedStoreChannelProductPoolConfigs(
      value as ProductStoreSellStatus
    );
    setStoreChannelProductPoolBatchSellStatus(undefined);
  }

  function handleStoreChannelProductPoolBatchSellableSkuKeysChange(
    value: unknown
  ) {
    const nextSkuKeys = normalizeStringArray(value).filter(
      (skuKey) => skuKey !== SKU_TREE_ROOT_KEY
    );

    if (!storeChannelProductPoolSelectedStoreKeys.length) {
      Message.warning('请先选择需要批量设置的店铺');
      return;
    }

    setDraftStoreChannelProductPoolConfigMap((previous) => {
      const next = { ...previous };

      storeChannelProductPoolSelectedStoreKeys.map(String).forEach((storeId) => {
        const current =
          next[storeId] ||
          createDefaultStoreChannelProductPoolStoreConfig(storeId);

        next[storeId] = {
          ...current,
          sellStatus: nextSkuKeys.length ? ('sellable' as const) : current.sellStatus,
          channelStatus:
            nextSkuKeys.length ? ('on' as const) : ('off' as const),
          sellableSkuKeys: nextSkuKeys,
          allowSelfPrice: nextSkuKeys.length
            ? current.allowSelfPrice === true
            : false,
        };
      });

      return next;
    });
    setStoreChannelProductPoolBatchSellableSkuKeys([]);
  }

  function handleStoreChannelProductPoolBatchAllowSelfPriceChange(value?: string) {
    if (!value) {
      return;
    }

    if (!storeChannelProductPoolSelectedStoreKeys.length) {
      Message.warning('请先选择需要批量设置的店铺');
      return;
    }

    setDraftStoreChannelProductPoolConfigMap((previous) => {
      const next = { ...previous };

      storeChannelProductPoolSelectedStoreKeys.map(String).forEach((storeId) => {
        const current =
          next[storeId] ||
          createDefaultStoreChannelProductPoolStoreConfig(storeId);

        next[storeId] = {
          ...current,
          allowSelfPrice:
            value === 'on' &&
            current.sellStatus === 'sellable' &&
            current.sellableSkuKeys.length > 0,
        };
      });

      return next;
    });
    setStoreChannelProductPoolBatchAllowSelfPrice(undefined);
  }

  function handleStoreChannelProductPoolModalConfirm() {
    patchStoreChannelConfig({
      productPoolStoreConfigs: Object.values(draftStoreChannelProductPoolConfigMap),
    });
    closeStoreChannelProductPoolModal();
  }

  function openStoreConfigModal() {
    const sourceStoreId = getSubmitProductSource().sourceStoreId;
    const enabledSkuKeys = uniqueStringArray(editableEnabledSkuKeys);
    const nextMap = normalizeProductStoreConfigs(
      productStoreConfigs,
      scopedStoreItems
    ).reduce<Record<string, ProductStoreConfigItem>>((result, item) => {
        result[item.storeId] = { ...item };
        return result;
      }, {});
    const nextShareSettingMap = Object.values(nextMap).reduce<
      Record<string, StoreShareSettingItem>
    >((result, item) => {
      const previousSetting = storeShareSettingMap[item.storeId];
      const isSourceStore = Boolean(sourceStoreId) && item.storeId === sourceStoreId;
      const baseSetting = previousSetting || buildDefaultStoreShareSetting(enabledSkuKeys);
      const nextSellableSkuKeys =
        item.sellStatus === 'sellable'
          ? uniqueStringArray(
              baseSetting.sellableSkuKeys.filter((skuKey) =>
                enabledSkuKeys.includes(skuKey)
              )
            )
          : [];

      result[item.storeId] = {
        shareMode: isSourceStore ? 'product_pool' : baseSetting.shareMode,
        sellableSkuKeys:
          item.sellStatus === 'sellable' && !nextSellableSkuKeys.length
            ? [...enabledSkuKeys]
            : nextSellableSkuKeys,
      };
      return result;
    }, {});

    setDraftStoreConfigMap(nextMap);
    setDraftStoreShareSettingMap(nextShareSettingMap);
    setSelectedStoreKeys([]);
    resetStoreConfigFilters();
    setStoreConfigModalVisible(true);
  }

  function handleStoreSelectionChange(keys: (string | number)[]) {
    setSelectedStoreKeys(keys.map(String));
  }

  function buildNextStoreConfig(
    previous: ProductStoreConfigItem | undefined,
    storeId: string,
    patch: Partial<Omit<ProductStoreConfigItem, 'storeId'>>
  ): ProductStoreConfigItem {
    const base = {
      ...(previous || createDefaultProductStoreConfig(storeId)),
      ...patch,
    };

    if (base.sellStatus !== 'sellable') {
      return {
        ...base,
        channelStatus: 'off',
      };
    }

    return base;
  }

  function handleDraftStoreConfigChange<
    K extends keyof Omit<ProductStoreConfigItem, 'storeId'>
  >(storeId: string, field: K, value: ProductStoreConfigItem[K]) {
    const enabledSkuKeys = uniqueStringArray(editableEnabledSkuKeys);
    const sourceStoreId = getSubmitProductSource().sourceStoreId;

    setDraftStoreConfigMap((previousConfig) => {
      const nextConfig = buildNextStoreConfig(previousConfig[storeId], storeId, {
        [field]: value,
      } as Partial<Omit<ProductStoreConfigItem, 'storeId'>>);
      const isSourceStore = Boolean(sourceStoreId) && storeId === sourceStoreId;

      setDraftStoreShareSettingMap((previousSetting) => {
        const currentSetting =
          previousSetting[storeId] || buildDefaultStoreShareSetting(enabledSkuKeys);
        const nextSellableSkuKeys =
          nextConfig.sellStatus === 'sellable'
            ? uniqueStringArray(
                currentSetting.sellableSkuKeys.filter((skuKey) =>
                  enabledSkuKeys.includes(skuKey)
                )
              )
            : [];
        return {
          ...previousSetting,
          [storeId]: {
            shareMode: isSourceStore ? 'product_pool' : currentSetting.shareMode,
            sellableSkuKeys:
              nextConfig.sellStatus === 'sellable' &&
              !nextSellableSkuKeys.length &&
              enabledSkuKeys.length
                ? [...enabledSkuKeys]
                : nextSellableSkuKeys,
          },
        };
      });

      return {
        ...previousConfig,
        [storeId]: nextConfig,
      };
    });
  }

  function handleDraftStoreSellableSkuKeysChange(storeId: string, skuKeys: string[]) {
    const enabledSkuKeySet = new Set(editableEnabledSkuKeys);
    const sourceStoreId = getSubmitProductSource().sourceStoreId;
    const isSourceStore = Boolean(sourceStoreId) && storeId === sourceStoreId;
    const normalizedSkuKeys = uniqueStringArray(
      skuKeys.filter((skuKey) => enabledSkuKeySet.has(skuKey))
    );

    setDraftStoreShareSettingMap((previous) => {
      const current = previous[storeId] || {
        shareMode: 'product_pool' as ProductChannelShareMode,
        sellableSkuKeys: [],
      };

      return {
        ...previous,
        [storeId]: {
          shareMode: isSourceStore ? 'product_pool' : current.shareMode,
          sellableSkuKeys: normalizedSkuKeys,
        },
      };
    });
    setDraftStoreConfigMap((previous) => {
      const currentConfig = previous[storeId] || createDefaultProductStoreConfig(storeId);
      if (currentConfig.sellStatus !== 'sellable') {
        return previous;
      }

      return {
        ...previous,
        [storeId]:
          normalizedSkuKeys.length > 0
            ? currentConfig
            : {
                ...currentConfig,
                sellStatus: 'unsellable',
                channelStatus: 'off',
              },
      };
    });
  }

  function handleDraftStoreShareModeChange(storeId: string, nextShareMode: ProductChannelShareMode) {
    const sourceStoreId = getSubmitProductSource().sourceStoreId;
    const isSourceStore = Boolean(sourceStoreId) && storeId === sourceStoreId;

    setDraftStoreShareSettingMap((previous) => {
      const current = previous[storeId] || buildDefaultStoreShareSetting([]);
      return {
        ...previous,
        [storeId]: {
          ...current,
          shareMode: isSourceStore ? 'product_pool' : nextShareMode,
        },
      };
    });
  }

  function updateSelectedStoreConfigs(value: ProductStoreSellStatus) {
    if (!selectedStoreKeys.length) {
      Message.warning('请先选择需要批量设置的店铺');
      return;
    }

    setDraftStoreConfigMap((previous) => {
      const next = { ...previous };

      selectedStoreKeys.map(String).forEach((storeId) => {
        next[storeId] = buildNextStoreConfig(next[storeId], storeId, {
          sellStatus: value,
        } as Partial<Omit<ProductStoreConfigItem, 'storeId'>>);
      });

      return next;
    });

    const enabledSkuKeys = uniqueStringArray(editableEnabledSkuKeys);
    setDraftStoreShareSettingMap((previous) => {
      const next = { ...previous };
      selectedStoreKeys.map(String).forEach((storeId) => {
        const current = next[storeId] || buildDefaultStoreShareSetting(enabledSkuKeys);
        next[storeId] = {
          ...current,
          sellableSkuKeys: value === 'sellable' ? current.sellableSkuKeys : [],
        };
      });
      return next;
    });
  }

  function handleBatchSellStatusChange(value?: string) {
    if (!value) {
      return;
    }

    updateSelectedStoreConfigs(value as ProductStoreSellStatus);
    setStoreBatchSellStatus(undefined);
  }

  function handleStoreConfigConfirm() {
    const enabledSkuKeys = uniqueStringArray(editableEnabledSkuKeys);
    const sourceStoreId = getSubmitProductSource().sourceStoreId;
    const rawStoreConfigs = normalizeProductStoreConfigs(
      Object.values(draftStoreConfigMap),
      scopedStoreItems
    );
    const nextStoreConfigs = rawStoreConfigs.map((item) => {
      const setting =
        draftStoreShareSettingMap[item.storeId] ||
        buildDefaultStoreShareSetting(enabledSkuKeys);
      const nextSellableSkuKeys =
        item.sellStatus === 'sellable'
          ? uniqueStringArray(
              setting.sellableSkuKeys.filter((skuKey) =>
                enabledSkuKeys.includes(skuKey)
              )
            )
          : [];

      if (item.sellStatus !== 'sellable') {
        return item;
      }

      if (nextSellableSkuKeys.length) {
        return item;
      }

      return {
        ...item,
        sellStatus: 'unsellable' as const,
        channelStatus: 'off' as const,
      };
    });
    const nextStoreConfigMap = new Map(
      nextStoreConfigs.map((item) => [item.storeId, item])
    );
    const nextStoreShareSettingMap = scopedStoreItems.reduce<
      Record<string, StoreShareSettingItem>
    >((result, item) => {
      const storeConfig =
        nextStoreConfigMap.get(item.id) || createDefaultProductStoreConfig(item.id);
      const setting =
        draftStoreShareSettingMap[item.id] ||
        buildDefaultStoreShareSetting(enabledSkuKeys);
      const isSourceStore = Boolean(sourceStoreId) && item.id === sourceStoreId;

      result[item.id] = {
        shareMode: isSourceStore ? 'product_pool' : setting.shareMode,
        sellableSkuKeys:
          storeConfig.sellStatus === 'sellable'
            ? uniqueStringArray(
                setting.sellableSkuKeys.filter((skuKey) =>
                  enabledSkuKeys.includes(skuKey)
                )
              )
            : [],
      };
      return result;
    }, {});

    setProductStoreConfigs(nextStoreConfigs);
    setStoreShareSettingMap(nextStoreShareSettingMap);
    setStoreConfigModalVisible(false);
  }

  function applyChannelStoreConfig(storeConfigs: ProductStoreConfigItem[]) {
    if (!currentStoreId) {
      return storeConfigs;
    }

    if (isEditMode && !isStoreScopedOwnedEditPage) {
      return storeConfigs;
    }

    if (!useStoreScopedChannelConfig && !channelEnabled) {
      return storeConfigs;
    }

    const nextChannelStatus =
      (
        useStoreScopedChannelConfig && !storeChannelEnabled ? 'off' : 'on'
      ) as ProductStoreConfigItem['channelStatus'];

    let hasCurrentStoreConfig = false;
    const nextStoreConfigs = storeConfigs.map((item) => {
      if (item.storeId !== currentStoreId) {
        return item;
      }

      hasCurrentStoreConfig = true;
      return {
        ...item,
        sellStatus: 'sellable' as const,
        channelStatus: nextChannelStatus,
      };
    });

    if (hasCurrentStoreConfig) {
      return nextStoreConfigs;
    }

    return [
      ...nextStoreConfigs,
      {
        ...createDefaultProductStoreConfig(currentStoreId),
        sellStatus: 'sellable' as const,
        channelStatus: nextChannelStatus,
      },
    ];
  }

  function getSubmitProductSource() {
    if (isEditMode && sourceProduct) {
      return {
        sourceType: sourceProduct.sourceType,
        sourceStoreId: sourceProduct.sourceStoreId,
      };
    }

    if (isHeadquarter) {
      return {
        sourceType: 'headquarter' as const,
        sourceStoreId: undefined,
      };
    }

    return {
      sourceType: 'store' as const,
      sourceStoreId:
        currentOrganization?.scope === 'store' || visibleStoreIds.length === 1
          ? visibleStoreIds[0]
          : undefined,
    };
  }

  function getIndependentPriceRuleDraftKey(
    sku: ProductSkuItem,
    index: number
  ) {
    if (isEditMode && sourceProduct) {
      return sku.id;
    }

    if (specMode === 'single') {
      return CHANNEL_SINGLE_SKU_KEY;
    }

    return specItems[index] ? String(specItems[index].id) : sku.id;
  }

  function buildSubmitIndependentPriceRule(nextSkus: ProductSkuItem[]) {
    if (!independentPriceEnabled) {
      return {
        enabled: false,
        skuRules: [],
      };
    }

    return {
      enabled: true,
      skuRules: nextSkus.flatMap((sku, index) => {
        const draft =
          independentPriceRuleDraftMap[
            getIndependentPriceRuleDraftKey(sku, index)
          ] || {};
        const minPrice =
          typeof draft.minPrice === 'number' && Number.isFinite(draft.minPrice)
            ? draft.minPrice
            : undefined;
        const maxPrice =
          typeof draft.maxPrice === 'number' && Number.isFinite(draft.maxPrice)
            ? draft.maxPrice
            : undefined;

        if (typeof minPrice !== 'number' && typeof maxPrice !== 'number') {
          return [];
        }

        return [
          {
            skuId: sku.id,
            minPrice,
            maxPrice,
          },
        ];
      }),
    };
  }

  function buildSkuKeyToSubmitSkuIdMap(nextSkus: ProductSkuItem[]) {
    if (isEditMode) {
      return new Map(nextSkus.map((sku) => [sku.id, sku.id] as [string, string]));
    }

    if (specMode === 'single') {
      return nextSkus[0]
        ? new Map<string, string>([[CHANNEL_SINGLE_SKU_KEY, nextSkus[0].id]])
        : new Map<string, string>();
    }

    return new Map(
      specItems.flatMap((item, index) =>
        nextSkus[index] ? [[String(item.id), nextSkus[index].id] as [string, string]] : []
      )
    );
  }

  function buildStoreScopedEditChannelPayload(
    createdAt: string,
    nextSkus: ProductSkuItem[]
  ) {
    if (!isStoreScopedOwnedEditPage || !sourceProduct) {
      return {
        storeChannelConfig: sourceProduct?.storeChannelConfig,
        shareTargets: buildSubmitShareTargets(
          createdAt,
          nextSkus,
          getSubmitProductSource().sourceStoreId
        ),
      };
    }

    const skuMetaItems = nextSkus.map((sku, index) => ({
      key: sku.id,
      skuId: sku.id,
      specLabel: sku.specText || (index === 0 ? '默认规格' : `规格${index + 1}`),
      sourcePrice: sku.price,
      sourceStock: sku.stock,
    }));

    return buildStoreChannelPayloadFromSkuMetaItems({
      skuMetaItems,
      storeChannelEnabled,
      config: storeChannelConfigDraft,
      targetStoreIds: storeChannelTargetStoreIds,
      createdAt,
    });
  }

  function buildSubmitShareTargets(
    createdAt: string,
    nextSkus: ProductSkuItem[],
    sourceStoreId?: string
  ): ProductShareTargetItem[] {
    if (!sourceStoreId || (!isEditMode && !channelEnabled)) {
      return [];
    }

    const skuKeyToIdMap = buildSkuKeyToSubmitSkuIdMap(nextSkus);
    const sourceStoreIdSet = new Set([sourceStoreId]);
    const managedStoreItems = scopedStoreItems.filter(
      (item) => item.type === 'store' && !sourceStoreIdSet.has(item.id)
    );
    const managedStoreIdSet = new Set(managedStoreItems.map((item) => item.id));
    const storeConfigMap = new Map(
      productStoreConfigs.map((item) => [item.storeId, item])
    );
    const existingShareTargets = (
      ((sourceProduct as ProductItem & { shareTargets?: ProductShareTargetItem[] })
        ?.shareTargets || []) as ProductShareTargetItem[]
    ).map((item) => ({
      ...item,
    }));
    const existingShareTargetMap = new Map(
      existingShareTargets.map((item) => [item.storeId, item])
    );

    const managedShareTargets = managedStoreItems.flatMap((item) => {
        const storeConfig =
          storeConfigMap.get(item.id) || createDefaultProductStoreConfig(item.id);
        const storeShareSetting =
          storeShareSettingMap[item.id] || buildDefaultStoreShareSetting([]);

        if (storeConfig.sellStatus !== 'sellable') {
          return [];
        }

        const sellableSkuIds = uniqueStringArray(
          storeShareSetting.sellableSkuKeys
            .map((skuKey) => skuKeyToIdMap.get(skuKey) || '')
            .filter(Boolean)
        );
        if (!sellableSkuIds.length) {
          return [];
        }

        const previousShareTarget = existingShareTargetMap.get(item.id);

        return [
          {
            storeId: item.id,
            status:
              storeShareSetting.shareMode === 'shared_pool'
                ? ('pending' as const)
                : ('referenced' as const),
            sharedAt: previousShareTarget?.sharedAt || createdAt,
            referencedAt:
              storeShareSetting.shareMode === 'shared_pool'
                ? undefined
                : previousShareTarget?.referencedAt || createdAt,
            sellableSkuIds,
          },
        ];
      });

    return [
      ...existingShareTargets.filter((item) => !managedStoreIdSet.has(item.storeId)),
      ...managedShareTargets,
    ];
  }

  function buildSubmitStoreOverrides(
    nextSkus: ProductSkuItem[],
    nextShareTargets: ProductShareTargetItem[] = []
  ): ProductStoreOverrideMap {
    if (!isEditMode && !channelEnabled && !isStoreScopedCreatePage) {
      return {};
    }

    const baseOverrides = { ...(sourceProduct?.storeOverrides || {}) } as ProductStoreOverrideMap;
    const allSkuIds = nextSkus.map((item) => item.id);
    const nextShareTargetMap = new Map(
      nextShareTargets.map((item) => [item.storeId, item])
    );
    const sourceStoreId = getSubmitProductSource().sourceStoreId;
    const managedStoreIds = scopedStoreItems
      .filter((item) => item.type === 'store' && item.id !== sourceStoreId)
      .map((item) => item.id);

    return managedStoreIds.reduce<ProductStoreOverrideMap>((result, storeId) => {
      const shareTarget = nextShareTargetMap.get(storeId);
      if (shareTarget?.status !== 'referenced') {
        delete result[storeId];
        return result;
      }

      const sellableSkuIdSet = new Set(
        shareTarget.sellableSkuIds?.length ? shareTarget.sellableSkuIds : allSkuIds
      );
      const unsellableSkus = nextSkus.filter((sku) => !sellableSkuIdSet.has(sku.id));

      if (!unsellableSkus.length) {
        delete result[storeId];
        return result;
      }

      result[storeId] = {
        ...createDefaultProductStoreOverride(storeId),
        ...(baseOverrides[storeId] || {}),
        skuSellStatusOverrides: unsellableSkus.map((sku) => ({
          skuId: sku.id,
          currentSellStatus: 'unsellable',
        })),
        skuStatusOverrides: unsellableSkus
          .filter((sku) => sku.status !== 'off')
          .map((sku) => ({
            skuId: sku.id,
            currentStatus: 'off',
          })),
      };
      return result;
    }, baseOverrides);
  }

  function buildSubmitProduct(productId: string, createdAt: string): ProductItem {
    const nextName = productName.trim() || sourceProduct?.name || '未命名商品';
    const nextCatalogId = productCatalogId || sourceProduct?.productCatalogId || '';
    const nextOwnershipId =
      productOwnershipId || sourceProduct?.productOwnershipId || '';
    const nextSource = getSubmitProductSource();
    const nextCarouselImages = buildSubmitCarouselImages(carouselImages);
    const nextDetailHtml = typeof detailHtml === 'string' ? detailHtml : '';
    const nextIsLimited = isLimited === true;
    const nextLimitCount =
      nextIsLimited &&
      typeof limitCount === 'number' &&
      Number.isFinite(limitCount)
        ? Math.max(1, Math.floor(limitCount))
        : undefined;
    const nextPurchaseLimit = nextIsLimited
      ? {
          enabled: true,
          count: nextLimitCount,
        }
      : {
          enabled: false,
        };
    const nextDetailContent = {
      html: nextDetailHtml,
      fontSize: detailFontSize,
      lineHeight: detailLineHeight,
    };
    const nextComboOptions = comboOptions.map((option) => ({
      ...option,
      items: syncComboOptionProductRequiredState(
        option.required,
        option.items
      ).map((item) => ({
        ...item,
      })),
    }));
    const nextBundleComponents = bundleComponents.map(({ productId, skuId }) => ({
      productId,
      skuId,
    }));
    const baseStoreConfigs = [
      ...hiddenStoreConfigs.map((item) => ({ ...item })),
      ...productStoreConfigs.map((item) => ({ ...item })),
    ];
    const nextStoreConfigsByDefault = applyChannelStoreConfig(baseStoreConfigs);

    if (isEditMode && sourceProduct) {
      const sourceProductBase = {
        ...(sourceProduct as ProductItem & {
          storeView?: unknown;
        }),
      };

      if ('storeView' in sourceProductBase) {
        delete sourceProductBase.storeView;
      }

      const nextSkus = (sourceProduct.skus || []).map((sku) => {
        const skuDraft = editSkuDraftMap[sku.id] || {};

        return {
          ...sku,
          price:
            typeof skuDraft.price === 'number' && Number.isFinite(skuDraft.price)
              ? skuDraft.price
              : sku.price,
          stock:
            typeof skuDraft.stock === 'number' && Number.isFinite(skuDraft.stock)
              ? Math.max(0, Math.floor(skuDraft.stock))
              : sku.stock,
          status:
            skuDraft.status === 'off'
              ? ('off' as const)
              : skuDraft.status === 'on'
                ? ('on' as const)
                : sku.status,
          ...(skuDraft.image ? { image: skuDraft.image } : {}),
          ...(skuDraft.isDefaultSelected ? { isDefaultSelected: true } : {}),
        };
      });
      const nextStoreChannelPayload = buildStoreScopedEditChannelPayload(
        createdAt,
        nextSkus
      );
      const nextShareTargets = nextStoreChannelPayload.shareTargets;
      const nextPrice = nextSkus.length
        ? Math.min(...nextSkus.map((item) => item.price))
        : 0;
      const nextStock = nextSkus.reduce((total, item) => total + item.stock, 0);
      const nextStatus = getProductStatusByStoreConfigs(nextStoreConfigsByDefault);

      return {
        ...sourceProductBase,
        productKind: 'combo',
        name: nextName,
        productCatalogId: nextCatalogId,
        productOwnershipId: nextOwnershipId,
        inventoryUnit,
        isLimited: nextIsLimited,
        limitCount: nextLimitCount,
        detailHtml: nextDetailHtml,
        purchaseLimit: nextPurchaseLimit,
        detailContent: nextDetailContent,
        status: nextStatus,
        specMode: sourceProduct.specMode,
        skus: nextSkus,
        price: nextPrice,
        stock: nextStock,
        createdAt,
        ...nextSource,
        comboOptions: nextComboOptions,
        bundleComponents: nextBundleComponents,
        carouselImages: nextCarouselImages,
        shareTargets: nextShareTargets,
        storeChannelConfig: nextStoreChannelPayload.storeChannelConfig,
        storeOverrides: buildSubmitStoreOverrides(nextSkus, nextShareTargets),
        storeConfigs: nextStoreConfigsByDefault,
        independentPriceRule: buildSubmitIndependentPriceRule(nextSkus),
        independentStockRule: sourceProductBase.independentStockRule,
      };
    }

    if (isStoreScopedCreatePage) {
      const storeChannelPayload = buildStoreChannelCreateSkuPayload({
        productId,
        specMode,
        specItems,
        storeChannelEnabled,
        sourceDraftMap: storeChannelSkuDraftMap,
        config: storeChannelConfigDraft,
        targetStoreIds: storeChannelTargetStoreIds,
        createdAt,
      });
      const nextShareTargets = storeChannelPayload.shareTargets;
      const storeChannelProductPoolConfigMap = new Map(
        (storeChannelPayload.storeChannelConfig?.productPoolStoreConfigs || []).map(
          (item) => [item.storeId, item]
        )
      );
      const referencedStoreIdSet = new Set(
        nextShareTargets
          .filter((item) => item.status === 'referenced')
          .map((item) => item.storeId)
      );
      const nextStoreConfigs = nextStoreConfigsByDefault.map((item) =>
        referencedStoreIdSet.has(item.storeId)
          ? {
              ...item,
              sellStatus:
                storeChannelProductPoolConfigMap.get(item.storeId)?.sellStatus ||
                ('sellable' as const),
              channelStatus:
                storeChannelProductPoolConfigMap.get(item.storeId)?.channelStatus ===
                'on'
                  ? ('on' as const)
                  : ('off' as const),
            }
          : item
      );
      const nextStatus = getProductStatusByStoreConfigs(nextStoreConfigs);
      const nextSkusWithStatus = storeChannelPayload.skus.map((item) => ({
        ...item,
        price: bundleCombinationPrice,
        status: nextStatus,
      }));
      const nextPrice = nextSkusWithStatus.length
        ? Math.min(...nextSkusWithStatus.map((item) => item.price))
        : 0;
      const nextStock = nextSkusWithStatus.reduce((total, item) => total + item.stock, 0);

      return {
        id: productId,
        name: nextName,
        productKind: 'combo',
        productCatalogId: nextCatalogId,
        productOwnershipId: nextOwnershipId,
        productType: sourceProduct?.productType || 'virtual',
        inventoryUnit,
        isLimited: nextIsLimited,
        limitCount: nextLimitCount,
        detailHtml: nextDetailHtml,
        purchaseLimit: nextPurchaseLimit,
        detailContent: nextDetailContent,
        specMode,
        skus: nextSkusWithStatus,
        status: nextStatus,
        price: nextPrice,
        stock: nextStock,
        createdAt,
        ...nextSource,
        comboOptions: nextComboOptions,
        bundleComponents: nextBundleComponents,
        shareTargets: nextShareTargets,
        carouselImages: nextCarouselImages,
        storeOverrides: buildSubmitStoreOverrides(
          nextSkusWithStatus,
          nextShareTargets
        ),
        storeConfigs: nextStoreConfigs,
        independentPriceRule: storeChannelPayload.independentPriceRule,
        independentStockRule: storeChannelPayload.independentStockRule,
        storeChannelConfig: storeChannelPayload.storeChannelConfig,
      };
    }

    let nextSkus: ProductSkuItem[] = [];
    let nextPrice = 0;
    let nextStock = 0;

    if (specMode === 'single') {
      const singleDraft = channelSkuDraftMap[CHANNEL_SINGLE_SKU_KEY] || {};
      nextPrice = bundleComponents.length
        ? bundleCombinationPrice
        : Number(singleSpecPrice ?? sourceProduct?.price ?? 0);
      nextStock = Number(singleSpecStock ?? sourceProduct?.stock ?? 0);
      nextSkus = [
        {
          id: createProductSkuId(productId, 0),
          specText: '',
          price: nextPrice,
          stock: nextStock,
          status:
            independentPriceEnabled && singleDraft.disabled ? 'off' : 'on',
        },
      ];
    } else {
      nextSkus = specItems.map((item, index) => {
        const draft = channelSkuDraftMap[String(item.id)] || {};

        return {
          id: createProductSkuId(productId, index),
          specText: buildSpecText(item, index),
          price: 0,
          stock: 0,
          status: independentPriceEnabled && draft.disabled ? 'off' : 'on',
        };
      });

      nextPrice = nextSkus.length
        ? Math.min(...nextSkus.map((item) => item.price))
        : 0;
      nextStock = nextSkus.reduce((total, item) => total + item.stock, 0);
    }
    let nextStoreConfigs = nextStoreConfigsByDefault;
    if (channelEnabled && nextSource.sourceStoreId) {
      const nextShareTargets = buildSubmitShareTargets(
        createdAt,
        nextSkus,
        nextSource.sourceStoreId
      );
      const referencedStoreConfigs = nextShareTargets
        .filter((item) => item.status === 'referenced')
        .map((item) => ({
          storeId: item.storeId,
          sellStatus: 'sellable' as const,
          channelStatus: 'off' as const,
        }));
      const sourceStoreConfig = {
        storeId: nextSource.sourceStoreId,
        sellStatus: 'sellable' as const,
        channelStatus: 'on' as const,
      };

      nextStoreConfigs = uniqueStringArray([
        sourceStoreConfig.storeId,
        ...referencedStoreConfigs.map((item) => item.storeId),
      ]).map((storeId) => {
        if (storeId === sourceStoreConfig.storeId) {
          return sourceStoreConfig;
        }

        return (
          referencedStoreConfigs.find((item) => item.storeId === storeId) ||
          createDefaultProductStoreConfig(storeId)
        );
      });
    }
    const nextStatus = getProductStatusByStoreConfigs(nextStoreConfigs);
    const nextSkusWithStatus = nextSkus.map((item) => ({
      ...item,
      status: item.status === 'off' ? 'off' : nextStatus,
    }));
    nextPrice = nextSkusWithStatus.length
      ? Math.min(...nextSkusWithStatus.map((item) => item.price))
      : 0;
    nextStock = nextSkusWithStatus.reduce((total, item) => total + item.stock, 0);
    const nextShareTargets = buildSubmitShareTargets(
      createdAt,
      nextSkusWithStatus,
      nextSource.sourceStoreId
    );

    return {
      id: productId,
      name: nextName,
      productKind: 'combo',
      productCatalogId: nextCatalogId,
      productOwnershipId: nextOwnershipId,
      productType: sourceProduct?.productType || 'virtual',
      inventoryUnit,
      isLimited: nextIsLimited,
      limitCount: nextLimitCount,
      detailHtml: nextDetailHtml,
      purchaseLimit: nextPurchaseLimit,
      detailContent: nextDetailContent,
      specMode,
      skus: nextSkusWithStatus,
      status: nextStatus,
      price: nextPrice,
      stock: nextStock,
      createdAt,
      ...nextSource,
      comboOptions: nextComboOptions,
      bundleComponents: nextBundleComponents,
      shareTargets: nextShareTargets,
      carouselImages: nextCarouselImages,
      storeOverrides: buildSubmitStoreOverrides(nextSkusWithStatus, nextShareTargets),
      storeConfigs: nextStoreConfigs,
      independentPriceRule: buildSubmitIndependentPriceRule(nextSkusWithStatus),
      independentStockRule: sourceProduct?.independentStockRule,
      storeChannelConfig: sourceProduct?.storeChannelConfig,
    };
  }

  function handleCancel() {
    history.push('/product/combo');
  }

  async function handleSubmit() {
    if (!isEditMode && channelEnabled) {
      if (!currentStoreId) {
        Message.warning('请先切换到具体店铺后再开启店铺渠道');
        return;
      }
    }

    if (isStoreScopedCreatePage) {
      try {
        const validationError = validateStoreChannelSkuDraftMap({
          specMode,
          specItems,
          storeChannelEnabled,
          sourceDraftMap: storeChannelSkuDraftMap,
          config: storeChannelConfigDraft,
          targetStoreIds: storeChannelTargetStoreIds,
        });

        if (validationError) {
          Message.warning(validationError);
          return;
        }
      } catch (error) {
        Message.warning(getErrorMessage(error));
        return;
      }
    }

    if (!comboOptions.length) {
      Message.warning('请至少配置一个商品选项');
      return;
    }

    const comboValidationError = comboOptions.reduce<string | undefined>(
      (error, option, optionIndex) => {
        if (error) {
          return error;
        }

        if (!option.title.trim()) {
          return `请填写选项${optionIndex + 1}的选项标题`;
        }

        if (!option.items.length) {
          return `请至少为选项${optionIndex + 1}添加一个商品`;
        }

        if (option.selectionLimit < 1) {
          return `选项${optionIndex + 1}的选择限制至少为 1`;
        }

        if (option.selectionLimit > option.items.length) {
          return `选项${optionIndex + 1}的选择限制不能超过已添加商品数`;
        }

        const hasInvalidPrice = option.items.some(
          (item) =>
            typeof item.comboPrice !== 'number' ||
            !Number.isFinite(item.comboPrice) ||
            item.comboPrice < 0
        );
        if (hasInvalidPrice) {
          return `请填写选项${optionIndex + 1}中商品的有效套餐售卖单价`;
        }

        const hasInvalidQuantity = option.items.some(
          (item) =>
            typeof item.quantity !== 'number' ||
            !Number.isFinite(item.quantity) ||
            item.quantity < 1
        );
        if (hasInvalidQuantity) {
          return `请填写选项${optionIndex + 1}中商品的有效数量`;
        }

        const requiredSkuTypeCount = option.items.filter((item) => item.required).length;
        if (requiredSkuTypeCount > option.selectionLimit) {
          return `选项${optionIndex + 1}的必选商品种类数不能超过选择限制`;
        }

        return undefined;
      },
      undefined
    );

    if (comboValidationError) {
      Message.warning(comboValidationError);
      return;
    }

    if (independentPriceEnabled) {
      const hasInvalidRule = independentPriceRuleTableData.some((item) => {
        const minPrice =
          typeof item.minPrice === 'number' && Number.isFinite(item.minPrice)
            ? item.minPrice
            : undefined;
        const maxPrice =
          typeof item.maxPrice === 'number' && Number.isFinite(item.maxPrice)
            ? item.maxPrice
            : undefined;

        if (typeof minPrice === 'number' && minPrice < 0) {
          return true;
        }

        if (typeof maxPrice === 'number' && maxPrice < 0) {
          return true;
        }

        return (
          typeof minPrice === 'number' &&
          typeof maxPrice === 'number' &&
          minPrice > maxPrice
        );
      });

      if (hasInvalidRule) {
        Message.warning('独立售价区间需为非负数，且最低价不能高于最高价');
        return;
      }
    }

    const nextProductId =
      pageMode === 'edit' && sourceProduct ? sourceProduct.id : createProductId();
    const nextCreatedAt =
      pageMode === 'edit' && sourceProduct
        ? sourceProduct.createdAt
        : formatProductCreatedAt();
    const nextProduct = buildSubmitProduct(nextProductId, nextCreatedAt);

    try {
      await productService.saveProduct(nextProduct as unknown as DomainProductItem);
      Message.success(pageMode === 'edit' ? '保存成功' : '提交成功');
      history.push('/product/combo');
    } catch (error) {
      Message.error(getErrorMessage(error));
    }
  }

  const currentCatalogAttributes = useMemo(
    () =>
      buildProductCatalogAttributesFromTemplate(
        getEnabledProductCatalogAttributeTemplateByCatalogId(
          catalogAttributeTemplates,
          productCatalogId
        ),
        catalogAttributes
      ),
    [catalogAttributeTemplates, catalogAttributes, productCatalogId]
  );
  const storeChannelTargetStoreItems = useMemo(
    () =>
      scopedStoreItems.filter(
        (item) => item.type === 'store' && item.id !== currentStoreId
      ),
    [currentStoreId, scopedStoreItems]
  );
  const storeChannelTargetStoreIds = useMemo(
    () => storeChannelTargetStoreItems.map((item) => item.id),
    [storeChannelTargetStoreItems]
  );
  const storeChannelCreateSkuMetaItems = useMemo(
    () =>
      buildStoreChannelSkuMetaItems(
        'draft_product',
        specMode,
        specItems,
        storeChannelSkuDraftMap
      ),
    [specItems, specMode, storeChannelSkuDraftMap]
  );
  const storeChannelEditSkuMetaItems = useMemo<StoreChannelSkuMetaItem[]>(() => {
    if (!isStoreScopedOwnedEditPage || !sourceProduct) {
      return [];
    }

    return (sourceProduct.skus || []).map((sku, index) => {
      const draft = editSkuDraftMap[sku.id] || {};

      return {
        key: sku.id,
        skuId: sku.id,
        specLabel: sku.specText || (index === 0 ? '默认规格' : `规格${index + 1}`),
        sourcePrice:
          typeof draft.price === 'number' && Number.isFinite(draft.price)
            ? draft.price
            : sku.price,
        sourceStock:
          typeof draft.stock === 'number' && Number.isFinite(draft.stock)
            ? draft.stock
            : sku.stock,
      };
    });
  }, [editSkuDraftMap, isStoreScopedOwnedEditPage, sourceProduct]);
  const storeChannelSkuMetaItems = useMemo(
    () =>
      isStoreScopedOwnedEditPage
        ? storeChannelEditSkuMetaItems
        : storeChannelCreateSkuMetaItems,
    [
      isStoreScopedOwnedEditPage,
      storeChannelCreateSkuMetaItems,
      storeChannelEditSkuMetaItems,
    ]
  );
  const channelSkuSpecTitle = useMemo(() => {
    if (specMode !== 'multi') {
      return '规格';
    }

    const specNameSet = new Set(
      specItems.map((item) => item.name.trim()).filter(Boolean)
    );
    const [specName] = Array.from(specNameSet);

    return specNameSet.size === 1 ? specName : '规格';
  }, [specItems, specMode]);
  const storeChannelSourceTableData = useMemo<StoreChannelSkuMetaItem[]>(() => {
    if (!useStoreScopedChannelConfig) {
      return [];
    }

    return storeChannelSkuMetaItems.map((item) => ({
      ...item,
      specLabel:
        item.key === STORE_CHANNEL_SINGLE_SKU_KEY
          ? '默认规格'
          : channelSkuSpecTitle !== '规格'
            ? item.specLabel.split('：').slice(-1)[0] || item.specLabel
            : item.specLabel,
    }));
  }, [
    channelSkuSpecTitle,
    useStoreScopedChannelConfig,
    storeChannelSkuMetaItems,
  ]);
  const storeChannelAvailableSkuKeys = useMemo(
    () => storeChannelSourceTableData.map((item) => item.key),
    [storeChannelSourceTableData]
  );
  const storeChannelProductPoolSkuTreeData = useMemo(
    () => [
      {
        key: SKU_TREE_ROOT_KEY,
        title: '全部 SKU',
        disabled: !storeChannelAvailableSkuKeys.length,
        children: storeChannelSourceTableData.map((item) => ({
          key: item.key,
          title: item.specLabel,
        })),
      },
    ],
    [storeChannelAvailableSkuKeys.length, storeChannelSourceTableData]
  );
  const storeChannelProductPoolTableData = useMemo<
    StoreChannelProductPoolTableItem[]
  >(() => {
    const keyword = storeChannelProductPoolKeyword.trim().toLowerCase();
    const matchedSkuKeySet = new Set(storeChannelAvailableSkuKeys);

    return storeChannelTargetStoreItems
      .map((item) => {
        const draftConfig =
          draftStoreChannelProductPoolConfigMap[item.id] ||
          createDefaultStoreChannelProductPoolStoreConfig(item.id);
        const normalizedSellableSkuKeys =
          draftConfig.sellStatus === 'sellable'
            ? uniqueStringArray(
                draftConfig.sellableSkuKeys.filter((skuKey) =>
                  matchedSkuKeySet.has(skuKey)
                )
              )
            : [];
        const isSellable = draftConfig.sellStatus === 'sellable';

        return {
          ...item,
          ...draftConfig,
          sellStatus: isSellable ? ('sellable' as const) : ('unsellable' as const),
          channelStatus:
            isSellable && draftConfig.channelStatus === 'on'
              ? ('on' as const)
              : ('off' as const),
          shareMode: 'product_pool' as const,
          sellableSkuKeys: isSellable ? normalizedSellableSkuKeys : [],
          allowSelfPrice: isSellable && draftConfig.allowSelfPrice === true,
        };
      })
      .filter((item) => {
        if (keyword && !item.name.toLowerCase().includes(keyword)) {
          return false;
        }

        if (storeChannelProductPoolStatusFilter !== 'all') {
          return (
            getStoreChannelProductPoolSellState(item.sellStatus) ===
            storeChannelProductPoolStatusFilter
          );
        }

        return true;
      });
  }, [
    draftStoreChannelProductPoolConfigMap,
    storeChannelAvailableSkuKeys,
    storeChannelProductPoolKeyword,
    storeChannelProductPoolStatusFilter,
    storeChannelTargetStoreItems,
  ]);
  const channelSkuTableData = useMemo<ChannelSkuTableItem[]>(() => {
    if (specMode === 'single') {
      const draft = channelSkuDraftMap[CHANNEL_SINGLE_SKU_KEY] || {};

      return [
        {
          key: CHANNEL_SINGLE_SKU_KEY,
          specLabel: '单规格',
          disabled: independentPriceEnabled ? Boolean(draft.disabled) : false,
        },
      ];
    }

    return specItems.map((item, index) => {
      const draft = channelSkuDraftMap[String(item.id)] || {};
      const specValue = item.value.trim();

        return {
          key: String(item.id),
          specLabel:
            channelSkuSpecTitle !== '规格' && specValue
              ? specValue
              : buildSpecText(item, index),
          disabled: independentPriceEnabled ? Boolean(draft.disabled) : false,
        };
      });
  }, [
    channelSkuDraftMap,
    channelSkuSpecTitle,
    independentPriceEnabled,
    specItems,
    specMode,
  ]);
  const editableStoreSkuItems = useMemo<ChannelSkuTableItem[]>(() => {
    if (!isEditMode || !sourceProduct) {
      return channelSkuTableData;
    }

    return (sourceProduct.skus || []).map((sku, index) => {
      const draft = editSkuDraftMap[sku.id] || {};
      const status =
        draft.status === 'off' ? ('off' as const) : draft.status === 'on' ? ('on' as const) : sku.status;

      return {
        key: sku.id,
        specLabel: sku.specText || (index === 0 ? '默认规格' : `规格${index + 1}`),
        disabled: status === 'off',
      };
    });
  }, [channelSkuTableData, editSkuDraftMap, isEditMode, sourceProduct]);
  const editableEnabledSkuKeys = useMemo(
    () => editableStoreSkuItems.filter((item) => !item.disabled).map((item) => item.key),
    [editableStoreSkuItems]
  );
  const storeChannelSourceTableColumns = useMemo<Array<any>>(
    () => [
      {
        title: 'SKU 名称',
        dataIndex: 'specLabel',
        width: 240,
        render: (value: string) => (
          <Typography.Text className={styles.channelSkuSpecText} ellipsis>
            {value}
          </Typography.Text>
        ),
      },
      {
        title: '源售价',
        dataIndex: 'sourcePrice',
        width: 220,
        render: (_: number, record: StoreChannelSkuMetaItem) => (
          <InputNumber
            className={styles.storeChannelNumberInput}
            min={0}
            precision={2}
            prefix="¥"
            placeholder="请输入"
            value={record.sourcePrice}
            onChange={(value) =>
              handleStoreChannelSkuDraftChange(
                record.key,
                'sourcePrice',
                typeof value === 'number' ? value : undefined
              )
            }
          />
        ),
      },
      {
        title: '源库存',
        dataIndex: 'sourceStock',
        width: 220,
        render: (_: number, record: StoreChannelSkuMetaItem) => (
          <InputNumber
            className={styles.storeChannelNumberInput}
            min={0}
            precision={0}
            placeholder="请输入"
            value={record.sourceStock}
            onChange={(value) =>
              handleStoreChannelSkuDraftChange(
                record.key,
                'sourceStock',
                typeof value === 'number' ? value : undefined
              )
            }
          />
        ),
      },
    ],
    []
  );

  const independentPriceRuleTableData = useMemo<
    IndependentPriceRuleTableItem[]
  >(() => {
    if (isEditMode && sourceProduct) {
      return (sourceProduct.skus || []).map((sku, index) => {
        const draft = independentPriceRuleDraftMap[sku.id] || {};

        return {
          key: sku.id,
          specLabel: sku.specText || (index === 0 ? '默认规格' : `规格${index + 1}`),
          sourcePrice: sku.price,
          minPrice: draft.minPrice,
          maxPrice: draft.maxPrice,
          disabled: false,
        };
      });
    }

    if (specMode === 'single') {
      const draft = independentPriceRuleDraftMap[CHANNEL_SINGLE_SKU_KEY] || {};

      return [
        {
          key: CHANNEL_SINGLE_SKU_KEY,
          specLabel: '默认规格',
          sourcePrice: singleSpecPrice ?? sourceProduct?.price,
          minPrice: draft.minPrice,
          maxPrice: draft.maxPrice,
          disabled: Boolean(channelSkuDraftMap[CHANNEL_SINGLE_SKU_KEY]?.disabled),
        },
      ];
    }

    return specItems.map((item, index) => {
      const key = String(item.id);
      const draft = independentPriceRuleDraftMap[key] || {};
      const specValue = item.value.trim();

      return {
        key,
        specLabel:
          channelSkuSpecTitle !== '规格' && specValue
            ? specValue
            : buildSpecText(item, index),
        sourcePrice: undefined,
        minPrice: draft.minPrice,
        maxPrice: draft.maxPrice,
        disabled: Boolean(channelSkuDraftMap[key]?.disabled),
      };
    });
  }, [
    channelSkuDraftMap,
    channelSkuSpecTitle,
    independentPriceRuleDraftMap,
    isEditMode,
    singleSpecPrice,
    sourceProduct,
    specItems,
    specMode,
  ]);
  const productStoreSummary = useMemo(
    () => getProductStoreSummary(productStoreConfigs),
    [productStoreConfigs]
  );
  const isOwnStoresSellableButOff = useMemo(
    () =>
      isCreateStoreConfigDefault(
        productStoreConfigs,
        scopedStoreItems,
        visibleStoreIds
      ),
    [productStoreConfigs, scopedStoreItems, visibleStoreIds]
  );
  const sourceStoreIdForSubmit = useMemo(
    () => getSubmitProductSource().sourceStoreId,
    [
      currentOrganization?.scope,
      isEditMode,
      isHeadquarter,
      sourceProduct?.sourceStoreId,
      visibleStoreIds,
    ]
  );
  const storeConfigTableData = useMemo<StoreConfigTableItem[]>(() => {
    const keyword = storeKeyword.trim().toLowerCase();
    const enabledSkuKeys = uniqueStringArray(editableEnabledSkuKeys);

    return scopedStoreItems
      .filter((item) => {
        if (storeTypeFilter !== 'all' && item.type !== storeTypeFilter) {
          return false;
        }

        if (
          storeDepartmentFilter !== 'all' &&
          item.departmentId !== storeDepartmentFilter
        ) {
          return false;
        }

        if (keyword && !item.name.toLowerCase().includes(keyword)) {
          return false;
        }

        if (storeStatusFilter !== 'all') {
          return (
            (
              draftStoreConfigMap[item.id] ||
              createDefaultProductStoreConfig(item.id)
            ).sellStatus === storeStatusFilter
          );
        }

        return true;
      })
      .map((item) => {
        const draftConfig =
          draftStoreConfigMap[item.id] ||
          createDefaultProductStoreConfig(item.id);
        const defaultShareSetting = buildDefaultStoreShareSetting(enabledSkuKeys);
        const draftShareSetting = draftStoreShareSettingMap[item.id] || defaultShareSetting;
        const isSourceStore = Boolean(sourceStoreIdForSubmit) && item.id === sourceStoreIdForSubmit;
        const normalizedSellableSkuKeys =
          draftConfig.sellStatus === 'sellable'
            ? uniqueStringArray(
                draftShareSetting.sellableSkuKeys.filter((skuKey) =>
                  enabledSkuKeys.includes(skuKey)
                )
              )
            : [];

        return {
          ...item,
          ...draftConfig,
          shareMode: isSourceStore ? 'product_pool' : draftShareSetting.shareMode,
          sellableSkuKeys: normalizedSellableSkuKeys,
        };
      });
  }, [
    draftStoreConfigMap,
    draftStoreShareSettingMap,
    editableEnabledSkuKeys,
    sourceStoreIdForSubmit,
    storeDepartmentFilter,
    scopedStoreItems,
    storeKeyword,
    storeStatusFilter,
    storeTypeFilter,
  ]);
  const storeConfigColumns = [
    {
      title: '店铺名称',
      dataIndex: 'name',
      width: 420,
      render: (_: string, record: StoreConfigTableItem) => (
        <div className={styles.storeCell}>
          <Tag
            className={styles.storeTag}
            color={record.type === 'store' ? 'arcoblue' : 'orangered'}
          >
            {PRODUCT_STORE_TYPE_LABEL_MAP[record.type]}
          </Tag>
          <span className={styles.storeName}>{record.name}</span>
        </div>
      ),
    },
    {
      title: '是否可售',
      dataIndex: 'sellStatus',
      width: 220,
      render: (value: ProductStoreSellStatus, record: StoreConfigTableItem) => (
        <Select
          className={styles.storeStatusSelect}
          value={value}
          onChange={(nextValue) =>
            handleDraftStoreConfigChange(
              record.id,
              'sellStatus',
              nextValue as ProductStoreSellStatus
            )
          }
        >
          {Object.entries(PRODUCT_STORE_SELL_STATUS_LABEL_MAP).map(
            ([optionValue, label]) => (
              <Select.Option key={optionValue} value={optionValue}>
                {label}
              </Select.Option>
            )
          )}
        </Select>
      ),
    },
    {
      title: '可售 SKU',
      dataIndex: 'sellableSkuKeys',
      width: 360,
      render: (_: string[], record: StoreConfigTableItem) => {
        const enabledSkuRows = editableStoreSkuItems.filter((item) => !item.disabled);
        const treeData = [
          {
            key: SKU_TREE_ROOT_KEY,
            title: '全部 SKU',
            disabled: !enabledSkuRows.length,
            children: enabledSkuRows.map((item) => ({
              key: item.key,
              title: item.specLabel,
            })),
          },
        ];
        const selectedKeys = record.sellableSkuKeys.filter((skuKey) =>
          enabledSkuRows.some((item) => item.key === skuKey)
        );

        return (
          <TreeSelect
            multiple
            treeCheckable
            allowClear
            className={styles.storeSkuTreeSelect}
            disabled={
              record.sellStatus !== 'sellable' ||
              record.type !== 'store' ||
              (Boolean(sourceStoreIdForSubmit) && record.id === sourceStoreIdForSubmit)
            }
            placeholder="请选择可售 SKU"
            treeData={treeData}
            value={selectedKeys}
            onChange={(value) => {
              const nextKeys = normalizeStringArray(value).filter(
                (skuKey) =>
                  skuKey !== SKU_TREE_ROOT_KEY &&
                  enabledSkuRows.some((item) => item.key === skuKey)
              );
              handleDraftStoreSellableSkuKeysChange(record.id, nextKeys);
            }}
          />
        );
      },
    },
    {
      title: '分享到',
      dataIndex: 'shareMode',
      width: 220,
      render: (value: ProductChannelShareMode, record: StoreConfigTableItem) => {
        if (record.type !== 'store') {
          return <Typography.Text type="secondary">--</Typography.Text>;
        }

        const isSourceStore =
          Boolean(sourceStoreIdForSubmit) && record.id === sourceStoreIdForSubmit;

        return (
          <Select
            className={styles.storeShareModeSelect}
            disabled={record.sellStatus !== 'sellable' || isSourceStore}
            value={isSourceStore ? 'product_pool' : value}
            onChange={(nextValue) =>
              handleDraftStoreShareModeChange(
                record.id,
                nextValue as ProductChannelShareMode
              )
            }
          >
            <Select.Option value="product_pool">
              {PRODUCT_CHANNEL_SHARE_MODE_LABEL_MAP.product_pool}
            </Select.Option>
            <Select.Option value="shared_pool">
              {PRODUCT_CHANNEL_SHARE_MODE_LABEL_MAP.shared_pool}
            </Select.Option>
          </Select>
        );
      },
    },
  ];
  const storeChannelProductPoolColumns: Array<any> = [
    {
      title: '店铺名称',
      dataIndex: 'name',
      width: 360,
      render: (_: string, record: StoreChannelProductPoolTableItem) => (
        <div className={styles.storeCell}>
          <Tag
            className={styles.storeTag}
            color={record.type === 'store' ? 'arcoblue' : 'orangered'}
          >
            {PRODUCT_STORE_TYPE_LABEL_MAP[record.type]}
          </Tag>
          <span className={styles.storeName}>{record.name}</span>
        </div>
      ),
    },
    {
      title: '可售状态',
      dataIndex: 'sellStatus',
      width: 180,
      render: (
        _: ProductStoreSellStatus,
        record: StoreChannelProductPoolTableItem
      ) => (
        <Select
          value={getStoreChannelProductPoolSellState(record.sellStatus)}
          onChange={(value) =>
            handleStoreChannelProductPoolSellStatusChange(
              record.id,
              value as ProductStoreSellStatus
            )
          }
        >
          {Object.entries(PRODUCT_STORE_SELL_STATUS_LABEL_MAP).map(
            ([value, label]) => (
              <Select.Option key={value} value={value}>
                {label}
              </Select.Option>
            )
          )}
        </Select>
      ),
    },
    {
      title: '可售 SKU',
      dataIndex: 'sellableSkuKeys',
      width: 340,
      render: (_: string[], record: StoreChannelProductPoolTableItem) => (
        <TreeSelect
          multiple
          treeCheckable
          allowClear
          className={styles.storeSkuTreeSelect}
          disabled={record.sellStatus !== 'sellable'}
          placeholder="请选择可售 SKU"
          treeData={storeChannelProductPoolSkuTreeData}
          value={record.sellableSkuKeys}
          onChange={(value) => {
            const nextKeys = normalizeStringArray(value).filter(
              (skuKey) => skuKey !== SKU_TREE_ROOT_KEY
            );
            handleStoreChannelProductPoolSellableSkuKeysChange(record.id, nextKeys);
          }}
        />
      ),
    },
    {
      title: '自主定价',
      dataIndex: 'allowSelfPrice',
      width: 160,
      render: (value: boolean, record: StoreChannelProductPoolTableItem) => (
        <Switch
          checked={value}
          disabled={record.sellStatus !== 'sellable'}
          onChange={(checked) =>
            handleStoreChannelProductPoolAllowSelfPriceChange(record.id, checked)
          }
        />
      ),
    },
  ];
  const visibleStoreChannelProductPoolColumns =
    buildComboCreateStoreChannelProductPoolVisibleColumns(
      storeChannelProductPoolColumns
    );
  const independentPriceRuleColumns = [
    {
      title: 'SKU 名称',
      dataIndex: 'specLabel',
      width: 220,
      render: (value: string, record: IndependentPriceRuleTableItem) => (
        <Typography.Text
          className={
            record.disabled ? styles.channelSkuDisabledText : styles.channelSkuSpecText
          }
          ellipsis
        >
          {value}
        </Typography.Text>
      ),
    },
    {
      title: '源售价',
      dataIndex: 'sourcePrice',
      width: 160,
      render: (value?: number) => (
        <span className={styles.independentPriceText}>
          {typeof value === 'number' && Number.isFinite(value)
            ? `¥${formatPriceNumber(value)}`
            : '--'}
        </span>
      ),
    },
    {
      title: '独立售价区间',
      dataIndex: 'minPrice',
      width: 380,
      render: (_: number, record: IndependentPriceRuleTableItem) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <InputNumber
            className={styles.independentMoneyInput}
            disabled={record.disabled}
            min={0}
            precision={2}
            prefix="¥"
            placeholder="不限"
            value={record.minPrice}
            onChange={(value) =>
              handleIndependentPriceRuleDraftChange(record.key, 'minPrice', value)
            }
          />
          <span>~</span>
          <InputNumber
            className={styles.independentMoneyInput}
            disabled={record.disabled}
            min={0}
            precision={2}
            prefix="¥"
            placeholder="不限"
            value={record.maxPrice}
            onChange={(value) =>
              handleIndependentPriceRuleDraftChange(record.key, 'maxPrice', value)
            }
          />
        </div>
      ),
    },
    ...(!isEditMode
      ? [
          {
            title: '操作',
            dataIndex: 'operation',
            width: 120,
            align: 'right' as const,
            render: (_: string, record: IndependentPriceRuleTableItem) => (
              <Button
                size="small"
                status={record.disabled ? undefined : 'danger'}
                type="text"
                onClick={() => handleChannelSkuDisabledToggle(record.key)}
              >
                {record.disabled ? '启用' : '禁用'}
              </Button>
            ),
          },
        ]
      : []),
  ];
  const editSkuTableData = useMemo<EditSkuTableItem[]>(() => {
    if (!isEditMode || !sourceProduct) {
      return [];
    }

    return (sourceProduct.skus || []).map((sku, index) => {
      const draft = editSkuDraftMap[sku.id] || {};

      return {
        ...sku,
        index,
        price:
          typeof draft.price === 'number' && Number.isFinite(draft.price)
            ? draft.price
            : sku.price,
        stock:
          typeof draft.stock === 'number' && Number.isFinite(draft.stock)
            ? draft.stock
            : sku.stock,
      };
    });
  }, [editSkuDraftMap, isEditMode, sourceProduct]);
  const editSkuColumns: Array<any> = [
    {
      title: 'SKU 规格',
      dataIndex: 'specText',
      width: 240,
      render: (value: string, record: { index: number }) =>
        value || (record.index === 0 ? '默认规格' : `规格${record.index + 1}`),
    },
    {
      title: '售价',
      dataIndex: 'price',
      width: 220,
      render: (_: number, record: { id: string; price: number }) => (
        <InputNumber
          className={styles.independentMoneyInput}
          min={0}
          precision={2}
          prefix="¥"
          value={record.price}
          onChange={(value) =>
            handleEditSkuDraftChange(record.id, 'price', value)
          }
        />
      ),
    },
    {
      title: '库存',
      dataIndex: 'stock',
      width: 220,
      render: (_: number, record: { id: string; stock: number }) => (
        <InputNumber
          className={styles.independentMoneyInput}
          min={0}
          precision={0}
          value={record.stock}
          onChange={(value) =>
            handleEditSkuDraftChange(record.id, 'stock', value)
          }
        />
      ),
    },
  ];

  if (hasInvalidEditSource) {
    return null;
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageActions}>
        <Button onClick={handleCancel}>返回商品列表</Button>
      </div>

      <Card className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <Typography.Title className={styles.sectionTitle} heading={6}>
            基础信息
          </Typography.Title>
        </div>

        <Form form={baseForm} className={styles.sectionForm} {...PRODUCT_FORM_LAYOUT}>
          <div className={styles.formGrid}>
            <Form.Item label="商品类型">
              <Select className={styles.singleFieldControl} value="virtual" disabled>
                {PRODUCT_TYPE_OPTIONS.map((item) => (
                  <Select.Option key={item.value} value={item.value}>
                    {item.label}
                  </Select.Option>
                ))}
              </Select>
              <div className={styles.fieldHelp}>
                当前默认选择&quot;虚拟商品&quot;，暂不支持修改。
              </div>
            </Form.Item>

            <Form.Item
              field="productCategory"
              label="商品类目"
              required
              rules={[{ required: true, message: '请选择商品类目' }]}
            >
              <Cascader
                allowClear
                className={styles.singleFieldControl}
                disabled={isEditMode}
                options={productCatalogOptions}
                placeholder="请选择商品类目"
                value={
                  productCatalogId
                    ? getProductCatalogPathById(productCatalogId, catalogItems)
                    : undefined
                }
                onChange={(value) => {
                  const nextPath = normalizePath(value);
                  setProductCatalogId(
                    getProductCatalogIdFromPath(nextPath, catalogItems)
                  );
                }}
              />
            </Form.Item>

            <Form.Item
              field="productClassification"
              label="商品分类"
              required
              rules={[{ required: true, message: '请选择商品分类' }]}
            >
              <Cascader
                allowClear
                className={styles.singleFieldControl}
                disabled={isEditMode}
                options={productOwnershipOptions}
                placeholder="请选择商品分类"
                value={
                  productOwnershipId
                    ? getProductOwnershipPathById(
                        productOwnershipId,
                        ownershipItems
                      )
                    : undefined
                }
                onChange={(value) => {
                  const nextPath = normalizePath(value);
                  setProductOwnershipId(
                    getProductOwnershipIdFromPath(nextPath, ownershipItems)
                  );
                }}
              />
              <div className={styles.fieldHelp}>
                商品分类用于店铺内部经营管理与财务利润核算。
              </div>
            </Form.Item>

            <Form.Item
              field="productName"
              label="商品名称"
              required
              rules={[
                {
                  required: true,
                  message: '请输入商品名称',
                },
                {
                  max: 15,
                  message: '商品名称支持 15 字以内字符',
                },
              ]}
            >
              <Input
                className={styles.singleFieldControl}
                maxLength={15}
                placeholder="请输入商品名称"
                showWordLimit
                value={productName}
                onChange={setProductName}
                allowClear
              />
            </Form.Item>

            {showInventoryFields ? (
              <>
                <Form.Item className={styles.fullWidth} label="库存单位" required>
                  <Select
                    className={styles.singleFieldControl}
                    disabled={isEditMode}
                    value={inventoryUnit}
                    onChange={setInventoryUnit}
                  >
                    {INVENTORY_UNIT_OPTIONS.map((item) => (
                      <Select.Option key={item} value={item}>
                        {item}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item className={styles.fullWidth} label="库存量">
                  <InputNumber
                    className={styles.singleFieldControl}
                    min={0}
                    precision={0}
                    placeholder="请输入库存量"
                    value={singleSpecStock}
                    onChange={(value) =>
                      setSingleSpecStock(
                        typeof value === 'number' && Number.isFinite(value)
                          ? Math.max(0, Math.floor(value))
                          : undefined
                      )
                    }
                  />
                </Form.Item>
              </>
            ) : null}

            {productCatalogId && currentCatalogAttributes.length > 0 && (
              <Form.Item className={styles.fullWidth} label="商品类目属性">
                <div className={styles.attributePanel}>
                  <div className={styles.attributeFieldList}>
                    {currentCatalogAttributes.map((attribute) => (
                      <Form.Item
                        key={attribute.id}
                        className={styles.attributeFieldItem}
                        field={`catalogAttributeValue_${attribute.id}`}
                        label={attribute.name}
                        rules={getCatalogAttributeRules(attribute)}
                      >
                        {renderCatalogAttributeField(
                          attribute,
                          styles.singleFieldControl,
                          isEditMode
                        )}
                      </Form.Item>
                    ))}
                  </div>
                </div>
              </Form.Item>
            )}

            <Form.Item className={styles.fullWidth} label="商品轮播图">
              <div className={styles.uploadPanel}>
                <div className={styles.uploadContent}>
                  <div className={styles.uploadPrimary}>
                    <Upload
                      accept="image/*"
                      fileList={uploadFileList}
                      imagePreview={false}
                      limit={8}
                      listType="picture-card"
                      multiple
                      showUploadList={false}
                      customRequest={({ onSuccess }) => {
                        onSuccess({});
                      }}
                      onChange={handleUploadChange}
                      onExceedLimit={() => {
                        Message.warning('最多可上传 8 张图片');
                      }}
                    >
                      <div className={styles.uploadTrigger}>
                        <IconPlus />
                        <span className={styles.uploadTriggerText}>上传图片</span>
                      </div>
                    </Upload>

                    <Typography.Paragraph className={styles.uploadTips}>
                      建议尺寸 800px × 800px，默认首张图为主图，最多可上传 8 张图。
                    </Typography.Paragraph>
                  </div>

                  {!!carouselImages.length && (
                    <div className={styles.thumbList}>
                      {carouselImages.map((item, index) => (
                        <div
                          key={item.uid}
                          className={`${styles.thumbItem} ${
                            draggingUid === item.uid ? styles.thumbItemDragging : ''
                          }`}
                          draggable
                          onDragStart={() => setDraggingUid(item.uid)}
                          onDragOver={(event) => event.preventDefault()}
                          onDragEnd={() => setDraggingUid('')}
                          onDrop={() => handleDropTo(item.uid)}
                        >
                          <div className={styles.thumbImageBox}>
                            {item.url ? (
                              <img
                                alt={item.name || `商品轮播图${index + 1}`}
                                className={styles.thumbImage}
                                src={item.url}
                              />
                            ) : (
                              <div className={styles.thumbNoPreview}>暂无预览</div>
                            )}
                            <Button
                              className={styles.thumbDelete}
                              size="mini"
                              type="secondary"
                              onClick={() => handleRemoveImage(item.uid)}
                            >
                              删除
                            </Button>
                          </div>
                          <div className={styles.thumbFooter}>
                            <span className={styles.thumbOrder}>第 {index + 1} 张</span>
                            {index === 0 && <span className={styles.thumbMain}>主图</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Form.Item>

            <Form.Item className={styles.fullWidth} label="是否限购">
              <div className={styles.limitSwitchRow}>
                <Switch checked={isLimited} onChange={setIsLimited} />
                <span className={styles.limitSwitchText}>
                  {isLimited ? '已开启限购' : '不限购'}
                </span>
              </div>
            </Form.Item>

            {isLimited && (
              <Form.Item className={styles.fullWidth} label="限购">
                <div className={styles.limitConfigRow}>
                  <span className={styles.limitConfigLabel}>每人限购</span>
                  <InputNumber
                    className={styles.limitCountInput}
                    min={1}
                    precision={0}
                    value={limitCount}
                    onChange={(value) =>
                      setLimitCount(typeof value === 'number' ? value : undefined)
                    }
                  />
                  <span className={styles.limitConfigUnit}>件</span>
                </div>
              </Form.Item>
            )}
          </div>
        </Form>
      </Card>

      <Card className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <Typography.Title className={styles.sectionTitle} heading={6}>
            配置商品
          </Typography.Title>
        </div>

        <Form className={styles.sectionForm} {...PRODUCT_FORM_LAYOUT}>
          <div className={styles.formGrid}>
            <Form.Item className={styles.fullWidth} label="商品配置" required>
              <Alert
                className={styles.comboConfigAlert}
                type="warning"
                showIcon
                content="这里已添加商品的源商品不可售或者下架不影响当前组合商品中的可售和上下架状态"
              />
              <Button
                type="text"
                className={styles.comboExampleButton}
                onClick={() => setOnlineMallExampleVisible(true)}
              >
                查看线上商城展示示例
              </Button>
              <ComboProductConfigCard
                allowDeleteOption={!isEditMode}
                nonRemovableSkuIds={sourceComboOptionSkuIds}
                products={standardProductOptions}
                value={comboOptions}
                onChange={setComboOptions}
              />
            </Form.Item>
          </div>
        </Form>
      </Card>

      <Modal
        title="线上商城展示示例"
        visible={onlineMallExampleVisible}
        autoFocus={false}
        focusLock
        footer={null}
        style={{ width: 760 }}
        onCancel={() => setOnlineMallExampleVisible(false)}
      >
        <div className={styles.comboExampleModalBody}>
          <img
            className={styles.comboExampleImage}
            src={ONLINE_MALL_EXAMPLE_PLACEHOLDER}
            alt="线上商城展示示例占位图"
          />
        </div>
      </Modal>

      <Card className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <Typography.Title className={styles.sectionTitle} heading={6}>
            商品详情页配置
          </Typography.Title>
        </div>

        <Form className={styles.sectionForm} {...PRODUCT_FORM_LAYOUT}>
          <div className={styles.formGrid}>
            <Form.Item className={styles.fullWidth} label="商品详情页">
              <div className={styles.detailLayout}>
                <div className={styles.detailPreview}>
                  <div className={styles.detailPanelHeader}>详情预览</div>
                  <div className={styles.detailPanelBody}>
                    {detailHtml.trim() ? (
                      <div
                        className={styles.detailPreviewContent}
                        style={{
                          fontSize: `${detailFontSize}px`,
                          lineHeight: detailLineHeight,
                        }}
                        dangerouslySetInnerHTML={{ __html: detailHtml }}
                      />
                    ) : (
                      <div className={styles.detailEmpty}>
                        请输入商品详细介绍...
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.detailEditor}>
                  <div className={styles.detailToolbar}>
                    <div className={styles.detailToolbarRow}>
                      <Select
                        size="small"
                        className={styles.toolbarSelectCompact}
                        value={detailBlockType}
                        onChange={handleDetailBlockChange}
                      >
                        {DETAIL_BLOCK_OPTIONS.map((item) => (
                          <Select.Option key={item.value} value={item.value}>
                            {item.label}
                          </Select.Option>
                        ))}
                      </Select>
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconBold />}
                        onClick={() => runDetailCommand('bold')}
                      />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconUnderline />}
                        onClick={() => runDetailCommand('underline')}
                      />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconItalic />}
                        onClick={() => runDetailCommand('italic')}
                      />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconMore />}
                        onClick={() => runDetailCommand('strikethrough')}
                      />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconFontColors />}
                        onClick={() => runDetailCommand('foreColor', '#111827')}
                      />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconBgColors />}
                        onClick={() => runDetailCommand('hiliteColor', '#FFF5D6')}
                      />
                      <span className={styles.toolbarDivider} />
                      <Select
                        size="small"
                        className={styles.toolbarSelect}
                        value={detailFontSize}
                        onChange={handleDetailFontSizeChange}
                      >
                        {DETAIL_FONT_SIZE_OPTIONS.map((item) => (
                          <Select.Option key={item.value} value={item.value}>
                            {item.label}
                          </Select.Option>
                        ))}
                      </Select>
                      <Select
                        size="small"
                        className={styles.toolbarSelect}
                        value={detailLineHeight}
                        onChange={handleDetailLineHeightChange}
                      >
                        {DETAIL_LINE_HEIGHT_OPTIONS.map((item) => (
                          <Select.Option key={item.value} value={item.value}>
                            {item.label}
                          </Select.Option>
                        ))}
                      </Select>
                      <span className={styles.toolbarDivider} />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconUnorderedList />}
                        onClick={() => runDetailCommand('insertUnorderedList')}
                      />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconOrderedList />}
                        onClick={() => runDetailCommand('insertOrderedList')}
                      />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconCheckSquare />}
                        onClick={() =>
                          runDetailCommand(
                            'insertHTML',
                            '<ul><li><input type="checkbox" /> 待办项</li></ul>'
                          )
                        }
                      />
                      <span className={styles.toolbarDivider} />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconAlignLeft />}
                        onClick={() => runDetailCommand('justifyLeft')}
                      />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconAlignCenter />}
                        onClick={() => runDetailCommand('justifyCenter')}
                      />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconAlignRight />}
                        onClick={() => runDetailCommand('justifyRight')}
                      />
                    </div>
                    <div className={styles.detailToolbarRow}>
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconImage />}
                        onClick={handleInsertImage}
                      />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconLink />}
                        onClick={handleInsertLink}
                      />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconVideoCamera />}
                        onClick={handleInsertVideo}
                      />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconApps />}
                        onClick={handleInsertTable}
                      />
                      <span className={styles.toolbarDivider} />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconUndo />}
                        onClick={() => runDetailCommand('undo')}
                      />
                      <Button
                        size="small"
                        type="text"
                        className={styles.toolbarIconButton}
                        icon={<IconRedo />}
                        onClick={() => runDetailCommand('redo')}
                      />
                    </div>
                  </div>
                  <div
                    ref={detailEditorRef}
                    className={styles.detailEditable}
                    contentEditable
                    style={{
                      fontSize: `${detailFontSize}px`,
                      lineHeight: detailLineHeight,
                    }}
                    data-placeholder="请输入商品详细介绍..."
                    onInput={handleDetailInput}
                    suppressContentEditableWarning
                  />
                </div>
              </div>
            </Form.Item>
          </div>
        </Form>
      </Card>



      {useStoreScopedChannelConfig && (
        <>
          <CouponStoreSelector
            visible={storeChannelStoreSelectorVisible}
            title="选择店铺"
            entityLabel="店铺"
            simple
            allowedStoreIds={storeChannelTargetStoreIds}
            allowedStoreTypes={['store']}
            selectedStoreIds={storeChannelConfigDraft.storeIds}
            onCancel={() => setStoreChannelStoreSelectorVisible(false)}
            onConfirm={handleStoreChannelStoreSelectorConfirm}
          />

          <Modal
            title="管理在售门店"
            visible={storeChannelProductPoolModalVisible}
            autoFocus={false}
            focusLock
            style={{ width: 1280 }}
            onOk={handleStoreChannelProductPoolModalConfirm}
            onCancel={closeStoreChannelProductPoolModal}
          >
            <div className={styles.storeConfigModalContent}>
              <div className={styles.storeConfigFilterRow}>
                <Select
                  className={styles.storeConfigFilter}
                  value={storeChannelProductPoolStatusFilter}
                  onChange={(value) => {
                    setStoreChannelProductPoolStatusFilter(
                      value as StoreChannelProductPoolFilterStatus
                    );
                    setStoreChannelProductPoolPage(1);
                  }}
                >
                  <Select.Option value="all">全部状态</Select.Option>
                  {Object.entries(
                    PRODUCT_STORE_SELL_STATUS_LABEL_MAP
                  ).map(([value, label]) => (
                    <Select.Option key={value} value={value}>
                      {label}
                    </Select.Option>
                  ))}
                </Select>

                <Input
                  allowClear
                  className={styles.storeConfigSearch}
                  placeholder="搜索店铺名称"
                  value={storeChannelProductPoolKeyword}
                  onChange={(value) => {
                    setStoreChannelProductPoolKeyword(value);
                    setStoreChannelProductPoolPage(1);
                  }}
                />
              </div>

              <div className={styles.storeConfigToolbar}>
                <Typography.Text className={styles.storeConfigToolbarText}>
                  已勾选 {storeChannelProductPoolSelectedStoreKeys.length} 项
                </Typography.Text>
                <Typography.Text className={styles.storeConfigToolbarText}>
                  勾选后可批量设置：
                </Typography.Text>
                <Select
                  allowClear
                  className={styles.storeConfigBatchSelect}
                  placeholder="可售状态"
                  value={storeChannelProductPoolBatchSellStatus}
                  onChange={handleStoreChannelProductPoolBatchSellStatusChange}
                >
                  {Object.entries(
                    PRODUCT_STORE_SELL_STATUS_LABEL_MAP
                  ).map(([value, label]) => (
                    <Select.Option key={value} value={value}>
                      {label}
                    </Select.Option>
                  ))}
                </Select>
                {COMBO_CREATE_STORE_CHANNEL_PRODUCT_POOL_SHOW_SELLABLE_SKU ? (
                  <TreeSelect
                    multiple
                    treeCheckable
                    allowClear
                    className={styles.storeConfigBatchTreeSelect}
                    placeholder="可售 SKU"
                    treeData={storeChannelProductPoolSkuTreeData}
                    value={
                      storeChannelProductPoolBatchSellableSkuKeys.length
                        ? storeChannelProductPoolBatchSellableSkuKeys
                        : storeChannelAvailableSkuKeys
                    }
                    onChange={handleStoreChannelProductPoolBatchSellableSkuKeysChange}
                  />
                ) : null}
                <Select
                  allowClear
                  className={styles.storeConfigBatchSelect}
                  placeholder="自主定价"
                  value={storeChannelProductPoolBatchAllowSelfPrice}
                  onChange={handleStoreChannelProductPoolBatchAllowSelfPriceChange}
                >
                  <Select.Option value="on">开启</Select.Option>
                  <Select.Option value="off">关闭</Select.Option>
                </Select>
              </div>

              <Table
                rowKey="id"
                className={styles.storeConfigTable}
                columns={visibleStoreChannelProductPoolColumns}
                data={storeChannelProductPoolTableData}
                noDataElement="暂无店铺数据"
                pagination={{
                  current: storeChannelProductPoolPage,
                  pageSize: storeChannelProductPoolPageSize,
                  total: storeChannelProductPoolTableData.length,
                  sizeCanChange: true,
                  sizeOptions: STORE_CONFIG_PAGE_SIZE_OPTIONS,
                  showTotal: true,
                  showJumper: true,
                  onChange: (pageNumber, pageSize) => {
                    setStoreChannelProductPoolPage(pageNumber);
                    setStoreChannelProductPoolPageSize(pageSize);
                  },
                }}
                rowSelection={{
                  selectedRowKeys: storeChannelProductPoolSelectedStoreKeys,
                  columnWidth: 48,
                  preserveSelectedRowKeys: true,
                  onChange: handleStoreChannelProductPoolSelectionChange,
                }}
                scroll={{ x: 1280, y: 440 }}
                tableLayoutFixed
              />
            </div>
          </Modal>
        </>
      )}

      <Card className={styles.actionCard}>
        <div className={styles.actionRow}>
          <Button onClick={handleCancel}>取消</Button>
          <Button type="primary" onClick={handleSubmit}>
            {isEditMode ? '保存' : '提交'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default ProductCreatePage;
