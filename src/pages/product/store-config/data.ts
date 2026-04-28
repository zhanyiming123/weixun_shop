export type ProductStoreType = 'store' | 'mall';
export type ProductStoreSellStatus = 'sellable' | 'unsellable';
export type ProductStoreChannelStatus = 'on' | 'off';

export type ProductStoreItem = {
  id: string;
  name: string;
  type: ProductStoreType;
  departmentId: string;
  departmentName: string;
  address: string;
  managerName: string;
  phone: string;
};

export type ProductStoreConfigItem = {
  storeId: string;
  sellStatus: ProductStoreSellStatus;
  channelStatus: ProductStoreChannelStatus;
};

export type ProductStoreDetailItem = ProductStoreItem & ProductStoreConfigItem;

export type ProductStoreDepartmentOption = {
  label: string;
  value: string;
};

export const PRODUCT_STORE_TYPE_LABEL_MAP: Record<ProductStoreType, string> = {
  store: '店铺',
  mall: '商城',
};

export const PRODUCT_STORE_SELL_STATUS_LABEL_MAP: Record<
  ProductStoreSellStatus,
  string
> = {
  sellable: '可售',
  unsellable: '不可售',
};

export const PRODUCT_STORE_CHANNEL_STATUS_LABEL_MAP: Record<
  ProductStoreChannelStatus,
  string
> = {
  on: '上架',
  off: '下架',
};

export const DEFAULT_PRODUCT_STORE_ITEMS: ProductStoreItem[] = [
  {
    id: 'store_suzhou',
    name: '唯寻苏州店铺',
    type: 'store',
    departmentId: 'dept_offline',
    departmentName: '线下店铺部',
    address: '苏州市工业园区星湖街218号创意产业园B1栋',
    managerName: '陈老师',
    phone: '13855667788',
  },
  {
    id: 'store_guangzhou',
    name: '唯寻广州店铺',
    type: 'store',
    departmentId: 'dept_offline',
    departmentName: '线下店铺部',
    address: '广州市天河区珠江新城华夏路28号富力盈信大厦',
    managerName: '黄老师',
    phone: '13688991234',
  },
  {
    id: 'store_shenzhen',
    name: '唯寻深圳店铺',
    type: 'store',
    departmentId: 'dept_offline',
    departmentName: '线下店铺部',
    address: '深圳市南山区海德三道航天科技广场',
    managerName: '刘老师',
    phone: '13761234567',
  },
  {
    id: 'mall_online',
    name: '唯寻线上商城',
    type: 'mall',
    departmentId: 'dept_online',
    departmentName: '线上运营部',
    address: '线上直营网店',
    managerName: '林老师',
    phone: '13810223344',
  },
  {
    id: 'mall_jiangsu',
    name: '唯寻江苏旗舰店',
    type: 'mall',
    departmentId: 'dept_online',
    departmentName: '线上运营部',
    address: '江苏区域线上直营网店',
    managerName: '赵老师',
    phone: '13922334455',
  },
  {
    id: 'mall_mini_program',
    name: '唯寻小程序商城',
    type: 'mall',
    departmentId: 'dept_growth',
    departmentName: '增长运营部',
    address: '微信小程序直营渠道',
    managerName: '周老师',
    phone: '18601112223',
  },
];

export function readProductStoreItems() {
  return DEFAULT_PRODUCT_STORE_ITEMS;
}

export function createDefaultProductStoreConfig(
  storeId: string
): ProductStoreConfigItem {
  return {
    storeId,
    sellStatus: 'unsellable',
    channelStatus: 'off',
  };
}

export function normalizeProductStoreConfigs(
  storeConfigs: ProductStoreConfigItem[],
  items: ProductStoreItem[] = DEFAULT_PRODUCT_STORE_ITEMS
) {
  const configMap = new Map(
    storeConfigs.map((item) => [
      item.storeId,
      {
        ...createDefaultProductStoreConfig(item.storeId),
        ...item,
      },
    ])
  );

  return items.map(
    (item) => configMap.get(item.id) || createDefaultProductStoreConfig(item.id)
  );
}

export function buildProductStoreDepartmentOptions(
  items: ProductStoreItem[] = DEFAULT_PRODUCT_STORE_ITEMS
): ProductStoreDepartmentOption[] {
  const optionMap = new Map<string, ProductStoreDepartmentOption>();

  items.forEach((item) => {
    if (!optionMap.has(item.departmentId)) {
      optionMap.set(item.departmentId, {
        label: item.departmentName,
        value: item.departmentId,
      });
    }
  });

  return Array.from(optionMap.values());
}

export function getProductStoreById(
  storeId: string,
  items: ProductStoreItem[] = DEFAULT_PRODUCT_STORE_ITEMS
) {
  return items.find((item) => item.id === storeId);
}

export function buildProductStoreDetailItems(
  storeConfigs: ProductStoreConfigItem[],
  items: ProductStoreItem[] = DEFAULT_PRODUCT_STORE_ITEMS
): ProductStoreDetailItem[] {
  return storeConfigs.flatMap((config) => {
    const matchedStore = getProductStoreById(config.storeId, items);

    return matchedStore
      ? [
          {
            ...matchedStore,
            ...config,
          },
        ]
      : [];
  });
}

export function getProductStoreSummary(storeConfigs: ProductStoreConfigItem[]) {
  return storeConfigs.reduce(
    (summary, item) => {
      if (item.sellStatus === 'sellable') {
        summary.sellable += 1;
      } else {
        summary.unsellable += 1;
      }

      return summary;
    },
    {
      sellable: 0,
      unsellable: 0,
    }
  );
}

export function maskPhone(phone: string) {
  if (phone.length < 7) {
    return phone;
  }

  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}
