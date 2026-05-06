import usePersistentState, {
  readPersistentValue,
  writePersistentValue,
} from '@/utils/usePersistentState';
import type { ProductCatalogSpecItem } from './data';

export type ProductCatalogSpecTemplateEntry = {
  specId: string;
  values: string[];
};

export type ProductCatalogSpecTemplateItem = {
  id: string;
  catalogId: string;
  name: string;
  entries: ProductCatalogSpecTemplateEntry[];
  enabled: boolean;
  createdAt: string;
};

const STORAGE_KEY = 'product-catalog-spec-template-items';

export const DEFAULT_PRODUCT_CATALOG_SPEC_TEMPLATES: ProductCatalogSpecTemplateItem[] = [
  {
    id: 'template_international_live_core',
    catalogId: 'international',
    name: '国际课程直播常用模板',
    entries: [
      {
        specId: 'spec_international_class_type',
        values: ['1v1 旗舰班', '标准直播班'],
      },
      {
        specId: 'spec_international_delivery_mode',
        values: ['直播'],
      },
    ],
    enabled: true,
    createdAt: '2026-05-04 11:00:00',
  },
  {
    id: 'template_international_full_mode',
    catalogId: 'international',
    name: '国际课程全授课形式模板',
    entries: [
      {
        specId: 'spec_international_class_type',
        values: ['1v1 旗舰班', '1v4 金牌班'],
      },
      {
        specId: 'spec_international_delivery_mode',
        values: ['录播', '直播', '面授'],
      },
    ],
    enabled: true,
    createdAt: '2026-05-04 11:10:00',
  },
  {
    id: 'template_thesis_vip',
    catalogId: 'thesis',
    name: '论文服务高阶模板',
    entries: [
      {
        specId: 'spec_thesis_service_level',
        values: ['加急版', 'VIP 版'],
      },
    ],
    enabled: true,
    createdAt: '2026-05-04 11:20:00',
  },
];

function uniqueTrimmedValues(values: string[] = []) {
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

export function normalizeProductCatalogSpecTemplateItems(
  templates: ProductCatalogSpecTemplateItem[] = DEFAULT_PRODUCT_CATALOG_SPEC_TEMPLATES
) {
  return templates
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
      entries: Array.isArray(item.entries)
        ? item.entries
            .filter(
              (entry) =>
                entry &&
                typeof entry.specId === 'string' &&
                entry.specId.trim()
            )
            .map((entry) => ({
              specId: entry.specId.trim(),
              values: uniqueTrimmedValues(entry.values || []),
            }))
            .filter((entry) => entry.values.length > 0)
        : [],
      enabled: item.enabled !== false,
      createdAt: item.createdAt || '',
    }))
    .filter((item) => item.id && item.catalogId && item.name && item.entries.length > 0)
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-Hans-CN'));
}

export function readProductCatalogSpecTemplates() {
  const stored = readPersistentValue(
    STORAGE_KEY,
    DEFAULT_PRODUCT_CATALOG_SPEC_TEMPLATES
  );
  const normalized = normalizeProductCatalogSpecTemplateItems(stored);

  if (JSON.stringify(stored) !== JSON.stringify(normalized)) {
    writePersistentValue(STORAGE_KEY, normalized);
  }

  return normalized;
}

export function useProductCatalogSpecTemplates() {
  return usePersistentState(STORAGE_KEY, readProductCatalogSpecTemplates());
}

export function getEnabledSpecTemplatesByCatalogId(
  templates: ProductCatalogSpecTemplateItem[],
  catalogId?: string
) {
  if (!catalogId) {
    return [];
  }

  return templates.filter((item) => item.enabled && item.catalogId === catalogId);
}

export function buildSelectedCatalogSpecValueMapFromTemplate(
  template: ProductCatalogSpecTemplateItem | undefined,
  specs: ProductCatalogSpecItem[] = []
) {
  const entryMap = new Map(
    (template?.entries || []).map((entry) => [entry.specId, entry.values])
  );

  return specs.reduce<Record<string, string[]>>((result, spec) => {
    result[spec.id] = uniqueTrimmedValues(entryMap.get(spec.id) || []).filter((value) =>
      spec.values.includes(value)
    );
    return result;
  }, {});
}

export function buildSelectedCatalogSpecIdsFromTemplate(
  template: ProductCatalogSpecTemplateItem | undefined,
  specs: ProductCatalogSpecItem[] = []
) {
  const selectedValueMap = buildSelectedCatalogSpecValueMapFromTemplate(template, specs);

  return specs
    .filter((item) => (selectedValueMap[item.id] || []).length > 0)
    .map((item) => item.id);
}
