import usePersistentState, {
  readPersistentValue,
  writePersistentValue,
} from '@/utils/usePersistentState';

export type ProductCatalogSpecItem = {
  id: string;
  catalogIds: string[];
  name: string;
  values: string[];
  enabled: boolean;
  createdAt: string;
};

const STORAGE_KEY = 'product-catalog-spec-items';

export const DEFAULT_PRODUCT_CATALOG_SPECS: ProductCatalogSpecItem[] = [
  {
    id: 'spec_international_class_type',
    catalogIds: ['international'],
    name: '班型',
    values: ['1v1 旗舰班', '1v4 金牌班', '标准直播班'],
    enabled: true,
    createdAt: '2026-05-04 10:00:00',
  },
  {
    id: 'spec_international_delivery_mode',
    catalogIds: ['international'],
    name: '授课形式',
    values: ['录播', '直播', '面授'],
    enabled: true,
    createdAt: '2026-05-04 10:05:00',
  },
  {
    id: 'spec_thesis_service_level',
    catalogIds: ['thesis'],
    name: '服务等级',
    values: ['标准版', '加急版', 'VIP 版'],
    enabled: true,
    createdAt: '2026-05-04 10:10:00',
  },
  {
    id: 'spec_service_charge_mode',
    catalogIds: ['service'],
    name: '收费模式',
    values: ['一次性收费', '分阶段收费'],
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

function normalizeProductCatalogSpecCatalogIds(
  catalogIds: unknown,
  legacyCatalogId?: unknown
) {
  const rawCatalogIds = Array.isArray(catalogIds)
    ? catalogIds
    : typeof legacyCatalogId === 'string'
      ? [legacyCatalogId]
      : [];
  const seenCatalogIds = new Set<string>();

  return rawCatalogIds.reduce<string[]>((result, item) => {
    if (typeof item !== 'string') {
      return result;
    }

    const catalogId = item.trim();

    if (!catalogId || seenCatalogIds.has(catalogId)) {
      return result;
    }

    seenCatalogIds.add(catalogId);
    return [...result, catalogId];
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
        typeof item.name === 'string'
    )
    .map((item) => {
      const legacyItem = item as ProductCatalogSpecItem & {
        catalogId?: string;
        sort?: number;
      };

      return {
        id: item.id.trim(),
        catalogIds: normalizeProductCatalogSpecCatalogIds(
          legacyItem.catalogIds,
          legacyItem.catalogId
        ),
        name: item.name.trim(),
        values: normalizeProductCatalogSpecValues(item.values || []),
        enabled: item.enabled !== false,
        createdAt: item.createdAt || '',
      };
    })
    .filter((item) => item.id && item.catalogIds.length && item.name && item.values.length > 0)
    .sort((left, right) => {
      const leftPrimaryCatalogId = left.catalogIds[0] || '';
      const rightPrimaryCatalogId = right.catalogIds[0] || '';

      if (leftPrimaryCatalogId !== rightPrimaryCatalogId) {
        return leftPrimaryCatalogId.localeCompare(rightPrimaryCatalogId);
      }

      if (left.createdAt !== right.createdAt) {
        return left.createdAt.localeCompare(right.createdAt);
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
    .filter((item) => item.enabled && item.catalogIds.includes(catalogId))
    .sort((left, right) => {
      if (left.createdAt !== right.createdAt) {
        return left.createdAt.localeCompare(right.createdAt);
      }

      return left.name.localeCompare(right.name, 'zh-Hans-CN');
    });
}

export function isProductCatalogSpecNameDuplicated(
  specs: ProductCatalogSpecItem[],
  catalogIds: string[],
  name: string,
  excludeId?: string
) {
  const normalizedCatalogIdSet = new Set(
    normalizeProductCatalogSpecCatalogIds(catalogIds)
  );
  const normalizedName = name.trim();

  return specs.some(
    (item) =>
      item.catalogIds.some((catalogId) => normalizedCatalogIdSet.has(catalogId)) &&
      item.name === normalizedName &&
      item.id !== excludeId
  );
}

export function resolveProductCatalogSpecIdentity(
  nextName: string,
  editingItem?: Pick<ProductCatalogSpecItem, 'name'> | null
) {
  if (editingItem) {
    return editingItem.name;
  }

  return nextName.trim();
}
