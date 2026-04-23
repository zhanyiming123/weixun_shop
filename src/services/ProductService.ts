import { ProductRepository } from '@/repositories/ProductRepository';
import { AppError } from '@/lib/errors';
import { filterDataByScope } from '@/utils/useDataScopeFilter';
import {
  buildProductListItem,
  getProductStatusByStoreConfigs,
  hasProductStoreIntersection,
  getProductIndependentPriceRule,
  getProductSkuIndependentPriceRule,
  normalizeProductCarouselImages,
  normalizeProductStoreSkuPriceOverrides,
  resolveProductSourceStoreMeta,
} from '@/lib/product';
import { readOrganizationItems } from '@/pages/enterprise/organization/data';
import {
  createDefaultProductStoreConfig,
  readProductStoreItems,
} from '@/pages/product/store-config/data';
import type {
  PublishProductsToStoresInput,
  ProductFilterValues,
  ProductItem,
  ProductListItem,
  ProductListQuery,
  ProductListResult,
  ProductStatus,
  ProductStoreConfigItem,
  ProductTab,
  UpdateProductStoreChannelStatusInput,
  UpdateProductStoreOverrideInput,
} from '@/types/product';

function getDateTimestamp(dateTime: string) {
  return new Date(dateTime.replace(' ', 'T')).getTime();
}

function getRangeBoundary(date: string, endOfDay = false) {
  const suffix = endOfDay ? '23:59:59' : '00:00:00';
  return new Date(`${date}T${suffix}`).getTime();
}

function getProductListDisplayStatus(item: ProductListItem): ProductStatus {
  if (item.storeView.currentStoreId) {
    return item.storeView.currentStoreChannelStatus === 'on' ? 'on' : 'off';
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

function applyFilters(products: ProductListItem[], filters: ProductFilterValues) {
  const keyword = filters.keyword.trim().toLowerCase();
  const sourceStoreIdSet = new Set(filters.sourceStoreIds || []);

  return products.filter((item) => {
    if (keyword) {
      const target =
        filters.searchType === 'productId'
          ? item.id.toLowerCase()
          : `${item.name} ${item.storeView.currentName}`.toLowerCase();
      if (!target.includes(keyword)) {
        return false;
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

function getSalesStatusCounts(
  product: ProductItem,
  visibleStoreIds: string[]
) {
  const visibleStoreIdSet = new Set(visibleStoreIds);
  const selling = (product.storeConfigs || []).filter(
    (item) =>
      visibleStoreIdSet.has(item.storeId) &&
      item.sellStatus === 'sellable' &&
      item.channelStatus === 'on'
  ).length;

  return {
    selling,
    off: Math.max(visibleStoreIds.length - selling, 0),
  };
}

function paginateProducts(products: ProductListItem[], page: number, pageSize: number) {
  const normalizedPage = Math.max(1, page || 1);
  const normalizedPageSize = Math.max(1, pageSize || 10);
  const start = (normalizedPage - 1) * normalizedPageSize;

  return products.slice(start, start + normalizedPageSize);
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

export class ProductService {
  private repository = new ProductRepository();

  queryList(input: ProductListQuery): ProductListResult {
    const allProducts = this.repository.readSnapshot();
    const allStoreItems = readProductStoreItems();
    const sourceStoreItems = allStoreItems.filter((item) => item.type === 'store');
    const organizationItems = readOrganizationItems().filter(
      (item) => item.status === 'enabled'
    );
    const scopedProducts =
      input.organizationScope === 'headquarter'
        ? allProducts
        : allProducts.filter((item) =>
          hasProductStoreIntersection(item.storeConfigs, input.visibleStoreIds)
        );
    const projectedProducts = scopedProducts.map((item) =>
      buildProductListItem(item, input.organizationScope, input.visibleStoreIds, {
        ...resolveProductSourceStoreMeta(item, sourceStoreItems, organizationItems),
        salesStatusCounts: getSalesStatusCounts(item, input.visibleStoreIds),
      })
    );

    const filteredProducts = applyFilters(projectedProducts, input.filters);
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

          if (config.sellStatus !== 'sellable') {
            return {
              ...config,
              channelStatus: 'off',
            };
          }

          return {
            ...config,
            channelStatus: input.channelStatus,
          };
        }
      );

      updatedCount += 1;

      return {
        ...item,
        storeConfigs: nextStoreConfigs,
        status: getProductStatusByStoreConfigs(nextStoreConfigs),
      };
    });

    await this.repository.save(nextProducts);
    return updatedCount;
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
      input.sellStatus === 'unsellable' ? 'off' : input.channelStatus;
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

      return {
        ...item,
        storeConfigs: nextStoreConfigs,
        status: getProductStatusByStoreConfigs(nextStoreConfigs),
      };
    });

    await this.repository.save(nextProducts);
    return updatedCount;
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
        '本店自建商品无需设置独立售价'
      );
    }

    const normalizedSkuPriceOverrides = normalizeProductStoreSkuPriceOverrides(
      input.skuPriceOverrides || []
    );
    const requiredSkuIdSet = new Set((product.skus || []).map((item) => item.id));
    const independentPriceRule = getProductIndependentPriceRule(product);
    const skuPriceOverrideMap = new Map(
      normalizedSkuPriceOverrides.map((item) => [item.skuId, item.currentPrice])
    );
    const resolveSubmittedSkuPrice = (skuId: string) =>
      skuPriceOverrideMap.has(skuId)
        ? Number(skuPriceOverrideMap.get(skuId))
        : Number(input.currentPrice);

    if (input.priceMode === 'independent') {
      if (!independentPriceRule.enabled) {
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
    const shouldRemoveOverride =
      input.priceMode === 'follow' &&
      input.nameMode === 'follow' &&
      input.carouselMode === 'follow';

    if (shouldRemoveOverride) {
      delete nextStoreOverrides[input.storeId];
    } else {
      const submittedSkuPrices = (product.skus || []).map((sku) =>
        resolveSubmittedSkuPrice(sku.id)
      );
      const nextCurrentPrice =
        input.priceMode === 'independent' && submittedSkuPrices.length
          ? Math.min(...submittedSkuPrices)
          : undefined;

      nextStoreOverrides[input.storeId] = {
        storeId: input.storeId,
        priceMode: input.priceMode,
        currentPrice: nextCurrentPrice,
        skuPriceOverrides:
          input.priceMode === 'independent' ? normalizedSkuPriceOverrides : [],
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
