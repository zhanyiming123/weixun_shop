import type {
  ProductComboOptionItem,
  ProductComboOptionProductItem,
} from '@/types/product';

export const DEFAULT_COMBO_OPTION_PRODUCT_REQUIRED = false;
export const DEFAULT_COMBO_OPTION_PRODUCT_LISTED = true;
export type ComboOptionProductMoveDirection = 'up' | 'down';

export function createComboOptionProductItem(
  productId: string,
  skuId: string,
  comboPrice?: number
): ProductComboOptionProductItem {
  return {
    productId,
    skuId,
    comboPrice,
    quantity: 1,
    required: DEFAULT_COMBO_OPTION_PRODUCT_REQUIRED,
    listed: DEFAULT_COMBO_OPTION_PRODUCT_LISTED,
  };
}

export function canRemoveComboOptionProduct(
  skuId: string,
  nonRemovableSkuIds: readonly string[] = []
) {
  return !nonRemovableSkuIds.includes(skuId);
}

export function preserveNonRemovableComboOptionSkuIds(
  nextSkuIds: string[],
  nonRemovableSkuIds: readonly string[] = []
) {
  const seenSkuIdSet = new Set(nextSkuIds);

  return [
    ...nextSkuIds,
    ...nonRemovableSkuIds.filter((skuId) => {
      if (seenSkuIdSet.has(skuId)) {
        return false;
      }

      seenSkuIdSet.add(skuId);
      return true;
    }),
  ];
}

export function moveComboOptionProductItem(
  items: ProductComboOptionProductItem[],
  skuId: string,
  direction: ComboOptionProductMoveDirection
) {
  const currentIndex = items.findIndex((item) => item.skuId === skuId);

  if (currentIndex === -1) {
    return items;
  }

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

  if (targetIndex < 0 || targetIndex >= items.length) {
    return items;
  }

  const nextItems = [...items];
  const [movedItem] = nextItems.splice(currentIndex, 1);
  nextItems.splice(targetIndex, 0, movedItem);

  return nextItems;
}

export function syncComboOptionProductRequiredState<
  T extends Pick<ProductComboOptionProductItem, 'required'>
>(optionRequired: boolean, items: T[]) {
  return items.map((item) =>
    optionRequired || item.required === false
      ? { ...item }
      : {
          ...item,
          required: false,
        }
  );
}

export function getRequiredComboOptionSkuTypeCount(
  option: Pick<ProductComboOptionItem, 'items'>
) {
  return option.items.filter((item) => item.required).length;
}

export function canEnableComboOptionProductRequired(
  option: Pick<ProductComboOptionItem, 'selectionLimit' | 'items'>,
  skuId: string
) {
  const targetItem = option.items.find((item) => item.skuId === skuId);

  if (!targetItem || targetItem.required) {
    return true;
  }

  return getRequiredComboOptionSkuTypeCount(option) + 1 <= option.selectionLimit;
}

export function getListedComboOptionProductCount(
  option: Pick<ProductComboOptionItem, 'items'>
) {
  return option.items.filter((item) => item.listed !== false).length;
}

export function getDisableComboOptionProductListedError(
  option: Pick<ProductComboOptionItem, 'selectionLimit' | 'items'>,
  skuId: string
) {
  const targetItem = option.items.find((item) => item.skuId === skuId);

  if (!targetItem || targetItem.listed === false) {
    return '';
  }

  if (targetItem.required) {
    return '必选商品不允许下架';
  }

  if (getListedComboOptionProductCount(option) <= option.selectionLimit) {
    return '当前上架商品数量不可小于选择限制数量';
  }

  return '';
}

export function getComboOptionSelectionLimitError(
  option: Pick<ProductComboOptionItem, 'items'>,
  nextSelectionLimit: number
) {
  if (!option.items.length) {
    return '';
  }

  if (getListedComboOptionProductCount(option) < nextSelectionLimit) {
    return '当前上架商品数量不足';
  }

  if (getRequiredComboOptionSkuTypeCount(option) > nextSelectionLimit) {
    return '当前必选商品种类过多';
  }

  return '';
}

export function normalizeComboOptionSelectionLimit(
  option: Pick<ProductComboOptionItem, 'selectionLimit' | 'items'>
) {
  const listedCount = getListedComboOptionProductCount(option);

  if (!option.items.length) {
    return 1;
  }

  if (listedCount < 1) {
    return 1;
  }

  return Math.min(option.selectionLimit, listedCount);
}
