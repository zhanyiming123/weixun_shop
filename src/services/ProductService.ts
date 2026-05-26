import { ProductRepository } from '@/repositories/ProductRepository';
import { AppError } from '@/lib/errors';
import { filterDataByScope } from '@/utils/useDataScopeFilter';
import {
  applyBundleRuntime,
  buildProductListItem,
  createDefaultProductStoreOverride,
  getProductCurrentSkus,
  getProductSkuBaselineSellStatus,
  getProductStatusByStoreConfigs,
  hasProductShareTarget,
  getProductShareTargetByStoreId,
  getProductReferencedStoreIds,
  hasProductStoreIntersection,
  getProductIndependentPriceRule,
  getProductSkuIndependentPriceRule,
  markShareTargetReferenced,
  markShareTargetPending,
  normalizeProductCarouselImages,
  normalizeProductStoreLocalSkuItems,
  normalizeProductStoreOverride,
  normalizeProductStoreChannelConfig,
  normalizeProductStoreSkuSellStatusOverrides,
  normalizeProductStoreSkuStatusOverrides,
  normalizeProductStoreSkuStockOverrides,
  normalizeProductStoreSkuPriceOverrides,
  normalizeProductShareTargets,
  summarizeProductFromSkus,
  resolveProductSourceStoreMeta,
  syncReferencedStoreConfigsBySourceSellStatus,
  upsertPendingShareTargets,
} from '@/lib/product';
import { readOrganizationItems } from '@/pages/enterprise/organization/data';
import {
  createDefaultProductStoreConfig,
  readProductStoreItems,
} from '@/pages/product/store-config/data';
import type {
  ProductComboDisplayOption,
  ProductKind,
  PublishProductsToStoresInput,
  ProductFilterValues,
  ProductItem,
  ProductListItem,
  ProductListQuery,
  ProductListResult,
  ProductSharePoolQuery,
  ProductSharePoolItem,
  ProductSharePoolResult,
  ProductStatus,
  ProductStoreConfigItem,
  ProductStoreSellStatus,
  ProductTab,
  CancelReferenceSharedProductInput,
  ReferenceSharedProductInput,
  ShareProductsToPoolInput,
  UpdateProductStoreChannelConfigInput,
  UpdateProductStoreChannelStatusInput,
  UpdateProductStoreConfigsInput,
  UpdateProductStoreOverrideInput,
  UpdateProductSkuStatusesInput,
} from '@/types/product';

function getDateTimestamp(dateTime: string) {
  return new Date(dateTime.replace(' ', 'T')).getTime();
}

function normalizeProductKind(kind: ProductKind | undefined): ProductKind {
  if (kind === 'bundle') return 'bundle';
  if (kind === 'combo') return 'combo';
  return 'standard';
}

function getRangeBoundary(date: string, endOfDay = false) {
  const suffix = endOfDay ? '23:59:59' : '00:00:00';
  return new Date(`${date}T${suffix}`).getTime();
}

function getProductListDisplayStatus(item: ProductListItem): ProductStatus {
  if (item.storeView.currentStoreId) {
    return item.storeView.currentStoreChannelStatus || 'off';
  }

  return item.status;
}

function filterProductsByTab(products: ProductListItem[], tab: ProductTab) {
  if (tab === 'selling') {
    return products.filter((item) => getProductListDisplayStatus(item) === 'on');
  }

  if (tab === 'warehouse') {
    return products.filter((item) => getProductListDisplayStatus(item) === 'off');
  }

  return products;
}

function applyFilters<T extends ProductListItem>(
  products: T[],
  filters: ProductFilterValues,
  visibleStoreIds: string[] = [],
  relatedProductMap: Map<string, ProductListItem> = new Map()
) {
  const keyword = filters.keyword.trim().toLowerCase();
  const subProductKeyword = (filters.subProductKeyword || '').trim().toLowerCase();
  const sourceStoreIdSet = new Set(filters.sourceStoreIds || []);
  const visibleStoreIdSet = new Set(visibleStoreIds || []);

  return products.filter((item) => {
    if (keyword) {
      let target = `${item.name} ${item.storeView.currentName}`.toLowerCase();

      if (filters.searchType === 'productId') {
        target = item.id.toLowerCase();
      }

      if (!target.includes(keyword)) {
        return false;
      }
    }

    if (subProductKeyword) {
      const comboTargets = (item.comboOptions || []).flatMap((option) =>
        option.items.flatMap((optionItem) => {
          const relatedProduct = relatedProductMap.get(optionItem.productId);

          if (filters.subProductSearchType === 'subProductCode') {
            return [
              `${optionItem.productId} ${optionItem.skuId} ${relatedProduct?.id || ''}`.toLowerCase(),
            ];
          }

          return [
            `${relatedProduct?.name || ''} ${relatedProduct?.storeView.currentName || ''}`.toLowerCase(),
          ];
        })
      );

      if (!comboTargets.join(' ').includes(subProductKeyword)) {
        return false;
      }
    }

    if (filters.sellStatus) {
      const currentStoreSellStatus = item.storeView.currentStoreSellStatus;
      if (currentStoreSellStatus) {
        if (currentStoreSellStatus !== filters.sellStatus) {
          return false;
        }
      } else {
        const scopedStoreConfigs =
          visibleStoreIdSet.size > 0
            ? (item.storeConfigs || []).filter((config) =>
                visibleStoreIdSet.has(config.storeId)
              )
            : item.storeConfigs || [];
        const hasSellableStore = scopedStoreConfigs.some(
          (config) => config.sellStatus === 'sellable'
        );

        if (filters.sellStatus === 'sellable' && !hasSellableStore) {
          return false;
        }

        if (filters.sellStatus === 'unsellable' && hasSellableStore) {
          return false;
        }
      }
    }

    if (filters.productCatalogId && item.productCatalogId !== filters.productCatalogId) {
      return false;
    }

    if (filters.productOwnershipId && item.productOwnershipId !== filters.productOwnershipId) {
      return false;
    }

    if (filters.productSourceType && item.sourceType !== filters.productSourceType) {
      return false;
    }

    if (
      sourceStoreIdSet.size > 0 &&
      (!item.storeView.resolvedSourceStoreId ||
        !sourceStoreIdSet.has(item.storeView.resolvedSourceStoreId))
    ) {
      return false;
    }

    if (
      typeof filters.minPrice === 'number' &&
      Number.isFinite(filters.minPrice) &&
      item.storeView.currentPrice < filters.minPrice
    ) {
      return false;
    }

    if (
      typeof filters.maxPrice === 'number' &&
      Number.isFinite(filters.maxPrice) &&
      item.storeView.currentPrice > filters.maxPrice
    ) {
      return false;
    }

    if (filters.createdAtRange.length === 2) {
      const [startDate, endDate] = filters.createdAtRange;
      const createdAt = getDateTimestamp(item.createdAt);
      if (createdAt < getRangeBoundary(startDate)) {
        return false;
      }
      if (createdAt > getRangeBoundary(endDate, true)) {
        return false;
      }
    }

    return true;
  });
}

function normalizeProductFilters(
  filters?: ProductFilterValues
): ProductFilterValues | undefined {
  if (!filters) {
    return undefined;
  }

  const createdAtRange =
    Array.isArray(filters.createdAtRange) &&
    filters.createdAtRange.length === 2 &&
    filters.createdAtRange[0] &&
    filters.createdAtRange[1]
      ? [filters.createdAtRange[0], filters.createdAtRange[1]]
      : [];
  const isLegacySubProductSearch =
    filters.searchType === 'subProductName' ||
    filters.searchType === 'subProductCode';

  return {
    searchType: filters.searchType === 'productId' ? 'productId' : 'productName',
    keyword:
      typeof filters.keyword === 'string' && !isLegacySubProductSearch
        ? filters.keyword
        : '',
    subProductSearchType:
      filters.subProductSearchType === 'subProductCode' ||
      filters.subProductSearchType === 'subProductName'
        ? filters.subProductSearchType
        : filters.searchType === 'subProductCode'
          ? 'subProductCode'
          : 'subProductName',
    subProductKeyword:
      typeof filters.subProductKeyword === 'string'
        ? filters.subProductKeyword
        : isLegacySubProductSearch && typeof filters.keyword === 'string'
          ? filters.keyword
          : '',
    sellStatus:
      filters.sellStatus === 'sellable' || filters.sellStatus === 'unsellable'
        ? filters.sellStatus
        : undefined,
    productCatalogId:
      typeof filters.productCatalogId === 'string' ? filters.productCatalogId : undefined,
    productOwnershipId:
      typeof filters.productOwnershipId === 'string'
        ? filters.productOwnershipId
        : undefined,
    productSourceType:
      filters.productSourceType === 'headquarter' || filters.productSourceType === 'store'
        ? filters.productSourceType
        : undefined,
    sourceStoreIds: Array.isArray(filters.sourceStoreIds)
      ? filters.sourceStoreIds.filter((item): item is string => typeof item === 'string' && Boolean(item))
      : [],
    minPrice:
      typeof filters.minPrice === 'number' && Number.isFinite(filters.minPrice)
        ? filters.minPrice
        : undefined,
    maxPrice:
      typeof filters.maxPrice === 'number' && Number.isFinite(filters.maxPrice)
        ? filters.maxPrice
        : undefined,
    createdAtRange,
  };
}

function getSalesStatusCounts(
  product: ProductItem,
  visibleStoreIds: string[]
) {
  const visibleStoreIdSet = new Set(visibleStoreIds);
  const selling = (product.storeConfigs || []).filter(
    (item) => visibleStoreIdSet.has(item.storeId) && item.sellStatus === 'sellable'
  ).length;

  return {
    selling,
    off: Math.max(visibleStoreIds.length - selling, 0),
  };
}

function paginateProducts<T>(products: T[], page: number, pageSize: number) {
  const normalizedPage = Math.max(1, page || 1);
  const normalizedPageSize = Math.max(1, pageSize || 10);
  const start = (normalizedPage - 1) * normalizedPageSize;

  return products.slice(start, start + normalizedPageSize);
}

function normalizeComboSubProductName(name: string) {
  return name
    .replace(/^\[引用\]\s*/, '')
    .replace(/^.+?(?:店铺)?自建·/, '')
    .trim();
}

function buildComboDisplayOptions(
  product: ProductListItem,
  relatedProductMap: Map<string, ProductListItem>,
  fallbackProductMap: Map<string, ProductItem>
): ProductComboDisplayOption[] | undefined {
  if (product.productKind !== 'combo') {
    return undefined;
  }

  const displayOptions = (product.comboOptions || [])
    .map((option, optionIndex) => ({
      key: option.id || `option_${optionIndex + 1}`,
      title: option.title || `选项${optionIndex + 1}`,
      selectionLimit: option.selectionLimit,
      productNames: option.items
        .map((item) => {
          const relatedProduct = relatedProductMap.get(item.productId);
          const fallbackProduct = fallbackProductMap.get(item.productId);
          const rawName =
            relatedProduct?.storeView.currentName ||
            relatedProduct?.name ||
            fallbackProduct?.name ||
            '';

          return rawName ? normalizeComboSubProductName(rawName) : item.productId;
        })
        .filter(Boolean),
    }))
    .filter((option) => option.productNames.length);

  return displayOptions.length ? displayOptions : undefined;
}

function formatOverrideUpdatedAt(date = new Date()) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  const seconds = `${date.getSeconds()}`.padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function cloneStoreConfig(config: ProductStoreConfigItem): ProductStoreConfigItem {
  return {
    ...config,
  };
}

function shouldRemoveStoreOverride(
  override: {
    priceMode: UpdateProductStoreOverrideInput['priceMode'];
    stockMode: UpdateProductStoreOverrideInput['stockMode'];
    nameMode: UpdateProductStoreOverrideInput['nameMode'];
    carouselMode: UpdateProductStoreOverrideInput['carouselMode'];
    skuSellStatusOverrides?: UpdateProductStoreOverrideInput['skuSellStatusOverrides'];
    skuStatusOverrides?: UpdateProductStoreOverrideInput['skuStatusOverrides'];
    localSkuItems?: UpdateProductStoreOverrideInput['localSkuItems'];
  }
) {
  return (
    override.priceMode === 'follow' &&
    override.stockMode === 'follow' &&
    override.nameMode === 'follow' &&
    override.carouselMode === 'follow' &&
    !(override.skuSellStatusOverrides || []).length &&
    !(override.skuStatusOverrides || []).length &&
    !(override.localSkuItems || []).length
  );
}

function resolveNextSkuState(
  action: UpdateProductSkuStatusesInput['action'],
  currentSellStatus: ProductStoreSellStatus
) {
  if (action === 'sellable' || action === 'on') {
    return {
      sellStatus: 'sellable' as const,
      channelStatus: 'on' as const,
    };
  }

  if (action === 'unsellable' || action === 'off') {
    return {
      sellStatus: 'unsellable' as const,
      channelStatus: 'off' as const,
    };
  }

  return {
    sellStatus: currentSellStatus,
    channelStatus: currentSellStatus === 'sellable' ? ('on' as const) : ('off' as const),
  };
}

export class ProductService {
  private repository = new ProductRepository();

  private getRuntimeProducts() {
    const products = this.repository.readSnapshot();
    return products.map((item) => applyBundleRuntime(item, products));
  }

  private syncSharedStoreConfigs(previous: ProductItem, next: ProductItem) {
    return syncReferencedStoreConfigsBySourceSellStatus(previous, next);
  }

  queryList(input: ProductListQuery): ProductListResult {
    const allProducts = this.repository.readSnapshot();
    const runtimeProducts = allProducts.map((item) => applyBundleRuntime(item, allProducts));
    const runtimeProductMap = new Map(runtimeProducts.map((item) => [item.id, item]));
    const allStoreItems = readProductStoreItems();
    const sourceStoreItems = allStoreItems.filter((item) => item.type === 'store');
    const organizationItems = readOrganizationItems().filter(
      (item) => item.status === 'enabled'
    );
    const scopedProducts =
      input.organizationScope === 'headquarter'
        ? runtimeProducts
        : runtimeProducts.filter((item) =>
          hasProductStoreIntersection(item.storeConfigs, input.visibleStoreIds)
        );
    const projectedScopedProducts = scopedProducts.map((item) =>
      buildProductListItem(item, input.organizationScope, input.visibleStoreIds, {
        ...resolveProductSourceStoreMeta(item, sourceStoreItems, organizationItems),
        salesStatusCounts: getSalesStatusCounts(item, input.visibleStoreIds),
      })
    );
    const projectedProductMap = new Map(
      projectedScopedProducts.map((item) => [item.id, item])
    );
    const displayReadyProducts = projectedScopedProducts.map((item) => ({
      ...item,
      comboDisplayOptions: buildComboDisplayOptions(
        item,
        projectedProductMap,
        runtimeProductMap
      ),
    }));
    const displayReadyProductMap = new Map(
      displayReadyProducts.map((item) => [item.id, item])
    );
    const projectedProducts = input.productKind
      ? displayReadyProducts.filter(
          (item) =>
            normalizeProductKind(item.productKind) ===
            normalizeProductKind(input.productKind)
        )
      : displayReadyProducts;

    const filteredProducts = applyFilters(
      projectedProducts,
      input.filters,
      input.visibleStoreIds,
      displayReadyProductMap
    );
    const scopedProductsByDemo = filterDataByScope<
      ProductListItem & { operatorId?: string; creatorId?: string }
    >(
      filteredProducts,
      (item) => item.operatorId || item.creatorId || ''
    );
    const tabCounts = {
      all: scopedProductsByDemo.length,
      selling: scopedProductsByDemo.filter(
        (item) => getProductListDisplayStatus(item) === 'on'
      ).length,
      warehouse: scopedProductsByDemo.filter(
        (item) => getProductListDisplayStatus(item) === 'off'
      ).length,
    };
    const tabbedProducts = filterProductsByTab(scopedProductsByDemo, input.tab);

    return {
      items: paginateProducts(tabbedProducts, input.page, input.pageSize),
      total: tabbedProducts.length,
      tabCounts,
    };
  }

  querySharePool(input: ProductSharePoolQuery): ProductSharePoolResult {
    const currentStoreId = input.storeId;
    if (!currentStoreId) {
      return {
        items: [],
        total: 0,
      };
    }

    const allProducts = this.repository.readSnapshot();
    const runtimeProducts = allProducts.map((item) => applyBundleRuntime(item, allProducts));
    const sourceStoreItems = readProductStoreItems().filter((item) => item.type === 'store');
    const organizationItems = readOrganizationItems().filter(
      (item) => item.status === 'enabled'
    );

    const projectedItems = runtimeProducts.flatMap((product): ProductSharePoolItem[] => {
      const shareTarget = getProductShareTargetByStoreId(product, currentStoreId);
      if (!shareTarget) {
        return [];
      }

      return [
        {
          ...buildProductListItem(product, 'store', [currentStoreId], {
            ...resolveProductSourceStoreMeta(product, sourceStoreItems, organizationItems),
            salesStatusCounts: getSalesStatusCounts(product, [currentStoreId]),
          }),
          shareTarget,
        },
      ];
    });
    const shareableItems = projectedItems.filter(
      (item) => item.productKind !== 'bundle'
    );
    const normalizedKind = input.productKind
      ? normalizeProductKind(input.productKind)
      : undefined;
    const filteredByKind = normalizedKind
      ? shareableItems.filter(
          (item) => normalizeProductKind(item.productKind) === normalizedKind
        )
      : shareableItems;
    const normalizedFilters = normalizeProductFilters(input.filters);
    const filteredByFilters = normalizedFilters
      ? applyFilters(
          filteredByKind,
          normalizedFilters,
          [currentStoreId],
          new Map(filteredByKind.map((item) => [item.id, item]))
        )
      : filteredByKind;
    const legacyKeyword = (input.keyword || '').trim().toLowerCase();
    const filteredByKeyword =
      !normalizedFilters && legacyKeyword
        ? filteredByFilters.filter((item) => {
            const target = `${item.id} ${item.name} ${item.storeView.currentName}`.toLowerCase();
            return target.includes(legacyKeyword);
          })
        : filteredByFilters;
    const filteredByStatus = input.status
      ? filteredByKeyword.filter((item) => item.shareTarget.status === input.status)
      : filteredByKeyword;
    const sorted = [...filteredByStatus].sort((left, right) => {
      const leftAt = getDateTimestamp(left.shareTarget.sharedAt || left.createdAt);
      const rightAt = getDateTimestamp(right.shareTarget.sharedAt || right.createdAt);
      return rightAt - leftAt;
    });

    return {
      items: paginateProducts(sorted, input.page, input.pageSize),
      total: sorted.length,
    };
  }

  async shareProductsToPool(input: ShareProductsToPoolInput) {
    const sourceStoreId = input.sourceStoreId;
    const productIds = Array.from(new Set(input.productIds.filter(Boolean)));
    const targetStoreIds = Array.from(new Set(input.targetStoreIds.filter(Boolean)));

    if (!sourceStoreId) {
      throw new AppError('PRODUCT_INVALID_SOURCE_STORE', '请先选择源店铺');
    }

    if (!productIds.length) {
      throw new AppError('PRODUCT_EMPTY_SELECTION', '请先选择商品');
    }

    if (!targetStoreIds.length) {
      throw new AppError('PRODUCT_EMPTY_TARGET_STORES', '请至少选择 1 家目标店铺');
    }

    const productIdSet = new Set(productIds);
    const products = await this.repository.list();
    const now = formatOverrideUpdatedAt();
    let sharedCount = 0;

    const nextProducts = products.map((item) => {
      if (!productIdSet.has(item.id)) {
        return item;
      }

      if (item.sourceType !== 'store' || item.sourceStoreId !== sourceStoreId) {
        throw new AppError('PRODUCT_SOURCE_MISMATCH', '仅支持分享本店自建商品');
      }

      const nextTargetStoreIds = targetStoreIds.filter((storeId) => {
        if (storeId === sourceStoreId) {
          return false;
        }

        return !hasProductShareTarget(item, storeId, 'referenced');
      });
      if (!nextTargetStoreIds.length) {
        return item;
      }

      sharedCount += 1;

      return upsertPendingShareTargets(item, nextTargetStoreIds, now);
    });

    await this.repository.save(nextProducts);
    return sharedCount;
  }

  async referenceSharedProduct(input: ReferenceSharedProductInput) {
    if (!input.storeId) {
      throw new AppError('PRODUCT_EMPTY_TARGET_STORES', '缺少目标店铺');
    }

    const products = await this.repository.list();
    const now = formatOverrideUpdatedAt();
    let updated = false;

    const nextProducts = products.map((item) => {
      if (item.id !== input.productId) {
        return item;
      }

      const shareTarget = getProductShareTargetByStoreId(item, input.storeId);
      if (!shareTarget || shareTarget.status !== 'pending') {
        throw new AppError('PRODUCT_SHARE_TARGET_NOT_FOUND', '共享池中未找到待引用商品');
      }

      const sourceStoreConfig = item.sourceStoreId
        ? (item.storeConfigs || []).find((config) => config.storeId === item.sourceStoreId)
        : undefined;
      const nextReferencedSellStatus: ProductStoreConfigItem['sellStatus'] =
        sourceStoreConfig?.sellStatus === 'unsellable' ? 'unsellable' : 'sellable';
      const hasStoreConfig = (item.storeConfigs || []).some(
        (config) => config.storeId === input.storeId
      );
      const nextStoreConfigs = hasStoreConfig
        ? (item.storeConfigs || []).map((config) =>
            config.storeId === input.storeId
              ? {
                  ...config,
                  sellStatus: nextReferencedSellStatus,
                  channelStatus: 'off' as const,
                }
              : config
          )
        : [
          ...(item.storeConfigs || []).map(cloneStoreConfig),
          {
            ...createDefaultProductStoreConfig(input.storeId),
            sellStatus: nextReferencedSellStatus,
            channelStatus: 'off' as const,
          },
        ];
      const nextItem = markShareTargetReferenced(item, input.storeId, now);
      const referencedTarget = getProductShareTargetByStoreId(nextItem, input.storeId);
      const allSkuIds = (item.skus || []).map((sku) => sku.id);
      const sellableSkuIdSet = new Set(
        (
          Array.isArray(referencedTarget?.sellableSkuIds) &&
          referencedTarget?.sellableSkuIds?.length
            ? referencedTarget.sellableSkuIds
            : allSkuIds
        ).filter((skuId): skuId is string => Boolean(skuId))
      );
      const unsellableSkuIds = allSkuIds.filter((skuId) => !sellableSkuIdSet.has(skuId));
      const skuSellStatusOverrides = normalizeProductStoreSkuSellStatusOverrides(
        unsellableSkuIds.map((skuId) => ({
          skuId,
          currentSellStatus: 'unsellable' as const,
        }))
      );
      const skuStatusOverrides = normalizeProductStoreSkuStatusOverrides(
        (item.skus || [])
          .filter((sku) => unsellableSkuIds.includes(sku.id) && sku.status !== 'off')
          .map((sku) => ({
            skuId: sku.id,
            currentStatus: 'off' as const,
          }))
      );
      const previousOverride = item.storeOverrides?.[input.storeId]
        ? normalizeProductStoreOverride(
            input.storeId,
            item.storeOverrides?.[input.storeId]
          )
        : createDefaultProductStoreOverride(input.storeId);
      const nextStoreOverrides = {
        ...(item.storeOverrides || {}),
      };
      nextStoreOverrides[input.storeId] = {
        ...previousOverride,
        skuSellStatusOverrides,
        skuStatusOverrides,
        updatedAt: now,
      };
      updated = true;

      return {
        ...nextItem,
        storeConfigs: nextStoreConfigs,
        storeOverrides: nextStoreOverrides,
        status: getProductStatusByStoreConfigs(nextStoreConfigs),
      };
    });

    if (!updated) {
      throw new AppError('PRODUCT_NOT_FOUND', '商品不存在');
    }

    await this.repository.save(nextProducts);
  }

  async cancelReferenceSharedProduct(input: CancelReferenceSharedProductInput) {
    if (!input.storeId) {
      throw new AppError('PRODUCT_EMPTY_TARGET_STORES', '缺少目标店铺');
    }

    const products = await this.repository.list();
    let updated = false;

    const nextProducts = products.map((item) => {
      if (item.id !== input.productId) {
        return item;
      }

      const shareTarget = getProductShareTargetByStoreId(item, input.storeId);
      if (!shareTarget || shareTarget.status !== 'referenced') {
        throw new AppError('PRODUCT_SHARE_TARGET_NOT_FOUND', '共享池中未找到已引用商品');
      }

      const hasStoreConfig = (item.storeConfigs || []).some(
        (config) => config.storeId === input.storeId
      );
      const nextStoreConfigs = hasStoreConfig
        ? (item.storeConfigs || []).map((config) =>
            config.storeId === input.storeId
              ? {
                  ...config,
                  sellStatus: 'unsellable' as const,
                  channelStatus: 'off' as const,
                }
              : config
          )
        : [
          ...(item.storeConfigs || []).map(cloneStoreConfig),
          {
            ...createDefaultProductStoreConfig(input.storeId),
            sellStatus: 'unsellable' as const,
            channelStatus: 'off' as const,
          },
        ];

      updated = true;

      return {
        ...markShareTargetPending(item, input.storeId),
        storeConfigs: nextStoreConfigs,
        status: getProductStatusByStoreConfigs(nextStoreConfigs),
      };
    });

    if (!updated) {
      throw new AppError('PRODUCT_NOT_FOUND', '商品不存在');
    }

    await this.repository.save(nextProducts);
  }

  async saveProduct(nextProduct: ProductItem) {
    const products = await this.repository.list();
    const productIndex = products.findIndex((item) => item.id === nextProduct.id);
    const previousProduct = productIndex >= 0 ? products[productIndex] : undefined;
    const normalizedKind = normalizeProductKind(nextProduct.productKind);

    if (previousProduct && normalizeProductKind(previousProduct.productKind) === 'standard') {
      if (previousProduct.productCatalogId !== nextProduct.productCatalogId) {
        throw new AppError('PRODUCT_EDIT_CATALOG_IMMUTABLE', '普通商品编辑时不允许修改商品类目');
      }

      if (previousProduct.productOwnershipId !== nextProduct.productOwnershipId) {
        throw new AppError('PRODUCT_EDIT_OWNERSHIP_IMMUTABLE', '普通商品编辑时不允许修改商品分类');
      }

      if (previousProduct.inventoryUnit !== nextProduct.inventoryUnit) {
        throw new AppError('PRODUCT_EDIT_INVENTORY_UNIT_IMMUTABLE', '普通商品编辑时不允许修改库存单位');
      }

      if (previousProduct.specMode !== nextProduct.specMode) {
        throw new AppError('PRODUCT_EDIT_SPEC_MODE_IMMUTABLE', '普通商品编辑时不允许修改规格模式');
      }

      const previousSkuMap = new Map(
        (previousProduct.skus || []).map((item) => [item.id, item])
      );
      const nextSkuIds = (nextProduct.skus || []).map((item) => item.id);

      if ((previousProduct.skus || []).some((item) => !nextSkuIds.includes(item.id))) {
        throw new AppError(
          'PRODUCT_EDIT_SKU_IMMUTABLE',
          '普通商品编辑时不允许新增或删除销售规格'
        );
      }

      const hasChangedExistingSkuSpec = (nextProduct.skus || []).some((item) => {
        const previousSku = previousSkuMap.get(item.id);
        return previousSku && previousSku.specText !== item.specText;
      });

      if (hasChangedExistingSkuSpec) {
        throw new AppError(
          'PRODUCT_EDIT_SKU_SPEC_IMMUTABLE',
          '普通商品编辑时不允许修改已有销售规格'
        );
      }
    }

    const skuSummary = summarizeProductFromSkus(nextProduct.skus || []);
    const normalizedProduct: ProductItem = {
      ...nextProduct,
      productKind: normalizedKind,
      price: skuSummary.price,
      stock: skuSummary.stock,
      status: getProductStatusByStoreConfigs(nextProduct.storeConfigs || []),
    };
    const syncedProduct = previousProduct
      ? this.syncSharedStoreConfigs(previousProduct, normalizedProduct)
      : normalizedProduct;
    const nextProducts =
      productIndex >= 0
        ? products.map((item, index) => (index === productIndex ? syncedProduct : item))
        : [syncedProduct, ...products];

    await this.repository.save(nextProducts);
  }

  async updateProductStatus(ids: string[], nextStatus: ProductStatus) {
    if (!ids.length) {
      return;
    }

    const idSet = new Set(ids);
    const products = await this.repository.list();
    const nextProducts = products.map((item) =>
      idSet.has(item.id) ? { ...item, status: nextStatus } : item
    );

    await this.repository.save(nextProducts);
  }

  async updateProductStoreChannelStatus(
    input: UpdateProductStoreChannelStatusInput
  ) {
    const productIds = Array.from(new Set(input.productIds.filter(Boolean)));

    if (!productIds.length) {
      return 0;
    }

    const productIdSet = new Set(productIds);
    const products = await this.repository.list();
    let updatedCount = 0;

    const nextProducts = products.map((item) => {
      if (!productIdSet.has(item.id)) {
        return item;
      }

      const hasCurrentStoreConfig = (item.storeConfigs || []).some(
        (config) => config.storeId === input.storeId
      );

      if (!hasCurrentStoreConfig) {
        return item;
      }

      const nextStoreConfigs: ProductStoreConfigItem[] = (item.storeConfigs || []).map(
        (config) => {
          if (config.storeId !== input.storeId) {
            return config;
          }

          return {
            ...config,
            channelStatus: input.channelStatus,
          };
        }
      );

      updatedCount += 1;

      const nextItem = {
        ...item,
        storeConfigs: nextStoreConfigs,
        status: getProductStatusByStoreConfigs(nextStoreConfigs),
      };

      return this.syncSharedStoreConfigs(item, nextItem);
    });

    await this.repository.save(nextProducts);
    return updatedCount;
  }

  async updateProductStoreConfigs(input: UpdateProductStoreConfigsInput) {
    const normalizedStoreConfigs = Array.from(
      new Map(
        (input.storeConfigs || [])
          .filter((item) => item.storeId)
          .map((item) => [
            item.storeId,
            {
              ...item,
              channelStatus: item.sellStatus === 'sellable' ? 'on' : 'off',
            } as ProductStoreConfigItem,
          ])
      ).values()
    );

    if (!normalizedStoreConfigs.length) {
      return;
    }

    await this.getProductById(input.productId);
    const products = await this.repository.list();
    const submittedStoreConfigMap = new Map(
      normalizedStoreConfigs.map((item) => [item.storeId, item])
    );

    const nextProducts = products.map((item) => {
      if (item.id !== input.productId) {
        return item;
      }

      const existingStoreIdSet = new Set(
        (item.storeConfigs || []).map((config) => config.storeId)
      );
      const nextStoreConfigs = (item.storeConfigs || []).map((config) => {
        const submittedConfig = submittedStoreConfigMap.get(config.storeId);
        return submittedConfig ? cloneStoreConfig(submittedConfig) : config;
      });

      submittedStoreConfigMap.forEach((config, storeId) => {
        if (existingStoreIdSet.has(storeId)) {
          return;
        }

        nextStoreConfigs.push(cloneStoreConfig(config));
      });

      const nextItem = {
        ...item,
        storeConfigs: nextStoreConfigs,
        status: getProductStatusByStoreConfigs(nextStoreConfigs),
      };

      return this.syncSharedStoreConfigs(item, nextItem);
    });

    await this.repository.save(nextProducts);
  }

  async updateProductStoreChannelConfig(
    input: UpdateProductStoreChannelConfigInput
  ) {
    const product = await this.getProductById(input.productId);

    if (product.sourceType !== 'store' || !product.sourceStoreId) {
      throw new AppError('PRODUCT_SOURCE_MISMATCH', '仅支持本店自建商品管理销售店铺');
    }

    const managedStoreIds = Array.from(
      new Set(
        (input.productPoolStoreConfigs || [])
          .map((item) => item.storeId)
          .filter((storeId) => storeId && storeId !== product.sourceStoreId)
      )
    );

    if (!managedStoreIds.length) {
      return;
    }

    const normalizedStoreChannelConfig = normalizeProductStoreChannelConfig(
      {
        shareMode: 'product_pool',
        storeScope: 'specificStores',
        storeIds: managedStoreIds,
        productPoolStoreConfigs: input.productPoolStoreConfigs,
      },
      undefined,
      [],
      product.skus || [],
      managedStoreIds
    );
    const normalizedManagedConfigs =
      normalizedStoreChannelConfig?.productPoolStoreConfigs || [];
    const managedStoreIdSet = new Set(managedStoreIds);
    const normalizedConfigMap = new Map(
      normalizedManagedConfigs.map((item) => [item.storeId, item])
    );
    const existingShareTargets = normalizeProductShareTargets(product.shareTargets || []);
    const existingShareTargetMap = new Map(
      existingShareTargets.map((item) => [item.storeId, item])
    );
    const now = formatOverrideUpdatedAt();
    const nextShareTargets = [
      ...existingShareTargets.filter((item) => !managedStoreIdSet.has(item.storeId)),
      ...normalizedManagedConfigs.flatMap((item) => {
        if (item.sellStatus !== 'sellable') {
          return [];
        }

        const previousTarget = existingShareTargetMap.get(item.storeId);

        return [
          {
            storeId: item.storeId,
            status: 'referenced' as const,
            sharedAt: previousTarget?.sharedAt || now,
            referencedAt: previousTarget?.referencedAt || now,
            ...(item.sellableSkuIds?.length
              ? { sellableSkuIds: [...item.sellableSkuIds] }
              : {}),
            ...(item.allowSelfPrice ? { allowSelfPrice: true } : {}),
          },
        ];
      }),
    ];
    const submittedStoreConfigMap = new Map(
      managedStoreIds.map((storeId) => {
        const config = normalizedConfigMap.get(storeId);

        return [
          storeId,
          {
            storeId,
            sellStatus:
              config?.sellStatus === 'sellable'
                ? ('sellable' as const)
                : ('unsellable' as const),
            channelStatus:
              config?.sellStatus === 'sellable'
                ? ('on' as const)
                : ('off' as const),
          },
        ];
      })
    );
    const nextStoreConfigs = (product.storeConfigs || []).map((config) =>
      submittedStoreConfigMap.get(config.storeId)
        ? cloneStoreConfig(submittedStoreConfigMap.get(config.storeId)!)
        : config
    );
    const existingStoreIdSet = new Set(
      nextStoreConfigs.map((config) => config.storeId)
    );

    submittedStoreConfigMap.forEach((config, storeId) => {
      if (existingStoreIdSet.has(storeId)) {
        return;
      }

      nextStoreConfigs.push(cloneStoreConfig(config));
    });

    const nextStoreOverrides = {
      ...(product.storeOverrides || {}),
    };

    managedStoreIds.forEach((storeId) => {
      const config = normalizedConfigMap.get(storeId);
      const sellableSkuIdSet = new Set(
        config?.sellStatus === 'sellable' ? config.sellableSkuIds || [] : []
      );
      const unsellableSkuIds = (product.skus || [])
        .filter((sku) => !sellableSkuIdSet.has(sku.id))
        .map((sku) => sku.id);
      const previousOverride = product.storeOverrides?.[storeId]
        ? normalizeProductStoreOverride(storeId, product.storeOverrides[storeId])
        : createDefaultProductStoreOverride(storeId);
      const nextSkuSellStatusOverrides = normalizeProductStoreSkuSellStatusOverrides(
        unsellableSkuIds.map((skuId) => ({
          skuId,
          currentSellStatus: 'unsellable' as const,
        }))
      );
      const nextSkuStatusOverrides = normalizeProductStoreSkuStatusOverrides([]);

      if (
        shouldRemoveStoreOverride({
          priceMode: previousOverride.priceMode,
          stockMode: previousOverride.stockMode,
          nameMode: previousOverride.nameMode,
          carouselMode: previousOverride.carouselMode,
          skuSellStatusOverrides: nextSkuSellStatusOverrides,
          skuStatusOverrides: nextSkuStatusOverrides,
          localSkuItems: previousOverride.localSkuItems,
        })
      ) {
        delete nextStoreOverrides[storeId];
        return;
      }

      nextStoreOverrides[storeId] = {
        ...previousOverride,
        skuSellStatusOverrides: nextSkuSellStatusOverrides,
        skuStatusOverrides: nextSkuStatusOverrides,
        updatedAt: now,
      };
    });

    const nextProducts = (await this.repository.list()).map((item) =>
      item.id === input.productId
        ? {
            ...item,
            shareTargets: nextShareTargets,
            storeChannelConfig: normalizedStoreChannelConfig,
            storeConfigs: nextStoreConfigs,
            storeOverrides: nextStoreOverrides,
            status: getProductStatusByStoreConfigs(nextStoreConfigs),
          }
        : item
    );

    await this.repository.save(nextProducts);
  }

  async publishProductsToStores(input: PublishProductsToStoresInput) {
    const productIds = Array.from(new Set(input.productIds.filter(Boolean)));
    const scopedVisibleStoreIds = Array.from(
      new Set(input.visibleStoreIds.filter(Boolean))
    );
    const targetStoreIds = Array.from(
      new Set(
        (input.targetMode === 'all'
          ? scopedVisibleStoreIds
          : input.targetStoreIds.filter((item) =>
            scopedVisibleStoreIds.includes(item)
          )
        ).filter(Boolean)
      )
    );

    if (!productIds.length) {
      throw new AppError('PRODUCT_EMPTY_SELECTION', '请先选择商品');
    }

    if (!targetStoreIds.length) {
      throw new AppError('PRODUCT_EMPTY_TARGET_STORES', '请至少选择 1 家店铺');
    }

    const nextChannelStatus =
      input.sellStatus === 'sellable' ? ('on' as const) : ('off' as const);
    const productIdSet = new Set(productIds);
    const targetStoreIdSet = new Set(targetStoreIds);
    const products = await this.repository.list();
    let updatedCount = 0;

    const nextProducts = products.map((item) => {
      if (!productIdSet.has(item.id)) {
        return item;
      }

      updatedCount += 1;

      const nextStoreConfigs = item.storeConfigs.map((config) =>
        targetStoreIdSet.has(config.storeId)
          ? {
            ...config,
            sellStatus: input.sellStatus,
            channelStatus: nextChannelStatus,
          }
          : config
      );
      const existingStoreIdSet = new Set(
        nextStoreConfigs.map((config) => config.storeId)
      );

      targetStoreIds.forEach((storeId) => {
        if (existingStoreIdSet.has(storeId)) {
          return;
        }

        nextStoreConfigs.push({
          ...createDefaultProductStoreConfig(storeId),
          sellStatus: input.sellStatus,
          channelStatus: nextChannelStatus,
        });
      });

      const nextItem = {
        ...item,
        storeConfigs: nextStoreConfigs,
        status: getProductStatusByStoreConfigs(nextStoreConfigs),
      };

      return this.syncSharedStoreConfigs(item, nextItem);
    });

    await this.repository.save(nextProducts);
    return updatedCount;
  }

  async updateProductSkuStatuses(input: UpdateProductSkuStatusesInput) {
    const product = await this.getProductById(input.productId);
    const skuIds = Array.from(new Set(input.skuIds.filter(Boolean)));

    if (!input.storeId) {
      throw new AppError('PRODUCT_EMPTY_TARGET_STORES', '缺少目标店铺');
    }

    if (!skuIds.length) {
      return 0;
    }

    const currentSkuMap = new Map(
      getProductCurrentSkus(product, input.storeId).map((sku) => [sku.id, sku])
    );
    const currentSkuIdSet = new Set(currentSkuMap.keys());
    if (skuIds.some((skuId) => !currentSkuIdSet.has(skuId))) {
      throw new AppError('PRODUCT_INVALID_SKU_OVERRIDE', 'SKU 覆盖配置无效');
    }

    const skuIdSet = new Set(skuIds);
    const products = await this.repository.list();
    const updatedAt = formatOverrideUpdatedAt();

    if (product.sourceType === 'store' && product.sourceStoreId === input.storeId) {
      const nextProducts = products.map((item) =>
        item.id === input.productId
          ? {
              ...item,
              skus: (item.skus || []).map((sku) =>
                skuIdSet.has(sku.id)
                  ? (() => {
                    const currentSku = currentSkuMap.get(sku.id);
                    const nextState = resolveNextSkuState(
                      input.action,
                      currentSku?.currentSellStatus || 'sellable'
                    );

                    return {
                      ...sku,
                      sellStatus: nextState.sellStatus,
                      status: nextState.channelStatus,
                    };
                  })()
                  : sku
              ),
            }
          : item
      );

      await this.repository.save(nextProducts);
      return skuIds.length;
    }

    const previousOverride = product.storeOverrides?.[input.storeId]
      ? normalizeProductStoreOverride(input.storeId, product.storeOverrides[input.storeId])
      : createDefaultProductStoreOverride(input.storeId);
    const sourceSkuIdSet = new Set((product.skus || []).map((item) => item.id));
    const localSkuIdSet = new Set(
      Array.from(currentSkuMap.values())
        .filter((item) => item.isLocalSku)
        .map((item) => item.id)
    );
    const sourceUpdateSkuIdSet = new Set(
      skuIds.filter((skuId) => sourceSkuIdSet.has(skuId))
    );
    const localUpdateSkuIdSet = new Set(
      skuIds.filter((skuId) => localSkuIdSet.has(skuId))
    );
    const nextSkuSellStatusOverrides = normalizeProductStoreSkuSellStatusOverrides([
      ...(previousOverride.skuSellStatusOverrides || []).filter(
        (item) => !sourceUpdateSkuIdSet.has(item.skuId)
      ),
      ...(product.skus || []).flatMap((sku) => {
        if (!sourceUpdateSkuIdSet.has(sku.id)) {
          return [];
        }

        const currentSku = currentSkuMap.get(sku.id);
        const nextState = resolveNextSkuState(
          input.action,
          currentSku?.currentSellStatus ||
            getProductSkuBaselineSellStatus(product, sku.id, input.storeId)
        );
        const baselineSellStatus = getProductSkuBaselineSellStatus(
          product,
          sku.id,
          input.storeId
        );

        if (nextState.sellStatus === baselineSellStatus) {
          return [];
        }

        return [
          {
            skuId: sku.id,
            currentSellStatus: nextState.sellStatus,
          },
        ];
      }),
    ]);
    const nextSkuStatusOverrides = normalizeProductStoreSkuStatusOverrides([
      ...(previousOverride.skuStatusOverrides || []).filter(
        (item) => !sourceUpdateSkuIdSet.has(item.skuId)
      ),
      ...(previousOverride.skuStatusOverrides || []).filter(
        (item) => !sourceUpdateSkuIdSet.has(item.skuId)
      ),
    ]);
    const nextLocalSkuItems = (previousOverride.localSkuItems || []).map((item) =>
      localUpdateSkuIdSet.has(item.skuId)
        ? (() => {
            const currentSku = currentSkuMap.get(item.skuId);
            const nextState = resolveNextSkuState(
              input.action,
              currentSku?.currentSellStatus || item.sellStatus
            );

            return {
              ...item,
              sellStatus: nextState.sellStatus,
              status: nextState.channelStatus,
            };
          })()
        : item
    );
    const nextStoreOverrides = {
      ...(product.storeOverrides || {}),
    };

    if (
      shouldRemoveStoreOverride({
        priceMode: previousOverride.priceMode,
        stockMode: previousOverride.stockMode,
        nameMode: previousOverride.nameMode,
        carouselMode: previousOverride.carouselMode,
        skuSellStatusOverrides: nextSkuSellStatusOverrides,
        skuStatusOverrides: nextSkuStatusOverrides,
        localSkuItems: nextLocalSkuItems,
      })
    ) {
      delete nextStoreOverrides[input.storeId];
    } else {
      nextStoreOverrides[input.storeId] = {
        ...previousOverride,
        skuSellStatusOverrides: nextSkuSellStatusOverrides,
        skuStatusOverrides: nextSkuStatusOverrides,
        localSkuItems: nextLocalSkuItems,
        updatedAt,
      };
    }

    const nextProducts = products.map((item) =>
      item.id === input.productId
        ? {
            ...item,
            storeOverrides: nextStoreOverrides,
          }
        : item
    );

    await this.repository.save(nextProducts);
    return skuIds.length;
  }

  async getProductById(id: string) {
    const product = await this.repository.getById(id);
    if (!product) {
      throw new AppError('PRODUCT_NOT_FOUND', '商品不存在');
    }

    return product;
  }

  async updateProductStoreOverride(input: UpdateProductStoreOverrideInput) {
    const product = await this.getProductById(input.productId);

    if (product.sourceType === 'store' && product.sourceStoreId === input.storeId) {
      throw new AppError(
        'PRODUCT_SELF_BUILT',
        '本店自建商品无需设置本店配置'
      );
    }

    const previousOverride = product.storeOverrides?.[input.storeId]
      ? normalizeProductStoreOverride(input.storeId, product.storeOverrides[input.storeId])
      : createDefaultProductStoreOverride(input.storeId);
    const submittedLocalSkuItems = Array.isArray(input.localSkuItems)
      ? input.localSkuItems
      : previousOverride.localSkuItems || [];
    if (product.specMode !== 'multi' && submittedLocalSkuItems.length) {
      throw new AppError(
        'PRODUCT_LOCAL_SKU_NOT_ALLOWED',
        '单规格商品不支持新增 SKU'
      );
    }
    const normalizedLocalSkuItems = normalizeProductStoreLocalSkuItems(
      submittedLocalSkuItems,
      product.skus || []
    );
    if (submittedLocalSkuItems.length !== normalizedLocalSkuItems.length) {
      throw new AppError(
        'PRODUCT_INVALID_LOCAL_SKU',
        '请检查本店新增 SKU 配置'
      );
    }
    const normalizedSkuPriceOverrides =
      input.priceMode === 'independent'
        ? normalizeProductStoreSkuPriceOverrides(input.skuPriceOverrides || [])
        : [];
    const normalizedSkuStockOverrides =
      input.stockMode === 'independent'
        ? normalizeProductStoreSkuStockOverrides(input.skuStockOverrides || [])
        : [];
    const normalizedSkuSellStatusOverrides =
      normalizeProductStoreSkuSellStatusOverrides(
        Array.isArray(input.skuSellStatusOverrides)
          ? input.skuSellStatusOverrides
          : previousOverride.skuSellStatusOverrides || []
      );
    const normalizedSkuStatusOverrides = normalizeProductStoreSkuStatusOverrides(
      Array.isArray(input.skuStatusOverrides)
        ? input.skuStatusOverrides
        : previousOverride.skuStatusOverrides || []
    );
    const requiredSkuIdSet = new Set((product.skus || []).map((item) => item.id));
    const independentPriceRule = getProductIndependentPriceRule(product);
    const allowSelfPrice =
      getProductShareTargetByStoreId(product, input.storeId)?.allowSelfPrice === true;
    const canManageIndependentPrice = independentPriceRule.enabled || allowSelfPrice;
    const skuPriceOverrideMap = new Map(
      normalizedSkuPriceOverrides.map((item) => [item.skuId, item.currentPrice])
    );
    const resolveSubmittedSkuPrice = (skuId: string) =>
      skuPriceOverrideMap.has(skuId)
        ? Number(skuPriceOverrideMap.get(skuId))
        : Number(input.currentPrice);

    if (input.priceMode === 'independent') {
      if (!canManageIndependentPrice) {
        throw new AppError(
          'PRODUCT_INDEPENDENT_PRICE_DISABLED',
          '源商品未开放独立售价'
        );
      }

      const hasAllSkuPrices = (product.skus || []).every((sku) => {
        if (skuPriceOverrideMap.has(sku.id)) {
          return true;
        }

        return (
          product.specMode !== 'multi' &&
          Number.isFinite(input.currentPrice) &&
          Number(input.currentPrice) >= 0
        );
      });

      if (
        !hasAllSkuPrices ||
        normalizedSkuPriceOverrides.some(
          (item) => !requiredSkuIdSet.has(item.skuId)
        )
      ) {
        throw new AppError('PRODUCT_INVALID_SKU_PRICE', '请填写完整的规格售价');
      }

      if (independentPriceRule.enabled) {
        const outOfRangeSku = (product.skus || []).find((sku) => {
          const currentPrice = resolveSubmittedSkuPrice(sku.id);
          const skuRule = getProductSkuIndependentPriceRule(product, sku.id);

          if (!Number.isFinite(currentPrice) || currentPrice < 0) {
            return true;
          }

          if (
            typeof skuRule?.minPrice === 'number' &&
            currentPrice < skuRule.minPrice
          ) {
            return true;
          }

          return (
            typeof skuRule?.maxPrice === 'number' &&
            currentPrice > skuRule.maxPrice
          );
        });

        if (outOfRangeSku) {
          throw new AppError(
            'PRODUCT_SKU_PRICE_OUT_OF_RANGE',
            '独立售价超出源商品允许的价格区间'
          );
        }
      }
    }

    if (
      normalizedSkuStockOverrides.some((item) => !requiredSkuIdSet.has(item.skuId)) ||
      normalizedSkuSellStatusOverrides.some((item) => !requiredSkuIdSet.has(item.skuId)) ||
      normalizedSkuStatusOverrides.some((item) => !requiredSkuIdSet.has(item.skuId))
    ) {
      throw new AppError('PRODUCT_INVALID_SKU_OVERRIDE', 'SKU 覆盖配置无效');
    }

    if (
      input.nameMode === 'override' &&
      (!input.overrideName || !input.overrideName.trim())
    ) {
      throw new AppError('PRODUCT_INVALID_NAME', '请输入本店名称');
    }

    const nextStoreOverrides = {
      ...(product.storeOverrides || {}),
    };
    const normalizedImages = normalizeProductCarouselImages(
      input.overrideCarouselImages || []
    );
    const removeOverride = shouldRemoveStoreOverride({
      priceMode: input.priceMode,
      stockMode: input.stockMode,
      nameMode: input.nameMode,
      carouselMode: input.carouselMode,
      skuSellStatusOverrides: normalizedSkuSellStatusOverrides,
      skuStatusOverrides: normalizedSkuStatusOverrides,
      localSkuItems: normalizedLocalSkuItems,
    });

    if (removeOverride) {
      delete nextStoreOverrides[input.storeId];
    } else {
      const submittedSkuPrices = [
        ...(product.skus || []).map((sku) => resolveSubmittedSkuPrice(sku.id)),
        ...normalizedLocalSkuItems.map((item) => item.price),
      ];
      const nextCurrentPrice =
        input.priceMode === 'independent' && submittedSkuPrices.length
          ? Math.min(...submittedSkuPrices)
          : undefined;

      nextStoreOverrides[input.storeId] = {
        storeId: input.storeId,
        priceMode: input.priceMode,
        stockMode: input.stockMode,
        currentPrice: nextCurrentPrice,
        skuPriceOverrides: normalizedSkuPriceOverrides,
        skuStockOverrides: normalizedSkuStockOverrides,
        skuSellStatusOverrides: normalizedSkuSellStatusOverrides,
        skuStatusOverrides: normalizedSkuStatusOverrides,
        localSkuItems: normalizedLocalSkuItems,
        nameMode: input.nameMode,
        overrideName:
          input.nameMode === 'override' ? input.overrideName?.trim() : undefined,
        carouselMode: input.carouselMode,
        overrideCarouselImages:
          input.carouselMode === 'override' ? normalizedImages : [],
        updatedAt: formatOverrideUpdatedAt(),
      };
    }

    const products = await this.repository.list();
    const nextProducts = products.map((item) =>
      item.id === input.productId
        ? {
            ...item,
            storeOverrides: nextStoreOverrides,
          }
        : item
    );

    await this.repository.save(nextProducts);
  }
}
