import {
  createDefaultProductStoreOverride,
  normalizeProductIndependentPriceRule,
  normalizeProductShareTargets,
  normalizeProductStoreOverride,
  normalizeProductStoreSkuSellStatusOverrides,
  normalizeProductStoreSkuStatusOverrides,
} from '@/lib/product';
import type {
  ProductIndependentPriceRule,
  ProductItem,
  ProductShareTargetItem,
  ProductStoreOverrideMap,
  ProductStoreShareSettingItem,
} from '@/types/product';
import type {
  ProductStoreConfigItem,
  ProductStoreItem,
} from '@/pages/product/store-config/data';

function uniqueStringArray(values: string[] = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function buildDefaultStoreShareSetting(
  enabledSkuIds: string[] = []
): ProductStoreShareSettingItem {
  return {
    shareMode: 'product_pool',
    sellableSkuIds: uniqueStringArray(enabledSkuIds),
  };
}

export function sanitizeSellableSkuIds(
  sellableSkuIds: string[] = [],
  enabledSkuIds: string[] = []
) {
  const enabledSkuIdSet = new Set(enabledSkuIds.filter(Boolean));

  return uniqueStringArray(
    sellableSkuIds.filter((skuId) => enabledSkuIdSet.has(skuId))
  );
}

export function sanitizeStoreShareSettingMapByEnabledSkuIds(
  storeShareSettingMap: Record<string, ProductStoreShareSettingItem>,
  enabledSkuIds: string[] = []
) {
  return Object.entries(storeShareSettingMap).reduce<
    Record<string, ProductStoreShareSettingItem>
  >((result, [storeId, setting]) => {
    result[storeId] = {
      shareMode:
        setting?.shareMode === 'shared_pool' ? 'shared_pool' : 'product_pool',
      sellableSkuIds: sanitizeSellableSkuIds(
        setting?.sellableSkuIds || [],
        enabledSkuIds
      ),
    };
    return result;
  }, {});
}

export function applyUnsellableWhenNoSellableSku(
  storeConfigs: ProductStoreConfigItem[] = [],
  storeShareSettingMap: Record<string, ProductStoreShareSettingItem>,
  enabledSkuIds: string[] = []
) {
  return storeConfigs.map((config) => {
    if (config.sellStatus !== 'sellable') {
      return {
        ...config,
        channelStatus: 'off' as const,
      };
    }

    const sellableSkuIds = sanitizeSellableSkuIds(
      storeShareSettingMap[config.storeId]?.sellableSkuIds || enabledSkuIds,
      enabledSkuIds
    );

    if (sellableSkuIds.length) {
      return {
        ...config,
        channelStatus: 'on' as const,
      };
    }

    return {
      ...config,
      sellStatus: 'unsellable' as const,
      channelStatus: 'off' as const,
    };
  });
}

export function buildStoreShareSettingMapFromProduct(
  product: ProductItem,
  storeItems: ProductStoreItem[],
  enabledSkuIds: string[]
) {
  const shareTargetMap = new Map(
    normalizeProductShareTargets(product.shareTargets || []).map((item) => [
      item.storeId,
      item,
    ])
  );
  const enabledSkuIdSet = new Set(enabledSkuIds);

  return storeItems.reduce<Record<string, ProductStoreShareSettingItem>>(
    (result, item) => {
      const shareTarget = shareTargetMap.get(item.id);
      const isSourceStore =
        Boolean(product.sourceStoreId) && item.id === product.sourceStoreId;
      const sellableSkuIds = isSourceStore
        ? [...enabledSkuIds]
        : uniqueStringArray(
            (shareTarget?.sellableSkuIds || []).filter((skuId) =>
              enabledSkuIdSet.has(skuId)
            )
          );

      result[item.id] = {
        shareMode:
          isSourceStore || shareTarget?.status === 'referenced'
            ? 'product_pool'
            : 'shared_pool',
        sellableSkuIds,
      };
      return result;
    },
    {}
  );
}

type BuildProductShareConfigResultInput = {
  product: ProductItem;
  storeConfigs: ProductStoreConfigItem[];
  storeShareSettingMap: Record<string, ProductStoreShareSettingItem>;
  independentPriceRule: ProductIndependentPriceRule;
  updatedAt: string;
};

export function buildProductShareConfigResult({
  product,
  storeConfigs,
  storeShareSettingMap,
  independentPriceRule,
  updatedAt,
}: BuildProductShareConfigResultInput) {
  const enabledSkuIds = (product.skus || [])
    .filter((sku) => sku.status !== 'off')
    .map((sku) => sku.id);
  const nextStoreShareSettingMap = sanitizeStoreShareSettingMapByEnabledSkuIds(
    storeShareSettingMap,
    enabledSkuIds
  );
  const nextStoreConfigs = applyUnsellableWhenNoSellableSku(
    storeConfigs,
    nextStoreShareSettingMap,
    enabledSkuIds
  );
  const managedStoreIds = uniqueStringArray(
    nextStoreConfigs
      .map((item) => item.storeId)
      .filter((storeId) => storeId && storeId !== product.sourceStoreId)
  );
  const managedStoreIdSet = new Set(managedStoreIds);
  const existingShareTargets = normalizeProductShareTargets(product.shareTargets || []);
  const existingShareTargetMap = new Map(
    existingShareTargets.map((item) => [item.storeId, item])
  );
  const nextShareTargets = [
    ...existingShareTargets.filter((item) => !managedStoreIdSet.has(item.storeId)),
    ...nextStoreConfigs.flatMap((config) => {
      if (
        !config.storeId ||
        config.storeId === product.sourceStoreId ||
        config.sellStatus !== 'sellable'
      ) {
        return [];
      }

      const currentSetting =
        nextStoreShareSettingMap[config.storeId] ||
        buildDefaultStoreShareSetting(enabledSkuIds);
      const sellableSkuIds = sanitizeSellableSkuIds(
        currentSetting.sellableSkuIds,
        enabledSkuIds
      );

      if (!sellableSkuIds.length) {
        return [];
      }

      const previousShareTarget = existingShareTargetMap.get(config.storeId);

      return [
        {
          storeId: config.storeId,
          status:
            currentSetting.shareMode === 'shared_pool'
              ? ('pending' as const)
              : ('referenced' as const),
          sharedAt: previousShareTarget?.sharedAt || updatedAt,
          referencedAt:
            currentSetting.shareMode === 'shared_pool'
              ? undefined
              : previousShareTarget?.referencedAt || updatedAt,
          sellableSkuIds,
        } as ProductShareTargetItem,
      ];
    }),
  ];
  const nextShareTargetMap = new Map(
    nextShareTargets.map((item) => [item.storeId, item])
  );
  const allSkuIds = (product.skus || []).map((sku) => sku.id);
  const baseOverrides = { ...(product.storeOverrides || {}) } as ProductStoreOverrideMap;
  const nextStoreOverrides = managedStoreIds.reduce<ProductStoreOverrideMap>(
    (result, storeId) => {
      const shareTarget = nextShareTargetMap.get(storeId);

      if (shareTarget?.status !== 'referenced') {
        delete result[storeId];
        return result;
      }

      const sellableSkuIdSet = new Set(
        shareTarget.sellableSkuIds?.length ? shareTarget.sellableSkuIds : allSkuIds
      );
      const unsellableSkus = (product.skus || []).filter(
        (sku) => !sellableSkuIdSet.has(sku.id)
      );

      if (!unsellableSkus.length) {
        delete result[storeId];
        return result;
      }

      const previousOverride = baseOverrides[storeId]
        ? normalizeProductStoreOverride(storeId, baseOverrides[storeId])
        : createDefaultProductStoreOverride(storeId);

      result[storeId] = {
        ...previousOverride,
        skuSellStatusOverrides: normalizeProductStoreSkuSellStatusOverrides(
          unsellableSkus.map((sku) => ({
            skuId: sku.id,
            currentSellStatus: 'unsellable' as const,
          }))
        ),
        skuStatusOverrides: normalizeProductStoreSkuStatusOverrides(
          unsellableSkus
            .filter((sku) => sku.status !== 'off')
            .map((sku) => ({
              skuId: sku.id,
              currentStatus: 'off' as const,
            }))
        ),
      };
      return result;
    },
    { ...baseOverrides }
  );

  return {
    shareTargets: nextShareTargets,
    storeOverrides: nextStoreOverrides,
    independentPriceRule: normalizeProductIndependentPriceRule(
      independentPriceRule,
      product.skus || []
    ),
    storeConfigs: nextStoreConfigs,
  };
}
