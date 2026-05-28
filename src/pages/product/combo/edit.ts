import qs from 'query-string';
import { getProductCurrentStoreId } from '@/lib/product';
import type {
  OrganizationScope,
  ProductItem,
  ProductListItem,
} from '@/types/product';

type ComboEditableProduct = Pick<ProductItem, 'sourceStoreId'> & {
  productKind?: ProductItem['productKind'];
};

export type ComboProductCreateActionMode = 'edit' | 'copy';

export function canEditComboProduct(
  product: ComboEditableProduct,
  organizationScope: OrganizationScope,
  visibleStoreIds: string[]
) {
  if (product.productKind !== 'combo') {
    return false;
  }

  const currentStoreId = getProductCurrentStoreId(organizationScope, visibleStoreIds);
  return !currentStoreId || product.sourceStoreId === currentStoreId;
}

export function buildComboProductCreateLocation(
  mode: ComboProductCreateActionMode,
  sourceProduct: ProductListItem
) {
  return {
    pathname: '/product/combo/create',
    search: `?${qs.stringify({
      mode,
      sourceId: sourceProduct.id,
    })}`,
    state: {
      mode,
      sourceProduct,
    },
  };
}
