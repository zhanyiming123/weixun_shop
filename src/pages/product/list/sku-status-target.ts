import {
  buildProductListItem,
  resolveProductSourceStoreMeta,
} from '@/lib/product';
import type { OrganizationItem } from '@/pages/enterprise/organization/data';
import type { ProductStoreItem } from '../store-config/data';
import type {
  OrganizationScope,
  ProductItem,
  ProductListItem,
} from '@/types/product';

function getSalesStatusCounts(product: ProductItem, visibleStoreIds: string[]) {
  const visibleStoreIdSet = new Set(visibleStoreIds);
  const selling = (product.storeConfigs || []).filter(
    (item) => visibleStoreIdSet.has(item.storeId) && item.sellStatus === 'sellable'
  ).length;

  return {
    selling,
    off: Math.max(visibleStoreIds.length - selling, 0),
  };
}

export function buildSkuStatusTarget(
  product: ProductItem,
  organizationScope: OrganizationScope,
  visibleStoreIds: string[],
  sourceStoreItems: ProductStoreItem[],
  organizationItems: OrganizationItem[]
): ProductListItem {
  return buildProductListItem(product, organizationScope, visibleStoreIds, {
    ...resolveProductSourceStoreMeta(product, sourceStoreItems, organizationItems),
    salesStatusCounts: getSalesStatusCounts(product, visibleStoreIds),
  });
}
