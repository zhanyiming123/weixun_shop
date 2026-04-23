import {
  ProductStoreItem,
  readProductStoreItems,
} from '@/pages/product/store-config/data';
import {
  readPersistentValue,
  writePersistentValue,
} from '@/utils/usePersistentState';

export type StoreBusinessDay =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export type StoreBasicConfigItem = {
  storeId: string;
  storeName: string;
  address: string;
  managerName: string;
  contactPhone: string;
  businessDays: StoreBusinessDay[];
  businessStartTime: string;
  businessEndTime: string;
  isPaused: boolean;
  updatedAt: string;
};

const STORAGE_KEY = 'store-basic-config-items-v1';

export const STORE_BUSINESS_DAY_OPTIONS: Array<{
  label: string;
  value: StoreBusinessDay;
}> = [
  { label: '周一', value: 'monday' },
  { label: '周二', value: 'tuesday' },
  { label: '周三', value: 'wednesday' },
  { label: '周四', value: 'thursday' },
  { label: '周五', value: 'friday' },
  { label: '周六', value: 'saturday' },
  { label: '周日', value: 'sunday' },
];

const DEFAULT_BUSINESS_DAYS: StoreBusinessDay[] = STORE_BUSINESS_DAY_OPTIONS.map(
  (item) => item.value
);

function createCurrentDateTime() {
  return new Date()
    .toLocaleString('zh-CN', {
      hour12: false,
    })
    .replace(/\//g, '-');
}

function normalizeBusinessDays(
  businessDays: StoreBusinessDay[] | undefined
): StoreBusinessDay[] {
  const validValueSet = new Set(STORE_BUSINESS_DAY_OPTIONS.map((item) => item.value));
  const nextDays = (businessDays || []).filter((item) => validValueSet.has(item));

  return nextDays.length ? nextDays : [...DEFAULT_BUSINESS_DAYS];
}

function normalizeTimeValue(value: string | undefined, fallbackValue: string) {
  return /^\d{2}:\d{2}$/.test(value || '') ? (value as string) : fallbackValue;
}

export function createDefaultStoreBasicConfig(
  storeItem: ProductStoreItem
): StoreBasicConfigItem {
  return {
    storeId: storeItem.id,
    storeName: storeItem.name,
    address: storeItem.address,
    managerName: storeItem.managerName,
    contactPhone: storeItem.phone,
    businessDays: [...DEFAULT_BUSINESS_DAYS],
    businessStartTime: '09:00',
    businessEndTime: '21:00',
    isPaused: false,
    updatedAt: createCurrentDateTime(),
  };
}

function normalizeStoreBasicConfigItem(
  item: Partial<StoreBasicConfigItem>,
  storeItem: ProductStoreItem
): StoreBasicConfigItem {
  const fallbackValue = createDefaultStoreBasicConfig(storeItem);

  return {
    ...fallbackValue,
    ...item,
    storeId: storeItem.id,
    businessDays: normalizeBusinessDays(item.businessDays),
    businessStartTime: normalizeTimeValue(
      item.businessStartTime,
      fallbackValue.businessStartTime
    ),
    businessEndTime: normalizeTimeValue(
      item.businessEndTime,
      fallbackValue.businessEndTime
    ),
    updatedAt: item.updatedAt || fallbackValue.updatedAt,
  };
}

export function readStoreBasicConfigItems(
  storeItems: ProductStoreItem[] = readProductStoreItems().filter(
    (item) => item.type === 'store'
  )
) {
  const persistedItems = readPersistentValue<StoreBasicConfigItem[]>(
    STORAGE_KEY,
    []
  );
  const persistedMap = new Map(
    persistedItems.map((item) => [item.storeId, item] as const)
  );

  return storeItems.map((storeItem) =>
    normalizeStoreBasicConfigItem(persistedMap.get(storeItem.id) || {}, storeItem)
  );
}

export function getStoreBasicConfigByStoreId(
  storeId: string,
  items: StoreBasicConfigItem[] = readStoreBasicConfigItems()
) {
  return items.find((item) => item.storeId === storeId);
}

export function writeStoreBasicConfigItems(items: StoreBasicConfigItem[]) {
  writePersistentValue(STORAGE_KEY, items);
}

export function upsertStoreBasicConfigItem(
  nextItem: StoreBasicConfigItem,
  items: StoreBasicConfigItem[] = readStoreBasicConfigItems()
) {
  const nextItems = items.some((item) => item.storeId === nextItem.storeId)
    ? items.map((item) => (item.storeId === nextItem.storeId ? nextItem : item))
    : [...items, nextItem];

  writeStoreBasicConfigItems(nextItems);
  return nextItems;
}
