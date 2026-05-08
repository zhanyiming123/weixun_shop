import usePersistentState, {
  readPersistentValue,
  writePersistentValue,
} from '@/utils/usePersistentState';

export type ProductCatalogSpecItem = {
  id: string;
  catalogId: string;
  name: string;
  values: string[];
  sort: number;
  enabled: boolean;
  createdAt: string;
};

const STORAGE_KEY = 'product-catalog-spec-items';

export const DEFAULT_PRODUCT_CATALOG_SPECS: ProductCatalogSpecItem[] = [
  {
    id: 'spec_international_class_type',
    catalogId: 'international',
    name: '班型',
    values: ['1v1 旗舰班', '1v4 金牌班', '标准直播班'],
    sort: 1,
    enabled: true,
    createdAt: '2026-05-04 10:00:00',
  },
  {
    id: 'spec_international_delivery_mode',
    catalogId: 'international',
    name: '授课形式',
    values: ['录播', '直播', '面授'],
    sort: 2,
    enabled: true,
    createdAt: '2026-05-04 10:05:00',
  },
  {
    id: 'spec_thesis_service_level',
    catalogId: 'thesis',
    name: '服务等级',
    values: ['标准版', '加急版', 'VIP 版'],
    sort: 1,
    enabled: true,
    createdAt: '2026-05-04 10:10:00',
  },
  {
    id: 'spec_service_charge_mode',
    catalogId: 'service',
    name: '收费模式',
    values: ['一次性收费', '分阶段收费'],
    sort: 1,
    enabled: false,
    createdAt: '2026-05-04 10:15:00',
  },
];

export function normalizeProductCatalogSpecValues(values: string[] = []) {
  const seenValues = new Set<string>();

  return values.reduce<string[]>((result, item) => {
    const value = item.trim();

    if (!value || seenValues.has(value)) {
      return result;
    }

    seenValues.add(value);
    return [...result, value];
  }, []);
}

export function normalizeProductCatalogSpecs(
  specs: ProductCatalogSpecItem[] = DEFAULT_PRODUCT_CATALOG_SPECS
) {
  return specs
    .filter(
      (item) =>
        Boolean(item) &&
        typeof item.id === 'string' &&
        typeof item.catalogId === 'string' &&
        typeof item.name === 'string'
    )
    .map((item) => ({
      ...item,
      id: item.id.trim(),
      catalogId: item.catalogId.trim(),
      name: item.name.trim(),
      values: normalizeProductCatalogSpecValues(item.values || []),
      sort:
        typeof item.sort === 'number' && Number.isFinite(item.sort) && item.sort > 0
          ? Math.floor(item.sort)
          : 1,
      enabled: item.enabled !== false,
      createdAt: item.createdAt || '',
    }))
    .filter((item) => item.id && item.catalogId && item.name && item.values.length > 0)
    .sort((left, right) => {
      if (left.catalogId !== right.catalogId) {
        return left.catalogId.localeCompare(right.catalogId);
      }

      if (left.sort !== right.sort) {
        return left.sort - right.sort;
      }

      return left.name.localeCompare(right.name, 'zh-Hans-CN');
    });
}

export function readProductCatalogSpecs() {
  const stored = readPersistentValue(STORAGE_KEY, DEFAULT_PRODUCT_CATALOG_SPECS);
  const normalized = normalizeProductCatalogSpecs(stored);

  if (JSON.stringify(stored) !== JSON.stringify(normalized)) {
    writePersistentValue(STORAGE_KEY, normalized);
  }

  return normalized;
}

export function useProductCatalogSpecs() {
  return usePersistentState(STORAGE_KEY, readProductCatalogSpecs());
}

export function getEnabledSpecsByCatalogId(
  specs: ProductCatalogSpecItem[],
  catalogId?: string
) {
  if (!catalogId) {
    return [];
  }

  return specs
    .filter((item) => item.enabled && item.catalogId === catalogId)
    .sort((left, right) => left.sort - right.sort);
}

export function isProductCatalogSpecNameDuplicated(
  specs: ProductCatalogSpecItem[],
  catalogId: string,
  name: string,
  excludeId?: string
) {
  const normalizedCatalogId = catalogId.trim();
  const normalizedName = name.trim();

  return specs.some(
    (item) =>
      item.catalogId === normalizedCatalogId &&
      item.name === normalizedName &&
      item.id !== excludeId
  );
}

export function resolveProductCatalogSpecIdentity(
  nextIdentity: Pick<ProductCatalogSpecItem, 'catalogId' | 'name'>,
  editingItem?: Pick<ProductCatalogSpecItem, 'catalogId' | 'name'> | null
) {
  if (editingItem) {
    return {
      catalogId: editingItem.catalogId,
      name: editingItem.name,
    };
  }

  return {
    catalogId: nextIdentity.catalogId.trim(),
    name: nextIdentity.name.trim(),
  };
}
