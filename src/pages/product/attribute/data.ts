import usePersistentState, {
  readPersistentValue,
  writePersistentValue,
} from '@/utils/usePersistentState';

export type ProductCatalogAttributeType = 'text' | 'number' | 'single' | 'multi';
export type ProductCatalogAttributeNumberMode = 'integer' | 'decimalAllowed';

export type ProductCatalogAttributeItem = {
  id: string;
  catalogIds: string[];
  name: string;
  type: ProductCatalogAttributeType;
  values: string[];
  textMaxLength?: number;
  numberMode?: ProductCatalogAttributeNumberMode;
  numberPrecision?: number;
  required: boolean;
  sort: number;
  enabled: boolean;
  createdAt: string;
};

const STORAGE_KEY = 'product-catalog-attribute-items';

const PLANNING_ATTRIBUTE_TEMPLATES: ProductCatalogAttributeItem[] = [
  {
    id: 'planning_destination',
    catalogIds: ['planning'],
    name: '留学方向',
    type: 'single',
    values: ['加拿大', '新加坡', '澳大利亚', '香港', '美国'],
    required: true,
    sort: 1,
    enabled: true,
    createdAt: '2026-04-06 17:00:00',
  },
  {
    id: 'planning_level',
    catalogIds: ['planning'],
    name: '等级',
    type: 'single',
    values: ['博士', '研究生', '本科'],
    required: true,
    sort: 2,
    enabled: true,
    createdAt: '2026-04-06 17:01:00',
  },
  {
    id: 'planning_grade',
    catalogIds: ['planning'],
    name: '报名年级',
    type: 'single',
    values: ['八上', '八下', '九上', '九下', '十下', '十二上', '大一上'],
    required: true,
    sort: 3,
    enabled: true,
    createdAt: '2026-04-06 17:02:00',
  },
  {
    id: 'planning_semester_count',
    catalogIds: ['planning'],
    name: '服务学期数',
    type: 'number',
    values: [],
    required: true,
    sort: 4,
    enabled: true,
    createdAt: '2026-04-06 17:03:00',
  },
  {
    id: 'planning_school_count',
    catalogIds: ['planning'],
    name: '申请院校数量',
    type: 'number',
    values: [],
    required: true,
    sort: 5,
    enabled: true,
    createdAt: '2026-04-06 17:04:00',
  },
  {
    id: 'planning_product_tag',
    catalogIds: ['planning'],
    name: '商品标签',
    type: 'single',
    values: ['常规', '延期'],
    required: false,
    sort: 6,
    enabled: true,
    createdAt: '2026-04-06 17:05:00',
  },
  {
    id: 'planning_business_tag',
    catalogIds: ['planning'],
    name: '业务标签',
    type: 'single',
    values: ['正价', '速通'],
    required: true,
    sort: 7,
    enabled: true,
    createdAt: '2026-04-06 17:06:00',
  },
];

export const DEFAULT_PRODUCT_CATALOG_ATTRIBUTES: ProductCatalogAttributeItem[] = [
  {
    id: 'A001',
    catalogIds: ['international'],
    name: '班型',
    type: 'single',
    values: ['1v4 金牌班', '1v1 旗舰班', '标准直播班'],
    required: true,
    sort: 1,
    enabled: true,
    createdAt: '2024-02-01 10:00:00',
  },
  {
    id: 'A002',
    catalogIds: ['international'],
    name: '授课形式',
    type: 'multi',
    values: ['录播', '直播', '面授'],
    required: false,
    sort: 2,
    enabled: true,
    createdAt: '2024-02-01 10:05:00',
  },
  {
    id: 'A005',
    catalogIds: ['thesis'],
    name: '文书类型',
    type: 'multi',
    values: ['PS', 'RL', 'CV', 'Essay'],
    required: true,
    sort: 1,
    enabled: true,
    createdAt: '2024-02-02 09:00:00',
  },
  {
    id: 'A006',
    catalogIds: ['service'],
    name: '收费模式',
    type: 'single',
    values: ['一次性收费', '分阶段收费'],
    required: true,
    sort: 1,
    enabled: true,
    createdAt: '2024-02-03 08:00:00',
  },
  ...PLANNING_ATTRIBUTE_TEMPLATES,
];

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

function normalizeAttributeConstraints(
  item: ProductCatalogAttributeItem
): Pick<
  ProductCatalogAttributeItem,
  'textMaxLength' | 'numberMode' | 'numberPrecision'
> {
  if (item.type === 'text') {
    return {
      textMaxLength: normalizePositiveInteger(item.textMaxLength),
      numberMode: undefined,
      numberPrecision: undefined,
    };
  }

  if (item.type === 'number') {
    const numberMode: ProductCatalogAttributeNumberMode =
      item.numberMode === 'decimalAllowed' ? 'decimalAllowed' : 'integer';

    return {
      textMaxLength: undefined,
      numberMode,
      numberPrecision:
        numberMode === 'decimalAllowed'
          ? normalizeNonNegativeInteger(item.numberPrecision)
          : undefined,
    };
  }

  return {
    textMaxLength: undefined,
    numberMode: undefined,
    numberPrecision: undefined,
  };
}

function normalizeProductCatalogAttributeItem(item: ProductCatalogAttributeItem) {
  return {
    ...item,
    ...normalizeAttributeConstraints(item),
  };
}

export function normalizeProductCatalogAttributes(
  attributes: ProductCatalogAttributeItem[] = DEFAULT_PRODUCT_CATALOG_ATTRIBUTES
) {
  const templateIds = new Set(PLANNING_ATTRIBUTE_TEMPLATES.map((item) => item.id));
  const templateNames = new Set(PLANNING_ATTRIBUTE_TEMPLATES.map((item) => item.name));

  const nextAttributes = attributes
    .filter(Boolean)
    .filter((item) => item.id !== 'A003')
    .map((item) => {
      if (item.id === 'A004') {
        const nextCatalogIds = item.catalogIds.filter((id) => id !== 'planning');
        return {
          ...item,
          catalogIds: nextCatalogIds,
        };
      }

      return item;
    })
    .filter((item) => item.id !== 'A004' || item.catalogIds.length)
    .filter((item) => {
      if (templateIds.has(item.id)) {
        return false;
      }

      if (item.catalogIds.includes('planning') && templateNames.has(item.name)) {
        return false;
      }

      return true;
    });

  const matchedPlanningItems = new Map<string, ProductCatalogAttributeItem>();

  attributes.forEach((item) => {
    if (templateIds.has(item.id)) {
      matchedPlanningItems.set(item.id, item);
      return;
    }

    if (item.catalogIds.includes('planning') && templateNames.has(item.name)) {
      matchedPlanningItems.set(item.name, item);
    }
  });

  return [
    ...nextAttributes,
    ...PLANNING_ATTRIBUTE_TEMPLATES.map((template) => {
      const matched =
        matchedPlanningItems.get(template.id) || matchedPlanningItems.get(template.name);

      return normalizeProductCatalogAttributeItem({
        ...template,
        enabled: matched?.enabled ?? template.enabled,
        createdAt: matched?.createdAt ?? template.createdAt,
        textMaxLength: matched?.textMaxLength,
        numberMode: matched?.numberMode,
        numberPrecision: matched?.numberPrecision,
      });
    }),
  ]
    .map((item) => normalizeProductCatalogAttributeItem(item))
    .sort((a, b) => {
      const leftPrimaryCatalogId = a.catalogIds[0] || '';
      const rightPrimaryCatalogId = b.catalogIds[0] || '';

      if (leftPrimaryCatalogId !== rightPrimaryCatalogId) {
        return leftPrimaryCatalogId.localeCompare(rightPrimaryCatalogId);
      }

      return a.sort - b.sort;
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

  return '';
}

export function readProductCatalogAttributes() {
  const stored = readPersistentValue(STORAGE_KEY, DEFAULT_PRODUCT_CATALOG_ATTRIBUTES);
  const normalized = normalizeProductCatalogAttributes(stored);

  if (JSON.stringify(stored) !== JSON.stringify(normalized)) {
    writePersistentValue(STORAGE_KEY, normalized);
  }

  return normalized;
}

export function useProductCatalogAttributes() {
  return usePersistentState(STORAGE_KEY, readProductCatalogAttributes());
}

export function getEnabledAttributesByCatalogId(
  attributes: ProductCatalogAttributeItem[],
  catalogId?: string
) {
  if (!catalogId) {
    return [];
  }

  return attributes
    .filter((item) => item.enabled && item.catalogIds.includes(catalogId))
    .sort((a, b) => a.sort - b.sort);
}
