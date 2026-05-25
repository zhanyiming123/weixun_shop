import type { ProductComboDisplayOption } from '@/types/product';

export function formatComboSubProductSummary(
  options: ProductComboDisplayOption[] = []
) {
  return options
    .map(
      (option) =>
        `${option.title}（选 ${option.selectionLimit} 份）：${option.productNames.join('、')}`
    )
    .join('；');
}

export function formatComboStockDisplay() {
  return '无限';
}
