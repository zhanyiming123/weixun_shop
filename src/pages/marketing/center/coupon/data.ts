import {
  MOCK_PRODUCTS,
  ProductItem,
  ProductType,
} from '@/pages/product/list/data';
import { ProductCatalogLeafItem } from '@/pages/product/catalog/data';

export type { ProductCatalogLeafItem };

export type CouponPageMode = 'create' | 'detail' | 'edit';
export type CouponKind = 'general';
export type CouponDiscountType =
  | 'fullReduction'
  | 'directReduction'
  | 'discount';
export type CouponProductScope = 'all' | 'condition' | 'specific';
export type CouponValidityType =
  | 'sameAsReceive'
  | 'afterReceiveDays'
  | 'custom';
export type CouponListStatus = 'notStarted' | 'active' | 'expired' | 'voided';

export type CouponCampusOption = {
  label: string;
  value: string;
};

export type CouponProductCategoryOption = {
  label: string;
  value: string;
};

export type CouponOrgOption = {
  value: string;
  label: string;
};

export type OrgCascaderOption = {
  value: string;
  label: string;
  children?: OrgCascaderOption[];
};

export type CategoryConditionScope = {
  categoryId: string;
  selectedOrgPaths: string[][];
  selectedSpecValues: string[];
};

export type CouponSkuItem = {
  key: string;
  rowType: 'sku';
  productId: string;
  productName: string;
  productCategory: string;
  productCategoryValue: string;
  skuId: string;
  skuSpecText: string;
  productType: string;
  price: number;
};

export type CouponSpuItem = {
  key: string;
  rowType: 'spu';
  productId: string;
  productName: string;
  productCategory: string;
  productCategoryValue: string;
  skuId: string;
  skuSpecText: string;
  productType: string;
  price: number;
  minPrice: number;
  maxPrice: number;
  children: CouponSkuItem[];
};

export type CouponProductTableItem = CouponSpuItem | CouponSkuItem;

export type CouponFormValues = {
  discountType: CouponDiscountType;
  fullReductionThreshold?: number;
  fullReductionAmount?: number;
  directReductionAmount?: number;
  discountRate?: number;
  campusIds: string[];
  productScope: CouponProductScope;
  conditionScopes: CategoryConditionScope[];
  selectedSkuIds: string[];
  name: string;
  issueCount: number;
  limitPerUser: number;
  receiveTimeRange: string[];
  validityType: CouponValidityType;
  validDays?: number;
  customUseTimeRange: string[];
};

export type CouponListFilterValues = {
  discountType?: CouponDiscountType;
  status?: CouponListStatus;
  keyword: string;
};

export type CouponListItem = {
  id: string;
  couponKind: CouponKind;
  name: string;
  discountType: CouponDiscountType;
  productScope: CouponProductScope;
  promotionScene: string;
  discountSummary: string;
  receivedCount: number;
  issueCount: number;
  receiveRate: number;
  receiveStartAt: string;
  receiveEndAt: string;
  useStartAt: string;
  useEndAt: string;
  status: CouponListStatus;
};

export type CouponDetailRecord = {
  id: string;
  couponKind: CouponKind;
  name: string;
  discountType: CouponDiscountType;
  fullReductionThreshold?: number;
  fullReductionAmount?: number;
  directReductionAmount?: number;
  discountRate?: number;
  campusIds: string[];
  productScope: CouponProductScope;
  conditionScopes: CategoryConditionScope[];
  selectedSkuIds: string[];
  promotionScene: string;
  receivedCount: number;
  issueCount: number;
  receiveRate: number;
  receiveStartAt: string;
  receiveEndAt: string;
  useStartAt: string;
  useEndAt: string;
  status: CouponListStatus;
  validityType: CouponValidityType;
  validDays?: number;
  customUseTimeRange: string[];
};

export const COUPON_KIND_LABEL_MAP: Record<CouponKind, string> = {
  general: '通用券',
};

export const COUPON_DISCOUNT_OPTIONS = [
  { label: '满减', value: 'fullReduction' as CouponDiscountType },
  { label: '直减', value: 'directReduction' as CouponDiscountType },
  { label: '折扣', value: 'discount' as CouponDiscountType },
];

export const PRODUCT_SCOPE_OPTIONS = [
  { label: '全部商品', value: 'all' as CouponProductScope },
  { label: '按条件圈品', value: 'condition' as CouponProductScope },
  { label: '指定商品', value: 'specific' as CouponProductScope },
];

export const VALIDITY_TYPE_OPTIONS = [
  { label: '和领取时间一致', value: 'sameAsReceive' as CouponValidityType },
  { label: '领取后', value: 'afterReceiveDays' as CouponValidityType },
  { label: '自定义', value: 'custom' as CouponValidityType },
];

export const COUPON_LIST_STATUS_OPTIONS = [
  { label: '未生效', value: 'notStarted' as CouponListStatus },
  { label: '生效中', value: 'active' as CouponListStatus },
  { label: '已过期', value: 'expired' as CouponListStatus },
  { label: '已作废', value: 'voided' as CouponListStatus },
];

export const COUPON_DISCOUNT_LABEL_MAP: Record<CouponDiscountType, string> = {
  fullReduction: '满减',
  directReduction: '直减',
  discount: '折扣',
};

export const COUPON_LIST_STATUS_LABEL_MAP: Record<CouponListStatus, string> = {
  notStarted: '未生效',
  active: '生效中',
  expired: '已过期',
  voided: '已作废',
};

export const COUPON_SCOPE_SUMMARY_LABEL_MAP: Record<CouponProductScope, string> = {
  all: '全部商品',
  condition: '按条件圈品',
  specific: '指定商品',
};

export const MOCK_CAMPUSES: CouponCampusOption[] = [
  { label: '上海校区', value: 'shanghai' },
  { label: '北京校区', value: 'beijing' },
  { label: '深圳校区', value: 'shenzhen' },
  { label: '杭州校区', value: 'hangzhou' },
];

export const MOCK_CATEGORY_SPEC_OPTIONS: Record<string, CouponOrgOption[]> = {
  international: [
    { value: 'vip_1v4', label: '1v4 金牌班' },
    { value: 'vip_1v1', label: '1v1 旗舰班' },
    { value: 'standard', label: '标准直播班' },
  ],
};

const SKU_SPEC_TEMPLATES: Record<ProductType, string[]> = {
  virtual: ['标准版', 'VIP版'],
  course: ['录播班', '直播班'],
  service: ['基础服务', '进阶服务'],
};

const COUPON_PRODUCT_TYPE_LABEL_MAP: Record<ProductType, string> = {
  virtual: '虚拟商品',
  course: '课程商品',
  service: '服务商品',
};

const DEFAULT_SELECTED_SKUS_BY_RECORD: Record<string, string[]> = {
  '122661783978': ['sku-G_1237036327413878784-1', 'sku-G_1237036327413878784-2'],
  '122661783979': ['sku-G_1211793802365374464-1', 'sku-G_1211793802365374464-2'],
  '122661783980': ['sku-G_1210999402622266432-1'],
  '122661783981': ['sku-G_1231319097741021184-1'],
  '122661783984': ['sku-G_1210123456789012345-1'],
  '122661783987': ['sku-G_1210876543210987654-2'],
  '122661783988': ['sku-G_1209988776655443322-1', 'sku-G_1209988776655443322-2'],
};

const COUPON_RECORD_SEEDS: CouponDetailRecord[] = [
  {
    id: '122661783977',
    couponKind: 'general',
    name: '遴选计划-减免10000',
    discountType: 'fullReduction',
    fullReductionThreshold: 10,
    fullReductionAmount: 2,
    campusIds: ['shanghai', 'beijing'],
    productScope: 'all',
    conditionScopes: [],
    selectedSkuIds: [],
    promotionScene: '全场景',
    receivedCount: 200,
    issueCount: 400,
    receiveRate: 50,
    receiveStartAt: '2026/10/30 00:00:00',
    receiveEndAt: '2026/10/30 00:00:00',
    useStartAt: '2026/10/30 00:00:00',
    useEndAt: '2026/10/30 00:00:00',
    status: 'notStarted',
    validityType: 'sameAsReceive',
    validDays: 1,
    customUseTimeRange: [],
  },
  {
    id: '122661783978',
    couponKind: 'general',
    name: '遴选计划-减免8000',
    discountType: 'fullReduction',
    fullReductionThreshold: 10,
    fullReductionAmount: 2,
    campusIds: ['shanghai', 'shenzhen'],
    productScope: 'specific',
    conditionScopes: [],
    selectedSkuIds: DEFAULT_SELECTED_SKUS_BY_RECORD['122661783978'],
    promotionScene: '全场景',
    receivedCount: 200,
    issueCount: 400,
    receiveRate: 50,
    receiveStartAt: '2026/03/30 00:00:00',
    receiveEndAt: '2026/10/30 00:00:00',
    useStartAt: '2026/03/30 00:00:00',
    useEndAt: '2026/10/30 00:00:00',
    status: 'active',
    validityType: 'sameAsReceive',
    validDays: 1,
    customUseTimeRange: [],
  },
  {
    id: '122661783979',
    couponKind: 'general',
    name: '择校季-立减体验券',
    discountType: 'directReduction',
    directReductionAmount: 2,
    campusIds: ['beijing', 'hangzhou'],
    productScope: 'specific',
    conditionScopes: [],
    selectedSkuIds: DEFAULT_SELECTED_SKUS_BY_RECORD['122661783979'],
    promotionScene: '全场景',
    receivedCount: 200,
    issueCount: 400,
    receiveRate: 50,
    receiveStartAt: '2025/03/30 00:00:00',
    receiveEndAt: '2025/10/30 00:00:00',
    useStartAt: '2025/03/30 00:00:00',
    useEndAt: '2025/10/30 00:00:00',
    status: 'expired',
    validityType: 'afterReceiveDays',
    validDays: 30,
    customUseTimeRange: [],
  },
  {
    id: '122661783980',
    couponKind: 'general',
    name: '备考季-折扣福利券',
    discountType: 'discount',
    discountRate: 9,
    campusIds: ['shanghai'],
    productScope: 'specific',
    conditionScopes: [],
    selectedSkuIds: DEFAULT_SELECTED_SKUS_BY_RECORD['122661783980'],
    promotionScene: '全场景',
    receivedCount: 200,
    issueCount: 400,
    receiveRate: 50,
    receiveStartAt: '2024/03/30 00:00:00',
    receiveEndAt: '2024/10/30 00:00:00',
    useStartAt: '2024/03/30 00:00:00',
    useEndAt: '2024/10/30 00:00:00',
    status: 'voided',
    validityType: 'custom',
    validDays: 1,
    customUseTimeRange: ['2024/03/30 00:00:00', '2024/10/30 00:00:00'],
  },
  {
    id: '122661783981',
    couponKind: 'general',
    name: '留学冲刺-满减券',
    discountType: 'fullReduction',
    fullReductionThreshold: 20,
    fullReductionAmount: 5,
    campusIds: ['shenzhen', 'hangzhou'],
    productScope: 'specific',
    conditionScopes: [],
    selectedSkuIds: DEFAULT_SELECTED_SKUS_BY_RECORD['122661783981'],
    promotionScene: '全场景',
    receivedCount: 168,
    issueCount: 300,
    receiveRate: 56,
    receiveStartAt: '2026/05/01 00:00:00',
    receiveEndAt: '2026/06/30 23:59:59',
    useStartAt: '2026/05/01 00:00:00',
    useEndAt: '2026/07/15 23:59:59',
    status: 'active',
    validityType: 'sameAsReceive',
    validDays: 1,
    customUseTimeRange: [],
  },
  {
    id: '122661783982',
    couponKind: 'general',
    name: '雅思班-立减新人券',
    discountType: 'directReduction',
    directReductionAmount: 50,
    campusIds: ['beijing', 'shanghai'],
    productScope: 'all',
    conditionScopes: [],
    selectedSkuIds: [],
    promotionScene: '全场景',
    receivedCount: 96,
    issueCount: 200,
    receiveRate: 48,
    receiveStartAt: '2026/08/01 00:00:00',
    receiveEndAt: '2026/08/31 23:59:59',
    useStartAt: '2026/08/01 00:00:00',
    useEndAt: '2026/09/10 23:59:59',
    status: 'notStarted',
    validityType: 'afterReceiveDays',
    validDays: 10,
    customUseTimeRange: [],
  },
  {
    id: '122661783983',
    couponKind: 'general',
    name: 'A-Level秋季折扣券',
    discountType: 'discount',
    discountRate: 8.5,
    campusIds: ['shanghai', 'hangzhou'],
    productScope: 'all',
    conditionScopes: [],
    selectedSkuIds: [],
    promotionScene: '全场景',
    receivedCount: 320,
    issueCount: 600,
    receiveRate: 53,
    receiveStartAt: '2026/02/01 00:00:00',
    receiveEndAt: '2026/03/31 23:59:59',
    useStartAt: '2026/02/01 00:00:00',
    useEndAt: '2026/04/15 23:59:59',
    status: 'active',
    validityType: 'sameAsReceive',
    validDays: 1,
    customUseTimeRange: [],
  },
  {
    id: '122661783984',
    couponKind: 'general',
    name: '模考包-折扣券',
    discountType: 'discount',
    discountRate: 9.5,
    campusIds: ['beijing'],
    productScope: 'specific',
    conditionScopes: [],
    selectedSkuIds: DEFAULT_SELECTED_SKUS_BY_RECORD['122661783984'],
    promotionScene: '全场景',
    receivedCount: 88,
    issueCount: 180,
    receiveRate: 49,
    receiveStartAt: '2025/09/01 00:00:00',
    receiveEndAt: '2025/09/30 23:59:59',
    useStartAt: '2025/09/01 00:00:00',
    useEndAt: '2025/10/31 23:59:59',
    status: 'expired',
    validityType: 'sameAsReceive',
    validDays: 1,
    customUseTimeRange: [],
  },
  {
    id: '122661783985',
    couponKind: 'general',
    name: '服务套餐-减免券',
    discountType: 'fullReduction',
    fullReductionThreshold: 100,
    fullReductionAmount: 20,
    campusIds: ['shenzhen'],
    productScope: 'condition',
    conditionScopes: [
      {
        categoryId: 'planning',
        selectedOrgPaths: [['xm'], ['wx', 'wx-plan']],
        selectedSpecValues: [],
      },
    ],
    selectedSkuIds: [],
    promotionScene: '全场景',
    receivedCount: 58,
    issueCount: 120,
    receiveRate: 48,
    receiveStartAt: '2024/11/01 00:00:00',
    receiveEndAt: '2024/11/30 23:59:59',
    useStartAt: '2024/11/01 00:00:00',
    useEndAt: '2024/12/15 23:59:59',
    status: 'voided',
    validityType: 'sameAsReceive',
    validDays: 1,
    customUseTimeRange: [],
  },
  {
    id: '122661783986',
    couponKind: 'general',
    name: '申请季-全场通用券',
    discountType: 'directReduction',
    directReductionAmount: 30,
    campusIds: ['shanghai', 'beijing', 'shenzhen'],
    productScope: 'all',
    conditionScopes: [],
    selectedSkuIds: [],
    promotionScene: '全场景',
    receivedCount: 260,
    issueCount: 500,
    receiveRate: 52,
    receiveStartAt: '2026/04/01 00:00:00',
    receiveEndAt: '2026/05/31 23:59:59',
    useStartAt: '2026/04/01 00:00:00',
    useEndAt: '2026/06/30 23:59:59',
    status: 'active',
    validityType: 'sameAsReceive',
    validDays: 1,
    customUseTimeRange: [],
  },
  {
    id: '122661783987',
    couponKind: 'general',
    name: '冬令营-早鸟券',
    discountType: 'discount',
    discountRate: 8,
    campusIds: ['hangzhou', 'shenzhen'],
    productScope: 'specific',
    conditionScopes: [],
    selectedSkuIds: DEFAULT_SELECTED_SKUS_BY_RECORD['122661783987'],
    promotionScene: '全场景',
    receivedCount: 45,
    issueCount: 150,
    receiveRate: 30,
    receiveStartAt: '2026/11/01 00:00:00',
    receiveEndAt: '2026/11/30 23:59:59',
    useStartAt: '2026/12/01 00:00:00',
    useEndAt: '2027/01/15 23:59:59',
    status: 'notStarted',
    validityType: 'custom',
    validDays: 1,
    customUseTimeRange: ['2026/12/01 00:00:00', '2027/01/15 23:59:59'],
  },
  {
    id: '122661783988',
    couponKind: 'general',
    name: '科研项目-专享券',
    discountType: 'directReduction',
    directReductionAmount: 100,
    campusIds: ['beijing'],
    productScope: 'specific',
    conditionScopes: [],
    selectedSkuIds: DEFAULT_SELECTED_SKUS_BY_RECORD['122661783988'],
    promotionScene: '全场景',
    receivedCount: 120,
    issueCount: 180,
    receiveRate: 67,
    receiveStartAt: '2024/06/01 00:00:00',
    receiveEndAt: '2024/07/15 23:59:59',
    useStartAt: '2024/06/01 00:00:00',
    useEndAt: '2024/08/31 23:59:59',
    status: 'voided',
    validityType: 'sameAsReceive',
    validDays: 1,
    customUseTimeRange: [],
  },
];

function cloneConditionScopes(scopes: CategoryConditionScope[]) {
  return scopes.map((scope) => ({
    categoryId: scope.categoryId,
    selectedOrgPaths: scope.selectedOrgPaths.map((path) => [...path]),
    selectedSpecValues: [...scope.selectedSpecValues],
  }));
}

function cloneCouponDetailRecord(record: CouponDetailRecord): CouponDetailRecord {
  return {
    ...record,
    campusIds: [...record.campusIds],
    conditionScopes: cloneConditionScopes(record.conditionScopes),
    selectedSkuIds: [...record.selectedSkuIds],
    customUseTimeRange: [...record.customUseTimeRange],
  };
}

function formatNumberText(value?: number, fixed = 2) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '0';
  }
  const next = Number(value.toFixed(fixed));
  return Number.isInteger(next) ? `${next}` : `${next}`;
}

export function formatCouponDiscountSummary(
  record: Pick<
    CouponDetailRecord,
    | 'discountType'
    | 'fullReductionThreshold'
    | 'fullReductionAmount'
    | 'directReductionAmount'
    | 'discountRate'
  >
) {
  if (record.discountType === 'fullReduction') {
    return `满${formatNumberText(record.fullReductionThreshold)}减${formatNumberText(
      record.fullReductionAmount
    )}`;
  }
  if (record.discountType === 'directReduction') {
    return `直减${formatNumberText(record.directReductionAmount)}`;
  }
  return `打${formatNumberText(record.discountRate, 1)}折`;
}

function toCouponListItem(record: CouponDetailRecord): CouponListItem {
  return {
    id: record.id,
    couponKind: record.couponKind,
    name: record.name,
    discountType: record.discountType,
    productScope: record.productScope,
    promotionScene: record.promotionScene,
    discountSummary: formatCouponDiscountSummary(record),
    receivedCount: record.receivedCount,
    issueCount: record.issueCount,
    receiveRate: record.receiveRate,
    receiveStartAt: record.receiveStartAt,
    receiveEndAt: record.receiveEndAt,
    useStartAt: record.useStartAt,
    useEndAt: record.useEndAt,
    status: record.status,
  };
}

let couponDetailStore = COUPON_RECORD_SEEDS.map(cloneCouponDetailRecord);

export function readCouponListItems() {
  return couponDetailStore.map(toCouponListItem);
}

export function readCouponById(id: string) {
  const matched = couponDetailStore.find((item) => item.id === id);
  return matched ? cloneCouponDetailRecord(matched) : undefined;
}

export function updateCouponStatus(id: string, status: CouponListStatus) {
  const target = couponDetailStore.find((item) => item.id === id);
  if (!target) {
    return undefined;
  }
  target.status = status;
  return cloneCouponDetailRecord(target);
}

export function deleteCouponById(id: string) {
  const beforeCount = couponDetailStore.length;
  couponDetailStore = couponDetailStore.filter((item) => item.id !== id);
  return couponDetailStore.length < beforeCount;
}

export function updateCouponQuota(
  id: string,
  payload: {
    issueCount: number;
    limitPerUser: number;
  }
) {
  const target = couponDetailStore.find((item) => item.id === id);
  if (!target) {
    return undefined;
  }
  target.issueCount = payload.issueCount;
  target.limitPerUser = payload.limitPerUser;
  target.receiveRate = target.issueCount
    ? Math.round((target.receivedCount / target.issueCount) * 100)
    : 0;
  return cloneCouponDetailRecord(target);
}

export function buildCouponFormValuesFromRecord(record: CouponDetailRecord): CouponFormValues {
  return {
    discountType: record.discountType,
    fullReductionThreshold: record.fullReductionThreshold,
    fullReductionAmount: record.fullReductionAmount,
    directReductionAmount: record.directReductionAmount,
    discountRate: record.discountRate,
    campusIds: [...record.campusIds],
    productScope: record.productScope,
    conditionScopes: cloneConditionScopes(record.conditionScopes),
    selectedSkuIds: [...record.selectedSkuIds],
    name: record.name,
    issueCount: record.issueCount,
    limitPerUser: record.limitPerUser,
    receiveTimeRange: [record.receiveStartAt, record.receiveEndAt],
    validityType: record.validityType,
    validDays: record.validDays,
    customUseTimeRange: [...record.customUseTimeRange],
  };
}

export function buildCreateValuesFromCoupon(id: string) {
  const source = readCouponById(id);
  if (!source) {
    return undefined;
  }
  return {
    ...buildCouponFormValuesFromRecord(source),
    name: `${source.name}_副本`,
  };
}

export const DEFAULT_COUPON_FORM_VALUES: CouponFormValues = {
  discountType: 'fullReduction',
  fullReductionThreshold: undefined,
  fullReductionAmount: undefined,
  directReductionAmount: undefined,
  discountRate: undefined,
  campusIds: [],
  productScope: 'all',
  conditionScopes: [],
  selectedSkuIds: [],
  name: '',
  issueCount: 0,
  limitPerUser: 1,
  receiveTimeRange: [],
  validityType: 'sameAsReceive',
  validDays: 1,
  customUseTimeRange: [],
};

export const DEFAULT_COUPON_LIST_FILTER_VALUES: CouponListFilterValues = {
  discountType: undefined,
  status: undefined,
  keyword: '',
};

function resolveProductCategory(
  product: ProductItem,
  categories: ProductCatalogLeafItem[]
): CouponProductCategoryOption {
  const matched = categories.find((item) => item.id === product.productCatalogId);
  if (matched) {
    return { label: matched.label, value: matched.id };
  }

  const fallback = categories[0];
  return {
    label: fallback?.label || '未配置类目',
    value: fallback?.id || '',
  };
}

export function buildCouponProductCategoryOptions(
  categories: ProductCatalogLeafItem[]
) {
  return categories.map((item) => ({
    label: item.label,
    value: item.id,
  }));
}

export function buildCouponSpus(categories: ProductCatalogLeafItem[]) {
  return MOCK_PRODUCTS.map((product, productIndex) => {
    const category = resolveProductCategory(product, categories);
    const children = SKU_SPEC_TEMPLATES[product.productType].map(
      (specText, specIndex) => {
        const surcharge = specIndex === 0 ? 0 : Math.max(product.price * 0.12, 10);
        return {
          key: `sku-${product.id}-${specIndex + 1}`,
          rowType: 'sku' as const,
          productId: product.id,
          productName: product.name,
          productCategory: category.label,
          productCategoryValue: category.value,
          skuId: `SKU_${productIndex + 1}_${specIndex + 1}`,
          skuSpecText: specText,
          productType: COUPON_PRODUCT_TYPE_LABEL_MAP[product.productType],
          price: Number((product.price + surcharge).toFixed(2)),
        };
      }
    );

    const prices = children.map((item) => item.price);

    return {
      key: `spu-${product.id}`,
      rowType: 'spu' as const,
      productId: product.id,
      productName: product.name,
      productCategory: category.label,
      productCategoryValue: category.value,
      skuId: '',
      skuSpecText: `共 ${children.length} 个 SKU`,
      productType: COUPON_PRODUCT_TYPE_LABEL_MAP[product.productType],
      price: prices[0],
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      children,
    };
  });
}

export function formatCurrency(price: number) {
  return `¥${price.toFixed(2)}`;
}

export function formatCouponPriceRange(minPrice: number, maxPrice: number) {
  if (minPrice === maxPrice) {
    return formatCurrency(minPrice);
  }

  return `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`;
}

function matchKeyword(item: CouponProductTableItem, keyword: string) {
  return (
    item.productName.toLowerCase().includes(keyword) ||
    item.productId.toLowerCase().includes(keyword) ||
    item.productCategory.toLowerCase().includes(keyword) ||
    item.skuId.toLowerCase().includes(keyword)
  );
}

export function filterCouponProducts(
  data: CouponSpuItem[],
  keyword: string,
  categoryValue?: string
) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  return data
    .filter((item) => {
      if (!categoryValue) {
        return true;
      }
      return item.productCategoryValue === categoryValue;
    })
    .map((item) => {
      if (!normalizedKeyword) {
        return item;
      }

      const matchedChildren = item.children.filter((child) =>
        matchKeyword(child, normalizedKeyword)
      );

      if (matchKeyword(item, normalizedKeyword)) {
        return item;
      }

      if (!matchedChildren.length) {
        return null;
      }

      return {
        ...item,
        skuSpecText: `共 ${matchedChildren.length} 个 SKU`,
        minPrice: Math.min(...matchedChildren.map((child) => child.price)),
        maxPrice: Math.max(...matchedChildren.map((child) => child.price)),
        children: matchedChildren,
      };
    })
    .filter(Boolean) as CouponSpuItem[];
}
