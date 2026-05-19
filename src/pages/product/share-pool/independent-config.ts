import type { ProductSharePoolItem } from '@/types/product';

export function canShowIndependentPriceTag(product: ProductSharePoolItem) {
  return (
    product.independentPriceRule?.enabled === true ||
    product.shareTarget.allowSelfPrice === true
  );
}

export function getIndependentConfigLabel(product: ProductSharePoolItem) {
  return canShowIndependentPriceTag(product) ? '允许独立售价' : '--';
}
