import { createProductSkuId } from '../list/data';
import type {
  ProductIndependentPriceRule,
  ProductIndependentStockRule,
  ProductShareTargetItem,
  ProductSkuItem,
  ProductStoreChannelCustomFieldKey,
  ProductStoreChannelRuleItem,
  ProductStoreChannelShareMode,
  ProductStoreChannelSkuScope,
  ProductStoreChannelStoreScope,
} from '@/types/product';

export const STORE_CHANNEL_SINGLE_SKU_KEY = 'single';

const STORE_CHANNEL_FIELD_KEY_SET = new Set<ProductStoreChannelCustomFieldKey>([
  'productPrice',
  'productStock',
  'addSpecValue',
]);

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

export type StoreChannelRuleSkuConfigDraftItem = {
  skuKey: string;
  suggestedMinPrice?: number;
  suggestedMaxPrice?: number;
  suggestedMinStock?: number;
  suggestedMaxStock?: number;
};

export type StoreChannelRuleDraftItem = {
  id: string;
  fieldKeys: ProductStoreChannelCustomFieldKey[];
  storeScope: ProductStoreChannelStoreScope;
  storeIds: string[];
  skuScope: ProductStoreChannelSkuScope;
  skuKeys: string[];
  shareMode: ProductStoreChannelShareMode;
  skuConfigs: StoreChannelRuleSkuConfigDraftItem[];
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
  rules: StoreChannelRuleDraftItem[];
  targetStoreIds: string[];
  createdAt: string;
};

type ValidateStoreChannelSkuDraftMapInput = {
  specMode: 'single' | 'multi';
  specItems: StoreChannelSpecItem[];
  storeChannelEnabled: boolean;
  sourceDraftMap: StoreChannelSkuDraftMap;
  rules: StoreChannelRuleDraftItem[];
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

function hasInvalidPriceRange(
  item: Pick<
    StoreChannelRuleSkuConfigDraftItem,
    'suggestedMinPrice' | 'suggestedMaxPrice'
  >
) {
  if (
    (typeof item.suggestedMinPrice === 'number' &&
      Number.isFinite(item.suggestedMinPrice) &&
      item.suggestedMinPrice < 0) ||
    (typeof item.suggestedMaxPrice === 'number' &&
      Number.isFinite(item.suggestedMaxPrice) &&
      item.suggestedMaxPrice < 0)
  ) {
    return true;
  }

  const minPrice = toOptionalPrice(item.suggestedMinPrice);
  const maxPrice = toOptionalPrice(item.suggestedMaxPrice);

  return (
    typeof minPrice === 'number' &&
    typeof maxPrice === 'number' &&
    minPrice > maxPrice
  );
}

function hasInvalidStockRange(
  item: Pick<
    StoreChannelRuleSkuConfigDraftItem,
    'suggestedMinStock' | 'suggestedMaxStock'
  >
) {
  if (
    (typeof item.suggestedMinStock === 'number' &&
      Number.isFinite(item.suggestedMinStock) &&
      item.suggestedMinStock < 0) ||
    (typeof item.suggestedMaxStock === 'number' &&
      Number.isFinite(item.suggestedMaxStock) &&
      item.suggestedMaxStock < 0)
  ) {
    return true;
  }

  const minStock = toOptionalStock(item.suggestedMinStock);
  const maxStock = toOptionalStock(item.suggestedMaxStock);

  return (
    typeof minStock === 'number' &&
    typeof maxStock === 'number' &&
    minStock > maxStock
  );
}

function normalizeRuleFieldKeys(fieldKeys: ProductStoreChannelCustomFieldKey[] = []) {
  return Array.from(
    new Set(
      fieldKeys.filter((key) => STORE_CHANNEL_FIELD_KEY_SET.has(key))
    )
  );
}

function hasPriceSuggestionField(
  fieldKeys: ProductStoreChannelCustomFieldKey[] = []
) {
  return normalizeRuleFieldKeys(fieldKeys).includes('productPrice');
}

function hasStockSuggestionField(
  fieldKeys: ProductStoreChannelCustomFieldKey[] = []
) {
  return normalizeRuleFieldKeys(fieldKeys).includes('productStock');
}

function normalizeRuleSkuConfigs(
  skuConfigs: StoreChannelRuleSkuConfigDraftItem[] = [],
  allowedSkuKeySet: Set<string>,
  fieldKeys: ProductStoreChannelCustomFieldKey[] = []
) {
  const seenSkuKeys = new Set<string>();
  const allowPriceSuggestion = hasPriceSuggestionField(fieldKeys);
  const allowStockSuggestion = hasStockSuggestionField(fieldKeys);

  return skuConfigs.flatMap((item): StoreChannelRuleSkuConfigDraftItem[] => {
    const skuKey =
      typeof item?.skuKey === 'string' ? item.skuKey.trim() : '';
    if (!skuKey || seenSkuKeys.has(skuKey) || !allowedSkuKeySet.has(skuKey)) {
      return [];
    }

    const suggestedMinPrice = allowPriceSuggestion
      ? toOptionalPrice(item.suggestedMinPrice)
      : undefined;
    const suggestedMaxPrice = allowPriceSuggestion
      ? toOptionalPrice(item.suggestedMaxPrice)
      : undefined;
    const suggestedMinStock = allowStockSuggestion
      ? toOptionalStock(item.suggestedMinStock)
      : undefined;
    const suggestedMaxStock = allowStockSuggestion
      ? toOptionalStock(item.suggestedMaxStock)
      : undefined;

    if (
      (typeof suggestedMinPrice === 'number' &&
        typeof suggestedMaxPrice === 'number' &&
        suggestedMinPrice > suggestedMaxPrice) ||
      (typeof suggestedMinStock === 'number' &&
        typeof suggestedMaxStock === 'number' &&
        suggestedMinStock > suggestedMaxStock)
    ) {
      return [];
    }

    seenSkuKeys.add(skuKey);

    return [
      {
        skuKey,
        suggestedMinPrice,
        suggestedMaxPrice,
        suggestedMinStock,
        suggestedMaxStock,
      },
    ];
  });
}

function createStoreChannelRuleSequence() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyStoreChannelRule(): StoreChannelRuleDraftItem {
  return {
    id: `store_channel_rule_${createStoreChannelRuleSequence()}`,
    fieldKeys: [],
    storeScope: 'allStores',
    storeIds: [],
    skuScope: 'allSkus',
    skuKeys: [],
    shareMode: 'product_pool',
    skuConfigs: [],
  };
}

export function removeStoreChannelRuleDrafts(
  previous: StoreChannelRuleDraftItem[],
  ruleId: string
) {
  return previous.filter((item) => item.id !== ruleId);
}

export function canRemoveStoreChannelRule(ruleIndex: number) {
  return ruleIndex > 0;
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

export function getStoreChannelRuleMatchedSkuKeys(
  rule: StoreChannelRuleDraftItem,
  skuKeys: string[]
) {
  const normalizedSkuKeys = uniqueStringArray(skuKeys);

  if (rule.skuScope === 'allSkus') {
    return normalizedSkuKeys;
  }

  const allowedSkuKeySet = new Set(normalizedSkuKeys);
  return uniqueStringArray(rule.skuKeys).filter((skuKey) => allowedSkuKeySet.has(skuKey));
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

export function syncStoreChannelRuleDrafts(
  previous: StoreChannelRuleDraftItem[],
  skuKeys: string[]
) {
  const allowedSkuKeySet = new Set(uniqueStringArray(skuKeys));

  return previous.map((rule) => {
    const normalizedSkuKeys = uniqueStringArray(rule.skuKeys).filter((skuKey) =>
      allowedSkuKeySet.has(skuKey)
    );
    const matchedSkuKeys =
      rule.skuScope === 'allSkus'
        ? Array.from(allowedSkuKeySet)
        : normalizedSkuKeys;

    return {
      ...rule,
      fieldKeys: normalizeRuleFieldKeys(rule.fieldKeys),
      storeIds: uniqueStringArray(rule.storeIds),
      skuKeys: normalizedSkuKeys,
      skuConfigs: normalizeRuleSkuConfigs(
        rule.skuConfigs,
        new Set(matchedSkuKeys),
        rule.fieldKeys
      ),
    };
  });
}

type ExpandedStoreChannelRuleResult = {
  storeChannelRule: ProductStoreChannelRuleItem;
  targetStoreIds: string[];
  targetSkuIds: string[];
};

function expandStoreChannelRule(
  rule: StoreChannelRuleDraftItem,
  skuMetaItems: StoreChannelSkuMetaItem[],
  targetStoreIds: string[]
): ExpandedStoreChannelRuleResult {
  const targetStoreIdSet = new Set(targetStoreIds);
  const availableSkuKeys = skuMetaItems.map((item) => item.key);
  const matchedSkuKeys = getStoreChannelRuleMatchedSkuKeys(rule, availableSkuKeys);
  const matchedSkuKeySet = new Set(matchedSkuKeys);
  const skuIdMap = new Map(skuMetaItems.map((item) => [item.key, item.skuId]));
  const normalizedTargetStoreIds =
    rule.storeScope === 'allStores'
      ? [...targetStoreIds]
      : uniqueStringArray(rule.storeIds).filter((storeId) => targetStoreIdSet.has(storeId));
  const normalizedTargetSkuIds = matchedSkuKeys
    .map((skuKey) => skuIdMap.get(skuKey) || '')
    .filter(Boolean);
  const normalizedFieldKeys = normalizeRuleFieldKeys(rule.fieldKeys);

  return {
    targetStoreIds: normalizedTargetStoreIds,
    targetSkuIds: normalizedTargetSkuIds,
    storeChannelRule: {
      id: rule.id,
      fieldKeys: normalizedFieldKeys,
      storeScope: rule.storeScope,
      storeIds: rule.storeScope === 'specificStores' ? normalizedTargetStoreIds : [],
      skuScope: rule.skuScope,
      skuIds: rule.skuScope === 'specificSkus' ? normalizedTargetSkuIds : [],
      shareMode: rule.shareMode,
      skuConfigs: normalizeRuleSkuConfigs(
        rule.skuConfigs,
        matchedSkuKeySet,
        normalizedFieldKeys
      ).flatMap(
        (item) => {
          const skuId = skuIdMap.get(item.skuKey);
          if (!skuId) {
            return [];
          }

          const minSuggestedPrice = toOptionalPrice(item.suggestedMinPrice);
          const maxSuggestedPrice = toOptionalPrice(item.suggestedMaxPrice);
          const minSuggestedStock = toOptionalStock(item.suggestedMinStock);
          const maxSuggestedStock = toOptionalStock(item.suggestedMaxStock);

          if (
            typeof minSuggestedPrice !== 'number' &&
            typeof maxSuggestedPrice !== 'number' &&
            typeof minSuggestedStock !== 'number' &&
            typeof maxSuggestedStock !== 'number'
          ) {
            return [];
          }

          return [
            {
              skuId,
              minSuggestedPrice,
              maxSuggestedPrice,
              minSuggestedStock,
              maxSuggestedStock,
            },
          ];
        }
      ),
    },
  };
}

export function validateStoreChannelSkuDraftMap({
  specMode,
  specItems,
  storeChannelEnabled,
  sourceDraftMap,
  rules,
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

  if (!rules.length) {
    return '请至少保留 1 条规则配置';
  }

  const skuMetaItems = buildStoreChannelSkuMetaItems(
    'validate_only_product',
    specMode,
    specItems,
    sourceDraftMap
  );
  const targetStoreShareModeMap = new Map<string, ProductStoreChannelShareMode>();
  const storeSkuRuleMap = new Map<string, string>();

  for (const rule of rules) {
    if (rule.storeScope === 'specificStores' && !uniqueStringArray(rule.storeIds).length) {
      return '请选择店铺';
    }

    const matchedSkuKeys = getStoreChannelRuleMatchedSkuKeys(
      rule,
      skuMetaItems.map((item) => item.key)
    );
    if (rule.skuScope === 'specificSkus' && !matchedSkuKeys.length) {
      return '请选择SKU';
    }

    const matchedSkuKeySet = new Set(matchedSkuKeys);
    const rawMatchedSkuConfigs = normalizeRuleSkuConfigs(
      rule.skuConfigs,
      matchedSkuKeySet,
      rule.fieldKeys
    );

    if (rawMatchedSkuConfigs.some(hasInvalidPriceRange)) {
      return '建议零售价区间需为非负数，且最低价不能高于最高价';
    }

    if (rawMatchedSkuConfigs.some(hasInvalidStockRange)) {
      return '建议库存区间需为非负整数，且最低库存不能高于最高库存';
    }

    const expandedRule = expandStoreChannelRule(rule, skuMetaItems, targetStoreIds);

    expandedRule.targetStoreIds.forEach((storeId) => {
      const currentShareMode = targetStoreShareModeMap.get(storeId);
      if (currentShareMode && currentShareMode !== expandedRule.storeChannelRule.shareMode) {
        throw new Error('同一店铺命中的规则其“分享到”必须保持一致');
      }

      targetStoreShareModeMap.set(storeId, expandedRule.storeChannelRule.shareMode);
    });

    expandedRule.targetStoreIds.forEach((storeId) => {
      expandedRule.targetSkuIds.forEach((skuId) => {
        const key = `${storeId}:${skuId}`;
        const previousRuleId = storeSkuRuleMap.get(key);
        if (previousRuleId && previousRuleId !== rule.id) {
          throw new Error('同一店铺下的同一 SKU 不能命中多条规则');
        }

        storeSkuRuleMap.set(key, rule.id);
      });
    });
  }

  return undefined;
}

export function buildStoreChannelCreateSkuPayload({
  productId,
  specMode,
  specItems,
  storeChannelEnabled,
  sourceDraftMap,
  rules,
  targetStoreIds,
  createdAt,
}: BuildStoreChannelCreateSkuPayloadInput): {
  skus: ProductSkuItem[];
  price: number;
  stock: number;
  independentPriceRule: ProductIndependentPriceRule;
  independentStockRule: ProductIndependentStockRule;
  storeChannelRules: ProductStoreChannelRuleItem[];
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
      storeChannelRules: [],
      shareTargets: [],
    };
  }

  const expandedRules = rules.map((rule) =>
    expandStoreChannelRule(rule, skuMetaItems, targetStoreIds)
  );
  const shareTargetMap = new Map<
    string,
    {
      storeId: string;
      shareMode: ProductStoreChannelShareMode;
      skuIdSet: Set<string>;
    }
  >();

  expandedRules.forEach((item) => {
    item.targetStoreIds.forEach((storeId) => {
      const current = shareTargetMap.get(storeId) || {
        storeId,
        shareMode: item.storeChannelRule.shareMode,
        skuIdSet: new Set<string>(),
      };

      item.targetSkuIds.forEach((skuId) => {
        current.skuIdSet.add(skuId);
      });
      shareTargetMap.set(storeId, current);
    });
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
    storeChannelRules: expandedRules.map((item) => item.storeChannelRule),
    shareTargets: Array.from(shareTargetMap.values()).map((item) => ({
      storeId: item.storeId,
      status: item.shareMode === 'shared_pool' ? 'pending' : 'referenced',
      sharedAt: createdAt,
      referencedAt:
        item.shareMode === 'shared_pool' ? undefined : createdAt,
      sellableSkuIds: Array.from(item.skuIdSet),
    })),
  };
}
