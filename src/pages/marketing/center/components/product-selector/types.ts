import { ProductStatus } from '@/pages/product/list/data';

export type MarketingProductSelectorRowType = 'spu' | 'sku';
export type MarketingProductSelectorTab = 'all' | 'selected';

export type MarketingProductSelectorSkuItem = {
  key: string;
  rowType: 'sku';
  productId: string;
  productName: string;
  productCatalogId: string;
  productCatalogLabel: string;
  productOwnershipId: string;
  productOwnershipLabel: string;
  skuId: string;
  specText: string;
  specSummary: string;
  price: number;
  stock: number;
  status: ProductStatus;
  selectable: boolean;
  disabledReason: string;
};

export type MarketingProductSelectorSpuItem = {
  key: string;
  rowType: 'spu';
  productId: string;
  productName: string;
  productCatalogId: string;
  productCatalogLabel: string;
  productOwnershipId: string;
  productOwnershipLabel: string;
  specSummary: string;
  price: number;
  stock: number;
  status: ProductStatus;
  selectable: boolean;
  disabledReason: string;
  children: MarketingProductSelectorSkuItem[];
};

export type MarketingProductSelectorTableItem =
  | MarketingProductSelectorSpuItem
  | MarketingProductSelectorSkuItem;

export type MarketingProductSelectorFilterValues = {
  keyword: string;
  productCatalogId?: string;
  productOwnershipId?: string;
  status?: ProductStatus;
};
