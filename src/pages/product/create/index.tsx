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
  Space,
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
  IconInfoCircleFill,
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
  buildStoreChannelCreateSkuPayload,
  buildStoreChannelSkuMetaItems,
  canRemoveStoreChannelRule,
  createEmptyStoreChannelRule,
  getStoreChannelRuleMatchedSkuKeys,
  removeStoreChannelRuleDrafts,
  syncStoreChannelRuleDrafts,
  syncStoreChannelSkuDraftMap,
  validateStoreChannelSkuDraftMap,
  type StoreChannelRuleDraftItem,
  type StoreChannelRuleSkuConfigDraftItem,
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
  getProductStatusByStoreConfigs,
} from '@/lib/product';
import { formatPriceNumber } from '@/lib/format';
import { getErrorMessage } from '@/lib/errors';
import type {
  ProductIndependentPriceRule,
  ProductItem as DomainProductItem,
  ProductShareTargetItem,
  ProductStoreChannelCustomFieldKey,
  ProductStoreOverrideMap,
} from '@/types/product';
import { GlobalState } from '@/store';
import { filterStoreItemsByIds } from '@/utils/organization';
import { ProductService } from '@/services/ProductService';
import CouponStoreSelector from '@/pages/marketing/center/components/store-selector';

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
type ProductCreateMode = 'create' | 'edit' | 'copy';
type ProductCreateLocationState = {
  mode?: Exclude<ProductCreateMode, 'create'>;
  sourceProduct?: ProductItem;
};

type StoreConfigFilterType = 'all' | ProductStoreType;
type StoreConfigFilterStatus = 'all' | ProductStoreSellStatus;
type StoreConfigTableItem = ProductStoreItem & ProductStoreConfigItem & StoreShareSettingItem;
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
type StoreChannelRuleTableItem = StoreChannelSkuMetaItem & {
  suggestedMinPrice?: number;
  suggestedMaxPrice?: number;
  suggestedMinStock?: number;
  suggestedMaxStock?: number;
};

const STORE_CHANNEL_CUSTOM_FIELD_OPTIONS: Array<{
  key: ProductStoreChannelCustomFieldKey;
  label: string;
}> = [
  {
    key: 'productPrice',
    label: '商品价格',
  },
  {
    key: 'productStock',
    label: '商品库存',
  },
  {
    key: 'addSpecValue',
    label: '新增规格值',
  },
];

function getStoreChannelFieldLabels(
  fieldKeys: ProductStoreChannelCustomFieldKey[] = []
) {
  return STORE_CHANNEL_CUSTOM_FIELD_OPTIONS.filter((item) =>
    fieldKeys.includes(item.key)
  ).map((item) => item.label);
}

function formatStoreChannelSourcePrice(value?: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? `¥${formatPriceNumber(value)}`
    : '--';
}

function formatStoreChannelSourceStock(value?: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${Math.floor(value)}`
    : '--';
}

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

function buildDefaultStoreShareSetting(enabledSkuKeys: string[]): StoreShareSettingItem {
  return {
    shareMode: 'product_pool',
    sellableSkuKeys: uniqueStringArray(enabledSkuKeys),
  };
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
  const [specItems, setSpecItems] = useState<SpecItem[]>([]);
  const [singleSpecFileList, setSingleSpecFileList] = useState<UploadItem[]>([]);
  const [singleSpecPrice, setSingleSpecPrice] = useState<number | undefined>();
  const [singleSpecStock, setSingleSpecStock] = useState<number | undefined>();
  const [storeChannelEnabled, setStoreChannelEnabled] = useState(true);
  const [storeChannelSkuDraftMap, setStoreChannelSkuDraftMap] =
    useState<StoreChannelSkuDraftMap>({});
  const [storeChannelRules, setStoreChannelRules] = useState<
    StoreChannelRuleDraftItem[]
  >([createEmptyStoreChannelRule()]);
  const [storeChannelFieldModalVisible, setStoreChannelFieldModalVisible] =
    useState(false);
  const [storeChannelStoreSelectorVisible, setStoreChannelStoreSelectorVisible] =
    useState(false);
  const [storeChannelSkuSelectorVisible, setStoreChannelSkuSelectorVisible] =
    useState(false);
  const [activeStoreChannelRuleId, setActiveStoreChannelRuleId] = useState('');
  const [draftStoreChannelFieldKeys, setDraftStoreChannelFieldKeys] = useState<
    ProductStoreChannelCustomFieldKey[]
  >([]);
  const [draftStoreChannelSkuKeys, setDraftStoreChannelSkuKeys] = useState<
    string[]
  >([]);
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

  useEffect(() => {
    const objectUrlMap = objectUrlMapRef.current;
    return () => {
      objectUrlMap.forEach((url) => URL.revokeObjectURL(url));
      objectUrlMap.clear();
    };
  }, []);

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
      setSpecItems([]);
      setSingleSpecFileList([]);
      setSingleSpecPrice(undefined);
      setSingleSpecStock(undefined);
      setStoreChannelEnabled(true);
      setStoreChannelSkuDraftMap({});
      setStoreChannelRules([createEmptyStoreChannelRule()]);
      setStoreChannelFieldModalVisible(false);
      setStoreChannelStoreSelectorVisible(false);
      setStoreChannelSkuSelectorVisible(false);
      setActiveStoreChannelRuleId('');
      setDraftStoreChannelFieldKeys([]);
      setDraftStoreChannelSkuKeys([]);
      setChannelSkuDraftMap({});
      setEditSkuDraftMap({});
      setIndependentPriceEnabled(true);
      setIndependentPriceRuleDraftMap({});
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
    setSpecMode('single');
    setSpecItems([]);
    setSingleSpecFileList([]);
    setSingleSpecPrice(sourceProduct.price);
    setSingleSpecStock(sourceProduct.stock);
    setStoreChannelEnabled(true);
    setStoreChannelSkuDraftMap({});
    setStoreChannelRules([createEmptyStoreChannelRule()]);
    setStoreChannelFieldModalVisible(false);
    setStoreChannelStoreSelectorVisible(false);
    setStoreChannelSkuSelectorVisible(false);
    setActiveStoreChannelRuleId('');
    setDraftStoreChannelFieldKeys([]);
    setDraftStoreChannelSkuKeys([]);
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
    setStoreShareSettingMap({});
    setDraftStoreShareSettingMap({});
  }, [pageMode, scopedStoreItems, sourceProduct, visibleStoreIds]);

  useEffect(() => {
    if (isEditMode || !isStoreScopedCreatePage) {
      return;
    }

    setStoreChannelSkuDraftMap((previous) =>
      syncStoreChannelSkuDraftMap(previous, specMode, specItems)
    );
  }, [isEditMode, isStoreScopedCreatePage, specItems, specMode]);

  useEffect(() => {
    if (isEditMode || !isStoreScopedCreatePage) {
      return;
    }

    setStoreChannelRules((previous) => {
      return syncStoreChannelRuleDrafts(
        previous,
        specMode === 'single'
          ? [STORE_CHANNEL_SINGLE_SKU_KEY]
          : specItems.map((item) => String(item.id))
      );
    });
  }, [isEditMode, isStoreScopedCreatePage, specItems, specMode]);

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
    setStoreChannelSkuDraftMap((previous) => ({
      ...previous,
      [key]: {
        ...previous[key],
        [field]:
          typeof value === 'number' && Number.isFinite(value) ? value : undefined,
      },
    }));
  }

  function patchStoreChannelRule(
    ruleId: string,
    patch: Partial<StoreChannelRuleDraftItem>
  ) {
    setStoreChannelRules((previous) =>
      previous.map((item) =>
        item.id === ruleId
          ? {
              ...item,
              ...patch,
            }
          : item
      )
    );
  }

  function updateStoreChannelRuleSkuConfig(
    ruleId: string,
    skuKey: string,
    field: keyof Omit<StoreChannelRuleSkuConfigDraftItem, 'skuKey'>,
    value?: number
  ) {
    setStoreChannelRules((previous) =>
      previous.map((rule) => {
        if (rule.id !== ruleId) {
          return rule;
        }

        const nextConfigs = [...rule.skuConfigs];
        const targetIndex = nextConfigs.findIndex((item) => item.skuKey === skuKey);
        const nextValue =
          typeof value === 'number' && Number.isFinite(value) ? value : undefined;

        if (targetIndex >= 0) {
          nextConfigs[targetIndex] = {
            ...nextConfigs[targetIndex],
            [field]: nextValue,
          };

          const currentConfig = nextConfigs[targetIndex];
          if (
            typeof currentConfig.suggestedMinPrice !== 'number' &&
            typeof currentConfig.suggestedMaxPrice !== 'number' &&
            typeof currentConfig.suggestedMinStock !== 'number' &&
            typeof currentConfig.suggestedMaxStock !== 'number'
          ) {
            nextConfigs.splice(targetIndex, 1);
          }
        } else if (typeof nextValue === 'number') {
          nextConfigs.push({
            skuKey,
            [field]: nextValue,
          });
        }

        return {
          ...rule,
          skuConfigs: nextConfigs,
        };
      })
    );
  }

  function addStoreChannelRule() {
    setStoreChannelRules((previous) => [
      ...previous,
      createEmptyStoreChannelRule(),
    ]);
  }

  function confirmRemoveStoreChannelRule(ruleId: string, ruleIndex: number) {
    if (!canRemoveStoreChannelRule(ruleIndex)) {
      return;
    }

    Modal.confirm({
      title: `确定删除规则${ruleIndex + 1}吗？`,
      content: '删除后不可恢复，请确认是否继续。',
      onOk: () => {
        setStoreChannelRules((previous) =>
          removeStoreChannelRuleDrafts(previous, ruleId)
        );
      },
    });
  }

  function openStoreChannelFieldModal(ruleId: string) {
    const matchedRule = storeChannelRules.find((item) => item.id === ruleId);
    setActiveStoreChannelRuleId(ruleId);
    setDraftStoreChannelFieldKeys(matchedRule?.fieldKeys || []);
    setStoreChannelFieldModalVisible(true);
  }

  function handleStoreChannelFieldModalConfirm() {
    patchStoreChannelRule(activeStoreChannelRuleId, {
      fieldKeys: draftStoreChannelFieldKeys,
    });
    setStoreChannelFieldModalVisible(false);
    setActiveStoreChannelRuleId('');
  }

  function openStoreChannelStoreSelector(ruleId: string) {
    setActiveStoreChannelRuleId(ruleId);
    setStoreChannelStoreSelectorVisible(true);
  }

  function handleStoreChannelStoreSelectorConfirm(storeIds: string[]) {
    patchStoreChannelRule(activeStoreChannelRuleId, {
      storeIds,
    });
    setStoreChannelStoreSelectorVisible(false);
    setActiveStoreChannelRuleId('');
  }

  function openStoreChannelSkuSelector(ruleId: string) {
    const matchedRule = storeChannelRules.find((item) => item.id === ruleId);
    setActiveStoreChannelRuleId(ruleId);
    setDraftStoreChannelSkuKeys(matchedRule?.skuKeys || []);
    setStoreChannelSkuSelectorVisible(true);
  }

  function handleStoreChannelSkuSelectorConfirm() {
    patchStoreChannelRule(activeStoreChannelRuleId, {
      skuKeys: draftStoreChannelSkuKeys,
    });
    setStoreChannelSkuSelectorVisible(false);
    setActiveStoreChannelRuleId('');
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

  function openStoreConfigModal() {
    const sourceStoreId = getSubmitProductSource().sourceStoreId;
    const enabledSkuKeys = uniqueStringArray(
      channelSkuTableData.filter((item) => !item.disabled).map((item) => item.key)
    );
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
    const enabledSkuKeys = uniqueStringArray(
      channelSkuTableData.filter((item) => !item.disabled).map((item) => item.key)
    );
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
    const enabledSkuKeySet = new Set(
      channelSkuTableData.filter((item) => !item.disabled).map((item) => item.key)
    );
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

    const enabledSkuKeys = uniqueStringArray(
      channelSkuTableData.filter((item) => !item.disabled).map((item) => item.key)
    );
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
    const enabledSkuKeys = uniqueStringArray(
      channelSkuTableData.filter((item) => !item.disabled).map((item) => item.key)
    );
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
    if (isEditMode || !currentStoreId) {
      return storeConfigs;
    }

    if (!isStoreScopedCreatePage && !channelEnabled) {
      return storeConfigs;
    }

    const nextChannelStatus =
      (
        isStoreScopedCreatePage && !storeChannelEnabled ? 'off' : 'on'
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

  function buildSubmitShareTargets(
    createdAt: string,
    nextSkus: ProductSkuItem[],
    sourceStoreId?: string
  ): ProductShareTargetItem[] {
    if (isEditMode) {
      return (
        ((sourceProduct as ProductItem & { shareTargets?: ProductShareTargetItem[] })
          ?.shareTargets || [])
          .map((item) => ({
            ...item,
          }))
      );
    }

    if (!channelEnabled || !sourceStoreId) {
      return [];
    }

    const skuKeyToIdMap = buildSkuKeyToSubmitSkuIdMap(nextSkus);
    const sourceStoreIdSet = new Set([sourceStoreId]);
    const storeConfigMap = new Map(
      productStoreConfigs.map((item) => [item.storeId, item])
    );

    return scopedStoreItems
      .filter((item) => item.type === 'store' && !sourceStoreIdSet.has(item.id))
      .flatMap((item) => {
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

        return [
          {
            storeId: item.id,
            status:
              storeShareSetting.shareMode === 'shared_pool'
                ? ('pending' as const)
                : ('referenced' as const),
            sharedAt: createdAt,
            referencedAt:
              storeShareSetting.shareMode === 'shared_pool' ? undefined : createdAt,
            sellableSkuIds,
          },
        ];
      });
  }

  function buildSubmitStoreOverrides(
    nextSkus: ProductSkuItem[],
    nextShareTargets: ProductShareTargetItem[] = []
  ): ProductStoreOverrideMap {
    if (isEditMode) {
      return (sourceProduct?.storeOverrides || {}) as ProductStoreOverrideMap;
    }

    if (!channelEnabled && !isStoreScopedCreatePage) {
      return {};
    }

    const allSkuIds = nextSkus.map((item) => item.id);

    return nextShareTargets.reduce<ProductStoreOverrideMap>((result, item) => {
      if (item.status !== 'referenced') {
        return result;
      }

      const sellableSkuIdSet = new Set(
        item.sellableSkuIds?.length ? item.sellableSkuIds : allSkuIds
      );
      const unsellableSkus = nextSkus.filter((sku) => !sellableSkuIdSet.has(sku.id));

      if (!unsellableSkus.length) {
        return result;
      }

      result[item.storeId] = {
        ...createDefaultProductStoreOverride(item.storeId),
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
    }, {});
  }

  function buildSubmitProduct(productId: string, createdAt: string): ProductItem {
    const nextName = productName.trim() || sourceProduct?.name || '未命名商品';
    const nextCatalogId = productCatalogId || sourceProduct?.productCatalogId || '';
    const nextOwnershipId =
      productOwnershipId || sourceProduct?.productOwnershipId || '';
    const nextSource = getSubmitProductSource();
    const nextCarouselImages = buildSubmitCarouselImages(carouselImages);
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
        };
      });
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
        status: nextStatus,
        specMode: sourceProduct.specMode,
        skus: nextSkus,
        price: nextPrice,
        stock: nextStock,
        createdAt,
        ...nextSource,
        carouselImages: nextCarouselImages,
        shareTargets: buildSubmitShareTargets(
          createdAt,
          nextSkus,
          nextSource.sourceStoreId
        ),
        storeOverrides: buildSubmitStoreOverrides(nextSkus),
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
        rules: storeChannelRules,
        targetStoreIds: storeChannelTargetStoreIds,
        createdAt,
      });
      const nextShareTargets = storeChannelPayload.shareTargets;
      const referencedStoreIdSet = new Set(
        nextShareTargets
          .filter((item) => item.status === 'referenced')
          .map((item) => item.storeId)
      );
      const nextStoreConfigs = nextStoreConfigsByDefault.map((item) =>
        referencedStoreIdSet.has(item.storeId)
          ? {
              ...item,
              sellStatus: 'sellable' as const,
              channelStatus: 'off' as const,
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
        storeChannelRules: storeChannelPayload.storeChannelRules,
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
      productKind: 'standard',
      productCatalogId: nextCatalogId,
      productOwnershipId: nextOwnershipId,
      productType: sourceProduct?.productType || 'virtual',
      inventoryUnit,
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
      storeChannelRules: sourceProduct?.storeChannelRules,
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

    if (isStoreScopedCreatePage) {
      try {
        const validationError = validateStoreChannelSkuDraftMap({
          specMode,
          specItems,
          storeChannelEnabled,
          sourceDraftMap: storeChannelSkuDraftMap,
          rules: storeChannelRules,
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
  const storeChannelSkuMetaItems = useMemo(
    () =>
      buildStoreChannelSkuMetaItems(
        'draft_product',
        specMode,
        specItems,
        storeChannelSkuDraftMap
      ),
    [specItems, specMode, storeChannelSkuDraftMap]
  );
  const activeStoreChannelRule = useMemo(
    () =>
      storeChannelRules.find((item) => item.id === activeStoreChannelRuleId),
    [activeStoreChannelRuleId, storeChannelRules]
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
    if (!isStoreScopedCreatePage || isEditMode) {
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
    isEditMode,
    isStoreScopedCreatePage,
    storeChannelSkuMetaItems,
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

  function getStoreChannelRuleTableData(
    rule: StoreChannelRuleDraftItem
  ): StoreChannelRuleTableItem[] {
    const matchedSkuKeySet = new Set(
      getStoreChannelRuleMatchedSkuKeys(
        rule,
        storeChannelSourceTableData.map((item) => item.key)
      )
    );
    const skuConfigMap = new Map(rule.skuConfigs.map((item) => [item.skuKey, item]));

    return storeChannelSourceTableData
      .filter((item) => matchedSkuKeySet.has(item.key))
      .map((item) => {
        const skuConfig = skuConfigMap.get(item.key);

        return {
          ...item,
          suggestedMinPrice: skuConfig?.suggestedMinPrice,
          suggestedMaxPrice: skuConfig?.suggestedMaxPrice,
          suggestedMinStock: skuConfig?.suggestedMinStock,
          suggestedMaxStock: skuConfig?.suggestedMaxStock,
        };
      });
  }

  function getStoreChannelRuleTableEmptyText(rule: StoreChannelRuleDraftItem) {
    if (!storeChannelSourceTableData.length) {
      return '请先添加规格信息';
    }

    return rule.skuScope === 'specificSkus' ? '请先选择SKU' : '暂无可配置 SKU';
  }

  function buildStoreChannelRuleTableColumns(rule: StoreChannelRuleDraftItem) {
    const columns = [
      {
        title: 'SKU 名称',
        dataIndex: 'specLabel',
        width: 220,
        render: (value: string) => (
          <Typography.Text className={styles.channelSkuSpecText} ellipsis>
            {value}
          </Typography.Text>
        ),
      },
      {
        title: '源售价',
        dataIndex: 'sourcePrice',
        width: 180,
        render: (_: number, record: StoreChannelRuleTableItem) => (
          <span className={styles.independentPriceText}>
            {formatStoreChannelSourcePrice(record.sourcePrice)}
          </span>
        ),
      },
      {
        title: '源库存',
        dataIndex: 'sourceStock',
        width: 180,
        render: (_: number, record: StoreChannelRuleTableItem) => (
          <span className={styles.independentPriceText}>
            {formatStoreChannelSourceStock(record.sourceStock)}
          </span>
        ),
      },
    ];

    if (rule.fieldKeys.includes('productPrice')) {
      columns.splice(2, 0, {
        title: '建议零售价区间',
        dataIndex: 'suggestedMinPrice',
        width: 340,
        render: (_: number, record: StoreChannelRuleTableItem) => (
          <div className={styles.storeChannelRangeInputGroup}>
            <InputNumber
              className={styles.storeChannelRangeInput}
              min={0}
              precision={2}
              prefix="¥"
              placeholder="最低价"
              value={record.suggestedMinPrice}
              onChange={(value) =>
                updateStoreChannelRuleSkuConfig(
                  rule.id,
                  record.key,
                  'suggestedMinPrice',
                  typeof value === 'number' ? value : undefined
                )
              }
            />
            <span className={styles.storeChannelRangeSeparator}>-</span>
            <InputNumber
              className={styles.storeChannelRangeInput}
              min={0}
              precision={2}
              prefix="¥"
              placeholder="最高价"
              value={record.suggestedMaxPrice}
              onChange={(value) =>
                updateStoreChannelRuleSkuConfig(
                  rule.id,
                  record.key,
                  'suggestedMaxPrice',
                  typeof value === 'number' ? value : undefined
                )
              }
            />
          </div>
        ),
      });
    }

    if (rule.fieldKeys.includes('productStock')) {
      columns.push({
        title: '建议库存区间',
        dataIndex: 'suggestedMinStock',
        width: 300,
        render: (_: number, record: StoreChannelRuleTableItem) => (
          <div className={styles.storeChannelRangeInputGroup}>
            <InputNumber
              className={styles.storeChannelRangeInput}
              min={0}
              precision={0}
              placeholder="最低库存"
              value={record.suggestedMinStock}
              onChange={(value) =>
                updateStoreChannelRuleSkuConfig(
                  rule.id,
                  record.key,
                  'suggestedMinStock',
                  typeof value === 'number' ? value : undefined
                )
              }
            />
            <span className={styles.storeChannelRangeSeparator}>-</span>
            <InputNumber
              className={styles.storeChannelRangeInput}
              min={0}
              precision={0}
              placeholder="最高库存"
              value={record.suggestedMaxStock}
              onChange={(value) =>
                updateStoreChannelRuleSkuConfig(
                  rule.id,
                  record.key,
                  'suggestedMaxStock',
                  typeof value === 'number' ? value : undefined
                )
              }
            />
          </div>
        ),
      });
    }

    return columns;
  }
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
    const enabledSkuKeys = uniqueStringArray(
      channelSkuTableData.filter((item) => !item.disabled).map((item) => item.key)
    );

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
    channelSkuTableData,
    draftStoreConfigMap,
    draftStoreShareSettingMap,
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
        const enabledSkuRows = channelSkuTableData.filter((item) => !item.disabled);
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
                  编辑模式仅允许修改已有 SKU 的售价与库存，不支持新增或删除规格。
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
                <Table
                  rowKey="id"
                  columns={editSkuColumns}
                  data={editSkuTableData}
                  pagination={false}
                  scroll={{ x: 760 }}
                  tableLayoutFixed
                />
              ) : isStoreScopedCreatePage ? (
                <div className={styles.storeScopedSpecWrap}>
                  {specMode === 'single' ? (
                    <div className={styles.specPanel}>
                      <Typography.Paragraph className={styles.specEmpty}>
                        单规格商品默认生成 1 条 SKU，请在下方维护源售价和源库存。
                      </Typography.Paragraph>
                    </div>
                  ) : (
                    <div className={styles.specPanel}>
                      <Button type="outline" onClick={handleAddSpec}>
                        添加新规格
                      </Button>

                      {specItems.length ? (
                        <div className={styles.specList}>
                          {specItems.map((item, index) => (
                            <div key={item.id} className={styles.specItem}>
                              <div className={styles.specItemHeader}>
                                <span className={styles.specItemTitle}>规格 {index + 1}</span>
                                <Button
                                  size="mini"
                                  type="text"
                                  status="danger"
                                  onClick={() => handleRemoveSpec(item.id)}
                                >
                                  删除
                                </Button>
                              </div>

                              <div className={styles.specInputs}>
                                <Input
                                  value={item.name}
                                  placeholder="请输入规格名称，例如：班级"
                                  onChange={(value) =>
                                    handleSpecChange(item.id, 'name', value)
                                  }
                                />
                                <Input
                                  value={item.value}
                                  placeholder="请输入规格值，例如：1v1"
                                  onChange={(value) =>
                                    handleSpecChange(item.id, 'value', value)
                                  }
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Typography.Paragraph className={styles.specEmpty}>
                          当前仅支持多规格，可点击"添加新规格"开始配置规格信息。
                        </Typography.Paragraph>
                      )}
                    </div>
                  )}

                  <div className={styles.storeChannelTablePanel}>
                    <Table
                      rowKey="key"
                      className={styles.storeChannelTable}
                      columns={storeChannelSourceTableColumns}
                      data={storeChannelSourceTableData}
                      noDataElement="请先添加规格信息"
                      pagination={false}
                      scroll={{ x: 760 }}
                      tableLayoutFixed
                    />
                    <Typography.Paragraph className={styles.storeChannelTableHint}>
                      请先维护每个 SKU 的源售价和源库存；开启规则后，规格明细会自动展示这里的值。
                    </Typography.Paragraph>
                  </div>
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
                <div className={styles.specPanel}>
                  <Button type="outline" onClick={handleAddSpec}>
                    添加新规格
                  </Button>

                  {specItems.length ? (
                    <div className={styles.specList}>
                      {specItems.map((item, index) => (
                        <div key={item.id} className={styles.specItem}>
                          <div className={styles.specItemHeader}>
                            <span className={styles.specItemTitle}>规格 {index + 1}</span>
                            <Button
                              size="mini"
                              type="text"
                              status="danger"
                              onClick={() => handleRemoveSpec(item.id)}
                            >
                              删除
                            </Button>
                          </div>

                          <div className={styles.specInputs}>
                            <Input
                              value={item.name}
                              placeholder="请输入规格名称，例如：颜色"
                              onChange={(value) => handleSpecChange(item.id, 'name', value)}
                            />
                            <Input
                              value={item.value}
                              placeholder="请输入规格值，例如：红色,蓝色"
                              onChange={(value) => handleSpecChange(item.id, 'value', value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Typography.Paragraph className={styles.specEmpty}>
                      当前仅支持多规格，可点击"添加新规格"开始配置规格信息。
                    </Typography.Paragraph>
                  )}
                </div>
              )}
            </Form.Item>

            {!isEditMode && specMode === 'multi' && (
              <Form.Item className={styles.fullWidth} label="商品属性配置项">
                {specItems.length ? (
                  <div className={styles.specAttributePanel}>
                    <Typography.Paragraph className={styles.attributeHint}>
                      已添加规格信息。商品属性配置区域已激活，后续可按规格联动展示具体属性项。
                    </Typography.Paragraph>
                    <div className={styles.placeholderRows}>
                      <div className={styles.placeholderRow}>商品属性配置项预留区 01</div>
                      <div className={styles.placeholderRow}>商品属性配置项预留区 02</div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.specAttributeTip}>
                    请先在规格模块中添加规格信息。添加规格信息后，商品属性才会展示。
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

      {isStoreScopedCreatePage && !isEditMode && (
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
                <Form.Item className={styles.fullWidth} label="规则配置">
                  <div className={styles.storeChannelRuleList}>
                    {storeChannelRules.map((rule, index) => {
                      const fieldLabels = getStoreChannelFieldLabels(rule.fieldKeys);
                      const ruleTableData = getStoreChannelRuleTableData(rule);
                      const matchedSkuKeys = getStoreChannelRuleMatchedSkuKeys(
                        rule,
                        storeChannelSourceTableData.map((item) => item.key)
                      );

                      return (
                        <div key={rule.id} className={styles.storeChannelRuleCard}>
                          <div className={styles.storeChannelRuleCardHeader}>
                            <Typography.Text className={styles.storeChannelRuleTitle}>
                              规则{index + 1}
                            </Typography.Text>
                            {canRemoveStoreChannelRule(index) && (
                              <Button
                                size="mini"
                                type="text"
                                status="danger"
                                onClick={() =>
                                  confirmRemoveStoreChannelRule(rule.id, index)
                                }
                              >
                                删除
                              </Button>
                            )}
                          </div>

                          <div className={styles.storeChannelRuleBody}>
                            <div className={styles.storeChannelRuleLine}>
                              <div className={styles.storeChannelRuleLabel}>
                                <span className={styles.channelRequiredMark}>*</span>
                                选择店铺：
                              </div>
                              <div className={styles.storeChannelRuleContent}>
                                <Radio.Group
                                  value={rule.storeScope}
                                  onChange={(value) =>
                                    patchStoreChannelRule(rule.id, {
                                      storeScope: value as StoreChannelRuleDraftItem['storeScope'],
                                      storeIds:
                                        value === 'specificStores' ? rule.storeIds : [],
                                    })
                                  }
                                >
                                  <Radio value="allStores">全部店铺</Radio>
                                  <Radio value="specificStores">指定店铺</Radio>
                                </Radio.Group>

                                {rule.storeScope === 'specificStores' && (
                                  <div className={styles.storeChannelSelectorRow}>
                                    <Button
                                      type="outline"
                                      onClick={() => openStoreChannelStoreSelector(rule.id)}
                                    >
                                      选择店铺
                                    </Button>
                                    <Typography.Text type="secondary">
                                      已选 {rule.storeIds.length} 家店铺
                                    </Typography.Text>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className={styles.storeChannelRuleLine}>
                              <div className={styles.storeChannelRuleLabel}>
                                自定义字段：
                              </div>
                              <div className={styles.storeChannelRuleContent}>
                                {fieldLabels.length ? (
                                  <div className={styles.storeChannelSummaryRow}>
                                    <Typography.Text>
                                      {fieldLabels.join('、')}
                                    </Typography.Text>
                                    <Button
                                      type="text"
                                      size="mini"
                                      className={styles.storeChannelInlineButton}
                                      onClick={() => openStoreChannelFieldModal(rule.id)}
                                    >
                                      重新选择
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    type="text"
                                    size="mini"
                                    className={styles.storeChannelInlineButton}
                                    onClick={() => openStoreChannelFieldModal(rule.id)}
                                  >
                                    选择自定义字段
                                  </Button>
                                )}
                              </div>
                            </div>

                            <div className={styles.storeChannelRuleLine}>
                              <div className={styles.storeChannelRuleLabel}>
                                选择SKU：
                              </div>
                              <div className={styles.storeChannelRuleContent}>
                                <Radio.Group
                                  value={rule.skuScope}
                                  onChange={(value) =>
                                    patchStoreChannelRule(rule.id, {
                                      skuScope: value as StoreChannelRuleDraftItem['skuScope'],
                                      skuKeys: value === 'specificSkus' ? rule.skuKeys : [],
                                      skuConfigs:
                                        value === 'specificSkus'
                                          ? rule.skuConfigs.filter((item) =>
                                              rule.skuKeys.includes(item.skuKey)
                                            )
                                          : rule.skuConfigs,
                                    })
                                  }
                                >
                                  <Radio value="allSkus">全部 SKU</Radio>
                                  <Radio value="specificSkus">指定 SKU</Radio>
                                </Radio.Group>

                                {rule.skuScope === 'specificSkus' && (
                                  <div className={styles.storeChannelSelectorRow}>
                                    <Button
                                      type="outline"
                                      onClick={() => openStoreChannelSkuSelector(rule.id)}
                                    >
                                      选择SKU
                                    </Button>
                                    <Typography.Text type="secondary">
                                      已选 {matchedSkuKeys.length} 个 SKU
                                    </Typography.Text>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className={styles.storeChannelRuleLine}>
                              <div className={styles.storeChannelRuleLabel}>规格明细：</div>
                              <div className={styles.storeChannelRuleContent}>
                                <div className={styles.storeChannelTablePanel}>
                                  <Table
                                    rowKey="key"
                                    className={styles.storeChannelTable}
                                    columns={buildStoreChannelRuleTableColumns(rule)}
                                    data={ruleTableData}
                                    noDataElement={getStoreChannelRuleTableEmptyText(rule)}
                                    pagination={false}
                                    scroll={{ x: 1220 }}
                                    tableLayoutFixed
                                  />
                                  <div className={styles.storeChannelRuleHint}>
                                    <IconInfoCircleFill
                                      className={styles.storeChannelRuleHintIcon}
                                    />
                                    <Typography.Text
                                      className={styles.storeChannelRuleHintText}
                                    >
                                      建议零售价区间、建议库存区间均为选填，
                                      <span className={styles.storeChannelRuleHintEmphasis}>
                                        不填写则不限
                                      </span>
                                      ；若填写区间，请确保最低值不高于最高值。
                                    </Typography.Text>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className={styles.storeChannelRuleLine}>
                              <div className={styles.storeChannelRuleLabel}>
                                生效商品池：
                              </div>
                              <div className={styles.storeChannelRuleContent}>
                                <Radio.Group
                                  value={rule.shareMode}
                                  onChange={(value) =>
                                    patchStoreChannelRule(rule.id, {
                                      shareMode: value as StoreChannelRuleDraftItem['shareMode'],
                                    })
                                  }
                                >
                                  <Radio value="product_pool">商品库</Radio>
                                  <Radio value="shared_pool">商品共享池</Radio>
                                </Radio.Group>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div className={styles.storeChannelAddRuleRow}>
                      <Button type="text" onClick={addStoreChannelRule}>
                        新增规则
                      </Button>
                    </div>
                  </div>
                </Form.Item>
              )}
            </div>
          </Form>
        </Card>
      )}

      {!isStoreScopedCreatePage && (
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
                              ? '自己的店铺可售但下架'
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

      {isStoreScopedCreatePage && !isEditMode && (
        <>
          <CouponStoreSelector
            visible={storeChannelStoreSelectorVisible}
            title="选择店铺"
            entityLabel="店铺"
            simple
            allowedStoreIds={storeChannelTargetStoreIds}
            allowedStoreTypes={['store']}
            selectedStoreIds={activeStoreChannelRule?.storeIds || []}
            onCancel={() => {
              setStoreChannelStoreSelectorVisible(false);
              setActiveStoreChannelRuleId('');
            }}
            onConfirm={handleStoreChannelStoreSelectorConfirm}
          />

          <Modal
            title="选择自定义字段"
            visible={storeChannelFieldModalVisible}
            onOk={handleStoreChannelFieldModalConfirm}
            onCancel={() => {
              setStoreChannelFieldModalVisible(false);
              setActiveStoreChannelRuleId('');
            }}
          >
            <div className={styles.storeChannelFieldModalContent}>
              <div className={styles.storeChannelFieldModalTip}>
                <IconInfoCircleFill className={styles.storeChannelFieldModalTipIcon} />
                <div>
                  勾选后，表示目标店铺可以按规则自定义以下信息；未勾选时，相关信息保持跟随源商品。
                </div>
              </div>

              <div className={styles.storeChannelFieldOptionRow}>
                <div className={styles.storeChannelRuleLabel}>自定义字段：</div>
                <Checkbox.Group
                  value={draftStoreChannelFieldKeys}
                  onChange={(value) =>
                    setDraftStoreChannelFieldKeys(
                      value as ProductStoreChannelCustomFieldKey[]
                    )
                  }
                >
                  <Space wrap size={24}>
                    {STORE_CHANNEL_CUSTOM_FIELD_OPTIONS.map((item) => (
                      <Checkbox key={item.key} value={item.key}>
                        {item.label}
                      </Checkbox>
                    ))}
                  </Space>
                </Checkbox.Group>
              </div>
            </div>
          </Modal>

          <Modal
            title="选择SKU"
            visible={storeChannelSkuSelectorVisible}
            autoFocus={false}
            focusLock
            style={{ width: 920 }}
            onOk={() => {
              if (!draftStoreChannelSkuKeys.length) {
                Message.warning('请至少选择 1 个 SKU');
                return;
              }

              handleStoreChannelSkuSelectorConfirm();
            }}
            onCancel={() => {
              setStoreChannelSkuSelectorVisible(false);
              setActiveStoreChannelRuleId('');
            }}
          >
            <Table
              rowKey="key"
              className={styles.storeChannelTable}
              columns={[
                {
                  title: 'SKU 名称',
                  dataIndex: 'specLabel',
                  width: 280,
                },
                {
                  title: '源售价',
                  dataIndex: 'sourcePrice',
                  width: 180,
                  render: (value: number | undefined) =>
                    typeof value === 'number' ? `¥${value.toFixed(2)}` : '-',
                },
                {
                  title: '源库存',
                  dataIndex: 'sourceStock',
                  width: 180,
                  render: (value: number | undefined) =>
                    typeof value === 'number' ? value : '-',
                },
              ]}
              data={storeChannelSourceTableData}
              noDataElement="请先添加规格信息"
              pagination={false}
              rowSelection={{
                selectedRowKeys: draftStoreChannelSkuKeys,
                onChange: (keys) => setDraftStoreChannelSkuKeys(keys.map(String)),
              }}
              scroll={{ y: 360 }}
              tableLayoutFixed
            />
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
