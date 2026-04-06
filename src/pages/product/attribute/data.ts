import usePersistentState, {
  readPersistentValue,
} from '@/utils/usePersistentState';

export type ProductCatalogAttributeType = 'text' | 'single' | 'multi';

export type ProductCatalogAttributeItem = {
  id: string;
  catalogIds: string[];
  name: string;
  type: ProductCatalogAttributeType;
  values: string[];
  required: boolean;
  sort: number;
  enabled: boolean;
  createdAt: string;
};

const STORAGE_KEY = 'product-catalog-attribute-items';

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
    id: 'A003',
    catalogIds: ['planning'],
    name: '服务阶段',
    type: 'single',
    values: ['规划前测', '申请规划', '选校指导'],
    required: true,
    sort: 1,
    enabled: true,
    createdAt: '2024-02-01 10:10:00',
  },
  {
    id: 'A004',
    catalogIds: ['planning', 'thesis'],
    name: '服务说明',
    type: 'text',
    values: [],
    required: false,
    sort: 2,
    enabled: true,
    createdAt: '2024-02-01 10:15:00',
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
];

export function readProductCatalogAttributes() {
  return readPersistentValue(STORAGE_KEY, DEFAULT_PRODUCT_CATALOG_ATTRIBUTES);
}

export function useProductCatalogAttributes() {
  return usePersistentState(STORAGE_KEY, DEFAULT_PRODUCT_CATALOG_ATTRIBUTES);
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
