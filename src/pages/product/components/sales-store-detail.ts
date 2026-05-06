import { getProductCurrentSkus } from '@/lib/product';
import {
  readProductStoreItems,
  type ProductStoreItem,
} from '@/pages/product/store-config/data';
import type { ProductItem, ProductStoreSkuViewItem } from '@/types/product';

export type ProductSalesStoreRow = {
  key: string;
  storeId: string;
  storeName: string;
  skuNamesText: string;
};

function getStoreName(storeId: string, storeItems: ProductStoreItem[]) {
  return storeItems.find((item) => item.id === storeId)?.name || storeId;
}

function getSkuLabel(
  product: Pick<ProductItem, 'specMode'>,
  sku: Pick<ProductStoreSkuViewItem, 'specText'>,
  index: number
) {
  return sku.specText || (product.specMode === 'single' ? '默认规格' : `规格${index + 1}`);
}

export function buildProductSalesStoreRows(
  product: ProductItem,
  storeItems: ProductStoreItem[] = readProductStoreItems()
) {
  return (product.storeConfigs || [])
    .filter((item) => item.sellStatus === 'sellable')
    .map((config) => {
      const sellableSkus = getProductCurrentSkus(product, config.storeId).filter(
        (sku) => sku.currentSellStatus === 'sellable'
      );

      return {
        key: config.storeId,
        storeId: config.storeId,
        storeName: getStoreName(config.storeId, storeItems),
        skuNamesText: sellableSkus.length
          ? sellableSkus
              .map((sku, index) => getSkuLabel(product, sku, index))
              .join('、')
          : '--',
      };
    });
}

export function getProductSalesStoreCount(
  product: ProductItem,
  storeItems: ProductStoreItem[] = readProductStoreItems()
) {
  return buildProductSalesStoreRows(product, storeItems).length;
}
