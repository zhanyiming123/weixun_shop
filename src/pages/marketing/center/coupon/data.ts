import {
  filterProductsByStoreIds,
  MOCK_PRODUCTS,
  ProductItem,
  ProductType,
} from '@/pages/product/list/data';
import { ProductCatalogLeafItem } from '@/pages/product/catalog/data';
import { ProductOwnershipLeafItem } from '@/pages/product/category/data';
import { DEFAULT_PRODUCT_STORE_ITEMS } from '@/pages/product/store-config/data';
import { hasStoreIntersection } from '@/utils/organization';
import { MarketingProductSelectorSpuItem } from '../components/product-selector/types';

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
export type CouponOwnershipType = 'platform' | 'shop';
export type CouponStackingType =
  | 'shopOnly'
  | 'platformOnly'
  | 'shopAndPlatform';

export type CouponOwnershipScope = 'own';
export type CouponEditFieldMode = 'editable' | 'increaseOnly' | 'readonly';

export type CouponEditRuleSet = {
  discountInfo: CouponEditFieldMode;
  storeIds: CouponEditFieldMode;
  productScope: CouponEditFieldMode;
  name: CouponEditFieldMode;
  issueCount: CouponEditFieldMode;
  limitPerUser: CouponEditFieldMode;
  receiveStartAt: CouponEditFieldMode;
  receiveEndAt: CouponEditFieldMode;
  validity: CouponEditFieldMode;
  stacking: CouponEditFieldMode;
};

export type CouponProductCategoryOption = {
  label: string;
  value: string;
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
  allowStacking: boolean;
  stackingCouponType?: CouponStackingType;
  storeIds: string[];
  productScope: CouponProductScope;
  conditionCategoryPaths: string[][];
  conditionOwnershipSelections: CouponConditionOwnershipSelection[];
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
  ownershipStoreIds: string[];
  ownershipType?: CouponOwnershipType;
  status?: CouponListStatus;
  keyword: string;
};

export type CouponListItem = {
  id: string;
  couponKind: CouponKind;
  name: string;
  discountType: CouponDiscountType;
  productScope: CouponProductScope;
  discountSummary: string;
  // 全局领取/发放数据（所有分享店铺共用同一额度池）
  receivedCount: number;
  issueCount: number;
  // 本店领取数量
  localReceivedCount: number;
  receiveRate: number;
  receiveStartAt: string;
  receiveEndAt: string;
  useStartAt: string;
  useEndAt: string;
  // 当前视角下的归属状态
  ownershipScope: CouponOwnershipScope;
  // 创建者店铺 ID（必填）
  ownershipStoreId: string;
  // 创建者店铺名称（用于展示）
  ownershipLabel: string;
  // 平台券下发到的目标店铺列表
  sharedToStoreIds: string[];
  // 适用店铺列表（含创建店铺自身）
  storeIds: string[];
  ownershipType: CouponOwnershipType;
  status: CouponListStatus;
};

export type CouponReadOptions = {
  isStoreSystem?: boolean;
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
  allowStacking?: boolean;
  stackingCouponType?: CouponStackingType;
  stackingUnlimited?: boolean;
  stackingCount?: number;
  storeIds: string[];
  productScope: CouponProductScope;
  conditionCategoryPaths: string[][];
  conditionOwnershipSelections: CouponConditionOwnershipSelection[];
  selectedSkuIds: string[];
  // 全局领取/发放（所有店铺共享额度池）
  receivedCount: number;
  issueCount: number;
  // 本店领取数量
  localReceivedCount: number;
  limitPerUser: number;
  receiveRate: number;
  receiveStartAt: string;
  receiveEndAt: string;
  useStartAt: string;
  useEndAt: string;
  // 创建者店铺 ID（必填，总部店铺也是一个店铺）
  ownershipStoreId: string;
  // 平台券下发到的目标店铺列表（不含创建者自身）
  sharedToStoreIds: string[];
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

export function getCreatePageDiscountOptions() {
  return COUPON_DISCOUNT_OPTIONS.filter((item) => item.value === 'fullReduction');
}

export const COUPON_STACKING_TYPE_OPTIONS = [
  { label: '仅店铺券', value: 'shopOnly' as CouponStackingType },
  { label: '仅平台券', value: 'platformOnly' as CouponStackingType },
  { label: '店铺券和平台券', value: 'shopAndPlatform' as CouponStackingType },
];

export function getCreatePageDefaultStackingCouponType(
  isStoreSystem: boolean
): CouponStackingType {
  return isStoreSystem ? 'platformOnly' : 'shopOnly';
}

export const PRODUCT_SCOPE_OPTIONS = [
  { label: '全部商品', value: 'all' as CouponProductScope },
  { label: '按条件圈品', value: 'condition' as CouponProductScope },
  { label: '部分商品', value: 'specific' as CouponProductScope },
];

export function getCreatePageProductScopeOptions(isStoreSystem: boolean) {
  return isStoreSystem
    ? PRODUCT_SCOPE_OPTIONS
    : PRODUCT_SCOPE_OPTIONS.filter((item) => item.value !== 'specific');
}

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

export const COUPON_OWNERSHIP_SCOPE_LABEL_MAP: Record<CouponOwnershipScope, string> = {
  own: '本店创建',
};

export const COUPON_OWNERSHIP_TYPE_LABEL_MAP: Record<CouponOwnershipType, string> = {
  platform: '平台券',
  shop: '店铺券',
};

export const COUPON_OWNERSHIP_TYPE_OPTIONS = [
  { label: '平台券', value: 'platform' as CouponOwnershipType },
  { label: '店铺券', value: 'shop' as CouponOwnershipType },
];

const READONLY_COUPON_EDIT_RULES: CouponEditRuleSet = {
  discountInfo: 'readonly',
  storeIds: 'readonly',
  productScope: 'readonly',
  name: 'readonly',
  issueCount: 'readonly',
  limitPerUser: 'readonly',
  receiveStartAt: 'readonly',
  receiveEndAt: 'readonly',
  validity: 'readonly',
  stacking: 'readonly',
};

export const COUPON_SCOPE_SUMMARY_LABEL_MAP: Record<CouponProductScope, string> = {
  all: '全部商品',
  condition: '按条件圈品',
  specific: '部分商品',
};

export type CouponConditionOwnershipSelection = {
  catalogPath: string[];
  ownershipPaths: string[][];
  specAttributeId?: string;
  specValue?: string;
};

const ALL_COUPON_STORE_IDS = DEFAULT_PRODUCT_STORE_ITEMS.map((item) => item.id);
const COUPON_STORE_NAME_MAP = new Map(
  DEFAULT_PRODUCT_STORE_ITEMS.map((item) => [item.id, item.name])
);
const COUPON_STORE_ID_MIGRATION_MAP: Record<string, string> = {
  store_shanghai: 'store_shanghai',
  store_beijing: 'store_beijing',
  store_hangzhou: 'store_chengdu',
};

function migrateCouponStoreId(storeId?: string) {
  if (!storeId) {
    return undefined;
  }
  return COUPON_STORE_ID_MIGRATION_MAP[storeId] || storeId;
}

function normalizeCouponAvailableStoreIds(storeIds: string[] = ALL_COUPON_STORE_IDS) {
  const availableStoreIdSet = new Set(
    storeIds
      .map((item) => migrateCouponStoreId(item))
      .filter((item): item is string => Boolean(item) && ALL_COUPON_STORE_IDS.includes(item))
  );
  return ALL_COUPON_STORE_IDS.filter((item) => availableStoreIdSet.has(item));
}

export function normalizeCouponStoreIds(
  storeIds: string[] = [],
  availableStoreIds: string[] = ALL_COUPON_STORE_IDS
) {
  const normalizedAvailableStoreIds = normalizeCouponAvailableStoreIds(availableStoreIds);
  const selectedSet = new Set(
    storeIds
      .map((item) => migrateCouponStoreId(item))
      .filter((item): item is string =>
        Boolean(item) && normalizedAvailableStoreIds.includes(item)
      )
  );
  return normalizedAvailableStoreIds.filter((item) => selectedSet.has(item));
}

export function isAllCouponStoresSelected(
  storeIds: string[] = [],
  availableStoreIds: string[] = ALL_COUPON_STORE_IDS
) {
  const normalizedAvailableStoreIds = normalizeCouponAvailableStoreIds(availableStoreIds);
  return (
    Boolean(normalizedAvailableStoreIds.length) &&
    normalizeCouponStoreIds(storeIds, normalizedAvailableStoreIds).length ===
      normalizedAvailableStoreIds.length
  );
}

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

const COUPON_COPY_NAME_SUFFIX = '_副本';

function buildCopyCouponName(name: string) {
  const maxLength = 15;
  const trimmedName = name.trim();
  const baseLength = maxLength - COUPON_COPY_NAME_SUFFIX.length;
  if (trimmedName.length <= baseLength) {
    return `${trimmedName}${COUPON_COPY_NAME_SUFFIX}`;
  }
  return `${trimmedName.slice(0, baseLength)}${COUPON_COPY_NAME_SUFFIX}`;
}

// 广州店铺（store_guangzhou）在 Demo 中充当"总部店铺"，
// 负责创建标准券并分享给其他店铺。
const HQ_STORE_ID = 'store_guangzhou';
const ALL_STORE_IDS_EXCEPT_HQ = ALL_COUPON_STORE_IDS.filter((id) => id !== HQ_STORE_ID);

const COUPON_RECORD_SEEDS: CouponDetailRecord[] = [
  // ─── 广州店铺（总部店铺）创建并分享给其他店铺的券 ────────────────────────────

  {
    id: '122661783977',
    couponKind: 'general',
    name: '遴选计划-减免10000',
    discountType: 'fullReduction',
    fullReductionThreshold: 10,
    fullReductionAmount: 2,
    storeIds: ['store_guangzhou', 'store_suzhou'],
    productScope: 'all',
    conditionCategoryPaths: [],
    conditionOwnershipSelections: [],
    selectedSkuIds: [],
    receivedCount: 200,
    issueCount: 400,
    localReceivedCount: 95,
    limitPerUser: 1,
    receiveRate: 50,
    receiveStartAt: '2026/10/30 00:00:00',
    receiveEndAt: '2026/10/30 00:00:00',
    useStartAt: '2026/10/30 00:00:00',
    useEndAt: '2026/10/30 00:00:00',
    ownershipStoreId: HQ_STORE_ID,
    sharedToStoreIds: ['store_suzhou'],
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
    storeIds: ['store_guangzhou', 'store_suzhou', 'mall_online'],
    productScope: 'specific',
    conditionCategoryPaths: [],
    conditionOwnershipSelections: [],
    selectedSkuIds: DEFAULT_SELECTED_SKUS_BY_RECORD['122661783978'],
    receivedCount: 200,
    issueCount: 400,
    localReceivedCount: 68,
    limitPerUser: 1,
    receiveRate: 50,
    receiveStartAt: '2026/03/30 00:00:00',
    receiveEndAt: '2026/10/30 00:00:00',
    useStartAt: '2026/03/30 00:00:00',
    useEndAt: '2026/10/30 00:00:00',
    ownershipStoreId: HQ_STORE_ID,
    sharedToStoreIds: ['store_suzhou', 'mall_online'],
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
    storeIds: ['store_guangzhou', 'store_suzhou'],
    productScope: 'all',
    conditionCategoryPaths: [],
    conditionOwnershipSelections: [],
    selectedSkuIds: [],
    receivedCount: 96,
    issueCount: 200,
    localReceivedCount: 42,
    limitPerUser: 1,
    receiveRate: 48,
    receiveStartAt: '2026/08/01 00:00:00',
    receiveEndAt: '2026/08/31 23:59:59',
    useStartAt: '2026/08/01 00:00:00',
    useEndAt: '2026/09/10 23:59:59',
    ownershipStoreId: HQ_STORE_ID,
    sharedToStoreIds: ['store_suzhou'],
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
    storeIds: ['store_guangzhou', 'store_suzhou', 'mall_mini_program'],
    productScope: 'all',
    conditionCategoryPaths: [],
    conditionOwnershipSelections: [],
    selectedSkuIds: [],
    receivedCount: 320,
    issueCount: 600,
    localReceivedCount: 107,
    limitPerUser: 1,
    receiveRate: 53,
    receiveStartAt: '2026/02/01 00:00:00',
    receiveEndAt: '2026/03/31 23:59:59',
    useStartAt: '2026/02/01 00:00:00',
    useEndAt: '2026/04/15 23:59:59',
    ownershipStoreId: HQ_STORE_ID,
    sharedToStoreIds: ['store_suzhou', 'mall_mini_program'],
    status: 'active',
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
    storeIds: ['store_guangzhou', 'mall_jiangsu'],
    productScope: 'condition',
    conditionCategoryPaths: [['weixun-course', 'international']],
    conditionOwnershipSelections: [
      {
        catalogPath: ['weixun-course', 'international'],
        ownershipPaths: [['dept_06', 'system_06_03', 'item_06_03_01']],
        specAttributeId: 'A001',
        specValue: '标准直播班',
      },
    ],
    selectedSkuIds: [],
    receivedCount: 58,
    issueCount: 120,
    localReceivedCount: 29,
    limitPerUser: 1,
    receiveRate: 48,
    receiveStartAt: '2024/11/01 00:00:00',
    receiveEndAt: '2024/11/30 23:59:59',
    useStartAt: '2024/11/01 00:00:00',
    useEndAt: '2024/12/15 23:59:59',
    ownershipStoreId: HQ_STORE_ID,
    sharedToStoreIds: ['mall_jiangsu'],
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
    storeIds: [...ALL_COUPON_STORE_IDS],
    productScope: 'all',
    conditionCategoryPaths: [],
    conditionOwnershipSelections: [],
    selectedSkuIds: [],
    receivedCount: 260,
    issueCount: 500,
    localReceivedCount: 37,
    limitPerUser: 1,
    receiveRate: 52,
    receiveStartAt: '2026/04/01 00:00:00',
    receiveEndAt: '2026/05/31 23:59:59',
    useStartAt: '2026/04/01 00:00:00',
    useEndAt: '2026/06/30 23:59:59',
    ownershipStoreId: HQ_STORE_ID,
    sharedToStoreIds: ALL_STORE_IDS_EXCEPT_HQ,
    status: 'active',
    validityType: 'sameAsReceive',
    validDays: 1,
    customUseTimeRange: [],
  },
  {
    id: '122661783997',
    couponKind: 'general',
    name: '平台暑期回流券',
    discountType: 'directReduction',
    directReductionAmount: 45,
    storeIds: ['store_guangzhou', 'store_suzhou'],
    productScope: 'all',
    conditionCategoryPaths: [],
    conditionOwnershipSelections: [],
    selectedSkuIds: [],
    receivedCount: 154,
    issueCount: 260,
    localReceivedCount: 71,
    limitPerUser: 1,
    receiveRate: 59,
    receiveStartAt: '2025/07/01 00:00:00',
    receiveEndAt: '2025/07/31 23:59:59',
    useStartAt: '2025/07/01 00:00:00',
    useEndAt: '2025/08/15 23:59:59',
    ownershipStoreId: HQ_STORE_ID,
    sharedToStoreIds: ['store_suzhou'],
    status: 'expired',
    validityType: 'sameAsReceive',
    validDays: 1,
    customUseTimeRange: [],
  },
  {
    id: '122661783989',
    couponKind: 'general',
    name: '苏州新客到店礼',
    discountType: 'directReduction',
    directReductionAmount: 80,
    storeIds: ['store_guangzhou', 'store_suzhou'],
    productScope: 'all',
    conditionCategoryPaths: [],
    conditionOwnershipSelections: [],
    selectedSkuIds: [],
    receivedCount: 132,
    issueCount: 240,
    localReceivedCount: 66,
    limitPerUser: 1,
    receiveRate: 55,
    receiveStartAt: '2026/04/01 00:00:00',
    receiveEndAt: '2026/04/30 23:59:59',
    useStartAt: '2026/04/01 00:00:00',
    useEndAt: '2026/05/15 23:59:59',
    ownershipStoreId: HQ_STORE_ID,
    sharedToStoreIds: ['store_suzhou'],
    status: 'active',
    validityType: 'sameAsReceive',
    validDays: 1,
    customUseTimeRange: [],
  },
  {
    id: '122661783991',
    couponKind: 'general',
    name: '广州试听福利券',
    discountType: 'fullReduction',
    fullReductionThreshold: 500,
    fullReductionAmount: 120,
    storeIds: ['store_guangzhou'],
    productScope: 'all',
    conditionCategoryPaths: [],
    conditionOwnershipSelections: [],
    selectedSkuIds: [],
    receivedCount: 98,
    issueCount: 180,
    localReceivedCount: 98,
    limitPerUser: 1,
    receiveRate: 54,
    receiveStartAt: '2026/04/03 00:00:00',
    receiveEndAt: '2026/04/29 23:59:59',
    useStartAt: '2026/04/03 00:00:00',
    useEndAt: '2026/05/12 23:59:59',
    ownershipStoreId: HQ_STORE_ID,
    sharedToStoreIds: [],
    status: 'active',
    validityType: 'sameAsReceive',
    validDays: 1,
    customUseTimeRange: [],
  },
  {
    id: '122661783993',
    couponKind: 'general',
    name: '深圳春季体验券',
    discountType: 'discount',
    discountRate: 8.5,
    storeIds: ['store_guangzhou', 'store_shenzhen'],
    productScope: 'all',
    conditionCategoryPaths: [],
    conditionOwnershipSelections: [],
    selectedSkuIds: [],
    receivedCount: 72,
    issueCount: 120,
    localReceivedCount: 36,
    limitPerUser: 1,
    receiveRate: 60,
    receiveStartAt: '2026/04/02 00:00:00',
    receiveEndAt: '2026/04/26 23:59:59',
    useStartAt: '2026/04/02 00:00:00',
    useEndAt: '2026/05/10 23:59:59',
    ownershipStoreId: HQ_STORE_ID,
    sharedToStoreIds: ['store_shenzhen'],
    status: 'active',
    validityType: 'sameAsReceive',
    validDays: 1,
    customUseTimeRange: [],
  },
  {
    id: '122661783995',
    couponKind: 'general',
    name: '苏州到店礼',
    discountType: 'directReduction',
    directReductionAmount: 70,
    storeIds: ['store_guangzhou', 'store_suzhou'],
    productScope: 'all',
    conditionCategoryPaths: [],
    conditionOwnershipSelections: [],
    selectedSkuIds: [],
    receivedCount: 42,
    issueCount: 90,
    localReceivedCount: 21,
    limitPerUser: 1,
    receiveRate: 47,
    receiveStartAt: '2026/04/09 00:00:00',
    receiveEndAt: '2026/05/09 23:59:59',
    useStartAt: '2026/04/09 00:00:00',
    useEndAt: '2026/05/20 23:59:59',
    ownershipStoreId: HQ_STORE_ID,
    sharedToStoreIds: ['store_suzhou'],
    status: 'active',
    validityType: 'sameAsReceive',
    validDays: 1,
    customUseTimeRange: [],
  },

  // ─── 各店铺自建券 ─────────────────────────────────────────────────────────────

  {
    id: '122661783979',
    couponKind: 'general',
    name: '择校季-立减体验券',
    discountType: 'directReduction',
    directReductionAmount: 2,
    storeIds: ['store_guangzhou', 'mall_jiangsu'],
    productScope: 'specific',
    conditionCategoryPaths: [],
    conditionOwnershipSelections: [],
    selectedSkuIds: DEFAULT_SELECTED_SKUS_BY_RECORD['122661783979'],
    receivedCount: 200,
    issueCount: 400,
    localReceivedCount: 200,
    limitPerUser: 1,
    receiveRate: 50,
    receiveStartAt: '2025/03/30 00:00:00',
    receiveEndAt: '2025/10/30 00:00:00',
    useStartAt: '2025/03/30 00:00:00',
    useEndAt: '2025/10/30 00:00:00',
    ownershipStoreId: 'store_guangzhou',
    sharedToStoreIds: [],
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
    storeIds: ['store_suzhou'],
    productScope: 'specific',
    conditionCategoryPaths: [],
    conditionOwnershipSelections: [],
    selectedSkuIds: DEFAULT_SELECTED_SKUS_BY_RECORD['122661783980'],
    receivedCount: 88,
    issueCount: 150,
    localReceivedCount: 88,
    limitPerUser: 1,
    receiveRate: 59,
    receiveStartAt: '2024/03/30 00:00:00',
    receiveEndAt: '2024/10/30 00:00:00',
    useStartAt: '2024/03/30 00:00:00',
    useEndAt: '2024/10/30 00:00:00',
    ownershipStoreId: 'store_suzhou',
    sharedToStoreIds: [],
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
    storeIds: ['store_shenzhen', 'mall_online'],
    productScope: 'specific',
    conditionCategoryPaths: [],
    conditionOwnershipSelections: [],
    selectedSkuIds: DEFAULT_SELECTED_SKUS_BY_RECORD['122661783981'],
    receivedCount: 168,
    issueCount: 300,
    localReceivedCount: 168,
    limitPerUser: 1,
    receiveRate: 56,
    receiveStartAt: '2026/05/01 00:00:00',
    receiveEndAt: '2026/06/30 23:59:59',
    useStartAt: '2026/05/01 00:00:00',
    useEndAt: '2026/07/15 23:59:59',
    ownershipStoreId: 'store_shenzhen',
    sharedToStoreIds: [],
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
    storeIds: ['store_guangzhou'],
    productScope: 'specific',
    conditionCategoryPaths: [],
    conditionOwnershipSelections: [],
    selectedSkuIds: DEFAULT_SELECTED_SKUS_BY_RECORD['122661783984'],
    receivedCount: 88,
    issueCount: 180,
    localReceivedCount: 88,
    limitPerUser: 1,
    receiveRate: 49,
    receiveStartAt: '2025/09/01 00:00:00',
    receiveEndAt: '2025/09/30 23:59:59',
    useStartAt: '2025/09/01 00:00:00',
    useEndAt: '2025/10/31 23:59:59',
    ownershipStoreId: 'store_guangzhou',
    sharedToStoreIds: [],
    status: 'expired',
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
    storeIds: ['store_shenzhen', 'mall_mini_program'],
    productScope: 'specific',
    conditionCategoryPaths: [],
    conditionOwnershipSelections: [],
    selectedSkuIds: DEFAULT_SELECTED_SKUS_BY_RECORD['122661783987'],
    receivedCount: 45,
    issueCount: 150,
    localReceivedCount: 45,
    limitPerUser: 1,
    receiveRate: 30,
    receiveStartAt: '2026/11/01 00:00:00',
    receiveEndAt: '2026/11/30 23:59:59',
    useStartAt: '2026/12/01 00:00:00',
    useEndAt: '2027/01/15 23:59:59',
    ownershipStoreId: 'store_shenzhen',
    sharedToStoreIds: [],
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
    storeIds: ['store_guangzhou'],
    productScope: 'specific',
    conditionCategoryPaths: [],
    conditionOwnershipSelections: [],
    selectedSkuIds: DEFAULT_SELECTED_SKUS_BY_RECORD['122661783988'],
    receivedCount: 120,
    issueCount: 180,
    localReceivedCount: 120,
    limitPerUser: 1,
    receiveRate: 67,
    receiveStartAt: '2024/06/01 00:00:00',
    receiveEndAt: '2024/07/15 23:59:59',
    useStartAt: '2024/06/01 00:00:00',
    useEndAt: '2024/08/31 23:59:59',
    ownershipStoreId: 'store_guangzhou',
    sharedToStoreIds: [],
    status: 'voided',
    validityType: 'sameAsReceive',
    validDays: 1,
    customUseTimeRange: [],
  },
  {
    id: '122661783990',
    couponKind: 'general',
    name: '苏州店铺周末转化券',
    discountType: 'discount',
    discountRate: 8.8,
    storeIds: ['store_suzhou'],
    productScope: 'all',
    conditionCategoryPaths: [],
    conditionOwnershipSelections: [],
    selectedSkuIds: [],
    receivedCount: 76,
    issueCount: 120,
    localReceivedCount: 76,
    limitPerUser: 1,
    receiveRate: 63,
    receiveStartAt: '2026/04/05 00:00:00',
    receiveEndAt: '2026/04/28 23:59:59',
    useStartAt: '2026/04/05 00:00:00',
    useEndAt: '2026/05/05 23:59:59',
    ownershipStoreId: 'store_suzhou',
    sharedToStoreIds: [],
    status: 'active',
    validityType: 'afterReceiveDays',
    validDays: 7,
    customUseTimeRange: [],
  },
  {
    id: '122661783992',
    couponKind: 'general',
    name: '广州店铺升学咨询券',
    discountType: 'directReduction',
    directReductionAmount: 60,
    storeIds: ['store_guangzhou'],
    productScope: 'all',
    conditionCategoryPaths: [],
    conditionOwnershipSelections: [],
    selectedSkuIds: [],
    receivedCount: 64,
    issueCount: 100,
    localReceivedCount: 64,
    limitPerUser: 1,
    receiveRate: 64,
    receiveStartAt: '2026/04/06 00:00:00',
    receiveEndAt: '2026/04/25 23:59:59',
    useStartAt: '2026/04/06 00:00:00',
    useEndAt: '2026/05/06 23:59:59',
    ownershipStoreId: 'store_guangzhou',
    sharedToStoreIds: [],
    status: 'active',
    validityType: 'afterReceiveDays',
    validDays: 10,
    customUseTimeRange: [],
  },
  {
    id: '122661783994',
    couponKind: 'general',
    name: '深圳店铺语言提升礼券',
    discountType: 'directReduction',
    directReductionAmount: 40,
    storeIds: ['store_shenzhen'],
    productScope: 'all',
    conditionCategoryPaths: [],
    conditionOwnershipSelections: [],
    selectedSkuIds: [],
    receivedCount: 36,
    issueCount: 80,
    localReceivedCount: 36,
    limitPerUser: 1,
    receiveRate: 45,
    receiveStartAt: '2026/04/10 00:00:00',
    receiveEndAt: '2026/05/10 23:59:59',
    useStartAt: '2026/04/10 00:00:00',
    useEndAt: '2026/05/20 23:59:59',
    ownershipStoreId: 'store_shenzhen',
    sharedToStoreIds: [],
    status: 'notStarted',
    validityType: 'custom',
    validDays: 1,
    customUseTimeRange: ['2026/04/10 00:00:00', '2026/05/20 23:59:59'],
  },
  {
    id: '122661783996',
    couponKind: 'general',
    name: '苏州店铺到店转化券',
    discountType: 'discount',
    discountRate: 8.5,
    storeIds: ['store_suzhou'],
    productScope: 'all',
    conditionCategoryPaths: [],
    conditionOwnershipSelections: [],
    selectedSkuIds: [],
    receivedCount: 28,
    issueCount: 60,
    localReceivedCount: 28,
    limitPerUser: 1,
    receiveRate: 47,
    receiveStartAt: '2026/04/10 00:00:00',
    receiveEndAt: '2026/05/12 23:59:59',
    useStartAt: '2026/04/10 00:00:00',
    useEndAt: '2026/05/25 23:59:59',
    ownershipStoreId: 'store_suzhou',
    sharedToStoreIds: [],
    status: 'notStarted',
    validityType: 'afterReceiveDays',
    validDays: 10,
    customUseTimeRange: [],
  },

  // ─── 店铺之间相互分享的券（演示跨店分享功能）─────────────────────────────────

  {
    id: '122661784001',
    couponKind: 'general',
    name: '苏州爆款课-联合推广券',
    discountType: 'fullReduction',
    fullReductionThreshold: 300,
    fullReductionAmount: 50,
    storeIds: ['store_suzhou'],
    productScope: 'all',
    conditionCategoryPaths: [],
    conditionOwnershipSelections: [],
    selectedSkuIds: [],
    receivedCount: 186,
    issueCount: 360,
    localReceivedCount: 186,
    limitPerUser: 1,
    receiveRate: 52,
    receiveStartAt: '2026/04/01 00:00:00',
    receiveEndAt: '2026/05/15 23:59:59',
    useStartAt: '2026/04/01 00:00:00',
    useEndAt: '2026/06/01 23:59:59',
    ownershipStoreId: 'store_suzhou',
    sharedToStoreIds: [],
    status: 'active',
    validityType: 'sameAsReceive',
    validDays: 1,
    customUseTimeRange: [],
  },
  {
    id: '122661784002',
    couponKind: 'general',
    name: '深圳精品班-体验券',
    discountType: 'directReduction',
    directReductionAmount: 120,
    storeIds: ['store_shenzhen'],
    productScope: 'all',
    conditionCategoryPaths: [],
    conditionOwnershipSelections: [],
    selectedSkuIds: [],
    receivedCount: 144,
    issueCount: 280,
    localReceivedCount: 144,
    limitPerUser: 1,
    receiveRate: 51,
    receiveStartAt: '2026/04/05 00:00:00',
    receiveEndAt: '2026/05/20 23:59:59',
    useStartAt: '2026/04/05 00:00:00',
    useEndAt: '2026/06/05 23:59:59',
    ownershipStoreId: 'store_shenzhen',
    sharedToStoreIds: [],
    status: 'active',
    validityType: 'sameAsReceive',
    validDays: 1,
    customUseTimeRange: [],
  },
  {
    id: '122661784101',
    couponKind: 'general',
    name: '店铺冲刺引流券A',
    discountType: 'directReduction',
    directReductionAmount: 30,
    storeIds: ['store_guangzhou'],
    productScope: 'all',
    conditionCategoryPaths: [],
    conditionOwnershipSelections: [],
    selectedSkuIds: [],
    receivedCount: 112,
    issueCount: 240,
    localReceivedCount: 112,
    limitPerUser: 1,
    receiveRate: 47,
    receiveStartAt: '2026/04/18 00:00:00',
    receiveEndAt: '2026/05/20 23:59:59',
    useStartAt: '2026/04/18 00:00:00',
    useEndAt: '2026/06/01 23:59:59',
    ownershipStoreId: 'store_guangzhou',
    sharedToStoreIds: [],
    status: 'active',
    validityType: 'sameAsReceive',
    validDays: 1,
    customUseTimeRange: [],
  },
  {
    id: '122661784102',
    couponKind: 'general',
    name: '店铺周末转化券B',
    discountType: 'discount',
    discountRate: 8.8,
    storeIds: ['store_guangzhou'],
    productScope: 'all',
    conditionCategoryPaths: [],
    conditionOwnershipSelections: [],
    selectedSkuIds: [],
    receivedCount: 86,
    issueCount: 180,
    localReceivedCount: 86,
    limitPerUser: 1,
    receiveRate: 48,
    receiveStartAt: '2026/04/20 00:00:00',
    receiveEndAt: '2026/05/22 23:59:59',
    useStartAt: '2026/04/20 00:00:00',
    useEndAt: '2026/06/05 23:59:59',
    ownershipStoreId: 'store_guangzhou',
    sharedToStoreIds: [],
    status: 'active',
    validityType: 'afterReceiveDays',
    validDays: 10,
    customUseTimeRange: [],
  },
  {
    id: '122661784103',
    couponKind: 'general',
    name: '店铺拉新福利券C',
    discountType: 'fullReduction',
    fullReductionThreshold: 300,
    fullReductionAmount: 60,
    storeIds: ['store_guangzhou'],
    productScope: 'all',
    conditionCategoryPaths: [],
    conditionOwnershipSelections: [],
    selectedSkuIds: [],
    receivedCount: 74,
    issueCount: 200,
    localReceivedCount: 74,
    limitPerUser: 1,
    receiveRate: 37,
    receiveStartAt: '2026/04/22 00:00:00',
    receiveEndAt: '2026/05/28 23:59:59',
    useStartAt: '2026/04/22 00:00:00',
    useEndAt: '2026/06/10 23:59:59',
    ownershipStoreId: 'store_guangzhou',
    sharedToStoreIds: [],
    status: 'notStarted',
    validityType: 'sameAsReceive',
    validDays: 1,
    customUseTimeRange: [],
  },
];

const STORE_SYSTEM_PAGE_ONE_MOCK_COUPON_IDS = [
  '122661784101',
  '122661784102',
  '122661784103',
];

function cloneConditionCategoryPaths(conditionCategoryPaths: string[][]) {
  return conditionCategoryPaths.map((path) => [...path]);
}

function cloneConditionOwnershipSelections(
  conditionOwnershipSelections: CouponConditionOwnershipSelection[]
) {
  return conditionOwnershipSelections.map((item) => ({
    catalogPath: [...item.catalogPath],
    ownershipPaths: cloneConditionCategoryPaths(item.ownershipPaths),
    specAttributeId: item.specAttributeId,
    specValue: item.specValue,
  }));
}

function computeOwnershipScope(): CouponOwnershipScope {
  return 'own';
}

export function getCouponOwnershipType(
  record: Pick<CouponDetailRecord, 'ownershipStoreId'> &
    Partial<Pick<CouponDetailRecord, 'sharedToStoreIds'>>
): CouponOwnershipType {
  if (Array.isArray(record.sharedToStoreIds)) {
    return record.sharedToStoreIds.length > 0 ? 'platform' : 'shop';
  }
  return record.ownershipStoreId === HQ_STORE_ID ? 'platform' : 'shop';
}

function prioritizeStoreSystemPageOneCoupons(records: CouponDetailRecord[]) {
  const rankMap = new Map(
    STORE_SYSTEM_PAGE_ONE_MOCK_COUPON_IDS.map((id, index) => [id, index])
  );
  const prioritized: Array<CouponDetailRecord | undefined> = new Array(
    STORE_SYSTEM_PAGE_ONE_MOCK_COUPON_IDS.length
  );
  const rest: CouponDetailRecord[] = [];

  records.forEach((record) => {
    const rank = rankMap.get(record.id);
    if (typeof rank === 'number') {
      prioritized[rank] = record;
      return;
    }
    rest.push(record);
  });

  return [
    ...prioritized.filter((item): item is CouponDetailRecord => Boolean(item)),
    ...rest,
  ];
}

export function formatCouponOwnershipLabel(
  record: Pick<CouponDetailRecord, 'ownershipStoreId'>
) {
  return COUPON_STORE_NAME_MAP.get(record.ownershipStoreId) || record.ownershipStoreId;
}

export function isCouponEditableStatus(status: CouponListStatus) {
  return status === 'notStarted' || status === 'active';
}

export function isCouponEditFieldEditable(mode: CouponEditFieldMode) {
  return mode !== 'readonly';
}

export function getCouponEditRuleSet(
  record: Pick<CouponDetailRecord, 'status'>
): CouponEditRuleSet {
  if (record.status === 'notStarted') {
    return {
      discountInfo: 'editable',
      storeIds: 'editable',
      productScope: 'editable',
      name: 'editable',
      issueCount: 'editable',
      limitPerUser: 'editable',
      receiveStartAt: 'editable',
      receiveEndAt: 'editable',
      validity: 'editable',
      stacking: 'editable',
    };
  }

  if (record.status === 'active') {
    return {
      discountInfo: 'readonly',
      storeIds: 'readonly',
      productScope: 'readonly',
      name: 'editable',
      issueCount: 'increaseOnly',
      limitPerUser: 'increaseOnly',
      receiveStartAt: 'readonly',
      receiveEndAt: 'editable',
      validity: 'readonly',
      stacking: 'readonly',
    };
  }

  return READONLY_COUPON_EDIT_RULES;
}

function cloneCouponDetailRecord(record: CouponDetailRecord): CouponDetailRecord {
  const allowStacking = Boolean(record.allowStacking);
  const stackingUnlimited = allowStacking ? Boolean(record.stackingUnlimited) : false;

  return {
    ...record,
    allowStacking,
    stackingCouponType: allowStacking ? record.stackingCouponType : undefined,
    stackingUnlimited,
    stackingCount:
      allowStacking && !stackingUnlimited && typeof record.stackingCount === 'number'
        ? record.stackingCount
        : undefined,
    storeIds: normalizeCouponStoreIds(record.storeIds),
    sharedToStoreIds: [...record.sharedToStoreIds],
    conditionCategoryPaths: cloneConditionCategoryPaths(record.conditionCategoryPaths),
    conditionOwnershipSelections: cloneConditionOwnershipSelections(
      record.conditionOwnershipSelections
    ),
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
    return `满${formatNumberText(record.directReductionAmount)}减${formatNumberText(
      record.directReductionAmount
    )}`;
  }
  return `满100减${formatNumberText(
    typeof record.discountRate === 'number' ? (10 - record.discountRate) * 10 : undefined
  )}`;
}

function toCouponListItem(
  record: CouponDetailRecord,
  _visibleStoreIds?: string[]
): CouponListItem {
  const ownershipScope = computeOwnershipScope();

  return {
    id: record.id,
    couponKind: record.couponKind,
    name: record.name,
    discountType: record.discountType,
    productScope: record.productScope,
    discountSummary: formatCouponDiscountSummary(record),
    receivedCount: record.receivedCount,
    issueCount: record.issueCount,
    localReceivedCount: record.localReceivedCount,
    receiveRate: record.receiveRate,
    receiveStartAt: record.receiveStartAt,
    receiveEndAt: record.receiveEndAt,
    useStartAt: record.useStartAt,
    useEndAt: record.useEndAt,
    ownershipScope,
    ownershipStoreId: record.ownershipStoreId,
    ownershipLabel: formatCouponOwnershipLabel(record),
    sharedToStoreIds: [...record.sharedToStoreIds],
    storeIds: [...record.storeIds],
    ownershipType: getCouponOwnershipType(record),
    status: record.status,
  };
}

function normalizeCouponSeedRecord(record: CouponDetailRecord) {
  if (record.discountType === 'fullReduction') {
    return cloneCouponDetailRecord(record);
  }

  if (record.discountType === 'directReduction') {
    return cloneCouponDetailRecord({
      ...record,
      discountType: 'fullReduction',
      fullReductionThreshold: record.directReductionAmount,
      fullReductionAmount: record.directReductionAmount,
      directReductionAmount: undefined,
      discountRate: undefined,
    });
  }

  return cloneCouponDetailRecord({
    ...record,
    discountType: 'fullReduction',
    fullReductionThreshold: 100,
    fullReductionAmount:
      typeof record.discountRate === 'number'
        ? Number(((10 - record.discountRate) * 10).toFixed(2))
        : undefined,
    directReductionAmount: undefined,
    discountRate: undefined,
  });
}

let couponDetailStore = COUPON_RECORD_SEEDS.map(normalizeCouponSeedRecord);

function getVisibleCouponRecords(
  visibleStoreIds?: string[],
  options?: CouponReadOptions
) {
  if (typeof visibleStoreIds === 'undefined') {
    return couponDetailStore;
  }

  if (options?.isStoreSystem) {
    return couponDetailStore.filter(
      (item) =>
        visibleStoreIds.includes(item.ownershipStoreId) ||
        (getCouponOwnershipType(item) === 'platform' &&
          hasStoreIntersection(item.sharedToStoreIds, visibleStoreIds))
    );
  }

  return couponDetailStore.filter((item) => hasStoreIntersection(item.storeIds, visibleStoreIds));
}

export function readCouponListItems(
  visibleStoreIds?: string[],
  options?: CouponReadOptions
) {
  const visibleRecords = getVisibleCouponRecords(visibleStoreIds, options);
  const orderedRecords = options?.isStoreSystem
    ? prioritizeStoreSystemPageOneCoupons(visibleRecords)
    : visibleRecords;

  return orderedRecords.map((record) =>
    toCouponListItem(record, visibleStoreIds)
  );
}

export function readCouponById(
  id: string,
  visibleStoreIds?: string[],
  options?: CouponReadOptions
) {
  const matched = getVisibleCouponRecords(visibleStoreIds, options).find(
    (item) => item.id === id
  );
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

export function updateCouponById(
  id: string,
  values: CouponFormValues,
  options?: CouponReadOptions
): CouponDetailRecord | undefined {
  const target = couponDetailStore.find((item) => item.id === id);
  if (!target) {
    return undefined;
  }

  const editRuleSet = getCouponEditRuleSet(target);
  const storeIdSet = new Set([
    target.ownershipStoreId,
    ...normalizeCouponStoreIds(values.storeIds),
  ]);
  const nextStoreIds = ALL_COUPON_STORE_IDS.filter((sid) => storeIdSet.has(sid));
  const nextReceiveStartAt = isCouponEditFieldEditable(editRuleSet.receiveStartAt)
    ? values.receiveTimeRange[0] || target.receiveStartAt
    : target.receiveStartAt;
  const nextReceiveEndAt = isCouponEditFieldEditable(editRuleSet.receiveEndAt)
    ? values.receiveTimeRange[1] || target.receiveEndAt
    : target.receiveEndAt;
  const nextValidityType = isCouponEditFieldEditable(editRuleSet.validity)
    ? values.validityType
    : target.validityType;
  const nextValidDays = isCouponEditFieldEditable(editRuleSet.validity)
    ? values.validDays
    : target.validDays;
  const nextCustomUseTimeRange = isCouponEditFieldEditable(editRuleSet.validity)
    ? [...values.customUseTimeRange]
    : [...target.customUseTimeRange];
  const nextUseStartAt =
    nextValidityType === 'custom'
      ? nextCustomUseTimeRange[0] || target.useStartAt
      : nextReceiveStartAt;
  const nextUseEndAt =
    nextValidityType === 'custom'
      ? nextCustomUseTimeRange[1] || target.useEndAt
      : nextReceiveEndAt;

  if (isCouponEditFieldEditable(editRuleSet.discountInfo)) {
    target.discountType = values.discountType;
    target.fullReductionThreshold =
      values.discountType === 'fullReduction'
        ? values.fullReductionThreshold
        : undefined;
    target.fullReductionAmount =
      values.discountType === 'fullReduction'
        ? values.fullReductionAmount
        : undefined;
    target.directReductionAmount =
      values.discountType === 'directReduction'
        ? values.directReductionAmount
        : undefined;
    target.discountRate =
      values.discountType === 'discount' ? values.discountRate : undefined;
  }
  if (isCouponEditFieldEditable(editRuleSet.stacking)) {
    target.allowStacking = values.allowStacking;
    target.stackingCouponType = values.allowStacking
      ? values.stackingCouponType
      : undefined;
    target.stackingUnlimited = false;
    target.stackingCount = undefined;
  }
  if (!options?.isStoreSystem && isCouponEditFieldEditable(editRuleSet.storeIds)) {
    if (getCouponOwnershipType(target) === 'platform') {
      target.storeIds = nextStoreIds;
      target.sharedToStoreIds = nextStoreIds.filter(
        (storeId) => storeId !== target.ownershipStoreId
      );
    } else {
      target.storeIds = [target.ownershipStoreId];
      target.sharedToStoreIds = [];
    }
  }
  if (isCouponEditFieldEditable(editRuleSet.productScope)) {
    target.productScope = values.productScope;
    target.conditionCategoryPaths = cloneConditionCategoryPaths(
      values.conditionCategoryPaths
    );
    target.conditionOwnershipSelections = cloneConditionOwnershipSelections(
      values.conditionOwnershipSelections
    );
    target.selectedSkuIds = [...values.selectedSkuIds];
  }
  if (isCouponEditFieldEditable(editRuleSet.name)) {
    target.name = values.name.trim();
  }
  if (editRuleSet.issueCount === 'editable') {
    target.issueCount = values.issueCount;
  } else if (
    editRuleSet.issueCount === 'increaseOnly' &&
    values.issueCount > target.issueCount
  ) {
    target.issueCount = values.issueCount;
  }
  if (editRuleSet.limitPerUser === 'editable') {
    target.limitPerUser = values.limitPerUser;
  } else if (
    editRuleSet.limitPerUser === 'increaseOnly' &&
    values.limitPerUser > target.limitPerUser
  ) {
    target.limitPerUser = values.limitPerUser;
  }
  target.receiveRate = target.issueCount
    ? Math.round((target.receivedCount / target.issueCount) * 100)
    : 0;
  target.receiveStartAt = nextReceiveStartAt;
  target.receiveEndAt = nextReceiveEndAt;
  target.useStartAt = nextUseStartAt;
  target.useEndAt = nextUseEndAt;
  target.validityType = nextValidityType;
  target.validDays = nextValidDays;
  target.customUseTimeRange = nextCustomUseTimeRange;

  return cloneCouponDetailRecord(target);
}

export function buildCouponFormValuesFromRecord(
  record: CouponDetailRecord,
  visibleStoreIds?: string[]
): CouponFormValues {
  const allowStacking = Boolean(record.allowStacking);

  return {
    discountType: record.discountType,
    fullReductionThreshold: record.fullReductionThreshold,
    fullReductionAmount: record.fullReductionAmount,
    directReductionAmount: record.directReductionAmount,
    discountRate: record.discountRate,
    allowStacking,
    stackingCouponType: allowStacking ? record.stackingCouponType : undefined,
    storeIds: normalizeCouponStoreIds(
      record.storeIds,
      visibleStoreIds || ALL_COUPON_STORE_IDS
    ),
    productScope: record.productScope,
    conditionCategoryPaths: cloneConditionCategoryPaths(record.conditionCategoryPaths),
    conditionOwnershipSelections: cloneConditionOwnershipSelections(
      record.conditionOwnershipSelections
    ),
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

export function buildCreateValuesFromCoupon(
  id: string,
  visibleStoreIds?: string[],
  options?: CouponReadOptions
) {
  const source = readCouponById(id, visibleStoreIds, options);
  if (!source) {
    return undefined;
  }
  return {
    ...buildCouponFormValuesFromRecord(source),
    name: buildCopyCouponName(source.name),
  };
}

export const DEFAULT_COUPON_FORM_VALUES: CouponFormValues = {
  discountType: 'fullReduction',
  fullReductionThreshold: undefined,
  fullReductionAmount: undefined,
  directReductionAmount: undefined,
  discountRate: undefined,
  allowStacking: false,
  stackingCouponType: undefined,
  storeIds: [],
  productScope: 'all',
  conditionCategoryPaths: [],
  conditionOwnershipSelections: [],
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
  ownershipStoreIds: [],
  ownershipType: undefined,
  status: undefined,
  keyword: '',
};

function resolveProductCatalog(
  product: ProductItem,
  categories: ProductCatalogLeafItem[]
) {
  const matched = categories.find((item) => item.id === product.productCatalogId);
  if (matched) {
    return matched;
  }

  const fallback = categories[0];
  return {
    id: fallback?.id || '',
    label: fallback?.label || '未配置类目',
    labelPath: fallback?.labelPath || ['未配置类目'],
    path: fallback?.path || [],
    hasSkuSpec: Boolean(fallback?.hasSkuSpec),
  };
}

function resolveProductOwnership(
  product: ProductItem,
  ownershipItems: ProductOwnershipLeafItem[]
) {
  const matched = ownershipItems.find(
    (item) => item.id === product.productOwnershipId
  );
  if (matched) {
    return matched;
  }

  const fallback = ownershipItems[0];
  return {
    id: fallback?.id || '',
    label: fallback?.label || '未配置分类',
    labelPath: fallback?.labelPath || ['未配置分类'],
    path: fallback?.path || [],
  };
}

function getSkuDisabledReason(product: ProductItem, stock: number, status: string) {
  if (status === 'off') {
    return '已下架';
  }

  if (stock <= 0) {
    return '库存不足';
  }

  if (product.status === 'off' && product.skus.length === 1) {
    return '已下架';
  }

  return '';
}

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

export function buildCouponSpus(
  categories: ProductCatalogLeafItem[],
  visibleStoreIds?: string[]
) {
  const products =
    typeof visibleStoreIds === 'undefined'
      ? MOCK_PRODUCTS
      : filterProductsByStoreIds(MOCK_PRODUCTS, visibleStoreIds);

  return products.map((product, productIndex) => {
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

export function buildMarketingProductSelectorSpus(
  categories: ProductCatalogLeafItem[],
  ownershipItems: ProductOwnershipLeafItem[],
  visibleStoreIds?: string[]
) {
  const products =
    typeof visibleStoreIds === 'undefined'
      ? MOCK_PRODUCTS
      : filterProductsByStoreIds(MOCK_PRODUCTS, visibleStoreIds);

  return products.map((product) => {
    const catalog = resolveProductCatalog(product, categories);
    const ownership = resolveProductOwnership(product, ownershipItems);
    const children = product.skus.map((sku) => {
      const disabledReason = getSkuDisabledReason(product, sku.stock, sku.status);

      return {
        key: sku.id,
        rowType: 'sku' as const,
        productId: product.id,
        productName: product.name,
        productCatalogId: catalog.id,
        productCatalogLabel: catalog.label,
        productOwnershipId: ownership.id,
        productOwnershipLabel: ownership.label,
        skuId: sku.id,
        specText: product.specMode === 'multi' ? sku.specText : '',
        specSummary:
          product.specMode === 'multi' ? sku.specText || '默认规格' : '单规格',
        price: sku.price,
        stock: sku.stock,
        status: product.status,
        selectable: !disabledReason,
        disabledReason,
      };
    });

    const hasSelectableSku = children.some((item) => item.selectable);

    return {
      key: `spu-${product.id}`,
      rowType: 'spu' as const,
      productId: product.id,
      productName: product.name,
      productCatalogId: catalog.id,
      productCatalogLabel: catalog.label,
      productOwnershipId: ownership.id,
      productOwnershipLabel: ownership.label,
      specSummary:
        product.specMode === 'multi'
          ? `共 ${product.skus.length} 个规格`
          : '单规格',
      price: product.price,
      stock: product.stock,
      status: product.status,
      selectable: hasSelectableSku,
      disabledReason: hasSelectableSku ? '' : '该商品下无可选 SKU',
      children,
    } as MarketingProductSelectorSpuItem;
  });
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
