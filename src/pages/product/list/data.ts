export type ProductSearchType = 'productName' | 'productId';
export type ProductStatus = 'on' | 'off';
export type ProductType = 'virtual' | 'course' | 'service';

export type ProductItem = {
  id: string;
  name: string;
  productCatalogId: string;
  productType: ProductType;
  status: ProductStatus;
  price: number;
  stock: number;
  createdAt: string;
};

export type ProductFilterValues = {
  searchType: ProductSearchType;
  keyword: string;
  productCatalogId?: string;
  productType?: ProductType;
  minPrice?: number;
  maxPrice?: number;
  createdAtRange: string[];
};

export const PRODUCT_TYPE_OPTIONS = [
  { label: '虚拟商品', value: 'virtual' as ProductType },
  { label: '课程商品', value: 'course' as ProductType },
  { label: '服务商品', value: 'service' as ProductType },
];

export const PRODUCT_TYPE_LABEL_MAP: Record<ProductType, string> = {
  virtual: '虚拟商品',
  course: '课程商品',
  service: '服务商品',
};

export const DEFAULT_FILTER_VALUES: ProductFilterValues = {
  searchType: 'productName',
  keyword: '',
  productCatalogId: undefined,
  productType: undefined,
  minPrice: undefined,
  maxPrice: undefined,
  createdAtRange: [],
};

export const MOCK_PRODUCTS: ProductItem[] = [
  {
    id: 'G_1237036327413878784',
    name: '唯寻2026年IG&AS大考预测课',
    productCatalogId: 'international',
    productType: 'virtual',
    status: 'on',
    price: 199,
    stock: 2998,
    createdAt: '2026-04-02 11:01:49',
  },
  {
    id: 'G_1231319097741021184',
    name: '[唯寻] 2026年IG&AS大考预测课',
    productCatalogId: 'international',
    productType: 'course',
    status: 'on',
    price: 199,
    stock: 29992,
    createdAt: '2026-03-17 16:23:35',
  },
  {
    id: 'G_1231318174553739264',
    name: '[唯寻] 2026年IG&AS大考预测课',
    productCatalogId: 'international',
    productType: 'course',
    status: 'on',
    price: 199,
    stock: 29980,
    createdAt: '2026-03-17 16:19:55',
  },
  {
    id: 'G_1215778084171681792',
    name: 'ALEVEL定制学习服务',
    productCatalogId: 'service',
    productType: 'service',
    status: 'off',
    price: 1,
    stock: 444,
    createdAt: '2026-02-02 19:09:09',
  },
  {
    id: 'G_1211793802365374464',
    name: '[唯寻橡沐] AP预测课',
    productCatalogId: 'international',
    productType: 'course',
    status: 'on',
    price: 49,
    stock: 1000,
    createdAt: '2026-01-22 19:17:02',
  },
  {
    id: 'G_1211793279398580224',
    name: '[唯寻橡沐] IB预测课',
    productCatalogId: 'international',
    productType: 'course',
    status: 'on',
    price: 49,
    stock: 599,
    createdAt: '2026-01-22 19:14:57',
  },
  {
    id: 'G_1210999402622266432',
    name: '[唯寻橡沐] AP冲刺班',
    productCatalogId: 'international',
    productType: 'service',
    status: 'on',
    price: 129,
    stock: 998,
    createdAt: '2026-01-20 14:40:22',
  },
  {
    id: 'G_1210998727024709632',
    name: '[唯寻橡沐] IB冲刺班',
    productCatalogId: 'international',
    productType: 'service',
    status: 'on',
    price: 129,
    stock: 598,
    createdAt: '2026-01-20 14:37:41',
  },
  {
    id: 'G_1210997383807242240',
    name: '[唯寻橡沐] AP预习课',
    productCatalogId: 'international',
    productType: 'virtual',
    status: 'off',
    price: 49,
    stock: 1000,
    createdAt: '2026-01-20 14:32:21',
  },
  {
    id: 'G_1210876543210987654',
    name: '2026年STEP数学冲刺营',
    productCatalogId: 'international',
    productType: 'course',
    status: 'off',
    price: 299,
    stock: 88,
    createdAt: '2026-01-05 09:30:00',
  },
  {
    id: 'G_1210123456789012345',
    name: '雅思一对一提升服务',
    productCatalogId: 'planning',
    productType: 'service',
    status: 'on',
    price: 899,
    stock: 32,
    createdAt: '2025-12-28 20:15:18',
  },
  {
    id: 'G_1209988776655443322',
    name: '牛津面试模考包',
    productCatalogId: 'thesis',
    productType: 'virtual',
    status: 'off',
    price: 159,
    stock: 200,
    createdAt: '2025-12-18 18:08:42',
  },
];
