import React, { useEffect, useMemo, useState } from 'react';
import qs from 'query-string';
import {
  Button,
  Card,
  Cascader,
  Form,
  Input,
  InputNumber,
  Message,
  Modal,
  Select,
  Table,
  Tag,
  TreeSelect,
  Typography,
} from '@arco-design/web-react';
import { useHistory, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import styles from '@/pages/product/create/index.module.less';
import {
  buildProductCatalogCascaderOptions,
  getProductCatalogIdFromPath,
  getProductCatalogPathById,
  readProductCatalogItems,
} from '@/pages/product/catalog/data';
import {
  buildProductOwnershipCascaderOptions,
  getProductOwnershipIdFromPath,
  getProductOwnershipPathById,
  readProductOwnershipItems,
} from '@/pages/product/category/data';
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
} from '@/pages/product/store-config/data';
import {
  createDefaultProductStoreOverride,
  getProductStatusByStoreConfigs,
} from '@/lib/product';
import { createProductId, createProductSkuId, formatProductCreatedAt } from '@/pages/product/list/data';
import { filterStoreItemsByIds } from '@/utils/organization';
import { ProductService } from '@/services/ProductService';
import type {
  ProductItem,
  ProductListItem,
  ProductSkuItem,
  ProductShareTargetItem,
  ProductStoreOverrideMap,
} from '@/types/product';
import { GlobalState } from '@/store';
import BundleProductTable, { BundleProductItem } from '@/pages/product/components/bundle-product-table';

type ProductCreateMode = 'create' | 'edit' | 'copy';
type ProductBundleCreateLocationState = {
  mode?: Exclude<ProductCreateMode, 'create'>;
  sourceProduct?: ProductItem;
};
type StoreConfigFilterType = 'all' | ProductStoreType;
type StoreConfigFilterStatus = 'all' | ProductStoreSellStatus;
type ProductChannelShareMode = 'product_pool' | 'shared_pool';
type StoreShareSettingItem = {
  shareMode: ProductChannelShareMode;
  sellableSkuKeys: string[];
};
type StoreConfigTableItem = ProductStoreItem & ProductStoreConfigItem & StoreShareSettingItem;

const PRODUCT_FORM_LAYOUT = {
  layout: 'horizontal' as const,
  labelCol: { flex: '120px' },
  wrapperCol: { flex: '1' },
  requiredSymbol: true,
};
const STORE_CONFIG_PAGE_SIZE_OPTIONS = [20, 50];
const EMPTY_STORE_IDS: string[] = [];
const BUNDLE_SINGLE_SKU_KEY = 'bundle_single';
const SKU_TREE_ROOT_KEY = '__all_skus__';
const PRODUCT_CHANNEL_SHARE_MODE_LABEL_MAP: Record<ProductChannelShareMode, string> = {
  product_pool: '店铺商品池',
  shared_pool: '店铺商品共享池',
};

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

function buildCopyProductName(name: string) {
  const suffix = '（副本）';
  if (`${name}${suffix}`.length <= 15) {
    return `${name}${suffix}`;
  }

  return `${name.slice(0, Math.max(1, 15 - suffix.length))}${suffix}`;
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

function ProductBundleCreatePage() {
  const history = useHistory();
  const location = useLocation<ProductBundleCreateLocationState>();
  const productService = useMemo(() => new ProductService(), []);
  const currentOrganization = useSelector(
    (state: GlobalState) => state.currentOrganization
  );
  const isHeadquarter = currentOrganization?.scope === 'headquarter';
  const catalogItems = useMemo(() => readProductCatalogItems(), []);
  const ownershipItems = useMemo(() => readProductOwnershipItems(), []);
  const storeItems = useMemo(
    () => readProductStoreItems().filter((item) => item.type === 'store'),
    []
  );
  const catalogOptions = useMemo(
    () => buildProductCatalogCascaderOptions(catalogItems),
    [catalogItems]
  );
  const ownershipOptions = useMemo(
    () => buildProductOwnershipCascaderOptions(ownershipItems),
    [ownershipItems]
  );
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
      (item) => !scopedItems.some((candidate) => candidate.id === item.id)
    );

    return [...scopedItems, ...missingItems];
  }, [isHeadquarter, storeItems, visibleStoreIds]);
  const storeDepartmentOptions = useMemo(
    () => buildProductStoreDepartmentOptions(scopedStoreItems),
    [scopedStoreItems]
  );
  const locationQuery = useMemo(() => qs.parse(location.search), [location.search]);
  const pageMode = useMemo<ProductCreateMode>(() => {
    const rawMode = location.state?.mode || locationQuery.mode;
    return rawMode === 'edit' || rawMode === 'copy' ? rawMode : 'create';
  }, [location.state, locationQuery.mode]);
  const isEditMode = pageMode === 'edit';
  const sourceProductId = useMemo(() => {
    if (typeof locationQuery.sourceId === 'string') {
      return locationQuery.sourceId;
    }

    return location.state?.sourceProduct?.id || '';
  }, [location.state, locationQuery.sourceId]);

  const [sourceProduct, setSourceProduct] = useState<ProductItem | null>(null);
  const [loadingSource, setLoadingSource] = useState(false);
  const [productCatalogId, setProductCatalogId] = useState<string>();
  const [productOwnershipId, setProductOwnershipId] = useState<string>();
  const [productName, setProductName] = useState('');
  const [bundleComponents, setBundleComponents] = useState<BundleProductItem[]>([]);
  const [bundlePrice, setBundlePrice] = useState<number | undefined>();
  const [inventoryUnit, setInventoryUnit] = useState('套');
  const [standardProductOptions, setStandardProductOptions] = useState<ProductListItem[]>([]);
  const [productStoreConfigs, setProductStoreConfigs] = useState<
    ProductStoreConfigItem[]
  >([]);
  const [hiddenStoreConfigs, setHiddenStoreConfigs] = useState<
    ProductStoreConfigItem[]
  >([]);
  const [storeShareSettingMap, setStoreShareSettingMap] = useState<
    Record<string, StoreShareSettingItem>
  >({});
  const [draftStoreConfigMap, setDraftStoreConfigMap] = useState<
    Record<string, ProductStoreConfigItem>
  >({});
  const [draftStoreShareSettingMap, setDraftStoreShareSettingMap] = useState<
    Record<string, StoreShareSettingItem>
  >({});
  const [storeConfigModalVisible, setStoreConfigModalVisible] = useState(false);
  const [selectedStoreKeys, setSelectedStoreKeys] = useState<(string | number)[]>(
    []
  );
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
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!sourceProductId) {
      setSourceProduct(null);
      return;
    }

    let mounted = true;
    setLoadingSource(true);
    productService
      .getProductById(sourceProductId)
      .then((result) => {
        if (!mounted) {
          return;
        }

        setSourceProduct(result);
      })
      .catch(() => {
        if (!mounted) {
          return;
        }

        setSourceProduct(null);
      })
      .finally(() => {
        if (mounted) {
          setLoadingSource(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [productService, sourceProductId]);

  useEffect(() => {
    if (!currentStoreId) {
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
      organizationScope: 'store',
      visibleStoreIds: [currentStoreId],
      page: 1,
      pageSize: 500,
    });

    setStandardProductOptions(
      queryResult.items.filter(
        (item) =>
          item.productKind === 'standard' &&
          item.storeView.isSelfBuilt &&
          item.sourceStoreId === currentStoreId
      )
    );
  }, [currentStoreId, productService]);

  useEffect(() => {
    const visibleStoreIdSet = new Set(scopedStoreItems.map((item) => item.id));

    if (!sourceProduct) {
      setProductCatalogId(undefined);
      setProductOwnershipId(undefined);
      setProductName('');
      setBundleComponents([]);
      setBundlePrice(undefined);
      setInventoryUnit('套');
      setProductStoreConfigs(
        buildDefaultCreateStoreConfigs(scopedStoreItems, visibleStoreIds)
      );
      setHiddenStoreConfigs([]);
      setStoreShareSettingMap({});
      setDraftStoreConfigMap({});
      setDraftStoreShareSettingMap({});
      return;
    }

    if (sourceProduct.productKind !== 'bundle') {
      return;
    }

    setProductCatalogId(sourceProduct.productCatalogId);
    setProductOwnershipId(sourceProduct.productOwnershipId);
    setProductName(
      pageMode === 'copy' ? buildCopyProductName(sourceProduct.name) : sourceProduct.name
    );
    setBundleComponents(
      (sourceProduct.bundleComponents || []).map((item) => ({
        productId: item.productId,
        skuId: item.skuId,
        discountPrice: undefined,
      }))
    );
    setBundlePrice(sourceProduct.price);
    setInventoryUnit(sourceProduct.inventoryUnit || '套');
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
    setDraftStoreConfigMap({});
    setDraftStoreShareSettingMap({});
  }, [pageMode, scopedStoreItems, sourceProduct, visibleStoreIds]);

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
    const enabledSkuKeys = [BUNDLE_SINGLE_SKU_KEY];
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
    const enabledSkuKeys = [BUNDLE_SINGLE_SKU_KEY];
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
    const enabledSkuKeySet = new Set([BUNDLE_SINGLE_SKU_KEY]);
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
      const current = previous[storeId] || buildDefaultStoreShareSetting([BUNDLE_SINGLE_SKU_KEY]);
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

    const enabledSkuKeys = [BUNDLE_SINGLE_SKU_KEY];
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
    const enabledSkuKeys = [BUNDLE_SINGLE_SKU_KEY];
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

  function applySourceStoreConfig(
    storeConfigs: ProductStoreConfigItem[],
    sourceStoreId?: string
  ) {
    if (!sourceStoreId) {
      return storeConfigs;
    }

    let hasSourceStoreConfig = false;
    const nextStoreConfigs = storeConfigs.map((item) => {
      if (item.storeId !== sourceStoreId) {
        return item;
      }

      hasSourceStoreConfig = true;
      return {
        ...item,
        sellStatus: 'sellable' as const,
        channelStatus: 'on' as const,
      };
    });

    if (hasSourceStoreConfig) {
      return nextStoreConfigs;
    }

    return [
      ...nextStoreConfigs,
      {
        ...createDefaultProductStoreConfig(sourceStoreId),
        sellStatus: 'sellable' as const,
        channelStatus: 'on' as const,
      },
    ];
  }

  function buildSubmitShareTargets(
    nextCreatedAt: string,
    nextSkuId: string,
    sourceStoreId?: string
  ): ProductShareTargetItem[] {
    if (isEditMode && sourceProduct) {
      return (sourceProduct.shareTargets || []).map((item) => ({
        ...item,
      }));
    }

    if (!sourceStoreId) {
      return [];
    }

    const sourceStoreIdSet = new Set([sourceStoreId]);
    const storeConfigMap = new Map(
      productStoreConfigs.map((item) => [item.storeId, item])
    );

    return scopedStoreItems
      .filter((item) => !sourceStoreIdSet.has(item.id))
      .flatMap((item) => {
        const storeConfig =
          storeConfigMap.get(item.id) || createDefaultProductStoreConfig(item.id);
        const storeShareSetting =
          storeShareSettingMap[item.id] ||
          buildDefaultStoreShareSetting([BUNDLE_SINGLE_SKU_KEY]);

        if (storeConfig.sellStatus !== 'sellable') {
          return [];
        }

        const sellableSkuKeys = uniqueStringArray(
          storeShareSetting.sellableSkuKeys.filter(
            (skuKey) => skuKey === BUNDLE_SINGLE_SKU_KEY
          )
        );
        if (!sellableSkuKeys.length) {
          return [];
        }

        return [
          {
            storeId: item.id,
            status:
              storeShareSetting.shareMode === 'shared_pool'
                ? ('pending' as const)
                : ('referenced' as const),
            sharedAt: nextCreatedAt,
            referencedAt:
              storeShareSetting.shareMode === 'shared_pool'
                ? undefined
                : nextCreatedAt,
            sellableSkuIds: [nextSkuId],
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

    return nextShareTargets.reduce<ProductStoreOverrideMap>((result, item) => {
      if (item.status !== 'referenced') {
        return result;
      }

      const sellableSkuIdSet = new Set(
        item.sellableSkuIds?.length ? item.sellableSkuIds : nextSkus.map((sku) => sku.id)
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

  async function handleSubmit() {
    const nextSource = getSubmitProductSource();
    if (nextSource.sourceType !== 'store' || !nextSource.sourceStoreId) {
      Message.warning('请先切换到具体店铺后再创建套餐');
      return;
    }

    if (!productCatalogId) {
      Message.warning('请选择商品类目');
      return;
    }

    if (!productOwnershipId) {
      Message.warning('请选择商品分类');
      return;
    }

    if (!productName.trim()) {
      Message.warning('请输入套餐名称');
      return;
    }

    if (bundleComponents.length === 0) {
      Message.warning('请至少添加一个商品组成套餐');
      return;
    }

    if (typeof bundlePrice !== 'number' || !Number.isFinite(bundlePrice) || bundlePrice < 0) {
      Message.warning('请填写有效的套餐售价');
      return;
    }

    const nextProductId =
      pageMode === 'edit' && sourceProduct ? sourceProduct.id : createProductId();
    const nextCreatedAt =
      pageMode === 'edit' && sourceProduct ? sourceProduct.createdAt : formatProductCreatedAt();
    const sourceBundleSkuId =
      pageMode === 'edit' && sourceProduct?.skus?.[0]?.id
        ? sourceProduct.skus[0].id
        : createProductSkuId(nextProductId, 0);
    const componentLabelMap = new Map(
      standardProductOptions.flatMap((item) =>
        item.skus.map((sku, index) => [
          `${item.id}:${sku.id}`,
          `${item.name}-${sku.specText || (index === 0 ? '默认规格' : `规格${index + 1}`)}`,
        ])
      )
    );
    const nextSpecText = bundleComponents
      .map((item) => componentLabelMap.get(`${item.productId}:${item.skuId}`) || item.skuId)
      .join(' + ');
    const nextBundleComponents = bundleComponents.map(({ productId, skuId }) => ({
      productId,
      skuId,
    }));
    const baseStoreConfigs = [
      ...hiddenStoreConfigs.map((item) => ({ ...item })),
      ...productStoreConfigs.map((item) => ({ ...item })),
    ];
    const nextShareTargets = buildSubmitShareTargets(
      nextCreatedAt,
      sourceBundleSkuId,
      nextSource.sourceStoreId
    );
    let nextStoreConfigs = applySourceStoreConfig(
      baseStoreConfigs,
      nextSource.sourceStoreId
    );
    if (!isEditMode) {
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

    const nextProduct: ProductItem = {
      ...(sourceProduct || {}),
      id: nextProductId,
      name: productName.trim(),
      productKind: 'bundle',
      productCatalogId,
      productOwnershipId,
      productType: 'virtual',
      inventoryUnit: inventoryUnit || '套',
      specMode: 'single',
      skus: [
        {
          id: sourceBundleSkuId,
          specText: nextSpecText,
          price: bundlePrice,
          stock: 0,
          status: getProductStatusByStoreConfigs(nextStoreConfigs),
        },
      ],
      status: getProductStatusByStoreConfigs(nextStoreConfigs),
      price: bundlePrice,
      stock: 0,
      createdAt: nextCreatedAt,
      sourceType: 'store',
      sourceStoreId: nextSource.sourceStoreId,
      storeConfigs: nextStoreConfigs,
      bundleComponents: nextBundleComponents,
      shareTargets: nextShareTargets,
      carouselImages: sourceProduct?.carouselImages || [],
      storeOverrides: buildSubmitStoreOverrides(
        [
          {
            id: sourceBundleSkuId,
            specText: nextSpecText,
            price: bundlePrice,
            stock: 0,
            status: getProductStatusByStoreConfigs(nextStoreConfigs),
          },
        ],
        nextShareTargets
      ),
      independentPriceRule: {
        enabled: false,
        skuRules: [],
      },
    };

    try {
      setSubmitting(true);
      await productService.saveProduct(nextProduct);
      Message.success(pageMode === 'edit' ? '保存成功' : '提交成功');
      history.push('/product/bundle');
    } catch (error) {
      Message.error((error as Error)?.message || '保存失败');
    } finally {
      setSubmitting(false);
    }
  }

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
  const productStoreSummary = useMemo(
    () => getProductStoreSummary(productStoreConfigs),
    [productStoreConfigs]
  );
  const storeConfigTableData = useMemo<StoreConfigTableItem[]>(() => {
    const keyword = storeKeyword.trim().toLowerCase();
    const enabledSkuKeys = [BUNDLE_SINGLE_SKU_KEY];

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
    scopedStoreItems,
    sourceStoreIdForSubmit,
    storeDepartmentFilter,
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
          <Tag className={styles.storeTag} color="arcoblue">
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
        const treeData = [
          {
            key: SKU_TREE_ROOT_KEY,
            title: '全部 SKU',
            children: [
              {
                key: BUNDLE_SINGLE_SKU_KEY,
                title: '套餐 SKU',
              },
            ],
          },
        ];
        const selectedKeys = record.sellableSkuKeys.filter(
          (skuKey) => skuKey === BUNDLE_SINGLE_SKU_KEY
        );

        return (
          <TreeSelect
            multiple
            treeCheckable
            allowClear
            className={styles.storeSkuTreeSelect}
            disabled={
              record.sellStatus !== 'sellable' ||
              (Boolean(sourceStoreIdForSubmit) && record.id === sourceStoreIdForSubmit)
            }
            placeholder="请选择可售 SKU"
            treeData={treeData}
            value={selectedKeys}
            onChange={(value) => {
              const nextKeys = normalizeStringArray(value).filter(
                (skuKey) =>
                  skuKey !== SKU_TREE_ROOT_KEY &&
                  skuKey === BUNDLE_SINGLE_SKU_KEY
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

  return (
    <div className={styles.page}>
      <div className={styles.pageActions}>
        <Button onClick={() => history.push('/product/bundle')}>返回套餐列表</Button>
      </div>

      <Card className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <Typography.Title className={styles.sectionTitle} heading={6}>
            基础信息
          </Typography.Title>
        </div>

        <Form className={styles.sectionForm} {...PRODUCT_FORM_LAYOUT}>
          <div className={styles.formGrid}>
            <Form.Item className={styles.fullWidth} label="套餐名称" required>
              <Input
                className={styles.singleFieldControl}
                maxLength={15}
                placeholder="请输入套餐名称"
                showWordLimit
                value={productName}
                onChange={setProductName}
              />
            </Form.Item>

            <Form.Item className={styles.fullWidth} label="商品类目" required>
              <Cascader
                allowClear
                className={styles.singleFieldControl}
                options={catalogOptions}
                placeholder="请选择商品类目"
                value={
                  productCatalogId ? getProductCatalogPathById(productCatalogId, catalogItems) : undefined
                }
                onChange={(value) => {
                  const nextPath = normalizePath(value);
                  setProductCatalogId(getProductCatalogIdFromPath(nextPath, catalogItems));
                }}
              />
            </Form.Item>

            <Form.Item className={styles.fullWidth} label="商品分类" required>
              <Cascader
                allowClear
                className={styles.singleFieldControl}
                options={ownershipOptions}
                placeholder="请选择商品分类"
                value={
                  productOwnershipId
                    ? getProductOwnershipPathById(productOwnershipId, ownershipItems)
                    : undefined
                }
                onChange={(value) => {
                  const nextPath = normalizePath(value);
                  setProductOwnershipId(getProductOwnershipIdFromPath(nextPath, ownershipItems));
                }}
              />
            </Form.Item>

            <Form.Item className={styles.fullWidth} label="库存单位">
              <Input
                className={styles.singleFieldControl}
                value={inventoryUnit}
                onChange={setInventoryUnit}
                placeholder="库存单位，默认套"
              />
            </Form.Item>
          </div>
        </Form>
      </Card>

      <Card className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <Typography.Title className={styles.sectionTitle} heading={6}>
            套餐配置
          </Typography.Title>
        </div>

        <Form className={styles.sectionForm} {...PRODUCT_FORM_LAYOUT}>
          <div className={styles.formGrid}>
            <Form.Item className={styles.fullWidth} label="选择商品" required>
              <BundleProductTable
                products={standardProductOptions}
                value={bundleComponents}
                onChange={setBundleComponents}
              />
            </Form.Item>

          </div>
        </Form>
      </Card>

      <Card className={styles.sectionCard}>
        <div className={styles.sectionHeader}>
          <Typography.Title className={styles.sectionTitle} heading={6}>
            店铺渠道配置
          </Typography.Title>
        </div>

        <Form className={styles.sectionForm} {...PRODUCT_FORM_LAYOUT}>
          <div className={styles.formGrid}>
            <Form.Item className={styles.fullWidth} label="店铺配置">
              <div className={styles.storeSummaryPanel}>
                {productStoreConfigs.length ? (
                  <div className={styles.storeSummaryContent}>
                    <div className={styles.storeSummaryLine}>
                      <span className={styles.storeSummaryLabel}>店铺配置：</span>
                      <span className={styles.storeSummaryValue}>
                        {`可售店铺：${productStoreSummary.sellable}，不可售店铺：${productStoreSummary.unsellable}`}
                      </span>
                      <Button
                        className={styles.storeSummaryAction}
                        size="mini"
                        type="text"
                        onClick={openStoreConfigModal}
                      >
                        修改
                      </Button>
                    </div>
                    <Typography.Paragraph className={styles.storeSummaryHint}>
                      可售店铺可配置“分享到店铺商品池/店铺商品共享池”；不可售店铺不参与分享。
                    </Typography.Paragraph>
                  </div>
                ) : (
                  <div className={styles.storeSummaryEmpty}>
                    <Typography.Text className={styles.storeSummaryEmptyText}>
                      暂未配置发布店铺
                    </Typography.Text>
                    <Button type="primary" onClick={openStoreConfigModal}>
                      新增
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
        style={{ width: 1320 }}
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
              勾选后可批量设置“是否可售”：
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
            scroll={{ x: 1320, y: 440 }}
            tableLayoutFixed
          />
        </div>
      </Modal>

      <Card className={styles.actionCard}>
        <div className={styles.actionRow}>
          <Button onClick={() => history.push('/product/bundle')}>取消</Button>
          <Button type="primary" loading={submitting || loadingSource} onClick={handleSubmit}>
            {pageMode === 'edit' ? '保存' : '提交'}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default ProductBundleCreatePage;
