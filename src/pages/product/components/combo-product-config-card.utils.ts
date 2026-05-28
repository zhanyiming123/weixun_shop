import type {
  ProductComboOptionItem,
  ProductComboOptionProductItem,
  ProductComboOptionType,
  ProductListItem,
} from '@/types/product';

export const DEFAULT_COMBO_OPTION_PRODUCT_REQUIRED = false;
export const DEFAULT_COMBO_OPTION_PRODUCT_LISTED = true;
export type ComboOptionProductMoveDirection = 'up' | 'down';

export type ComboTrialRow = {
  key: string;
  leftSkuId: string;
  rightSkuId: string;
  leftProductName: string;
  rightProductName: string;
  leftSpecText: string;
  rightSpecText: string;
  leftUnitPrice: number;
  rightUnitPrice: number;
  leftQuantity: number;
  rightQuantity: number;
  leftSubtotal: number;
  rightSubtotal: number;
  totalPrice: number;
  isDefaultCombination: boolean;
};

export type ComboTrialResult = {
  supported: boolean;
  reason?: string;
  rows: ComboTrialRow[];
};

export type ComboTrialTableRow = {
  key: string;
  comboIndex: number;
  productName: string;
  skuId: string;
  specText: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  totalPrice: number;
  rowSpan: number;
  isSummaryRow: boolean;
  isDefaultCombination: boolean;
};

export function getComboOptionType(option: Pick<ProductComboOptionItem, 'optionType' | 'required' | 'selectionLimit' | 'items'>): ProductComboOptionType {
  if (option.optionType) {
    return option.optionType;
  }

  if (option.required === false) {
    return 'add_on';
  }

  const requiredItemCount = option.items.filter((item) => item.required).length;
  if (requiredItemCount > 0 && requiredItemCount === option.items.length) {
    return 'must_buy';
  }

  return 'selective';
}

export function isMustBuyComboOption(
  option: Pick<ProductComboOptionItem, 'optionType' | 'required' | 'selectionLimit' | 'items'>
) {
  return getComboOptionType(option) === 'must_buy';
}

export function getComboOptionRequiredByType(optionType: ProductComboOptionType) {
  return optionType !== 'add_on';
}

export function syncComboOptionItemsByType<
  T extends Pick<ProductComboOptionProductItem, 'required' | 'listed'> & {
    defaultSelected?: boolean;
  }
>(optionType: ProductComboOptionType, items: T[]) {
  return items.map((item) => {
    if (optionType === 'must_buy') {
      return {
        ...item,
        required: true,
        listed: true,
        defaultSelected: true,
      };
    }

    return {
      ...item,
      required: false,
    };
  });
}

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

export function getComboOptionDefaultSelectedCount(
  option: Pick<ProductComboOptionItem, 'items'>
) {
  return option.items.filter(
    (item) => item.listed !== false && (item.required || item.defaultSelected === true)
  ).length;
}

export function getComboTrialDefaultSelectionError(
  options: ProductComboOptionItem[]
) {
  const hasInvalidOption = options.some(
    (option) => getComboOptionDefaultSelectedCount(option) !== option.selectionLimit
  );

  return hasInvalidOption ? '请配置全部选项卡的默认选中商品' : '';
}

function getComboTrialOptionLabel(
  option: Pick<ProductComboOptionItem, 'title'>,
  index: number
) {
  return option.title || `选项${index + 1}`;
}

function createUnsupportedComboTrialResult(reason: string): ComboTrialResult {
  return {
    supported: false,
    reason,
    rows: [],
  };
}

function getListedComboTrialItems(option: Pick<ProductComboOptionItem, 'items'>) {
  return option.items.filter((item) => item.listed !== false);
}

function getComboTrialRowProductMeta(
  item: Pick<ProductComboOptionProductItem, 'productId' | 'skuId'>,
  products: ProductListItem[]
) {
  const product = products.find((candidate) => candidate.id === item.productId);
  const sku = product?.skus.find((candidate) => candidate.id === item.skuId);

  return {
    productName: product?.name || item.productId,
    specText:
      product?.specMode === 'multi' ? sku?.specText || '默认规格' : '单规格',
  };
}

export function buildComboTrialResult(
  options: ProductComboOptionItem[],
  products: ProductListItem[]
): ComboTrialResult {
  if (options.length !== 2) {
    return createUnsupportedComboTrialResult('当前仅支持 2 个选项卡试算');
  }

  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    const optionLabel = getComboTrialOptionLabel(option, index);
    const optionType = getComboOptionType(option);
    const listedItems = getListedComboTrialItems(option);

    if (optionType !== 'must_buy' && option.selectionLimit !== 1) {
      return createUnsupportedComboTrialResult('当前仅支持每个选项卡选择 1 份的试算');
    }

    if (getRequiredComboOptionSkuTypeCount(option) > 1) {
      return createUnsupportedComboTrialResult(
        `${optionLabel}存在多个必选商品，暂不支持试算`
      );
    }

    if (optionType === 'must_buy' && listedItems.length !== 1) {
      return createUnsupportedComboTrialResult('当前仅支持每个选项卡选择 1 份的试算');
    }

    if (!listedItems.length) {
      return createUnsupportedComboTrialResult(`${optionLabel}暂无上架商品，无法试算`);
    }
  }

  const [leftOption, rightOption] = options;
  const leftItems = getListedComboTrialItems(leftOption);
  const rightItems = getListedComboTrialItems(rightOption);

  const rows = leftItems.flatMap((leftItem) => {
    const leftMeta = getComboTrialRowProductMeta(leftItem, products);
    const leftUnitPrice = leftItem.comboPrice ?? 0;
    const leftSubtotal = leftUnitPrice * leftItem.quantity;
    const leftDefaultSelected = leftItem.required || leftItem.defaultSelected === true;

    return rightItems.map((rightItem) => {
      const rightMeta = getComboTrialRowProductMeta(rightItem, products);
      const rightUnitPrice = rightItem.comboPrice ?? 0;
      const rightSubtotal = rightUnitPrice * rightItem.quantity;
      const rightDefaultSelected = rightItem.required || rightItem.defaultSelected === true;

      return {
        key: `${leftItem.skuId}__${rightItem.skuId}`,
        leftSkuId: leftItem.skuId,
        rightSkuId: rightItem.skuId,
        leftProductName: leftMeta.productName,
        rightProductName: rightMeta.productName,
        leftSpecText: leftMeta.specText,
        rightSpecText: rightMeta.specText,
        leftUnitPrice,
        rightUnitPrice,
        leftQuantity: leftItem.quantity,
        rightQuantity: rightItem.quantity,
        leftSubtotal,
        rightSubtotal,
        totalPrice: leftSubtotal + rightSubtotal,
        isDefaultCombination: leftDefaultSelected && rightDefaultSelected,
      };
    });
  });

  return {
    supported: true,
    rows,
  };
}

export function buildComboTrialTableRows(
  rows: ComboTrialRow[]
): ComboTrialTableRow[] {
  return rows.flatMap((row, index) => [
    {
      key: `${row.key}__left`,
      comboIndex: index + 1,
      productName: row.leftProductName,
      skuId: row.leftSkuId,
      specText: row.leftSpecText,
      unitPrice: row.leftUnitPrice,
      quantity: row.leftQuantity,
      subtotal: row.leftSubtotal,
      totalPrice: row.totalPrice,
      rowSpan: 2,
      isSummaryRow: true,
      isDefaultCombination: row.isDefaultCombination,
    },
    {
      key: `${row.key}__right`,
      comboIndex: index + 1,
      productName: row.rightProductName,
      skuId: row.rightSkuId,
      specText: row.rightSpecText,
      unitPrice: row.rightUnitPrice,
      quantity: row.rightQuantity,
      subtotal: row.rightSubtotal,
      totalPrice: row.totalPrice,
      rowSpan: 0,
      isSummaryRow: false,
      isDefaultCombination: row.isDefaultCombination,
    },
  ]);
}
