import usePersistentState, {
  readPersistentValue,
  writePersistentValue,
} from '@/utils/usePersistentState';

export type ProductCatalogAttributeType = 'text' | 'number' | 'single' | 'multi';
export type ProductCatalogAttributeNumberMode = 'integer' | 'decimalAllowed';

export type ProductCatalogAttributeItem = {
  id: string;
  name: string;
  description?: string;
  type: ProductCatalogAttributeType;
  values: string[];
  textMaxLength?: number;
  numberMode?: ProductCatalogAttributeNumberMode;
  numberPrecision?: number;
  sort: number;
  enabled: boolean;
  createdAt: string;
};

export const PRODUCT_CATALOG_ATTRIBUTE_TYPE_LABELS: Record<
  ProductCatalogAttributeType,
  string
> = {
  text: '文本',
  number: '数字',
  single: '单选',
  multi: '多选',
};

export const PRODUCT_CATALOG_ATTRIBUTE_TYPE_COLORS: Record<
  ProductCatalogAttributeType,
  string
> = {
  text: 'gray',
  number: 'gold',
  single: 'arcoblue',
  multi: 'green',
};

const STORAGE_KEY = 'product-catalog-attribute-definition-items-v2';

export const DEFAULT_PRODUCT_CATALOG_ATTRIBUTES: ProductCatalogAttributeItem[] = [
  {
    id: 'attr_class_type',
    name: '班型',
    type: 'single',
    values: ['1v4 金牌班', '1v1 旗舰班', '标准直播班'],
    sort: 1,
    enabled: true,
    createdAt: '2026-05-18 10:00:00',
  },
  {
    id: 'attr_delivery_mode',
    name: '授课形式',
    type: 'multi',
    values: ['录播', '直播', '面授'],
    sort: 2,
    enabled: true,
    createdAt: '2026-05-18 10:05:00',
  },
  {
    id: 'attr_service_level',
    name: '服务等级',
    type: 'single',
    values: ['标准版', '加急版', 'VIP 版'],
    sort: 3,
    enabled: true,
    createdAt: '2026-05-18 10:10:00',
  },
  {
    id: 'attr_charge_mode',
    name: '收费模式',
    type: 'single',
    values: ['一次性收费', '分阶段收费'],
    sort: 4,
    enabled: true,
    createdAt: '2026-05-18 10:15:00',
  },
  {
    id: 'attr_remark',
    name: '备注',
    type: 'text',
    values: [],
    textMaxLength: 50,
    sort: 5,
    enabled: true,
    createdAt: '2026-05-18 10:20:00',
  },
  {
    id: 'attr_semester_count',
    name: '服务学期数',
    type: 'number',
    values: [],
    numberMode: 'integer',
    sort: 6,
    enabled: true,
    createdAt: '2026-05-18 10:25:00',
  },
];

export function mergeDefaultProductCatalogAttributes(
  attributes: ProductCatalogAttributeItem[] = [],
  defaults: ProductCatalogAttributeItem[] = DEFAULT_PRODUCT_CATALOG_ATTRIBUTES
) {
  if (!Array.isArray(attributes) || !attributes.length) {
    return defaults;
  }

  const existingIds = new Set(
    attributes
      .filter((item) => item && typeof item.id === 'string' && item.id.trim())
      .map((item) => item.id.trim())
  );

  return [
    ...attributes,
    ...defaults.filter((item) => !existingIds.has(item.id)),
  ];
}

function normalizePositiveInteger(value: unknown) {
  if (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value > 0
  ) {
    return value;
  }

  return undefined;
}

function normalizeNonNegativeInteger(value: unknown) {
  if (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value >= 0
  ) {
    return value;
  }

  return undefined;
}

function uniqueTrimmedValues(values: unknown) {
  if (!Array.isArray(values)) {
    return [];
  }

  const seenValues = new Set<string>();

  return values.reduce<string[]>((result, item) => {
    if (typeof item !== 'string') {
      return result;
    }

    const value = item.trim();

    if (!value || seenValues.has(value)) {
      return result;
    }

    seenValues.add(value);
    return [...result, value];
  }, []);
}

function normalizeAttributeConstraints(
  item: ProductCatalogAttributeItem
): Pick<
  ProductCatalogAttributeItem,
  'description' | 'textMaxLength' | 'numberMode' | 'numberPrecision'
> {
  const description =
    typeof item.description === 'string' && item.description.trim()
      ? item.description.trim()
      : undefined;

  if (item.type === 'text') {
    return {
      description,
      textMaxLength: normalizePositiveInteger(item.textMaxLength),
      numberMode: undefined,
      numberPrecision: undefined,
    };
  }

  if (item.type === 'number') {
    const numberMode: ProductCatalogAttributeNumberMode =
      item.numberMode === 'decimalAllowed' ? 'decimalAllowed' : 'integer';

    return {
      description,
      textMaxLength: undefined,
      numberMode,
      numberPrecision:
        numberMode === 'decimalAllowed'
          ? normalizeNonNegativeInteger(item.numberPrecision)
          : undefined,
    };
  }

  return {
    description,
    textMaxLength: undefined,
    numberMode: undefined,
    numberPrecision: undefined,
  };
}

function normalizeProductCatalogAttributeItem(
  item: ProductCatalogAttributeItem
): ProductCatalogAttributeItem {
  return {
    ...item,
    ...normalizeAttributeConstraints(item),
  };
}

export function normalizeProductCatalogAttributes(
  attributes: ProductCatalogAttributeItem[] = DEFAULT_PRODUCT_CATALOG_ATTRIBUTES
) {
  return attributes
    .filter(
      (item) =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        typeof item.name === 'string'
    )
    .map((item) => {
      const type: ProductCatalogAttributeType =
        item.type === 'number' ||
        item.type === 'single' ||
        item.type === 'multi'
          ? item.type
          : 'text';
      const normalizedValues =
        type === 'single' || type === 'multi' ? uniqueTrimmedValues(item.values) : [];

      return normalizeProductCatalogAttributeItem({
        id: item.id.trim(),
        name: item.name.trim(),
        description: item.description,
        type,
        values: normalizedValues,
        textMaxLength: item.textMaxLength,
        numberMode: item.numberMode,
        numberPrecision: item.numberPrecision,
        sort: normalizePositiveInteger(item.sort) || 1,
        enabled: item.enabled !== false,
        createdAt: item.createdAt || '',
      });
    })
    .filter((item) => item.id && item.name)
    .sort((left, right) => {
      if (left.sort !== right.sort) {
        return left.sort - right.sort;
      }

      if (left.createdAt !== right.createdAt) {
        return left.createdAt.localeCompare(right.createdAt);
      }

      return left.name.localeCompare(right.name, 'zh-Hans-CN');
    });
}

export function getProductCatalogAttributeValueSummary(
  item: ProductCatalogAttributeItem
) {
  if (item.type === 'text') {
    return item.textMaxLength
      ? `自由填写 / 最多 ${item.textMaxLength} 字`
      : '自由填写';
  }

  if (item.type === 'number') {
    if (item.numberMode === 'decimalAllowed') {
      return item.numberPrecision !== undefined
        ? `数字输入 / 最多 ${item.numberPrecision} 位小数`
        : '数字输入 / 可含小数';
    }

    return '数字输入 / 整数';
  }

  return item.values.length ? `${item.values.length} 个枚举值` : '';
}

export function readProductCatalogAttributes() {
  const stored = readPersistentValue(STORAGE_KEY, DEFAULT_PRODUCT_CATALOG_ATTRIBUTES);
  const normalized = normalizeProductCatalogAttributes(
    mergeDefaultProductCatalogAttributes(stored)
  );

  if (JSON.stringify(stored) !== JSON.stringify(normalized)) {
    writePersistentValue(STORAGE_KEY, normalized);
  }

  return normalized;
}

export function useProductCatalogAttributes() {
  return usePersistentState(STORAGE_KEY, readProductCatalogAttributes());
}

export function getEnabledProductCatalogAttributes(
  attributes: ProductCatalogAttributeItem[]
) {
  return attributes
    .filter((item) => item.enabled)
    .sort((left, right) => {
      if (left.sort !== right.sort) {
        return left.sort - right.sort;
      }

      return left.name.localeCompare(right.name, 'zh-Hans-CN');
    });
}
