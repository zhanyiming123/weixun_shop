import { createProductSkuId } from '../data';
import type {
  ProductIndependentPriceRule,
  ProductIndependentStockRule,
  ProductShareTargetItem,
  ProductSkuItem,
  ProductStoreChannelConfigItem,
  ProductStoreChannelStatus,
  ProductStoreChannelShareMode,
  ProductStoreChannelStoreScope,
  ProductStoreSellStatus,
} from '@/types/product';

export const STORE_CHANNEL_SINGLE_SKU_KEY = 'single';

export type StoreChannelSpecItem = {
  id: number;
  name: string;
  value: string;
};

export type StoreChannelSkuDraftItem = {
  sourcePrice?: number;
  sourceStock?: number;
};

export type StoreChannelSkuDraftMap = Record<string, StoreChannelSkuDraftItem>;

export type StoreChannelProductPoolStoreConfigDraftItem = {
  storeId: string;
  sellStatus: ProductStoreSellStatus;
  channelStatus: ProductStoreChannelStatus;
  sellableSkuKeys: string[];
  allowSelfPrice: boolean;
};

export type StoreChannelConfigDraftItem = {
  shareMode: ProductStoreChannelShareMode;
  storeScope: ProductStoreChannelStoreScope;
  storeIds: string[];
  productPoolStoreConfigs: StoreChannelProductPoolStoreConfigDraftItem[];
};

export type StoreChannelSkuMetaItem = {
  key: string;
  skuId: string;
  specLabel: string;
  sourcePrice?: number;
  sourceStock?: number;
};

type BuildStoreChannelCreateSkuPayloadInput = {
  productId: string;
  specMode: 'single' | 'multi';
  specItems: StoreChannelSpecItem[];
  storeChannelEnabled: boolean;
  sourceDraftMap: StoreChannelSkuDraftMap;
  config: StoreChannelConfigDraftItem;
  targetStoreIds: string[];
  createdAt: string;
};

type ValidateStoreChannelSkuDraftMapInput = {
  specMode: 'single' | 'multi';
  specItems: StoreChannelSpecItem[];
  storeChannelEnabled: boolean;
  sourceDraftMap: StoreChannelSkuDraftMap;
  config: StoreChannelConfigDraftItem;
  targetStoreIds: string[];
};

function uniqueStringArray(values: string[] = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

function toOptionalPrice(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}

function toOptionalStock(value?: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : undefined;
}

function toRequiredPrice(value?: number) {
  const nextValue = toOptionalPrice(value);
  return typeof nextValue === 'number' ? nextValue : 0;
}

function toRequiredStock(value?: number) {
  const nextValue = toOptionalStock(value);
  return typeof nextValue === 'number' ? nextValue : 0;
}

function hasInvalidSourcePrice(value?: number) {
  return (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0
  );
}

function hasInvalidSourceStock(value?: number) {
  return (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    !Number.isInteger(value)
  );
}

export function createDefaultStoreChannelProductPoolStoreConfig(
  storeId: string
): StoreChannelProductPoolStoreConfigDraftItem {
  return {
    storeId,
    sellStatus: 'unsellable',
    channelStatus: 'off',
    sellableSkuKeys: [],
    allowSelfPrice: false,
  };
}

function normalizeProductPoolStoreConfigs(
  productPoolStoreConfigs: StoreChannelProductPoolStoreConfigDraftItem[] = [],
  allowedStoreIds: string[] = [],
  allowedSkuKeys: string[] = []
) {
  const normalizedStoreIds = uniqueStringArray(allowedStoreIds);
  const allowedStoreIdSet = new Set(normalizedStoreIds);
  const allowedSkuKeySet = new Set(uniqueStringArray(allowedSkuKeys));
  const configMap = new Map<string, StoreChannelProductPoolStoreConfigDraftItem>();

  productPoolStoreConfigs.forEach((item) => {
    const storeId =
      typeof item?.storeId === 'string' ? item.storeId.trim() : '';

    if (!storeId || configMap.has(storeId) || !allowedStoreIdSet.has(storeId)) {
      return;
    }

    configMap.set(storeId, item);
  });

  return normalizedStoreIds.map((storeId) => {
    const current =
      configMap.get(storeId) ||
      createDefaultStoreChannelProductPoolStoreConfig(storeId);
    const normalizedSellableSkuKeys = uniqueStringArray(
      current.sellableSkuKeys
    ).filter((skuKey) => allowedSkuKeySet.has(skuKey));
    const isSellable = current.sellStatus === 'sellable';

    return {
      storeId,
      sellStatus: isSellable ? ('sellable' as const) : ('unsellable' as const),
      channelStatus: isSellable ? ('on' as const) : ('off' as const),
      sellableSkuKeys: isSellable ? normalizedSellableSkuKeys : [],
      allowSelfPrice:
        isSellable &&
        normalizedSellableSkuKeys.length > 0 &&
        current.allowSelfPrice === true,
    };
  });
}

export function createEmptyStoreChannelConfig(): StoreChannelConfigDraftItem {
  return {
    shareMode: 'product_pool',
    storeScope: 'allStores',
    storeIds: [],
    productPoolStoreConfigs: [],
  };
}

export function buildStoreChannelSpecText(
  item: StoreChannelSpecItem,
  index: number
) {
  return (
    [item.name.trim(), item.value.trim()].filter(Boolean).join('：') ||
    `规格${index + 1}`
  );
}

export function getStoreChannelDraftKeys(
  specMode: 'single' | 'multi',
  specItems: StoreChannelSpecItem[]
) {
  if (specMode === 'single') {
    return [STORE_CHANNEL_SINGLE_SKU_KEY];
  }

  return specItems.map((item) => String(item.id));
}

export function buildStoreChannelSkuMetaItems(
  productId: string,
  specMode: 'single' | 'multi',
  specItems: StoreChannelSpecItem[],
  draftMap: StoreChannelSkuDraftMap
): StoreChannelSkuMetaItem[] {
  if (specMode === 'single') {
    const draft = draftMap[STORE_CHANNEL_SINGLE_SKU_KEY] || {};

    return [
      {
        key: STORE_CHANNEL_SINGLE_SKU_KEY,
        skuId: createProductSkuId(productId, 0),
        specLabel: '默认规格',
        sourcePrice: draft.sourcePrice,
        sourceStock: draft.sourceStock,
      },
    ];
  }

  return specItems.map((item, index) => {
    const draftKey = String(item.id);
    const draft = draftMap[draftKey] || {};

    return {
      key: draftKey,
      skuId: createProductSkuId(productId, index),
      specLabel: buildStoreChannelSpecText(item, index),
      sourcePrice: draft.sourcePrice,
      sourceStock: draft.sourceStock,
    };
  });
}

export function syncStoreChannelSkuDraftMap(
  previous: StoreChannelSkuDraftMap,
  specMode: 'single' | 'multi',
  specItems: StoreChannelSpecItem[]
) {
  return getStoreChannelDraftKeys(specMode, specItems).reduce<StoreChannelSkuDraftMap>(
    (result, key) => {
      result[key] = previous[key] || {};
      return result;
    },
    {}
  );
}

export function syncStoreChannelConfigDraft(
  previous: StoreChannelConfigDraftItem,
  skuKeys: string[],
  targetStoreIds: string[] = []
) {
  return {
    ...previous,
    storeIds: uniqueStringArray(previous.storeIds),
    productPoolStoreConfigs: normalizeProductPoolStoreConfigs(
      previous.productPoolStoreConfigs || [],
      targetStoreIds,
      uniqueStringArray(skuKeys)
    ),
  };
}

export function createStoreChannelConfigDraftFromProductConfig(
  config: ProductStoreChannelConfigItem | undefined,
  skuMetaItems: StoreChannelSkuMetaItem[],
  targetStoreIds: string[] = []
) {
  if (!config) {
    return createEmptyStoreChannelConfig();
  }

  const skuKeyMap = new Map(skuMetaItems.map((item) => [item.skuId, item.key]));

  return syncStoreChannelConfigDraft(
    {
      shareMode: config.shareMode,
      storeScope:
        config.shareMode === 'product_pool' ? 'specificStores' : config.storeScope,
      storeIds: uniqueStringArray(config.storeIds || []),
      productPoolStoreConfigs: (config.productPoolStoreConfigs || []).map((item) => {
        const sellableSkuKeys = uniqueStringArray(
          (item.sellableSkuIds || [])
            .map((skuId) => skuKeyMap.get(skuId) || '')
            .filter(Boolean)
        );
        const isSellable = item.sellStatus === 'sellable' && sellableSkuKeys.length > 0;

        return {
          storeId: item.storeId,
          sellStatus: isSellable ? ('sellable' as const) : ('unsellable' as const),
          channelStatus: isSellable ? ('on' as const) : ('off' as const),
          sellableSkuKeys: isSellable ? sellableSkuKeys : [],
          allowSelfPrice: isSellable && item.allowSelfPrice === true,
        };
      }),
    },
    skuMetaItems.map((item) => item.key),
    targetStoreIds
  );
}

type ExpandedStoreChannelConfigTargetItem = {
  storeId: string;
  skuIds: string[];
  allowSelfPrice?: boolean;
};

type ExpandedStoreChannelConfigResult = {
  storeChannelConfig: ProductStoreChannelConfigItem;
  targets: ExpandedStoreChannelConfigTargetItem[];
};

function expandStoreChannelConfig(
  config: StoreChannelConfigDraftItem,
  skuMetaItems: StoreChannelSkuMetaItem[],
  targetStoreIds: string[]
): ExpandedStoreChannelConfigResult {
  const availableSkuKeys = uniqueStringArray(skuMetaItems.map((item) => item.key));
  const targetStoreIdSet = new Set(targetStoreIds);
  const skuIdMap = new Map(skuMetaItems.map((item) => [item.key, item.skuId]));
  const normalizedProductPoolStoreConfigs = normalizeProductPoolStoreConfigs(
    config.productPoolStoreConfigs || [],
    targetStoreIds,
    availableSkuKeys
  );
  const sharedPoolTargetStoreIds =
    config.storeScope === 'allStores'
      ? [...targetStoreIds]
      : uniqueStringArray(config.storeIds).filter((storeId) => targetStoreIdSet.has(storeId));
  const productPoolTargets: ExpandedStoreChannelConfigTargetItem[] =
    normalizedProductPoolStoreConfigs.flatMap((item) => {
      if (item.sellStatus !== 'sellable') {
        return [];
      }

      const skuIds = uniqueStringArray(
        item.sellableSkuKeys
          .map((skuKey) => skuIdMap.get(skuKey) || '')
          .filter(Boolean)
      );

      if (!skuIds.length) {
        return [];
      }

      return [
        {
          storeId: item.storeId,
          skuIds,
          ...(item.allowSelfPrice ? { allowSelfPrice: true } : {}),
        },
      ];
    });
  const persistedProductPoolStoreConfigs = normalizedProductPoolStoreConfigs.map((item) => {
    const sellableSkuIds = uniqueStringArray(
      item.sellableSkuKeys
        .map((skuKey) => skuIdMap.get(skuKey) || '')
        .filter(Boolean)
    );
    const isSellable = item.sellStatus === 'sellable' && sellableSkuIds.length > 0;

    return {
      storeId: item.storeId,
      sellStatus: isSellable ? ('sellable' as const) : ('unsellable' as const),
      channelStatus: isSellable ? ('on' as const) : ('off' as const),
      ...(isSellable ? { sellableSkuIds } : {}),
      ...(isSellable && item.allowSelfPrice ? { allowSelfPrice: true } : {}),
    };
  });
  const productPoolStoreIds = uniqueStringArray(
    productPoolTargets.map((item) => item.storeId)
  );

  return {
    storeChannelConfig: {
      shareMode: config.shareMode,
      storeScope:
        config.shareMode === 'product_pool' ? 'specificStores' : config.storeScope,
      storeIds:
        config.shareMode === 'product_pool'
          ? productPoolStoreIds
          : config.storeScope === 'specificStores'
            ? sharedPoolTargetStoreIds
            : [],
      productPoolStoreConfigs:
        config.shareMode === 'product_pool' ? persistedProductPoolStoreConfigs : [],
    },
    targets:
      config.shareMode === 'product_pool'
        ? productPoolTargets
        : sharedPoolTargetStoreIds.map((storeId) => ({
            storeId,
            skuIds: uniqueStringArray(skuMetaItems.map((item) => item.skuId)),
          })),
  };
}

export function buildStoreChannelPayloadFromSkuMetaItems({
  skuMetaItems,
  storeChannelEnabled,
  config,
  targetStoreIds,
  createdAt,
}: {
  skuMetaItems: StoreChannelSkuMetaItem[];
  storeChannelEnabled: boolean;
  config: StoreChannelConfigDraftItem;
  targetStoreIds: string[];
  createdAt: string;
}): {
  storeChannelConfig?: ProductStoreChannelConfigItem;
  shareTargets: ProductShareTargetItem[];
} {
  if (!storeChannelEnabled) {
    return {
      storeChannelConfig: undefined,
      shareTargets: [],
    };
  }

  const expandedConfig = expandStoreChannelConfig(config, skuMetaItems, targetStoreIds);

  return {
    storeChannelConfig: expandedConfig.storeChannelConfig,
    shareTargets: expandedConfig.targets.map((item) => ({
      storeId: item.storeId,
      status:
        expandedConfig.storeChannelConfig.shareMode === 'shared_pool'
          ? 'pending'
          : 'referenced',
      sharedAt: createdAt,
      referencedAt:
        expandedConfig.storeChannelConfig.shareMode === 'shared_pool'
          ? undefined
          : createdAt,
      sellableSkuIds: item.skuIds,
      ...(item.allowSelfPrice ? { allowSelfPrice: true } : {}),
    })),
  };
}

export function validateStoreChannelSkuDraftMap({
  specMode,
  specItems,
  storeChannelEnabled,
  sourceDraftMap,
  config,
  targetStoreIds,
}: ValidateStoreChannelSkuDraftMapInput) {
  const draftKeys = getStoreChannelDraftKeys(specMode, specItems);

  if (!draftKeys.length) {
    return '请先添加规格信息';
  }

  const sourceDrafts = draftKeys.map((key) => sourceDraftMap[key] || {});

  if (sourceDrafts.some((draft) => hasInvalidSourcePrice(draft.sourcePrice))) {
    return '源售价需为非负数，且最多保留 2 位小数';
  }

  if (sourceDrafts.some((draft) => hasInvalidSourceStock(draft.sourceStock))) {
    return '源库存需为非负整数';
  }

  if (!storeChannelEnabled) {
    return undefined;
  }

  if (
    config.shareMode === 'shared_pool' &&
    config.storeScope === 'specificStores' &&
    !uniqueStringArray(config.storeIds).length
  ) {
    return '请选择店铺';
  }

  const skuMetaItems = buildStoreChannelSkuMetaItems(
    'validate_only_product',
    specMode,
    specItems,
    sourceDraftMap
  );
  const expandedConfig = expandStoreChannelConfig(config, skuMetaItems, targetStoreIds);

  if (
    expandedConfig.storeChannelConfig.shareMode === 'product_pool' &&
    !expandedConfig.targets.length
  ) {
    return '请至少选择 1 家可售门店';
  }

  return undefined;
}

export function buildStoreChannelCreateSkuPayload({
  productId,
  specMode,
  specItems,
  storeChannelEnabled,
  sourceDraftMap,
  config,
  targetStoreIds,
  createdAt,
}: BuildStoreChannelCreateSkuPayloadInput): {
  skus: ProductSkuItem[];
  price: number;
  stock: number;
  independentPriceRule: ProductIndependentPriceRule;
  independentStockRule: ProductIndependentStockRule;
  storeChannelConfig?: ProductStoreChannelConfigItem;
  shareTargets: ProductShareTargetItem[];
} {
  const skuMetaItems = buildStoreChannelSkuMetaItems(
    productId,
    specMode,
    specItems,
    sourceDraftMap
  );
  const skus = skuMetaItems.map((item) => ({
    id: item.skuId,
    specText: specMode === 'single' ? '' : item.specLabel,
    price: toRequiredPrice(item.sourcePrice),
    stock: toRequiredStock(item.sourceStock),
    status: 'on' as const,
  }));
  const skuPrices = skus.map((item) => item.price);
  const skuStocks = skus.map((item) => item.stock);

  if (!storeChannelEnabled) {
    return {
      skus,
      price: skuPrices.length ? Math.min(...skuPrices) : 0,
      stock: skuStocks.reduce((total, value) => total + value, 0),
      independentPriceRule: {
        enabled: false,
        skuRules: [],
      },
      independentStockRule: {
        enabled: false,
        skuRules: [],
      },
      storeChannelConfig: undefined,
      shareTargets: [],
    };
  }

  const storeChannelPayload = buildStoreChannelPayloadFromSkuMetaItems({
    skuMetaItems,
    storeChannelEnabled,
    config,
    targetStoreIds,
    createdAt,
  });

  return {
    skus,
    price: skuPrices.length ? Math.min(...skuPrices) : 0,
    stock: skuStocks.reduce((total, value) => total + value, 0),
    independentPriceRule: {
      enabled: false,
      skuRules: [],
    },
    independentStockRule: {
      enabled: false,
      skuRules: [],
    },
    storeChannelConfig: storeChannelPayload.storeChannelConfig,
    shareTargets: storeChannelPayload.shareTargets,
  };
}
