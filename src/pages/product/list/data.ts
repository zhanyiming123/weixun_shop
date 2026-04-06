export type ProductSearchType = 'productName' | 'productId';
export type ProductStatus = 'on' | 'off';
export type ProductType = 'virtual' | 'course' | 'service';
export type ProductSpecMode = 'single' | 'multi';

export type ProductSkuItem = {
  id: string;
  specText: string;
  price: number;
  stock: number;
  status: ProductStatus;
};

export type ProductItem = {
  id: string;
  name: string;
  productCatalogId: string;
  productOwnershipId: string;
  productType: ProductType;
  inventoryUnit: string;
  specMode: ProductSpecMode;
  skus: ProductSkuItem[];
  status: ProductStatus;
  price: number;
  stock: number;
  createdAt: string;
};

export type ProductFilterValues = {
  searchType: ProductSearchType;
  keyword: string;
  productCatalogId?: string;
  productOwnershipId?: string;
  minPrice?: number;
  maxPrice?: number;
  createdAtRange: string[];
};

export const PRODUCT_TYPE_LABEL_MAP: Record<ProductType, string> = {
  virtual: '虚拟商品',
  course: '课程商品',
  service: '服务商品',
};

export const DEFAULT_FILTER_VALUES: ProductFilterValues = {
  searchType: 'productName',
  keyword: '',
  productCatalogId: undefined,
  productOwnershipId: undefined,
  minPrice: undefined,
  maxPrice: undefined,
  createdAtRange: [],
};

export const DEFAULT_INVENTORY_UNIT = '份';

export const INVENTORY_UNIT_OPTIONS = [
  DEFAULT_INVENTORY_UNIT,
  '课时',
  '课次',
  '期',
  '名额',
  '人次',
  '席位',
  '套',
];

export const MOCK_PRODUCTS: ProductItem[] = [
  {
    id: 'G_1237036327413878784',
    name: '唯寻2026年IG&AS大考预测课',
    productCatalogId: 'international',
    productOwnershipId: 'item_06_02_01',
    productType: 'virtual',
    inventoryUnit: '名额',
    specMode: 'multi',
    skus: [
      {
        id: 'sku-G_1237036327413878784-1',
        specText: '标准版',
        price: 199,
        stock: 1800,
        status: 'on',
      },
      {
        id: 'sku-G_1237036327413878784-2',
        specText: 'VIP版',
        price: 239,
        stock: 1198,
        status: 'on',
      },
    ],
    status: 'off',
    price: 199,
    stock: 2998,
    createdAt: '2026-04-02 11:01:49',
  },
  {
    id: 'G_1231319097741021184',
    name: '[唯寻] 2026年IG&AS大考预测课',
    productCatalogId: 'international',
    productOwnershipId: 'item_06_02_01',
    productType: 'course',
    inventoryUnit: '名额',
    specMode: 'single',
    skus: [
      {
        id: 'sku-G_1231319097741021184-1',
        specText: '',
        price: 199,
        stock: 29992,
        status: 'on',
      },
    ],
    status: 'off',
    price: 199,
    stock: 29992,
    createdAt: '2026-03-17 16:23:35',
  },
  {
    id: 'G_1231318174553739264',
    name: '[唯寻] 2026年IG&AS大考预测课',
    productCatalogId: 'international',
    productOwnershipId: 'item_06_02_01',
    productType: 'course',
    inventoryUnit: '名额',
    specMode: 'single',
    skus: [
      {
        id: 'sku-G_1231318174553739264-1',
        specText: '',
        price: 199,
        stock: 29980,
        status: 'on',
      },
    ],
    status: 'on',
    price: 199,
    stock: 29980,
    createdAt: '2026-03-17 16:19:55',
  },
  {
    id: 'G_1215778084171681792',
    name: 'ALEVEL定制学习服务',
    productCatalogId: 'service',
    productOwnershipId: 'item_06_01_01',
    productType: 'service',
    inventoryUnit: '课时',
    specMode: 'single',
    skus: [
      {
        id: 'sku-G_1215778084171681792-1',
        specText: '',
        price: 1,
        stock: 444,
        status: 'off',
      },
    ],
    status: 'on',
    price: 1,
    stock: 444,
    createdAt: '2026-02-02 19:09:09',
  },
  {
    id: 'G_1211793802365374464',
    name: '[唯寻橡沐] AP预测课',
    productCatalogId: 'international',
    productOwnershipId: 'item_03_03_07',
    productType: 'course',
    inventoryUnit: '名额',
    specMode: 'multi',
    skus: [
      {
        id: 'sku-G_1211793802365374464-1',
        specText: '录播班',
        price: 49,
        stock: 600,
        status: 'on',
      },
      {
        id: 'sku-G_1211793802365374464-2',
        specText: '直播班',
        price: 69,
        stock: 400,
        status: 'on',
      },
    ],
    status: 'on',
    price: 49,
    stock: 1000,
    createdAt: '2026-01-22 19:17:02',
  },
  {
    id: 'G_1211793279398580224',
    name: '[唯寻橡沐] IB预测课',
    productCatalogId: 'international',
    productOwnershipId: 'item_03_03_07',
    productType: 'course',
    inventoryUnit: '名额',
    specMode: 'multi',
    skus: [
      {
        id: 'sku-G_1211793279398580224-1',
        specText: '录播班',
        price: 49,
        stock: 380,
        status: 'on',
      },
      {
        id: 'sku-G_1211793279398580224-2',
        specText: '直播班',
        price: 69,
        stock: 219,
        status: 'off',
      },
    ],
    status: 'on',
    price: 49,
    stock: 599,
    createdAt: '2026-01-22 19:14:57',
  },
  {
    id: 'G_1210999402622266432',
    name: '[唯寻橡沐] AP冲刺班',
    productCatalogId: 'international',
    productOwnershipId: 'item_03_03_08',
    productType: 'service',
    inventoryUnit: '名额',
    specMode: 'single',
    skus: [
      {
        id: 'sku-G_1210999402622266432-1',
        specText: '',
        price: 129,
        stock: 998,
        status: 'on',
      },
    ],
    status: 'on',
    price: 129,
    stock: 998,
    createdAt: '2026-01-20 14:40:22',
  },
  {
    id: 'G_1210998727024709632',
    name: '[唯寻橡沐] IB冲刺班',
    productCatalogId: 'international',
    productOwnershipId: 'item_03_03_08',
    productType: 'service',
    inventoryUnit: '名额',
    specMode: 'single',
    skus: [
      {
        id: 'sku-G_1210998727024709632-1',
        specText: '',
        price: 129,
        stock: 0,
        status: 'on',
      },
    ],
    status: 'on',
    price: 129,
    stock: 0,
    createdAt: '2026-01-20 14:37:41',
  },
  {
    id: 'G_1210997383807242240',
    name: '[唯寻橡沐] AP预习课',
    productCatalogId: 'international',
    productOwnershipId: 'item_03_03_07',
    productType: 'virtual',
    inventoryUnit: '名额',
    specMode: 'single',
    skus: [
      {
        id: 'sku-G_1210997383807242240-1',
        specText: '',
        price: 49,
        stock: 1000,
        status: 'off',
      },
    ],
    status: 'on',
    price: 49,
    stock: 1000,
    createdAt: '2026-01-20 14:32:21',
  },
  {
    id: 'G_1210876543210987654',
    name: '2026年STEP数学冲刺营',
    productCatalogId: 'international',
    productOwnershipId: 'item_05_02_05',
    productType: 'course',
    inventoryUnit: '席位',
    specMode: 'multi',
    skus: [
      {
        id: 'sku-G_1210876543210987654-1',
        specText: '录播班',
        price: 299,
        stock: 52,
        status: 'off',
      },
      {
        id: 'sku-G_1210876543210987654-2',
        specText: '直播班',
        price: 359,
        stock: 36,
        status: 'on',
      },
    ],
    status: 'off',
    price: 299,
    stock: 88,
    createdAt: '2026-01-05 09:30:00',
  },
  {
    id: 'G_1210123456789012345',
    name: '雅思一对一提升服务',
    productCatalogId: 'planning',
    productOwnershipId: 'item_06_03_01',
    productType: 'service',
    inventoryUnit: '课时',
    specMode: 'single',
    skus: [
      {
        id: 'sku-G_1210123456789012345-1',
        specText: '',
        price: 899,
        stock: 32,
        status: 'on',
      },
    ],
    status: 'on',
    price: 899,
    stock: 32,
    createdAt: '2025-12-28 20:15:18',
  },
  {
    id: 'G_1209988776655443322',
    name: '牛津面试模考包',
    productCatalogId: 'thesis',
    productOwnershipId: 'item_05_03_04',
    productType: 'virtual',
    inventoryUnit: '套',
    specMode: 'multi',
    skus: [
      {
        id: 'sku-G_1209988776655443322-1',
        specText: '标准版',
        price: 159,
        stock: 120,
        status: 'on',
      },
      {
        id: 'sku-G_1209988776655443322-2',
        specText: 'VIP版',
        price: 199,
        stock: 80,
        status: 'on',
      },
    ],
    status: 'off',
    price: 159,
    stock: 200,
    createdAt: '2025-12-18 18:08:42',
  },
];

export function getMockProductById(id?: string) {
  if (!id) {
    return undefined;
  }

  return MOCK_PRODUCTS.find((item) => item.id === id);
}
