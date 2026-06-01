import type {
  ProductComboOptionItem,
  ProductComboOptionType,
  ProductCarouselImage,
  ProductStatus,
  ProductStoreSellStatus,
  ProductStoreSkuViewItem,
} from '@/types/product';

export type StoreSettingSpecField = {
  key: string;
  label: string;
  named: boolean;
};

export type StoreSettingSpecDimension = StoreSettingSpecField & {
  sourceValues: string[];
  localValues: string[];
};

export type StoreSettingLocalSpecValueMap = Record<string, string[]>;

export type StoreSettingLocalSkuDraftRow = {
  skuId: string;
  specText: string;
  specValues: string[];
  price?: number;
  stock?: number;
  sellStatus: ProductStoreSellStatus;
  status: ProductStatus;
  image?: ProductCarouselImage;
  isDefaultSelected?: boolean;
};

export type StoreSettingLegacyLocalSkuIssue = StoreSettingLocalSkuDraftRow & {
  reason: string;
};

export type StoreSettingLocalSkuRestoreResult = {
  localSpecValuesByField: StoreSettingLocalSpecValueMap;
  localSkuRows: StoreSettingLocalSkuDraftRow[];
  legacyIssues: StoreSettingLegacyLocalSkuIssue[];
};

export type StoreSettingSourceSkuConfigState =
  | {
      mode: 'price';
      hint: string;
    }
  | {
      mode: 'empty';
      emptyText: string;
    };

export function resolveStoreSettingSourceSkuConfigState(
  canManageIndependentPrice: boolean
): StoreSettingSourceSkuConfigState {
  if (canManageIndependentPrice) {
    return {
      mode: 'price',
      hint: '源 SKU 保持只读，仅支持调整独立售价。',
    };
  }

  return {
    mode: 'empty',
    emptyText: '该商品无自定义配置项。',
  };
}

export const COMBO_STORE_SETTING_EDITABLE_FIELDS = [
  'comboPrice',
  'listed',
  'defaultSelected',
] as const;
export const COMBO_STORE_SETTING_LISTED_LIMIT_ERROR_MESSAGE =
  '下架商品不可少于选择限制数量';
export const COMBO_STORE_SETTING_DEFAULT_SELECTED_LIMIT_ERROR_MESSAGE =
  '默认选中数量需等于选择限制数量';

export type ComboStoreSettingSectionField = {
  key: 'title' | 'optionType' | 'selectionLimit';
  label: string;
  value: string;
  displayMode: 'text';
};

export type ComboStoreSettingSectionRow = {
  key: string;
  optionId: string;
  optionType: ProductComboOptionType;
  selectionLimit: number;
  productId: string;
  skuId: string;
  productName: string;
  specText: string;
  originalPrice?: number;
  comboPrice?: number;
  quantity: number;
  subtotal: number;
  defaultSelected: boolean;
  defaultSelectedText: string;
  listed: boolean;
};

export type ComboStoreSettingSection = {
  optionId: string;
  title: string;
  fields: ComboStoreSettingSectionField[];
  rows: ComboStoreSettingSectionRow[];
};

export function getComboStoreSettingOptionTypeLabel(
  optionType: ProductComboOptionType | undefined
) {
  if (optionType === 'must_buy') {
    return '必购项';
  }

  if (optionType === 'add_on') {
    return '加购项';
  }

  return '选购项';
}

export function canEditComboStoreSettingListed(
  optionType: ProductComboOptionType | undefined
) {
  return optionType !== 'must_buy';
}

export function canEditComboStoreSettingDefaultSelected(
  optionType: ProductComboOptionType | undefined
) {
  return optionType === 'selective';
}

export function validateComboStoreSettingListedChange(
  rows: ComboStoreSettingSectionRow[] = [],
  targetSkuId: string,
  checked: boolean
) {
  if (checked || !rows.length) {
    return '';
  }

  const optionType = rows[0].optionType;

  if (optionType !== 'selective' && optionType !== 'add_on') {
    return '';
  }

  const nextListedCount = rows.filter((row) =>
    row.skuId === targetSkuId ? false : row.listed
  ).length;

  return nextListedCount < rows[0].selectionLimit
    ? COMBO_STORE_SETTING_LISTED_LIMIT_ERROR_MESSAGE
    : '';
}

export function validateComboStoreSettingDefaultSelectedCount(
  rows: ComboStoreSettingSectionRow[] = []
) {
  if (!rows.length || rows[0].optionType !== 'selective') {
    return '';
  }

  const defaultSelectedCount = rows.filter((row) => row.defaultSelected).length;

  return defaultSelectedCount === rows[0].selectionLimit
    ? ''
    : COMBO_STORE_SETTING_DEFAULT_SELECTED_LIMIT_ERROR_MESSAGE;
}

export function buildComboStoreSettingSections(
  options: ProductComboOptionItem[] = []
): ComboStoreSettingSection[] {
  return options.map((option, index) => ({
    optionId: option.id,
    title: `选项${index + 1}`,
    fields: [
      {
        key: 'title',
        label: '选项标题',
        value: option.title,
        displayMode: 'text',
      },
      {
        key: 'optionType',
        label: '选项类型',
        value: getComboStoreSettingOptionTypeLabel(option.optionType),
        displayMode: 'text',
      },
      {
        key: 'selectionLimit',
        label: '选择限制',
        value: `选 ${option.selectionLimit} 份`,
        displayMode: 'text',
      },
    ],
    rows: (option.items || []).map((item) => ({
      key: `${option.id}:${item.skuId}`,
      optionId: option.id,
      optionType: option.optionType || 'selective',
      selectionLimit: option.selectionLimit,
      productId: item.productId,
      skuId: item.skuId,
      productName: item.productName || item.productId,
      specText: item.specText || '默认规格',
      originalPrice: item.originalPrice,
      comboPrice: item.comboPrice,
      quantity: item.quantity,
      subtotal: Number(item.comboPrice || 0) * Number(item.quantity || 0),
      defaultSelected: item.defaultSelected === true,
      defaultSelectedText: item.defaultSelected ? '是' : '否',
      listed: item.listed !== false,
    })),
  }));
}

const SPEC_TEXT_SEGMENT_SPLIT_PATTERN = /\s*[\/／]\s*/;

function splitSpecTextSegments(specText: string) {
  return specText
    .split(SPEC_TEXT_SEGMENT_SPLIT_PATTERN)
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueTrimmedValues(values: string[] = []) {
  const seenValueSet = new Set<string>();

  return values.reduce<string[]>((result, item) => {
    const value = item.trim();

    if (!value || seenValueSet.has(value)) {
      return result;
    }

    seenValueSet.add(value);
    return [...result, value];
  }, []);
}

function buildEmptyLocalSpecValueMap(specFields: StoreSettingSpecField[]) {
  return specFields.reduce<StoreSettingLocalSpecValueMap>((result, field) => {
    result[field.key] = [];
    return result;
  }, {});
}

function parseNamedSpecText(specText: string) {
  const segments = splitSpecTextSegments(specText);

  if (!segments.length) {
    return [];
  }

  const parsedSegments = segments.map((segment) => {
    const separatorIndex = segment.includes('：')
      ? segment.indexOf('：')
      : segment.indexOf(':');

    if (separatorIndex <= 0) {
      return null;
    }

    const label = segment.slice(0, separatorIndex).trim();
    const value = segment.slice(separatorIndex + 1).trim();

    if (!label) {
      return null;
    }

    return {
      label,
      value,
    };
  });

  return parsedSegments.every(Boolean)
    ? (parsedSegments as Array<{ label: string; value: string }>)
    : null;
}

function buildSourceSpecTextSet(
  skus: Array<Pick<ProductStoreSkuViewItem, 'specText'>>,
  specFields: StoreSettingSpecField[]
) {
  return new Set(
    skus
      .map((item) => normalizeStoreSettingLocalSkuSpecText(item.specText, specFields))
      .filter(Boolean)
  );
}

function buildSourceSpecValueMap(
  skus: Array<Pick<ProductStoreSkuViewItem, 'specText'>>,
  specFields: StoreSettingSpecField[]
) {
  return skus.reduce<Record<string, string[]>>((result, sku) => {
    const specValues = parseStoreSettingLocalSkuSpecValues(
      normalizeStoreSettingLocalSkuSpecText(sku.specText, specFields),
      specFields
    );

    specFields.forEach((field, index) => {
      const nextValue = specValues[index]?.trim() || '';

      if (!nextValue) {
        return;
      }

      const currentValues = result[field.key] || [];

      if (!currentValues.includes(nextValue)) {
        result[field.key] = [...currentValues, nextValue];
      }
    });

    return result;
  }, {});
}

function isRestorableLocalSkuSpecValues(
  specValues: string[],
  specFields: StoreSettingSpecField[]
) {
  if (!specFields.length) {
    return false;
  }

  if (specFields.length === 1 && !specFields[0].named) {
    return Boolean(specValues[0]?.trim());
  }

  return (
    specValues.length === specFields.length &&
    specValues.every((item) => Boolean(item.trim()))
  );
}

export function buildStoreSettingSpecFields(
  skus: Array<Pick<ProductStoreSkuViewItem, 'specText'>> = []
): StoreSettingSpecField[] {
  const specTexts = skus
    .map((item) => item.specText.trim())
    .filter(Boolean);

  if (!specTexts.length) {
    return [
      {
        key: 'spec_0',
        label: '规格值',
        named: false,
      },
    ];
  }

  const parsedSpecSets = specTexts.map((item) => parseNamedSpecText(item));
  const firstSpecSet = parsedSpecSets[0];

  if (!firstSpecSet || !firstSpecSet.length) {
    return [
      {
        key: 'spec_0',
        label: '规格值',
        named: false,
      },
    ];
  }

  const hasConsistentNamedSpecs = parsedSpecSets.every(
    (item) =>
      item &&
      item.length === firstSpecSet.length &&
      item.every((segment, index) => segment.label === firstSpecSet[index].label)
  );

  if (!hasConsistentNamedSpecs) {
    return [
      {
        key: 'spec_0',
        label: '规格值',
        named: false,
      },
    ];
  }

  return firstSpecSet.map((item, index) => ({
    key: `spec_${index}`,
    label: item.label,
    named: true,
  }));
}

export function parseStoreSettingLocalSkuSpecValues(
  specText: string,
  specFields: StoreSettingSpecField[]
) {
  if (!specFields.length) {
    return [];
  }

  const trimmedSpecText = specText.trim();

  if (!trimmedSpecText) {
    return specFields.map(() => '');
  }

  if (specFields.length === 1 && !specFields[0].named) {
    return [trimmedSpecText];
  }

  const namedSpecSegments = parseNamedSpecText(trimmedSpecText);

  if (namedSpecSegments && namedSpecSegments.length === specFields.length) {
    return specFields.map((field, index) => {
      const matchedSegment =
        namedSpecSegments.find((item) => item.label === field.label) ||
        namedSpecSegments[index];

      return matchedSegment?.value.trim() || '';
    });
  }

  const rawSegments = splitSpecTextSegments(trimmedSpecText);

  if (rawSegments.length === specFields.length) {
    return rawSegments.map((item) => item.trim());
  }

  return specFields.map((_, index) => (index === 0 ? trimmedSpecText : ''));
}

export function buildStoreSettingLocalSkuSpecText(
  specValues: string[],
  specFields: StoreSettingSpecField[]
) {
  if (!specFields.length) {
    return '';
  }

  const normalizedValues = specFields.map((_, index) =>
    typeof specValues[index] === 'string' ? specValues[index].trim() : ''
  );

  if (specFields.length === 1 && !specFields[0].named) {
    return normalizedValues[0] || '';
  }

  return specFields
    .flatMap((field, index) =>
      normalizedValues[index] ? [`${field.label}：${normalizedValues[index]}`] : []
    )
    .join(' / ');
}

export function normalizeStoreSettingLocalSkuSpecText(
  specText: string,
  specFields: StoreSettingSpecField[]
) {
  const normalizedSpecText = buildStoreSettingLocalSkuSpecText(
    parseStoreSettingLocalSkuSpecValues(specText, specFields),
    specFields
  );

  return normalizedSpecText || specText.trim();
}

export function getStoreSettingLocalSkuSpecValidationError(
  specValues: string[],
  specFields: StoreSettingSpecField[]
) {
  const normalizedValues = specFields.map((_, index) =>
    typeof specValues[index] === 'string' ? specValues[index].trim() : ''
  );
  const missingField = specFields.find((field, index) => !normalizedValues[index]);

  if (!missingField) {
    return '';
  }

  return specFields.length === 1 && !missingField.named
    ? '请输入规格值'
    : `请填写${missingField.label}`;
}

export function buildStoreSettingSpecDimensions(
  skus: Array<Pick<ProductStoreSkuViewItem, 'specText'>> = [],
  localSpecValuesByField: StoreSettingLocalSpecValueMap = {},
  specFields: StoreSettingSpecField[] = buildStoreSettingSpecFields(skus)
) {
  const sourceSpecValueMap = buildSourceSpecValueMap(skus, specFields);

  return specFields.map((field) => {
    const sourceValues = sourceSpecValueMap[field.key] || [];
    const localValues = uniqueTrimmedValues(localSpecValuesByField[field.key] || []).filter(
      (item) => !sourceValues.includes(item)
    );

    return {
      ...field,
      sourceValues,
      localValues,
    };
  });
}

export function buildStoreSettingGeneratedLocalSkuCombos(
  specDimensions: StoreSettingSpecDimension[],
  sourceSkus: Array<Pick<ProductStoreSkuViewItem, 'specText'>> = []
) {
  if (!specDimensions.some((item) => item.localValues.length)) {
    return [] as Array<Pick<StoreSettingLocalSkuDraftRow, 'specText' | 'specValues'>>;
  }

  const specFields = specDimensions.map(({ key, label, named }) => ({
    key,
    label,
    named,
  }));
  const sourceSpecTextSet = buildSourceSpecTextSet(sourceSkus, specFields);
  const seenSpecTextSet = new Set<string>();
  const result: Array<Pick<StoreSettingLocalSkuDraftRow, 'specText' | 'specValues'>> = [];

  function walk(
    dimensionIndex: number,
    currentValues: string[],
    containsLocalValue: boolean
  ) {
    if (dimensionIndex >= specDimensions.length) {
      if (!containsLocalValue) {
        return;
      }

      const specText = buildStoreSettingLocalSkuSpecText(currentValues, specFields);

      if (!specText || sourceSpecTextSet.has(specText) || seenSpecTextSet.has(specText)) {
        return;
      }

      seenSpecTextSet.add(specText);
      result.push({
        specText,
        specValues: [...currentValues],
      });
      return;
    }

    const dimension = specDimensions[dimensionIndex];
    const candidates = [
      ...dimension.sourceValues.map((value) => ({
        value,
        isLocal: false,
      })),
      ...dimension.localValues.map((value) => ({
        value,
        isLocal: true,
      })),
    ];

    candidates.forEach((candidate) => {
      walk(
        dimensionIndex + 1,
        [...currentValues, candidate.value],
        containsLocalValue || candidate.isLocal
      );
    });
  }

  walk(0, [], false);
  return result;
}

export function restoreStoreSettingLocalSkuState(
  sourceSkus: Array<Pick<ProductStoreSkuViewItem, 'specText'>> = [],
  localSkus: Array<
    Omit<StoreSettingLocalSkuDraftRow, 'specValues'> & Partial<Pick<StoreSettingLocalSkuDraftRow, 'specValues'>>
  > = []
): StoreSettingLocalSkuRestoreResult {
  const specFields = buildStoreSettingSpecFields(sourceSkus);
  const sourceSpecTextSet = buildSourceSpecTextSet(sourceSkus, specFields);
  const sourceSpecDimensions = buildStoreSettingSpecDimensions(sourceSkus, {}, specFields);
  const sourceSpecValueMap = sourceSpecDimensions.reduce<Record<string, string[]>>(
    (result, item) => {
      result[item.key] = item.sourceValues;
      return result;
    },
    {}
  );
  const localSpecValuesByField = buildEmptyLocalSpecValueMap(specFields);
  const seenLocalSpecTextSet = new Set<string>();
  const restorableRows: StoreSettingLocalSkuDraftRow[] = [];
  const legacyIssues: StoreSettingLegacyLocalSkuIssue[] = [];

  localSkus.forEach((item) => {
    const specValues = parseStoreSettingLocalSkuSpecValues(item.specText, specFields);
    const normalizedSpecText = buildStoreSettingLocalSkuSpecText(specValues, specFields);
    const baseItem = {
      skuId: item.skuId,
      specText: item.specText.trim(),
      specValues,
      price: item.price,
      stock: item.stock,
      sellStatus: item.sellStatus,
      status: item.status,
      ...(item.image ? { image: { ...item.image } } : {}),
      ...(item.isDefaultSelected ? { isDefaultSelected: true } : {}),
    };

    if (!isRestorableLocalSkuSpecValues(specValues, specFields)) {
      legacyIssues.push({
        ...baseItem,
        reason: '无法按当前源规格结构解析',
      });
      return;
    }

    if (sourceSpecTextSet.has(normalizedSpecText)) {
      legacyIssues.push({
        ...baseItem,
        reason: '规格组合已与源 SKU 重复',
      });
      return;
    }

    if (seenLocalSpecTextSet.has(normalizedSpecText)) {
      legacyIssues.push({
        ...baseItem,
        reason: '本店新增 SKU 组合重复',
      });
      return;
    }

    seenLocalSpecTextSet.add(normalizedSpecText);

    specFields.forEach((field, index) => {
      const nextValue = specValues[index]?.trim() || '';

      if (
        !nextValue ||
        sourceSpecValueMap[field.key]?.includes(nextValue) ||
        localSpecValuesByField[field.key].includes(nextValue)
      ) {
        return;
      }

      localSpecValuesByField[field.key] = [
        ...localSpecValuesByField[field.key],
        nextValue,
      ];
    });

    restorableRows.push({
      ...baseItem,
      specText: normalizedSpecText,
    });
  });

  const restoredDimensions = buildStoreSettingSpecDimensions(
    sourceSkus,
    localSpecValuesByField,
    specFields
  );
  const generatedSpecTextSet = new Set(
    buildStoreSettingGeneratedLocalSkuCombos(restoredDimensions, sourceSkus).map(
      (item) => item.specText
    )
  );
  const localSkuRows = restorableRows.filter((item) => {
    if (generatedSpecTextSet.has(item.specText)) {
      return true;
    }

    legacyIssues.push({
      ...item,
      reason: '规格组合不在当前可生成范围内',
    });
    return false;
  });

  return {
    localSpecValuesByField,
    localSkuRows,
    legacyIssues,
  };
}

export function syncStoreSettingLocalSkuRows(
  nextCombos: Array<Pick<StoreSettingLocalSkuDraftRow, 'specText' | 'specValues'>>,
  previousRows: StoreSettingLocalSkuDraftRow[],
  createSkuId: (specText: string) => string
) {
  const previousRowMap = new Map(
    previousRows.map((item) => [item.specText, item] as const)
  );

  return nextCombos.map((combo) => {
    const previousRow = previousRowMap.get(combo.specText);

    if (previousRow) {
      return {
        ...previousRow,
        specText: combo.specText,
        specValues: [...combo.specValues],
      };
    }

    return {
      skuId: createSkuId(combo.specText),
      specText: combo.specText,
      specValues: [...combo.specValues],
      price: undefined,
      stock: undefined,
      sellStatus: 'sellable' as const,
      status: 'on' as const,
    };
  });
}
