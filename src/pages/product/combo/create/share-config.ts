import type { ProductStoreConfigItem } from '../../store-config/data';

export type ProductChannelShareMode = 'product_pool' | 'shared_pool';

export type StoreShareSettingItem = {
  shareMode: ProductChannelShareMode;
  sellableSkuKeys: string[];
};

function uniqueStringArray(values: string[] = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

export function sanitizeSellableSkuKeys(
  sellableSkuKeys: string[] = [],
  enabledSkuKeys: string[] = []
) {
  const enabledSkuKeySet = new Set(enabledSkuKeys.filter(Boolean));

  return uniqueStringArray(
    sellableSkuKeys.filter((skuKey) => enabledSkuKeySet.has(skuKey))
  );
}

export function sanitizeStoreShareSettingMapByEnabledSkuKeys(
  storeShareSettingMap: Record<string, StoreShareSettingItem>,
  enabledSkuKeys: string[] = []
) {
  return Object.entries(storeShareSettingMap).reduce<
    Record<string, StoreShareSettingItem>
  >((result, [storeId, setting]) => {
    result[storeId] = {
      ...setting,
      sellableSkuKeys: sanitizeSellableSkuKeys(
        setting.sellableSkuKeys,
        enabledSkuKeys
      ),
    };
    return result;
  }, {});
}

export function applyUnsellableWhenNoSellableSku(
  storeConfigs: ProductStoreConfigItem[] = [],
  storeShareSettingMap: Record<string, StoreShareSettingItem>,
  enabledSkuKeys: string[] = []
) {
  return storeConfigs.map((config) => {
    if (config.sellStatus !== 'sellable') {
      return config;
    }

    const sellableSkuKeys = sanitizeSellableSkuKeys(
      storeShareSettingMap[config.storeId]?.sellableSkuKeys || enabledSkuKeys,
      enabledSkuKeys
    );
    if (sellableSkuKeys.length) {
      return config;
    }

    return {
      ...config,
      sellStatus: 'unsellable' as const,
      channelStatus: 'off' as const,
    };
  });
}
