import React, { useEffect, useMemo, useRef, useState } from 'react';
import qs from 'query-string';
import {
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
  IconDelete,
  IconDragDotVertical,
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
} from '../catalog/data';
import {
  buildProductOwnershipCascaderOptions,
  getProductOwnershipIdFromPath,
  getProductOwnershipPathById,
  readProductOwnershipItems,
} from '../category/data';
import {
  ProductCatalogAttributeItem,
  getEnabledAttributesByCatalogId,
  readProductCatalogAttributes,
} from '../attribute/data';
import {
  getEnabledSpecsByCatalogId,
  readProductCatalogSpecs,
  type ProductCatalogSpecItem,
} from '../spec/data';
import {
  buildSelectedCatalogSpecIdsFromTemplate,
  buildSelectedCatalogSpecValueMapFromTemplate,
  getEnabledSpecTemplatesByCatalogId,
  readProductCatalogSpecTemplates,
} from '../spec/template-data';
import {
  DEFAULT_INVENTORY_UNIT,
  INVENTORY_UNIT_OPTIONS,
  createProductId,
  createProductSkuId,
  formatProductCreatedAt,
  ProductItem,
  ProductSkuItem,
  useProductItems,
} from '../list/data';
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
} from '../store-config/data';
import {
  createDefaultProductStoreOverride,
  getProductStoreChannelConfig,
  getProductStatusByStoreConfigs,
} from '@/lib/product';
import { formatPriceNumber } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import type {
  ProductCarouselImage,
  ProductIndependentPriceRule,
  ProductItem as DomainProductItem,
  ProductShareTargetItem,
  ProductStatus,
  ProductStoreOverrideMap,
} from '@/types/product';
import { GlobalState } from '@/store';
import { filterStoreItemsByIds } from '@/utils/organization';
import { ProductService } from '@/services/ProductService';
import CouponStoreSelector from '@/pages/marketing/center/components/store-selector';
import {
  applyProductSkuBatchPatch,
  buildProductCreateSpecItems,
  buildProductSkuAttributeRowsFromSkus,
  buildProductSkuAttributeRowsFromSpecItems,
  buildProductSpecDimensionsFromCatalogSpecs,
  buildProductSpecDimensionsFromSkus,
  formatProductCreateSpecText,
  getSelectableProductSpecsForRow,
  hasProductSpecSelectionDraft,
  normalizeProductSkuAttributeRows,
  parseProductSpecText,
  normalizeSelectedProductSpecIds,
  normalizeSelectedProductSpecValues,
  type ProductCreateSpecItem,
  type ProductSkuAttributeRow,
  type ProductSpecDimension,
} from './spec';

type CarouselImage = {
  uid: string;
  name: string;
  url?: string;
};

type SpecItem = ProductCreateSpecItem;

type SpecMode = 'single' | 'multi';
type ProductCreateMode = 'create' | 'edit' | 'copy';
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
  status?: ProductStatus;
  price?: number;
  stock?: number;
  image?: ProductCarouselImage;
  isDefaultSelected?: boolean;
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
  status?: ProductStatus;
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
type EditCatalogSpecDraft = {
  specIds: string[];
  valueMap: Record<string, string[]>;
  existingValueMap: Record<string, string[]>;
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
type MultiSpecBatchDraft = {
  specFilters: Record<string, string>;
  price?: number;
  stock?: number;
  image?: ProductCarouselImage;
};
type MultiSpecAttributeTableRow =
  | {
      rowType: 'batch';
      key: 'batch';
    }
  | ({
      rowType: 'sku';
    } & ProductSkuAttributeRow);

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
const EDIT_NEW_SKU_KEY_PREFIX = 'new:';
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

function buildCopyProductName(name: string) {
  const maxLength = 15;
  const baseLength = maxLength - COPY_PRODUCT_NAME_SUFFIX.length;

  if (name.length <= baseLength) {
    return `${name}${COPY_PRODUCT_NAME_SUFFIX}`;
  }

  return `${name.slice(0, baseLength)}${COPY_PRODUCT_NAME_SUFFIX}`;
}

function buildSpecText(item: SpecItem, index: number) {
  return formatProductCreateSpecText(item, index);
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

function buildEditCatalogSpecDraftFromSkus(
  skus: ProductSkuItem[] = [],
  specs: ProductCatalogSpecItem[] = []
): EditCatalogSpecDraft {
  const dimensions = buildProductSpecDimensionsFromSkus(skus);

  if (!dimensions.length || dimensions.some((item) => !item.named)) {
    return {
      specIds: [],
      valueMap: {},
      existingValueMap: {},
    };
  }

  const specIds: string[] = [];
  const valueMap: Record<string, string[]> = {};
  const existingValueMap: Record<string, string[]> = {};

  for (const dimension of dimensions) {
    const matchedSpec = specs.find((item) => item.name === dimension.label);

    if (!matchedSpec) {
      return {
        specIds: [],
        valueMap: {},
        existingValueMap: {},
      };
    }

    const values = uniqueStringArray(dimension.values.map((item) => item.trim()).filter(Boolean));
    specIds.push(matchedSpec.id);
    valueMap[matchedSpec.id] = values;
    existingValueMap[matchedSpec.id] = values;
  }

  return {
    specIds,
    valueMap,
    existingValueMap,
  };
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

function isNewEditSkuKey(key: string) {
  return key.startsWith(EDIT_NEW_SKU_KEY_PREFIX);
}

function buildEditSkuDraftKeyFromSpecText(specText: string) {
  return `${EDIT_NEW_SKU_KEY_PREFIX}${specText}`;
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

function buildCompactSkuLabel(label: string) {
  const compactLabel = label
    .split('/')
    .map((segment) => {
      const trimmedSegment = segment.trim();

      if (!trimmedSegment) {
        return '';
      }

      const valueOnlySegment = trimmedSegment.split(/[：:]/).slice(-1)[0]?.trim();
      return valueOnlySegment || trimmedSegment;
    })
    .filter(Boolean)
    .join(' / ');

  return compactLabel || label;
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

function buildEditMultiSpecAttributeRows(
  sourceSkus: ProductSkuItem[] = [],
  selectedSpecs: ProductCatalogSpecItem[] = [],
  selectedValueMap: Record<string, string[]> = {},
  draftMap: EditSkuDraftMap = {}
) {
  if (!selectedSpecs.length) {
    return buildProductSkuAttributeRowsFromSkus(sourceSkus, draftMap);
  }

  const generatedSpecItems = buildProductCreateSpecItems(selectedSpecs, selectedValueMap);

  if (!generatedSpecItems.length) {
    return buildProductSkuAttributeRowsFromSkus(sourceSkus, draftMap);
  }

  const sourceSkuMap = new Map(
    sourceSkus.map((sku) => [sku.specText || '', sku])
  );
  const coveredSourceSkuIdSet = new Set<string>();
  const rows = generatedSpecItems.map((item, index) => {
    const specText = formatProductCreateSpecText(item, index);
    const sourceSku = sourceSkuMap.get(specText);
    const draftKey = sourceSku ? sourceSku.id : buildEditSkuDraftKeyFromSpecText(specText);
    const draft = draftMap[draftKey] || {};
    const specValueMap = item.specPairs.reduce<Record<string, string>>((result, pair, pairIndex) => {
      result[`spec_${pairIndex}`] = pair.value;
      return result;
    }, {});

    if (sourceSku) {
      coveredSourceSkuIdSet.add(sourceSku.id);
    }

    return {
      key: draftKey,
      specText,
      specPairs: item.specPairs.map((pair) => ({
        name: pair.name,
        value: pair.value,
      })),
      specValueMap,
      price:
        typeof draft.price === 'number' && Number.isFinite(draft.price)
          ? draft.price
          : sourceSku?.price,
      stock:
        typeof draft.stock === 'number' && Number.isFinite(draft.stock)
          ? draft.stock
          : sourceSku?.stock,
      status:
        draft.status === 'off'
          ? ('off' as const)
          : draft.status === 'on'
            ? ('on' as const)
            : sourceSku?.status || ('on' as const),
      ...(draft.image || sourceSku?.image
        ? { image: draft.image || sourceSku?.image }
        : {}),
      isDefaultSelected:
        draft.isDefaultSelected === true ||
        (draft.isDefaultSelected !== false && sourceSku?.isDefaultSelected === true),
    };
  });

  sourceSkus.forEach((sku) => {
    if (coveredSourceSkuIdSet.has(sku.id)) {
      return;
    }

    const fallbackDraft = draftMap[sku.id] || {};
    rows.push({
      key: sku.id,
      specText: sku.specText,
      specPairs: parseProductSpecText(sku.specText || ''),
      specValueMap: parseProductSpecText(sku.specText || '').reduce<Record<string, string>>(
        (result, pair, pairIndex) => {
          result[`spec_${pairIndex}`] = pair.value;
          return result;
        },
        {}
      ),
      price:
        typeof fallbackDraft.price === 'number' && Number.isFinite(fallbackDraft.price)
          ? fallbackDraft.price
          : sku.price,
      stock:
        typeof fallbackDraft.stock === 'number' && Number.isFinite(fallbackDraft.stock)
          ? fallbackDraft.stock
          : sku.stock,
      status:
        fallbackDraft.status === 'off'
          ? ('off' as const)
          : fallbackDraft.status === 'on'
            ? ('on' as const)
            : sku.status,
      ...(fallbackDraft.image || sku.image
        ? { image: fallbackDraft.image || sku.image }
        : {}),
      isDefaultSelected:
        fallbackDraft.isDefaultSelected === true ||
        (fallbackDraft.isDefaultSelected !== false && sku.isDefaultSelected === true),
    });
  });

  return normalizeProductSkuAttributeRows(rows);
}

function normalizeSpecValueDraftArray(values: string[] = []) {
  const seenValues = new Set<string>();

  return values.map((item) => {
    const value = item.trim();

    if (!value) {
      return '';
    }

    if (seenValues.has(value)) {
      return '';
    }

    seenValues.add(value);
    return value;
  });
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
  attribute: ProductCatalogAttributeItem,
  className: string,
  disabled = false
) {
  if (attribute.type === 'text') {
    return (
      <Input
        className={className}
        placeholder={`请输入${attribute.name}`}
        disabled={disabled}
        allowClear
      />
    );
  }

  if (attribute.type === 'number') {
    return (
      <InputNumber
        className={className}
        disabled={disabled}
        min={0}
        precision={0}
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

function ProductCreatePage() {
  const productService = useMemo(() => new ProductService(), []);
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
  const catalogSpecs = useMemo(() => readProductCatalogSpecs(), []);
  const catalogSpecTemplates = useMemo(() => readProductCatalogSpecTemplates(), []);
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
  const [specMode, setSpecMode] = useState<SpecMode>('multi');
  const [selectedCatalogSpecTemplateId, setSelectedCatalogSpecTemplateId] = useState<
    string | undefined
  >();
  const [selectedCatalogSpecIds, setSelectedCatalogSpecIds] = useState<string[]>([]);
  const [selectedCatalogSpecValueMap, setSelectedCatalogSpecValueMap] = useState<
    Record<string, string[]>
  >({});
  const [multiSpecBatchDraft, setMultiSpecBatchDraft] = useState<MultiSpecBatchDraft>({
    specFilters: {},
  });
  const [singleSpecFileList, setSingleSpecFileList] = useState<UploadItem[]>([]);
  const [singleSpecPrice, setSingleSpecPrice] = useState<number | undefined>();
  const [singleSpecStock, setSingleSpecStock] = useState<number | undefined>();
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
  const detailEditorRef = useRef<HTMLDivElement | null>(null);
  const currentCatalogSpecs = useMemo(
    () => getEnabledSpecsByCatalogId(catalogSpecs, productCatalogId),
    [catalogSpecs, productCatalogId]
  );
  const sourceEditCatalogSpecDraft = useMemo(
    () =>
      isEditMode && sourceProduct?.specMode === 'multi'
        ? buildEditCatalogSpecDraftFromSkus(
            sourceProduct.skus || [],
            currentCatalogSpecs
          )
        : {
            specIds: [],
            valueMap: {},
            existingValueMap: {},
          },
    [currentCatalogSpecs, isEditMode, sourceProduct]
  );
  const currentCatalogSpecTemplates = useMemo(
    () =>
      getEnabledSpecTemplatesByCatalogId(catalogSpecTemplates, productCatalogId),
    [catalogSpecTemplates, productCatalogId]
  );
  const normalizedSelectedCatalogSpecIds = useMemo(
    () =>
      normalizeSelectedProductSpecIds(selectedCatalogSpecIds, currentCatalogSpecs),
    [currentCatalogSpecs, selectedCatalogSpecIds]
  );
  const selectedCatalogSpecs = useMemo(() => {
    const currentCatalogSpecMap = new Map(
      currentCatalogSpecs.map((item) => [item.id, item])
    );

    return normalizedSelectedCatalogSpecIds.flatMap((specId) => {
      const matchedSpec = currentCatalogSpecMap.get(specId);
      if (!matchedSpec) {
        return [];
      }

      const selectedValues = uniqueStringArray(
        (selectedCatalogSpecValueMap[specId] || [])
          .map((item) => item.trim())
          .filter(Boolean)
      );

      return [
        {
          ...matchedSpec,
          values: uniqueStringArray([...matchedSpec.values, ...selectedValues]),
        },
      ];
    });
  }, [
    currentCatalogSpecs,
    normalizedSelectedCatalogSpecIds,
    selectedCatalogSpecValueMap,
  ]);
  const specItems = useMemo(
    () =>
      buildProductCreateSpecItems(
        selectedCatalogSpecs,
        selectedCatalogSpecValueMap
      ),
    [selectedCatalogSpecValueMap, selectedCatalogSpecs]
  );
  const createMultiSpecAttributeRows = useMemo(
    () => buildProductSkuAttributeRowsFromSpecItems(specItems, channelSkuDraftMap),
    [channelSkuDraftMap, specItems]
  );
  const editMultiSpecAttributeRows = useMemo(
    () =>
      isEditMode && sourceProduct?.specMode === 'multi'
        ? buildEditMultiSpecAttributeRows(
            sourceProduct.skus || [],
            selectedCatalogSpecs,
            selectedCatalogSpecValueMap,
            editSkuDraftMap
          )
        : [],
    [
      editSkuDraftMap,
      isEditMode,
      selectedCatalogSpecValueMap,
      selectedCatalogSpecs,
      sourceProduct,
    ]
  );
  const multiSpecAttributeRows = useMemo(
    () => (isEditMode ? editMultiSpecAttributeRows : createMultiSpecAttributeRows),
    [createMultiSpecAttributeRows, editMultiSpecAttributeRows, isEditMode]
  );
  const multiSpecDimensions = useMemo<ProductSpecDimension[]>(
    () =>
      isEditMode
        ? selectedCatalogSpecs.length
          ? buildProductSpecDimensionsFromCatalogSpecs(
              selectedCatalogSpecs,
              selectedCatalogSpecValueMap
            )
          : buildProductSpecDimensionsFromSkus(sourceProduct?.skus || [])
        : buildProductSpecDimensionsFromCatalogSpecs(
            selectedCatalogSpecs,
            selectedCatalogSpecValueMap
          ),
    [isEditMode, selectedCatalogSpecValueMap, selectedCatalogSpecs, sourceProduct]
  );
  const editableStoreSkuItems = useMemo<ChannelSkuTableItem[]>(() => {
    if (!isEditMode || !sourceProduct) {
      if (specMode === 'single') {
        const draft = channelSkuDraftMap[CHANNEL_SINGLE_SKU_KEY] || {};

        return [
          {
            key: CHANNEL_SINGLE_SKU_KEY,
            specLabel: '单规格',
            disabled: Boolean(draft.disabled),
          },
        ];
      }

      const specNameSet = new Set(
        specItems.map((item) => item.name.trim()).filter(Boolean)
      );
      const [specName] = Array.from(specNameSet);
      const channelSkuSpecTitle = specNameSet.size === 1 ? specName : '规格';

      return specItems.map((item, index) => {
        const draft = channelSkuDraftMap[String(item.id)] || {};
        const specValue = item.value.trim();

        return {
          key: String(item.id),
          specLabel:
            channelSkuSpecTitle !== '规格' && specValue
              ? specValue
              : buildSpecText(item, index),
          disabled: Boolean(draft.disabled),
        };
      });
    }

    if (sourceProduct.specMode === 'multi') {
      return multiSpecAttributeRows.map((row, index) => ({
        key: row.key,
        specLabel: row.specText || (index === 0 ? '默认规格' : `规格${index + 1}`),
        disabled: row.status === 'off',
      }));
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
  }, [
    channelSkuDraftMap,
    editSkuDraftMap,
    isEditMode,
    multiSpecAttributeRows,
    specItems,
    specMode,
    sourceProduct,
  ]);
  const editableEnabledSkuKeys = useMemo(
    () => editableStoreSkuItems.filter((item) => !item.disabled).map((item) => item.key),
    [editableStoreSkuItems]
  );

  useEffect(() => {
    const objectUrlMap = objectUrlMapRef.current;
    return () => {
      objectUrlMap.forEach((url) => URL.revokeObjectURL(url));
      objectUrlMap.clear();
    };
  }, []);

  useEffect(() => {
    if (!detailEditorRef.current) {
      return;
    }

    if (detailEditorRef.current.innerHTML !== detailHtml) {
      detailEditorRef.current.innerHTML = detailHtml;
    }
  }, [detailHtml]);

  useEffect(() => {
    const visibleStoreIdSet = new Set(scopedStoreItems.map((item) => item.id));

    if (!sourceProduct) {
      setProductCatalogId(undefined);
      setProductOwnershipId(undefined);
      setProductName('');
      setUploadFileList([]);
      setCarouselImages([]);
      setInventoryUnit(DEFAULT_INVENTORY_UNIT);
      setSpecMode('multi');
      setSelectedCatalogSpecTemplateId(undefined);
      setSelectedCatalogSpecIds([]);
      setSelectedCatalogSpecValueMap({});
      setMultiSpecBatchDraft({ specFilters: {} });
      setSingleSpecFileList([]);
      setSingleSpecPrice(undefined);
      setSingleSpecStock(undefined);
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
    setProductName(
      pageMode === 'copy'
        ? buildCopyProductName(sourceProduct.name)
        : sourceProduct.name
    );
    setUploadFileList(
      buildUploadFileListFromCarouselImages(sourceProduct.carouselImages || [])
    );
    setCarouselImages(buildCarouselImageState(sourceProduct.carouselImages || []));
    setInventoryUnit(sourceProduct.inventoryUnit || DEFAULT_INVENTORY_UNIT);
    setSpecMode(sourceProduct.specMode);
    setSelectedCatalogSpecTemplateId(undefined);
    setSelectedCatalogSpecIds(
      isEditMode && sourceProduct.specMode === 'multi'
        ? sourceEditCatalogSpecDraft.specIds
        : []
    );
    setSelectedCatalogSpecValueMap(
      isEditMode && sourceProduct.specMode === 'multi'
        ? sourceEditCatalogSpecDraft.valueMap
        : {}
    );
    setMultiSpecBatchDraft({ specFilters: {} });
    setSingleSpecFileList([]);
    setSingleSpecPrice(
      pageMode === 'copy' && sourceProduct.specMode === 'multi'
        ? undefined
        : sourceProduct.price
    );
    setSingleSpecStock(
      pageMode === 'copy' && sourceProduct.specMode === 'multi'
        ? undefined
        : sourceProduct.stock
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
    isEditMode,
    pageMode,
    scopedStoreItems,
    sourceEditCatalogSpecDraft.specIds,
    sourceEditCatalogSpecDraft.valueMap,
    sourceProduct,
    visibleStoreIds,
  ]);

  useEffect(() => {
    if (!isEditMode || sourceProduct?.specMode !== 'multi') {
      return;
    }

    setSelectedCatalogSpecIds(sourceEditCatalogSpecDraft.specIds);
    setSelectedCatalogSpecValueMap(sourceEditCatalogSpecDraft.valueMap);
  }, [
    isEditMode,
    sourceEditCatalogSpecDraft.specIds,
    sourceEditCatalogSpecDraft.valueMap,
    sourceProduct?.specMode,
  ]);

  useEffect(() => {
    if (isEditMode || !isStoreScopedCreatePage) {
      return;
    }

    setStoreChannelSkuDraftMap((previous) =>
      syncStoreChannelSkuDraftMap(previous, specMode, specItems)
    );
  }, [isEditMode, isStoreScopedCreatePage, specItems, specMode]);

  useEffect(() => {
    if (!useStoreScopedChannelConfig) {
      return;
    }

    const nextTargetStoreIds = scopedStoreItems
      .filter((item) => item.type === 'store' && item.id !== currentStoreId)
      .map((item) => item.id);

    const nextSkuKeys =
      isStoreScopedOwnedEditPage && sourceProduct
        ? sourceProduct.specMode === 'multi'
          ? editMultiSpecAttributeRows.map((item) => item.key)
          : (sourceProduct.skus || []).map((item) => item.id)
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
    editMultiSpecAttributeRows,
    isStoreScopedOwnedEditPage,
    scopedStoreItems,
    sourceProduct,
    specItems,
    specMode,
    useStoreScopedChannelConfig,
  ]);

  useEffect(() => {
    if (isEditMode) {
      return;
    }

    const nextKeys =
      specMode === 'single'
        ? [CHANNEL_SINGLE_SKU_KEY]
        : specItems.map((item) => String(item.id));

    setChannelSkuDraftMap((previous) =>
      nextKeys.reduce<ChannelSkuDraftMap>((result, key) => {
        result[key] = previous[key] || {};
        return result;
      }, {})
    );
    setIndependentPriceRuleDraftMap((previous) =>
      nextKeys.reduce<IndependentPriceRuleDraftMap>((result, key) => {
        result[key] = previous[key] || {};
        return result;
      }, {})
    );
  }, [isEditMode, specItems, specMode]);

  function revokeObjectUrl(uid: string) {
    const target = objectUrlMapRef.current.get(uid);
    if (target) {
      URL.revokeObjectURL(target);
      objectUrlMapRef.current.delete(uid);
    }
  }

  function revokeObjectUrlsByPrefix(prefix: string) {
    Array.from(objectUrlMapRef.current.keys())
      .filter((key) => key.startsWith(prefix))
      .forEach((key) => revokeObjectUrl(key));
  }

  function buildManagedProductImage(
    file: UploadItem,
    objectKey: string,
    fallbackName: string
  ) {
    revokeObjectUrl(objectKey);

    if (file.url) {
      return {
        id: file.uid || objectKey,
        name: file.name?.trim() || fallbackName,
        url: file.url,
      };
    }

    if (file.originFile) {
      const objectUrl = URL.createObjectURL(file.originFile);
      objectUrlMapRef.current.set(objectKey, objectUrl);

      return {
        id: file.uid || objectKey,
        name: file.name?.trim() || fallbackName,
        url: objectUrl,
      };
    }

    return undefined;
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

  function resetMultiSpecDraft() {
    revokeObjectUrlsByPrefix('product-multi-');
    setSelectedCatalogSpecTemplateId(undefined);
    setSelectedCatalogSpecIds([]);
    setSelectedCatalogSpecValueMap({});
    setMultiSpecBatchDraft({ specFilters: {} });
    setChannelSkuDraftMap({});
    setStoreChannelSkuDraftMap({});
    setIndependentPriceRuleDraftMap({});
  }

  function applyProductCatalogIdChange(nextCatalogId?: string) {
    setProductCatalogId(nextCatalogId);
    resetMultiSpecDraft();
  }

  function handleProductCatalogChange(value: (string | string[])[] | undefined) {
    const nextCatalogId = getProductCatalogIdFromPath(normalizePath(value), catalogItems);

    if (
      (nextCatalogId || '') === (productCatalogId || '') ||
      isEditMode ||
      specMode !== 'multi'
    ) {
      setProductCatalogId(nextCatalogId);
      return;
    }

    const hasDraft =
      hasProductSpecSelectionDraft(
        normalizedSelectedCatalogSpecIds,
        selectedCatalogSpecValueMap
      ) ||
      Object.values(channelSkuDraftMap).some(
        (item) =>
          typeof item.price === 'number' || typeof item.stock === 'number'
      ) ||
      Object.values(storeChannelSkuDraftMap).some(
        (item) =>
          typeof item.sourcePrice === 'number' ||
          typeof item.sourceStock === 'number'
      ) ||
      Object.values(independentPriceRuleDraftMap).some(
        (item) =>
          typeof item.minPrice === 'number' || typeof item.maxPrice === 'number'
      );

    if (!hasDraft) {
      applyProductCatalogIdChange(nextCatalogId);
      return;
    }

    Modal.confirm({
      title: '切换类目后将清空当前规格草稿',
      content: '已选择的规格项、规格值以及当前 SKU 草稿会被清空，是否继续切换？',
      onOk: () => applyProductCatalogIdChange(nextCatalogId),
    });
  }

  function handleCatalogSpecDraftAdd() {
    if (selectedCatalogSpecIds.length >= currentCatalogSpecs.length) {
      return;
    }

    setSelectedCatalogSpecIds((previous) => [...previous, '']);
  }

  function handleCatalogSpecDraftChange(rowIndex: number, nextSpecId?: string) {
    const previousSpecId = selectedCatalogSpecIds[rowIndex]?.trim() || '';
    const normalizedNextSpecId = typeof nextSpecId === 'string' ? nextSpecId.trim() : '';
    const matchedSpec = currentCatalogSpecs.find((item) => item.id === normalizedNextSpecId);

    if (
      normalizedNextSpecId &&
      selectedCatalogSpecIds.some(
        (item, index) => index !== rowIndex && item.trim() === normalizedNextSpecId
      )
    ) {
      return;
    }

    setSelectedCatalogSpecIds((previous) => {
      const next = [...previous];
      next[rowIndex] = matchedSpec ? normalizedNextSpecId : '';
      return next;
    });
    setSelectedCatalogSpecValueMap((previous) => {
      const next = { ...previous };

      if (previousSpecId && previousSpecId !== normalizedNextSpecId) {
        delete next[previousSpecId];
      }

      if (matchedSpec) {
        next[matchedSpec.id] = normalizeSelectedProductSpecValues(
          next[matchedSpec.id] || []
        ).filter((value) => matchedSpec.values.includes(value));
      }

      return next;
    });
  }

  function handleCatalogSpecDraftRemove(rowIndex: number) {
    const removedSpecId = selectedCatalogSpecIds[rowIndex]?.trim() || '';

    setSelectedCatalogSpecIds((previous) => previous.filter((_, index) => index !== rowIndex));

    if (!removedSpecId) {
      return;
    }

    setSelectedCatalogSpecValueMap((previous) => {
      const next = { ...previous };
      delete next[removedSpecId];
      return next;
    });
  }

  function getSelectedCatalogSpecDraftValues(specId: string) {
    const values = selectedCatalogSpecValueMap[specId] || [];
    return values.length ? values : [''];
  }

  function handleCatalogSpecValueDraftChange(
    specId: string,
    valueIndex: number,
    nextValue?: string
  ) {
    const matchedSpec = currentCatalogSpecs.find((item) => item.id === specId);

    if (!matchedSpec) {
      return;
    }

    setSelectedCatalogSpecValueMap((previous) => {
      const currentValues = previous[specId]?.length ? [...previous[specId]] : [''];
      currentValues[valueIndex] = typeof nextValue === 'string' ? nextValue.trim() : '';

      return {
        ...previous,
        [specId]: normalizeSpecValueDraftArray(
          currentValues.map((item) =>
            matchedSpec.values.includes(item) ? item : ''
          )
        ),
      };
    });
  }

  function handleCatalogSpecValueDraftAdd(specId: string) {
    setSelectedCatalogSpecValueMap((previous) => {
      const currentValues = previous[specId]?.length ? previous[specId] : [''];

      return {
        ...previous,
        [specId]: [...currentValues, ''],
      };
    });
  }

  function handleCatalogSpecValueDraftRemove(specId: string, valueIndex: number) {
    setSelectedCatalogSpecValueMap((previous) => {
      const currentValues = previous[specId]?.length ? [...previous[specId]] : [''];
      currentValues.splice(valueIndex, 1);

      return {
        ...previous,
        [specId]: normalizeSpecValueDraftArray(currentValues),
      };
    });
  }

  function handleEditCatalogSpecValueAppend(specId: string, nextValue?: string) {
    const normalizedValue = typeof nextValue === 'string' ? nextValue.trim() : '';

    if (!normalizedValue) {
      return;
    }

    setSelectedCatalogSpecValueMap((previous) => ({
      ...previous,
      [specId]: uniqueStringArray([...(previous[specId] || []), normalizedValue]),
    }));
  }

  function handleEditCatalogSpecNewValueRemove(specId: string, value: string) {
    const existingValueSet = new Set(sourceEditCatalogSpecDraft.existingValueMap[specId] || []);

    if (existingValueSet.has(value)) {
      return;
    }

    setSelectedCatalogSpecValueMap((previous) => ({
      ...previous,
      [specId]: (previous[specId] || []).filter((item) => item !== value),
    }));
  }

  function handleCatalogSpecTemplateChange(value?: string) {
    const nextTemplateId = typeof value === 'string' ? value : undefined;

    setSelectedCatalogSpecTemplateId(nextTemplateId);

    if (!nextTemplateId) {
      return;
    }

    const matchedTemplate = currentCatalogSpecTemplates.find(
      (item) => item.id === nextTemplateId
    );

    if (!matchedTemplate) {
      return;
    }

    setSelectedCatalogSpecIds(
      buildSelectedCatalogSpecIdsFromTemplate(matchedTemplate, currentCatalogSpecs)
    );
    setSelectedCatalogSpecValueMap(
      buildSelectedCatalogSpecValueMapFromTemplate(matchedTemplate, currentCatalogSpecs)
    );
  }

  function handleChannelSkuDraftChange(
    key: string,
    field: keyof ChannelSkuDraftItem,
    value?: number
  ) {
    const nextValue =
      typeof value === 'number' && Number.isFinite(value) ? value : undefined;

    setChannelSkuDraftMap((previous) => ({
      ...previous,
      [key]: {
        ...previous[key],
        [field]: nextValue,
      },
    }));

    if (isStoreScopedCreatePage && (field === 'price' || field === 'stock')) {
      setStoreChannelSkuDraftMap((previous) => ({
        ...previous,
        [key]: {
          ...previous[key],
          [field === 'price' ? 'sourcePrice' : 'sourceStock']: nextValue,
        },
      }));
    }
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

  function buildChannelSkuDraftMapFromRows(
    rows: ProductSkuAttributeRow[],
    previous: ChannelSkuDraftMap
  ) {
    return rows.reduce<ChannelSkuDraftMap>((result, row) => {
      result[row.key] = {
        ...previous[row.key],
        price: row.price,
        stock: row.stock,
        status: row.status,
        disabled: row.status === 'off',
        image: row.image,
        isDefaultSelected: row.isDefaultSelected || undefined,
      };
      return result;
    }, {});
  }

  function buildEditSkuDraftMapFromRows(
    rows: ProductSkuAttributeRow[],
    previous: EditSkuDraftMap
  ) {
    return rows.reduce<EditSkuDraftMap>((result, row) => {
      result[row.key] = {
        ...previous[row.key],
        price: row.price,
        stock: row.stock,
        status: row.status,
        image: row.image,
        isDefaultSelected: row.isDefaultSelected || undefined,
      };
      return result;
    }, {});
  }

  function syncStoreScopedDraftMapFromRows(rows: ProductSkuAttributeRow[]) {
    if (!isStoreScopedCreatePage) {
      return;
    }

    setStoreChannelSkuDraftMap((previous) =>
      rows.reduce<StoreChannelSkuDraftMap>((result, row) => {
        result[row.key] = {
          ...previous[row.key],
          sourcePrice: row.price,
          sourceStock: row.stock,
          status: row.status,
          image: row.image,
          isDefaultSelected: row.isDefaultSelected || undefined,
        };
        return result;
      }, {})
    );
  }

  function syncEnabledSkuRelatedState(nextRows: ProductSkuAttributeRow[]) {
    const nextEnabledSkuKeys = nextRows
      .filter((row) => row.status !== 'off')
      .map((row) => row.key);

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
  }

  function updateCreateMultiSkuRows(
    updater: (rows: ProductSkuAttributeRow[]) => ProductSkuAttributeRow[],
    options?: {
      syncEnabledSkuState?: boolean;
    }
  ) {
    setChannelSkuDraftMap((previous) => {
      const nextRows = updater(
        buildProductSkuAttributeRowsFromSpecItems(specItems, previous)
      );
      const nextMap = buildChannelSkuDraftMapFromRows(nextRows, previous);

      syncStoreScopedDraftMapFromRows(nextRows);
      if (options?.syncEnabledSkuState) {
        syncEnabledSkuRelatedState(nextRows);
      }

      return nextMap;
    });
  }

  function updateEditMultiSkuRows(
    updater: (rows: ProductSkuAttributeRow[]) => ProductSkuAttributeRow[]
  ) {
    if (!sourceProduct) {
      return;
    }

    setEditSkuDraftMap((previous) =>
      buildEditSkuDraftMapFromRows(
        updater(buildProductSkuAttributeRowsFromSkus(sourceProduct.skus || [], previous)),
        previous
      )
    );
  }

  function handleChannelSkuDisabledToggle(key: string) {
    updateCreateMultiSkuRows(
      (rows) =>
        rows.map((row) =>
          row.key === key
            ? {
                ...row,
                status: row.status === 'off' ? 'on' : 'off',
              }
            : row
        ),
      {
        syncEnabledSkuState: true,
      }
    );
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

  function handleMultiSpecBatchFilterChange(specKey: string, value?: string) {
    setMultiSpecBatchDraft((previous) => ({
      ...previous,
      specFilters: {
        ...previous.specFilters,
        [specKey]: value || '',
      },
    }));
  }

  function handleMultiSpecBatchFieldChange(
    field: 'price' | 'stock',
    value?: number
  ) {
    setMultiSpecBatchDraft((previous) => ({
      ...previous,
      [field]:
        typeof value === 'number' && Number.isFinite(value) ? value : undefined,
    }));
  }

  function handleMultiSpecBatchClear() {
    revokeObjectUrl('product-multi-batch-image');
    setMultiSpecBatchDraft({ specFilters: {} });
  }

  function handleMultiSpecBatchApply() {
    const nextRows = applyProductSkuBatchPatch(
      multiSpecAttributeRows,
      multiSpecBatchDraft.specFilters,
      {
        price: multiSpecBatchDraft.price,
        stock: multiSpecBatchDraft.stock,
        image: multiSpecBatchDraft.image,
      }
    );

    if (isEditMode) {
      updateEditMultiSkuRows(() => nextRows);
    } else {
      updateCreateMultiSkuRows(() => nextRows);
    }
  }

  function handleCreateMultiSkuFieldChange(
    key: string,
    field: 'price' | 'stock',
    value?: number
  ) {
    updateCreateMultiSkuRows((rows) =>
      rows.map((row) =>
        row.key === key
          ? {
              ...row,
              [field]:
                typeof value === 'number' && Number.isFinite(value)
                  ? value
                  : undefined,
            }
          : row
      )
    );
  }

  function handleEditMultiSkuFieldChange(
    key: string,
    field: 'price' | 'stock',
    value?: number
  ) {
    updateEditMultiSkuRows((rows) =>
      rows.map((row) =>
        row.key === key
          ? {
              ...row,
              [field]:
                typeof value === 'number' && Number.isFinite(value)
                  ? value
                  : undefined,
            }
          : row
      )
    );
  }

  function handleCreateMultiSkuDefaultChange(key: string, checked: boolean) {
    updateCreateMultiSkuRows((rows) =>
      rows.map((row) => ({
        ...row,
        isDefaultSelected: row.key === key ? checked : false,
      }))
    );
  }

  function handleEditMultiSkuDefaultChange(key: string, checked: boolean) {
    updateEditMultiSkuRows((rows) =>
      rows.map((row) => ({
        ...row,
        isDefaultSelected: row.key === key ? checked : false,
      }))
    );
  }

  function handleEditMultiSkuStatusChange(key: string, checked: boolean) {
    updateEditMultiSkuRows((rows) =>
      rows.map((row) =>
        row.key === key
          ? {
              ...row,
              status: checked ? 'on' : 'off',
            }
          : row
      )
    );
  }

  function handleMultiSpecBatchImageChange(nextFileList: UploadItem[]) {
    const latestFile = nextFileList.slice(-1)[0];
    const nextImage = latestFile
      ? buildManagedProductImage(latestFile, 'product-multi-batch-image', '批量图片')
      : undefined;

    setMultiSpecBatchDraft((previous) => ({
      ...previous,
      image: nextImage,
    }));
  }

  function handleMultiSpecBatchImageRemove() {
    revokeObjectUrl('product-multi-batch-image');
    setMultiSpecBatchDraft((previous) => ({
      ...previous,
      image: undefined,
    }));
    return true;
  }

  function handleCreateMultiSkuImageChange(key: string, nextFileList: UploadItem[]) {
    const latestFile = nextFileList.slice(-1)[0];
    const nextImage = latestFile
      ? buildManagedProductImage(
          latestFile,
          `product-multi-sku-${key}`,
          `规格图-${key}`
        )
      : undefined;

    updateCreateMultiSkuRows((rows) =>
      rows.map((row) =>
        row.key === key
          ? {
              ...row,
              image: nextImage,
            }
          : row
      )
    );
  }

  function handleEditMultiSkuImageChange(key: string, nextFileList: UploadItem[]) {
    const latestFile = nextFileList.slice(-1)[0];
    const nextImage = latestFile
      ? buildManagedProductImage(
          latestFile,
          `product-multi-sku-${key}`,
          `规格图-${key}`
        )
      : undefined;

    updateEditMultiSkuRows((rows) =>
      rows.map((row) =>
        row.key === key
          ? {
              ...row,
              image: nextImage,
            }
          : row
      )
    );
  }

  function handleCreateMultiSkuImageRemove(key: string) {
    revokeObjectUrl(`product-multi-sku-${key}`);
    updateCreateMultiSkuRows((rows) =>
      rows.map((row) =>
        row.key === key
          ? {
              ...row,
              image: undefined,
            }
          : row
      )
    );
    return true;
  }

  function handleEditMultiSkuImageRemove(key: string) {
    revokeObjectUrl(`product-multi-sku-${key}`);
    updateEditMultiSkuRows((rows) =>
      rows.map((row) =>
        row.key === key
          ? {
              ...row,
              image: undefined,
            }
          : row
      )
    );
    return true;
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
    const nextSkuKeys = normalizeTreeSelectSkuKeys(
      value,
      storeChannelAvailableSkuKeys
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
      if (sourceProduct?.specMode === 'multi') {
        return new Map(
          editMultiSpecAttributeRows.flatMap((row, index) =>
            nextSkus[index] ? [[row.key, nextSkus[index].id] as [string, string]] : []
          )
        );
      }

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

    const skuMetaItems =
      sourceProduct.specMode === 'multi'
        ? editMultiSpecAttributeRows.flatMap((row, index) =>
            nextSkus[index]
              ? [
                  {
                    key: row.key,
                    skuId: nextSkus[index].id,
                    specLabel: row.specText || `规格${index + 1}`,
                    sourcePrice: nextSkus[index].price,
                    sourceStock: nextSkus[index].stock,
                  } as StoreChannelSkuMetaItem,
                ]
              : []
          )
        : nextSkus.map((sku, index) => ({
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

      const nextSkus =
        sourceProduct.specMode === 'multi'
          ? (() => {
              let nextNewSkuIndex = (sourceProduct.skus || []).length;
              const sourceSkuMap = new Map<string, ProductSkuItem>(
                (sourceProduct.skus || []).map((sku) => [sku.id, sku] as const)
              );

              return editMultiSpecAttributeRows.map((row) => {
                const matchedSourceSku = sourceSkuMap.get(row.key);
                const nextSkuId = matchedSourceSku
                  ? matchedSourceSku.id
                  : createProductSkuId(productId, nextNewSkuIndex++);
                const baseSku: ProductSkuItem = matchedSourceSku || {
                  id: nextSkuId,
                  specText: row.specText,
                  price: 0,
                  stock: 0,
                  status: 'on' as const,
                };
                const { image: _sourceImage, isDefaultSelected: _sourceDefault, ...restSku } =
                  baseSku;

                return {
                  ...restSku,
                  id: nextSkuId,
                  specText: row.specText,
                  price:
                    typeof row.price === 'number' && Number.isFinite(row.price)
                      ? row.price
                      : baseSku.price,
                  stock:
                    typeof row.stock === 'number' && Number.isFinite(row.stock)
                      ? Math.max(0, Math.floor(row.stock))
                      : baseSku.stock,
                  status: row.status,
                  ...(row.image ? { image: row.image } : {}),
                  ...(row.isDefaultSelected ? { isDefaultSelected: true } : {}),
                };
              });
            })()
          : (sourceProduct.skus || []).map((sku) => {
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
        productKind: sourceProductBase.productKind || 'standard',
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
        status: nextStatus,
      }));
      const nextPrice = nextSkusWithStatus.length
        ? Math.min(...nextSkusWithStatus.map((item) => item.price))
        : 0;
      const nextStock = nextSkusWithStatus.reduce((total, item) => total + item.stock, 0);

      return {
        id: productId,
        name: nextName,
        productKind: 'standard',
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
        bundleComponents: [],
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
      nextPrice = Number(singleSpecPrice ?? sourceProduct?.price ?? 0);
      nextStock = Number(singleSpecStock ?? sourceProduct?.stock ?? 0);
      nextSkus = [
        {
          id: createProductSkuId(productId, 0),
          specText: '',
          price: nextPrice,
          stock: nextStock,
          status: singleDraft.disabled ? 'off' : 'on',
        },
      ];
    } else {
      nextSkus = multiSpecAttributeRows.map((row, index) => ({
        id: createProductSkuId(productId, index),
        specText: row.specText,
        price:
          typeof row.price === 'number' && Number.isFinite(row.price) ? row.price : 0,
        stock:
          typeof row.stock === 'number' && Number.isFinite(row.stock)
            ? Math.max(0, Math.floor(row.stock))
            : 0,
        status: row.status,
        ...(row.image ? { image: row.image } : {}),
        ...(row.isDefaultSelected ? { isDefaultSelected: true } : {}),
      }));

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
      productKind: 'standard',
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
      bundleComponents: [],
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
    history.push('/product/list');
  }

  async function handleSubmit() {
    if (!isEditMode && channelEnabled) {
      if (!currentStoreId) {
        Message.warning('请先切换到具体店铺后再开启店铺渠道');
        return;
      }
    }

    if (!isEditMode && specMode === 'multi') {
      if (!productCatalogId) {
        Message.warning('请先选择商品类目');
        return;
      }

      if (!currentCatalogSpecs.length) {
        Message.warning('当前类目下暂无可用规格项，请先前往商品规格完成配置');
        return;
      }

      if (!selectedCatalogSpecs.length) {
        Message.warning('请至少添加并选择 1 个规格项');
        return;
      }

      const hasIncompleteSpecValues = selectedCatalogSpecs.some(
        (item) =>
          normalizeSelectedProductSpecValues(
            selectedCatalogSpecValueMap[item.id] || []
          ).length === 0
      );

      if (hasIncompleteSpecValues || !specItems.length) {
        Message.warning('请为每个规格项至少选择 1 个规格值');
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

    if (!isEditMode && specMode === 'multi') {
      const visibleRows = multiSpecAttributeRows.filter((item) => item.status !== 'off');
      const hasInvalidVisibleRow = visibleRows.some(
        (item) =>
          !item.image ||
          typeof item.price !== 'number' ||
          !Number.isFinite(item.price) ||
          item.price < 0 ||
          typeof item.stock !== 'number' ||
          !Number.isFinite(item.stock) ||
          item.stock < 0 ||
          !Number.isInteger(item.stock)
      );

      if (hasInvalidVisibleRow) {
        Message.warning('请先补齐所有显示 SKU 的图片、售价和库存');
        return;
      }
    }

    if (isEditMode && sourceProduct?.specMode === 'multi') {
      const visibleRows = multiSpecAttributeRows.filter((item) => item.status !== 'off');
      const hasInvalidVisibleRow = visibleRows.some(
        (item) =>
          !item.image ||
          typeof item.price !== 'number' ||
          !Number.isFinite(item.price) ||
          item.price < 0 ||
          typeof item.stock !== 'number' ||
          !Number.isFinite(item.stock) ||
          item.stock < 0 ||
          !Number.isInteger(item.stock)
      );

      if (hasInvalidVisibleRow) {
        Message.warning('请先补齐所有显示 SKU 的图片、售价和库存');
        return;
      }
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
      history.push('/product/list');
    } catch (error) {
      Message.error(getErrorMessage(error));
    }
  }

  const currentCatalogAttributes = useMemo(
    () => getEnabledAttributesByCatalogId(catalogAttributes, productCatalogId),
    [catalogAttributes, productCatalogId]
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

    if (sourceProduct.specMode === 'multi') {
      return editMultiSpecAttributeRows.map((row, index) => ({
        key: row.key,
        skuId: row.key,
        specLabel: row.specText || `规格${index + 1}`,
        sourcePrice: row.price,
        sourceStock: row.stock,
      }));
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
  }, [editMultiSpecAttributeRows, editSkuDraftMap, isStoreScopedOwnedEditPage, sourceProduct]);
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
            : buildCompactSkuLabel(item.specLabel),
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
          title: buildCompactSkuLabel(item.specLabel),
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
          disabled: Boolean(draft.disabled),
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
          disabled: Boolean(draft.disabled),
        };
      });
  }, [
    channelSkuDraftMap,
    channelSkuSpecTitle,
    specItems,
    specMode,
  ]);
  const multiSpecSkuTableData = useMemo(
    () =>
      specItems.map((item, index) => {
        const draft = channelSkuDraftMap[String(item.id)] || {};

        return {
          key: String(item.id),
          specLabel: buildSpecText(item, index),
          price: draft.price,
          stock: draft.stock,
          disabled: Boolean(draft.disabled),
        };
      }),
    [channelSkuDraftMap, specItems]
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
        sourcePrice:
          typeof channelSkuDraftMap[key]?.price === 'number'
            ? channelSkuDraftMap[key]?.price
            : undefined,
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
  const multiSpecSkuColumns: Array<any> = [
    {
      title: 'SKU 规格',
      dataIndex: 'specLabel',
      width: 260,
      render: (value: string, record: { disabled: boolean }) => (
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
      title: '售价',
      dataIndex: 'price',
      width: 220,
      render: (_: number, record: { key: string; price?: number; disabled: boolean }) => (
        <InputNumber
          className={styles.independentMoneyInput}
          disabled={record.disabled}
          min={0}
          precision={2}
          prefix="¥"
          placeholder="请输入售价"
          value={record.price}
          onChange={(value) =>
            handleChannelSkuDraftChange(
              record.key,
              'price',
              typeof value === 'number' ? value : undefined
            )
          }
        />
      ),
    },
    {
      title: '库存',
      dataIndex: 'stock',
      width: 220,
      render: (_: number, record: { key: string; stock?: number; disabled: boolean }) => (
        <InputNumber
          className={styles.independentMoneyInput}
          disabled={record.disabled}
          min={0}
          precision={0}
          placeholder="请输入库存"
          value={record.stock}
          onChange={(value) =>
            handleChannelSkuDraftChange(
              record.key,
              'stock',
              typeof value === 'number' ? value : undefined
            )
          }
        />
      ),
    },
    {
      title: '操作',
      dataIndex: 'operation',
      width: 120,
      align: 'right' as const,
      render: (_: string, record: { key: string; disabled: boolean }) => (
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
  ];
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
              title: buildCompactSkuLabel(item.specLabel),
            })),
          },
        ];
        const availableSkuKeys = enabledSkuRows.map((item) => item.key);
        const selectedKeys = buildTreeSelectDisplaySkuKeys(
          record.sellableSkuKeys,
          availableSkuKeys
        );

        return (
          <TreeSelect
            multiple
            treeCheckable
            treeCheckedStrategy={TreeSelect.SHOW_PARENT}
            allowClear
            maxTagCount={{
              count: 1,
              render: (invisibleTagCount) => `+${invisibleTagCount}`,
            }}
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
              const nextKeys = normalizeTreeSelectSkuKeys(value, availableSkuKeys);
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
          treeCheckedStrategy={TreeSelect.SHOW_PARENT}
          allowClear
          maxTagCount={{
            count: 1,
            render: (invisibleTagCount) => `+${invisibleTagCount}`,
          }}
          className={styles.storeSkuTreeSelect}
          disabled={record.sellStatus !== 'sellable'}
          placeholder="请选择可售 SKU"
          treeData={storeChannelProductPoolSkuTreeData}
          value={buildTreeSelectDisplaySkuKeys(
            record.sellableSkuKeys,
            storeChannelAvailableSkuKeys
          )}
          onChange={(value) => {
            const nextKeys = normalizeTreeSelectSkuKeys(
              value,
              storeChannelAvailableSkuKeys
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
  const renderEditMultiSpecSelectorPanel = () => {
    if (!selectedCatalogSpecs.length) {
      return (
        <div className={styles.specAttributeTip}>
          当前商品规格结构无法映射到类目规格，请仅维护现有 SKU 信息。
        </div>
      );
    }

    return (
      <div className={styles.specPanel}>
        <div className={styles.specAttributeTip}>
          编辑模式下不支持新增规格项，也不支持删除或修改已有规格值；仅可在现有规格项下补充新规格值。
        </div>
        <div className={styles.specList}>
          {selectedCatalogSpecs.map((spec, rowIndex) => {
            const selectedValues = uniqueStringArray(selectedCatalogSpecValueMap[spec.id] || []);
            const existingValueSet = new Set(
              sourceEditCatalogSpecDraft.existingValueMap[spec.id] || []
            );
            const newValues = selectedValues.filter((value) => !existingValueSet.has(value));
            const selectableValues = spec.values.filter(
              (value) => !selectedValues.includes(value)
            );

            return (
              <div key={spec.id} className={styles.specItem}>
                <div className={styles.specItemHeader}>
                  <span className={styles.specItemTitle}>
                    规格项 {rowIndex + 1} · {spec.name}
                  </span>
                </div>
                <div className={styles.specValueList}>
                  {(sourceEditCatalogSpecDraft.existingValueMap[spec.id] || []).map((value) => (
                    <Tag key={`${spec.id}_${value}`} color="arcoblue">
                      {value}
                    </Tag>
                  ))}
                  {newValues.map((value) => (
                    <Tag
                      key={`${spec.id}_new_${value}`}
                      closable
                      color="green"
                      onClose={() => handleEditCatalogSpecNewValueRemove(spec.id, value)}
                    >
                      {value}
                    </Tag>
                  ))}
                </div>
                <div className={styles.specActionRow}>
                  <Select
                    key={`${spec.id}_${selectedValues.length}`}
                    allowClear
                    className={styles.specValueSelect}
                    disabled={!selectableValues.length}
                    placeholder={
                      selectableValues.length
                        ? `新增${spec.name}规格值`
                        : `${spec.name}规格值已全部添加`
                    }
                    onChange={(value) =>
                      handleEditCatalogSpecValueAppend(
                        spec.id,
                        typeof value === 'string' ? value : undefined
                      )
                    }
                  >
                    {selectableValues.map((value) => (
                      <Select.Option key={value} value={value}>
                        {value}
                      </Select.Option>
                    ))}
                  </Select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
  const renderMultiSpecSelectorPanel = () => {
    if (!productCatalogId) {
      return (
        <div className={styles.specAttributeTip}>
          请先选择商品类目，再从该类目下已配置的规格项中选择规格值。
        </div>
      );
    }

    if (!currentCatalogSpecs.length) {
      return (
        <div className={styles.specAttributeTip}>
          当前类目下暂无可用规格项，请先前往“商品配置 / 商品规格”完成配置。
        </div>
      );
    }

    return (
      <div className={styles.specPanel}>
        <div className={styles.specTemplateHeader}>
          <div className={styles.specTemplateActions}>
            <Select
              allowClear
              className={styles.specTemplateSelect}
              disabled={!currentCatalogSpecTemplates.length}
              placeholder={
                currentCatalogSpecTemplates.length
                  ? '选择规格模板（可选）'
                  : '当前类目暂无规格模板'
              }
              value={selectedCatalogSpecTemplateId}
              onChange={(value) =>
                handleCatalogSpecTemplateChange(
                  typeof value === 'string' ? value : undefined
                )
              }
            >
              {currentCatalogSpecTemplates.map((item) => (
                <Select.Option key={item.id} value={item.id}>
                  {item.name}
                </Select.Option>
              ))}
            </Select>
          </div>
        </div>

        <div className={styles.specList}>
          {selectedCatalogSpecIds.map((selectedSpecId, rowIndex) => {
            const selectableSpecs = getSelectableProductSpecsForRow(
              currentCatalogSpecs,
              selectedCatalogSpecIds,
              rowIndex
            );
            const matchedSpec = selectableSpecs.find((item) => item.id === selectedSpecId);
            const draftValues = matchedSpec
              ? getSelectedCatalogSpecDraftValues(matchedSpec.id)
              : [];
            const selectedValueSet = new Set(
              draftValues.map((value) => value.trim()).filter(Boolean)
            );

            return (
              <div key={`spec_row_${rowIndex}`} className={styles.specItem}>
                <div className={styles.specItemHeader}>
                  <span className={styles.specItemTitle}>规格项 {rowIndex + 1}</span>
                  <Button
                    className={styles.specValueRemove}
                    icon={<IconDelete />}
                    size="mini"
                    type="text"
                    onClick={() => handleCatalogSpecDraftRemove(rowIndex)}
                  />
                </div>
                <div className={styles.specSelectorRow}>
                  <span className={styles.specDragHandle}>
                    <IconDragDotVertical />
                  </span>
                  <Select
                    allowClear
                    className={styles.specItemSelect}
                    placeholder="请选择规格项"
                    value={matchedSpec ? matchedSpec.id : undefined}
                    onChange={(value) =>
                      handleCatalogSpecDraftChange(
                        rowIndex,
                        typeof value === 'string' ? value : undefined
                      )
                    }
                  >
                    {selectableSpecs.map((item) => (
                      <Select.Option key={item.id} value={item.id}>
                        {item.name}
                      </Select.Option>
                    ))}
                  </Select>
                </div>

                {matchedSpec ? (
                  <div className={styles.specValueList}>
                    {draftValues.map((draftValue, valueIndex) => (
                      <div
                        key={`${matchedSpec.id}_${valueIndex}`}
                        className={styles.specValueRow}
                      >
                        <span className={styles.specDragHandle}>
                          <IconDragDotVertical />
                        </span>
                        <Select
                          allowClear
                          className={styles.specValueSelect}
                          placeholder={`请选择${matchedSpec.name}规格值`}
                          value={draftValue || undefined}
                          onChange={(value) =>
                            handleCatalogSpecValueDraftChange(
                              matchedSpec.id,
                              valueIndex,
                              typeof value === 'string' ? value : undefined
                            )
                          }
                        >
                          {matchedSpec.values.map((value) => {
                            const disabled =
                              value !== draftValue && selectedValueSet.has(value);

                            return (
                              <Select.Option
                                key={value}
                                value={value}
                                disabled={disabled}
                              >
                                {value}
                              </Select.Option>
                            );
                          })}
                        </Select>
                        <Button
                          className={styles.specValueRemove}
                          icon={<IconDelete />}
                          size="mini"
                          type="text"
                          onClick={() =>
                            handleCatalogSpecValueDraftRemove(matchedSpec.id, valueIndex)
                          }
                        />
                      </div>
                    ))}
                    <Button
                      className={styles.specAddValueButton}
                      size="mini"
                      type="text"
                      onClick={() => handleCatalogSpecValueDraftAdd(matchedSpec.id)}
                    >
                      添加规格值
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}

          {!selectedCatalogSpecIds.length ? (
            <div className={styles.specSelectionHint}>
              请先添加规格项，再从当前类目下已配置的枚举值中选择规格值。
            </div>
          ) : null}

          <div className={styles.specActionRow}>
            <Button
              className={styles.specAddItemButton}
              size="mini"
              type="text"
              disabled={selectedCatalogSpecIds.length >= currentCatalogSpecs.length}
              onClick={handleCatalogSpecDraftAdd}
            >
              添加规格项
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderMultiSpecAttributeTable = () => {
    const tableData: MultiSpecAttributeTableRow[] = [
      {
        rowType: 'batch',
        key: 'batch',
      },
      ...multiSpecAttributeRows.map((item) => ({
        rowType: 'sku' as const,
        ...item,
      })),
    ];
    const columns = [
      ...multiSpecDimensions.map((dimension) => ({
        title: dimension.label,
        dataIndex: dimension.key,
        width: 180,
        render: (_: string, record: MultiSpecAttributeTableRow) =>
          record.rowType === 'batch' ? (
            <Select
              allowClear
              className={styles.multiSpecFilterSelect}
              placeholder={`全部${dimension.label}`}
              value={multiSpecBatchDraft.specFilters[dimension.key] || undefined}
              onChange={(value) =>
                handleMultiSpecBatchFilterChange(
                  dimension.key,
                  typeof value === 'string' ? value : undefined
                )
              }
            >
              {dimension.values.map((value) => (
                <Select.Option key={value} value={value}>
                  {value}
                </Select.Option>
              ))}
            </Select>
          ) : (
            <Typography.Text>{record.specValueMap[dimension.key] || '--'}</Typography.Text>
          ),
      })),
      {
        title: (
          <>
            <span className={styles.requiredMark}>*</span>
            图片
          </>
        ),
        dataIndex: 'image',
        width: 140,
        render: (_: ProductCarouselImage | undefined, record: MultiSpecAttributeTableRow) =>
          record.rowType === 'batch' ? (
            <Upload
              accept="image/*"
              className={styles.multiSpecImageUpload}
              fileList={
                multiSpecBatchDraft.image
                  ? buildUploadFileListFromCarouselImages([multiSpecBatchDraft.image])
                  : []
              }
              imagePreview
              limit={1}
              listType="picture-card"
              multiple={false}
              customRequest={({ onSuccess }) => onSuccess({})}
              onChange={handleMultiSpecBatchImageChange}
              onRemove={handleMultiSpecBatchImageRemove}
            />
          ) : (
            <Upload
              accept="image/*"
              className={styles.multiSpecImageUpload}
              fileList={
                record.image ? buildUploadFileListFromCarouselImages([record.image]) : []
              }
              imagePreview
              limit={1}
              listType="picture-card"
              multiple={false}
              customRequest={({ onSuccess }) => onSuccess({})}
              onChange={(fileList) =>
                isEditMode
                  ? handleEditMultiSkuImageChange(record.key, fileList)
                  : handleCreateMultiSkuImageChange(record.key, fileList)
              }
              onRemove={() =>
                isEditMode
                  ? handleEditMultiSkuImageRemove(record.key)
                  : handleCreateMultiSkuImageRemove(record.key)
              }
            />
          ),
      },
      {
        title: (
          <>
            <span className={styles.requiredMark}>*</span>
            售价
          </>
        ),
        dataIndex: 'price',
        width: 180,
        render: (_: number | undefined, record: MultiSpecAttributeTableRow) =>
          record.rowType === 'batch' ? (
            <InputNumber
              className={styles.multiSpecNumberInput}
              min={0}
              precision={2}
              prefix="¥"
              placeholder="售价"
              value={multiSpecBatchDraft.price}
              onChange={(value) =>
                handleMultiSpecBatchFieldChange(
                  'price',
                  typeof value === 'number' ? value : undefined
                )
              }
            />
          ) : (
            <InputNumber
              className={styles.multiSpecNumberInput}
              min={0}
              precision={2}
              prefix="¥"
              placeholder="售价"
              value={record.price}
              onChange={(value) =>
                isEditMode
                  ? handleEditMultiSkuFieldChange(
                      record.key,
                      'price',
                      typeof value === 'number' ? value : undefined
                    )
                  : handleCreateMultiSkuFieldChange(
                      record.key,
                      'price',
                      typeof value === 'number' ? value : undefined
                    )
              }
            />
          ),
      },
      {
        title: (
          <>
            <span className={styles.requiredMark}>*</span>
            库存
          </>
        ),
        dataIndex: 'stock',
        width: 180,
        render: (_: number | undefined, record: MultiSpecAttributeTableRow) =>
          record.rowType === 'batch' ? (
            <InputNumber
              className={styles.multiSpecNumberInput}
              min={0}
              precision={0}
              placeholder="库存"
              value={multiSpecBatchDraft.stock}
              onChange={(value) =>
                handleMultiSpecBatchFieldChange(
                  'stock',
                  typeof value === 'number' ? value : undefined
                )
              }
            />
          ) : (
            <InputNumber
              className={styles.multiSpecNumberInput}
              min={0}
              precision={0}
              placeholder="库存"
              value={record.stock}
              onChange={(value) =>
                isEditMode
                  ? handleEditMultiSkuFieldChange(
                      record.key,
                      'stock',
                      typeof value === 'number' ? value : undefined
                    )
                  : handleCreateMultiSkuFieldChange(
                      record.key,
                      'stock',
                      typeof value === 'number' ? value : undefined
                    )
              }
            />
          ),
      },
      {
        title: '默认选中规格',
        dataIndex: 'isDefaultSelected',
        width: 180,
        render: (_: boolean, record: MultiSpecAttributeTableRow) =>
          record.rowType === 'batch' ? (
            <Typography.Text type="secondary">--</Typography.Text>
          ) : (
            <Switch
              checked={record.isDefaultSelected}
              disabled={record.status === 'off'}
              onChange={(checked) =>
                isEditMode
                  ? handleEditMultiSkuDefaultChange(record.key, checked)
                  : handleCreateMultiSkuDefaultChange(record.key, checked)
              }
            />
          ),
      },
      {
        title: '操作',
        dataIndex: 'operation',
        width: 220,
        render: (_: string, record: MultiSpecAttributeTableRow) =>
          record.rowType === 'batch' ? (
            <div className={styles.multiSpecBatchActions}>
              <Button type="text" onClick={handleMultiSpecBatchApply}>
                批量修改
              </Button>
              <Button type="text" onClick={handleMultiSpecBatchClear}>
                清空
              </Button>
            </div>
          ) : (
            <div className={styles.multiSpecStatusCell}>
              <span className={styles.multiSpecStatusText}>
                {record.status === 'on' ? '显示' : '隐藏'}
              </span>
              <Switch
                checked={record.status === 'on'}
                onChange={(checked) =>
                  isEditMode
                    ? handleEditMultiSkuStatusChange(record.key, checked)
                    : handleChannelSkuDisabledToggle(record.key)
                }
              />
            </div>
          ),
      },
    ];

    return (
      <div className={styles.storeChannelTablePanel}>
        <Table
          rowKey="key"
          className={styles.multiSpecAttributeTable}
          columns={columns}
          data={tableData}
          pagination={false}
          scroll={{ x: 1160 }}
          tableLayoutFixed
        />
        <Typography.Paragraph className={styles.storeChannelTableHint}>
          系统会按已选规格值自动生成 SKU 组合；仅显示中的 SKU 需要补齐图片、售价和库存。
        </Typography.Paragraph>
      </div>
    );
  };

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

        <Form className={styles.sectionForm} {...PRODUCT_FORM_LAYOUT}>
          <div className={styles.formGrid}>
            <Form.Item label="商品类型">
              <Select className={styles.singleFieldControl} value="virtual" disabled>
                {PRODUCT_TYPE_OPTIONS.map((item) => (
                  <Select.Option key={item.value} value={item.value}>
                    {item.label}
                  </Select.Option>
                ))}
              </Select>
              <div className={styles.fieldHelp}>当前默认选择"虚拟商品"，暂不支持修改。</div>
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
                onChange={handleProductCatalogChange}
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
                        rules={
                          attribute.required
                            ? [
                                {
                                  required: true,
                                  message:
                                    attribute.type === 'text' ||
                                    attribute.type === 'number'
                                      ? `请输入${attribute.name}`
                                      : `请选择${attribute.name}`,
                                },
                              ]
                            : undefined
                        }
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
            规格与库存
          </Typography.Title>
        </div>

        <Form className={styles.sectionForm} {...PRODUCT_FORM_LAYOUT}>
          <div className={styles.formGrid}>
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

            <Form.Item className={styles.fullWidth} label="商品规格" required>
              {isEditMode ? (
                <Typography.Text className={styles.fieldHelp}>
                  编辑模式不支持修改规格模式和规格项；已有规格值不可改删，但可补充新规格值。
                </Typography.Text>
              ) : (
                <Radio.Group value={specMode} onChange={setSpecMode}>
                  <Radio value="single">单规格</Radio>
                  <Radio value="multi">多规格</Radio>
                </Radio.Group>
              )}
            </Form.Item>

            <Form.Item className={styles.fullWidth} label="规格信息">
              {isEditMode ? (
                sourceProduct?.specMode === 'multi' ? (
                  <div className={styles.storeScopedSpecWrap}>
                    {renderEditMultiSpecSelectorPanel()}
                    {renderMultiSpecAttributeTable()}
                  </div>
                ) : (
                  <Table
                    rowKey="id"
                    columns={editSkuColumns}
                    data={editSkuTableData}
                    pagination={false}
                    scroll={{ x: 760 }}
                    tableLayoutFixed
                  />
                )
              ) : isStoreScopedCreatePage ? (
                <div className={styles.storeScopedSpecWrap}>
                  {specMode === 'single' ? (
                    <div className={styles.specPanel}>
                      <Typography.Paragraph className={styles.specEmpty}>
                        单规格商品默认生成 1 条 SKU，请在下方维护源售价和源库存。
                      </Typography.Paragraph>
                    </div>
                  ) : (
                    renderMultiSpecSelectorPanel()
                  )}
                </div>
              ) : specMode === 'single' ? (
                <div className={styles.specPanel}>
                  <div className={styles.singleSpecGrid}>
                    <div className={styles.singleSpecField}>
                      <div className={styles.singleSpecLabel}>图片</div>
                      <Upload
                        accept="image/*"
                        className={styles.singleSpecUpload}
                        fileList={singleSpecFileList}
                        imagePreview
                        limit={1}
                        listType="picture-card"
                        multiple={false}
                        customRequest={({ onSuccess }) => {
                          onSuccess({});
                        }}
                        onChange={handleSingleSpecUploadChange}
                        onRemove={handleSingleSpecRemove}
                        onExceedLimit={() => {
                          Message.warning('单规格仅支持上传 1 张图片');
                        }}
                      />
                      <div className={styles.fieldHelp}>仅支持上传 1 张图片</div>
                    </div>

                    <div className={styles.singleSpecField}>
                      <div className={styles.singleSpecLabel}>售价</div>
                      <InputNumber
                        className={styles.singleSpecControl}
                        min={0}
                        precision={2}
                        placeholder="请输入售价"
                        value={singleSpecPrice}
                        onChange={(value) =>
                          setSingleSpecPrice(
                            typeof value === 'number' ? value : undefined
                          )
                        }
                      />
                    </div>

                    <div className={styles.singleSpecField}>
                      <div className={styles.singleSpecLabel}>库存</div>
                      <div className={styles.singleSpecInputRow}>
                        <InputNumber
                          className={styles.singleSpecControl}
                          min={0}
                          precision={0}
                          placeholder="请输入库存"
                          value={singleSpecStock}
                          onChange={(value) =>
                            setSingleSpecStock(
                              typeof value === 'number' ? value : undefined
                            )
                          }
                        />
                        <span className={styles.singleSpecUnit}>{inventoryUnit}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.storeScopedSpecWrap}>
                  {renderMultiSpecSelectorPanel()}
                </div>
              )}
            </Form.Item>

            {!isEditMode && specMode === 'multi' && (
              <Form.Item className={styles.fullWidth} label="商品属性配置项">
                {specItems.length ? (
                  renderMultiSpecAttributeTable()
                ) : (
                  <div className={styles.specAttributeTip}>
                    请先选择规格项并补齐规格值。生成 SKU 后，商品属性配置区域才会展示。
                  </div>
                )}
              </Form.Item>
            )}
          </div>
        </Form>
      </Card>

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
        <Card className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <Typography.Title className={styles.sectionTitle} heading={6}>
              店铺渠道配置
            </Typography.Title>
          </div>

          <Form className={styles.sectionForm} {...PRODUCT_FORM_LAYOUT}>
            <div className={styles.formGrid}>
              <Form.Item className={styles.fullWidth} label="店铺渠道">
                <div className={styles.storeChannelSwitchRow}>
                  <Switch
                    checked={storeChannelEnabled}
                    onChange={setStoreChannelEnabled}
                  />
                  <span className={styles.storeChannelSwitchText}>
                    {storeChannelEnabled ? '已开启' : '已关闭'}
                  </span>
                </div>
              </Form.Item>

              {storeChannelEnabled && (
                <>
                  <Form.Item className={styles.fullWidth} label="生效商品池">
                    <>
                      <Radio.Group
                        value={storeChannelConfigDraft.shareMode}
                        onChange={(value) =>
                          patchStoreChannelConfig({
                            shareMode: value as StoreChannelConfigDraftItem['shareMode'],
                            storeScope:
                              value === 'product_pool' ? 'specificStores' : 'allStores',
                            storeIds:
                              value === 'product_pool'
                                ? storeChannelConfigDraft.storeIds
                                : [],
                          })
                        }
                      >
                        <Radio value="product_pool">商品库</Radio>
                        <Radio value="shared_pool">商品共享池</Radio>
                      </Radio.Group>
                      <Typography.Paragraph className={styles.storeChannelTableHint}>
                        商品库：直接进入对应门店商品库并可售；商品共享池：进入全部店铺共享池，由门店自行引用。
                      </Typography.Paragraph>
                    </>
                  </Form.Item>

                  {storeChannelConfigDraft.shareMode === 'product_pool' && (
                    <Form.Item className={styles.fullWidth} label="销售店铺">
                      <div className={styles.storeChannelSelectorRow}>
                        <Button
                          type="outline"
                          onClick={() => openStoreChannelProductPoolModal()}
                        >
                          选择销售门店
                        </Button>
                        <Typography.Text type="secondary">
                          已选{' '}
                          {
                            storeChannelConfigDraft.productPoolStoreConfigs.filter(
                              (item) =>
                                item.sellStatus === 'sellable' &&
                                item.sellableSkuKeys.length > 0
                            ).length
                          }{' '}
                          家可售门店
                        </Typography.Text>
                      </div>
                    </Form.Item>
                  )}

                  {storeChannelConfigDraft.shareMode === 'shared_pool' && (
                    <>
                      <Form.Item className={styles.fullWidth} label="可售 SKU">
                        <TreeSelect
                          multiple
                          treeCheckable
                          allowClear
                          placeholder="请选择可售 SKU（默认全部）"
                          treeData={storeChannelProductPoolSkuTreeData}
                          value={buildTreeSelectDisplaySkuKeys(
                            storeChannelConfigDraft.sharedPoolSellableSkuKeys || [],
                            storeChannelAvailableSkuKeys
                          )}
                          onChange={(value) => {
                            const nextKeys = normalizeTreeSelectSkuKeys(
                              value,
                              storeChannelAvailableSkuKeys
                            );
                            patchStoreChannelConfig({
                              sharedPoolSellableSkuKeys: nextKeys,
                            });
                          }}
                        />
                      </Form.Item>
                      <Form.Item className={styles.fullWidth} label="自主定价">
                        <div className={styles.storeChannelSwitchRow}>
                          <Switch
                            checked={
                              storeChannelConfigDraft.sharedPoolAllowSelfPrice === true
                            }
                            onChange={(checked) =>
                              patchStoreChannelConfig({
                                sharedPoolAllowSelfPrice: checked,
                              })
                            }
                          />
                        </div>
                        <Typography.Paragraph
                          className={styles.storeChannelTableHint}
                        >
                          开启后，引用该商品的店铺可以自主定价。
                        </Typography.Paragraph>
                      </Form.Item>
                    </>
                  )}
                </>
              )}
            </div>
          </Form>
        </Card>
      )}

      {!useStoreScopedChannelConfig && (
        <>
          <Card className={styles.sectionCard}>
            <div className={styles.sectionHeader}>
              <Typography.Title className={styles.sectionTitle} heading={6}>
                店铺渠道配置
              </Typography.Title>
            </div>

            <Form className={styles.sectionForm} {...PRODUCT_FORM_LAYOUT}>
              <div className={styles.formGrid}>
                <Form.Item className={styles.fullWidth} label="独立售价授权">
                  <Radio.Group
                    value={independentPriceEnabled ? 'allow' : 'disallow'}
                    onChange={(val) => setIndependentPriceEnabled(val === 'allow')}
                  >
                    <Radio value="allow">允许</Radio>
                    <Radio value="disallow">不允许</Radio>
                  </Radio.Group>
                </Form.Item>

                <Form.Item className={styles.fullWidth} label="独立库存授权">
                  <Radio.Group
                    value={independentStockEnabled ? 'allow' : 'disallow'}
                    onChange={(val) => setIndependentStockEnabled(val === 'allow')}
                  >
                    <Radio value="allow">允许</Radio>
                    <Radio value="disallow">不允许</Radio>
                  </Radio.Group>
                </Form.Item>

                {(independentPriceEnabled || independentStockEnabled) && (
                  <Form.Item className={styles.fullWidth}>
                    <Table
                      rowKey="key"
                      className={styles.independentPriceRuleTable}
                      columns={independentPriceRuleColumns}
                      data={independentPriceRuleTableData}
                      noDataElement="请先添加规格信息"
                      pagination={false}
                      rowClassName={(record) =>
                        record.disabled ? styles.channelSkuRowDisabled : ''
                      }
                      scroll={{ x: 860 }}
                      tableLayoutFixed
                    />
                  </Form.Item>
                )}

                <Form.Item className={styles.fullWidth} label="分享店铺">
                  <div className={styles.storeSummaryPanel}>
                    {productStoreConfigs.length ? (
                      <div className={styles.storeSummaryContent}>
                        <div className={styles.storeSummaryLine}>
                          <span className={styles.storeSummaryValue}>
                            {isOwnStoresSellableButOff
                              ? '自己的店铺可售'
                              : `分享给 ${productStoreSummary.sellable} 个店铺`}
                          </span>
                          <Button
                            className={styles.storeSummaryAction}
                            size="mini"
                            type="text"
                            onClick={openStoreConfigModal}
                          >
                            配置分享店铺
                          </Button>
                        </div>
                        <Typography.Paragraph className={styles.storeSummaryHint}>
                          可售店铺可配置"分享到店铺商品池/店铺商品共享池"；不可售店铺不参与分享。
                        </Typography.Paragraph>
                      </div>
                    ) : (
                      <div className={styles.storeSummaryEmpty}>
                        <Typography.Text className={styles.storeSummaryEmptyText}>
                          暂未配置发布店铺
                        </Typography.Text>
                        <Button type="primary" onClick={openStoreConfigModal}>
                          配置分享店铺
                        </Button>
                      </div>
                    )}
                  </div>
                </Form.Item>
              </div>
            </Form>
          </Card>

          <Modal
            title="修改店铺配置"
            visible={storeConfigModalVisible}
            autoFocus={false}
            focusLock
            style={{ width: 1280 }}
            onOk={handleStoreConfigConfirm}
            onCancel={() => setStoreConfigModalVisible(false)}
          >
            <div className={styles.storeConfigModalContent}>
              <div className={styles.storeConfigFilterRow}>
                <Select
                  className={styles.storeConfigFilter}
                  value={storeTypeFilter}
                  onChange={(value) => {
                    setStoreTypeFilter(value as StoreConfigFilterType);
                    setStoreConfigPage(1);
                  }}
                >
                  <Select.Option value="all">全部店铺</Select.Option>
                  <Select.Option value="store">店铺</Select.Option>
                  <Select.Option value="mall">商城</Select.Option>
                </Select>

                <Select
                  className={styles.storeConfigFilter}
                  value={storeDepartmentFilter}
                  onChange={(value) => {
                    setStoreDepartmentFilter(value);
                    setStoreConfigPage(1);
                  }}
                >
                  <Select.Option value="all">全部部门</Select.Option>
                  {storeDepartmentOptions.map((item) => (
                    <Select.Option key={item.value} value={item.value}>
                      {item.label}
                    </Select.Option>
                  ))}
                </Select>

                <Select
                  className={styles.storeConfigFilter}
                  value={storeStatusFilter}
                  onChange={(value) => {
                    setStoreStatusFilter(value as StoreConfigFilterStatus);
                    setStoreConfigPage(1);
                  }}
                >
                  <Select.Option value="all">全部状态</Select.Option>
                  <Select.Option value="sellable">可售</Select.Option>
                  <Select.Option value="unsellable">不可售</Select.Option>
                </Select>

                <Input
                  allowClear
                  className={styles.storeConfigSearch}
                  placeholder="搜索店铺名称"
                  value={storeKeyword}
                  onChange={(value) => {
                    setStoreKeyword(value);
                    setStoreConfigPage(1);
                  }}
                />
              </div>

              <div className={styles.storeConfigToolbar}>
                <Typography.Text className={styles.storeConfigToolbarText}>
                  已勾选 {selectedStoreKeys.length} 项
                </Typography.Text>
                <Typography.Text className={styles.storeConfigToolbarText}>
                  勾选后可批量设置"是否可售"：
                </Typography.Text>
                <Select
                  allowClear
                  className={styles.storeConfigBatchSelect}
                  placeholder="是否可售"
                  value={storeBatchSellStatus}
                  onChange={handleBatchSellStatusChange}
                >
                  <Select.Option value="sellable">可售</Select.Option>
                  <Select.Option value="unsellable">不可售</Select.Option>
                </Select>
              </div>

              <Table
                rowKey="id"
                className={styles.storeConfigTable}
                columns={storeConfigColumns}
                data={storeConfigTableData}
                noDataElement="暂无店铺数据"
                pagination={{
                  current: storeConfigPage,
                  pageSize: storeConfigPageSize,
                  total: storeConfigTableData.length,
                  sizeCanChange: true,
                  sizeOptions: STORE_CONFIG_PAGE_SIZE_OPTIONS,
                  showTotal: true,
                  showJumper: true,
                  onChange: (pageNumber, pageSize) => {
                    setStoreConfigPage(pageNumber);
                    setStoreConfigPageSize(pageSize);
                  },
                }}
                rowSelection={{
                  selectedRowKeys: selectedStoreKeys,
                  columnWidth: 48,
                  preserveSelectedRowKeys: true,
                  onChange: handleStoreSelectionChange,
                }}
                scroll={{ x: 1280, y: 440 }}
                tableLayoutFixed
              />
            </div>
          </Modal>
        </>
      )}

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
                <TreeSelect
                  multiple
                  treeCheckable
                  treeCheckedStrategy={TreeSelect.SHOW_PARENT}
                  allowClear
                  maxTagCount={{
                    count: 1,
                    render: (invisibleTagCount) => `+${invisibleTagCount}`,
                  }}
                  className={styles.storeConfigBatchTreeSelect}
                  placeholder="可售 SKU"
                  treeData={storeChannelProductPoolSkuTreeData}
                  value={buildTreeSelectDisplaySkuKeys(
                    storeChannelProductPoolBatchSellableSkuKeys.length
                      ? storeChannelProductPoolBatchSellableSkuKeys
                      : storeChannelAvailableSkuKeys,
                    storeChannelAvailableSkuKeys
                  )}
                  onChange={handleStoreChannelProductPoolBatchSellableSkuKeysChange}
                />
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
                columns={storeChannelProductPoolColumns}
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
            提交
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default ProductCreatePage;
