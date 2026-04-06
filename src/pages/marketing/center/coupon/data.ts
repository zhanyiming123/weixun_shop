import {
  MOCK_PRODUCTS,
  PRODUCT_TYPE_LABEL_MAP,
  ProductItem,
  ProductType,
} from '@/pages/product/list/data';

export type CouponDiscountType =
  | 'fullReduction'
  | 'directReduction'
  | 'discount';
export type CouponProductScope = 'all' | 'partial';
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

export type CouponBusinessLineOption = {
  label: string;
  value: string;
  children?: CouponBusinessLineOption[];
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
  businessLinePath: string[];
  productScope: CouponProductScope;
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

export const COUPON_DISCOUNT_OPTIONS = [
  { label: '满减', value: 'fullReduction' as CouponDiscountType },
  { label: '直减', value: 'directReduction' as CouponDiscountType },
  { label: '折扣', value: 'discount' as CouponDiscountType },
];

export const PRODUCT_SCOPE_OPTIONS = [
  { label: '全部商品', value: 'all' as CouponProductScope },
  { label: '部分商品', value: 'partial' as CouponProductScope },
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
  partial: '适用商品',
};

export const MOCK_CAMPUSES: CouponCampusOption[] = [
  { label: '上海校区', value: 'shanghai' },
  { label: '北京校区', value: 'beijing' },
  { label: '深圳校区', value: 'shenzhen' },
  { label: '杭州校区', value: 'hangzhou' },
];

const PRODUCT_CATEGORY_PRESETS: CouponProductCategoryOption[] = [
  { label: '预测课', value: 'forecast-course' },
  { label: '冲刺课程', value: 'sprint-course' },
  { label: '预习课程', value: 'preview-course' },
  { label: '服务套餐', value: 'service-package' },
  { label: '模考产品', value: 'mock-package' },
];

export const MOCK_BUSINESS_LINES: CouponBusinessLineOption[] = [
  {
    label: '留学服务',
    value: 'overseas',
    children: [
      {
        label: '国际课程',
        value: 'international-course',
        children: [
          { label: 'IGCSE', value: 'igcse' },
          { label: 'A-Level', value: 'a-level' },
          { label: 'IB', value: 'ib' },
        ],
      },
      {
        label: '标化考试',
        value: 'standardized',
        children: [
          { label: '雅思', value: 'ielts' },
          { label: '托福', value: 'toefl' },
        ],
      },
    ],
  },
  {
    label: '背景提升',
    value: 'background-boost',
    children: [
      {
        label: '科研项目',
        value: 'research',
        children: [{ label: '导师课题', value: 'mentor-project' }],
      },
      {
        label: '竞赛规划',
        value: 'contest',
        children: [{ label: '学术竞赛', value: 'academic-contest' }],
      },
    ],
  },
];

const SKU_SPEC_TEMPLATES: Record<ProductType, string[]> = {
  virtual: ['标准版', 'VIP版'],
  course: ['录播班', '直播班'],
  service: ['基础服务', '进阶服务'],
};

export const MOCK_PRODUCT_CATEGORY_OPTIONS = PRODUCT_CATEGORY_PRESETS;

export const DEFAULT_COUPON_FORM_VALUES: CouponFormValues = {
  discountType: 'fullReduction',
  fullReductionThreshold: undefined,
  fullReductionAmount: undefined,
  directReductionAmount: undefined,
  discountRate: undefined,
  campusIds: [],
  businessLinePath: [],
  productScope: 'all',
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

export const MOCK_COUPON_LIST: CouponListItem[] = [
  {
    id: '122661783977',
    name: '遴选计划-减免10000',
    discountType: 'fullReduction',
    productScope: 'all',
    promotionScene: '全场景',
    discountSummary: '满10减2',
    receivedCount: 200,
    issueCount: 400,
    receiveRate: 50,
    receiveStartAt: '2026/10/30 00:00:00',
    receiveEndAt: '2026/10/30 00:00:00',
    useStartAt: '2026/10/30 00:00:00',
    useEndAt: '2026/10/30 00:00:00',
    status: 'notStarted',
  },
  {
    id: '122661783978',
    name: '遴选计划-减免8000',
    discountType: 'fullReduction',
    productScope: 'partial',
    promotionScene: '全场景',
    discountSummary: '满10减2',
    receivedCount: 200,
    issueCount: 400,
    receiveRate: 50,
    receiveStartAt: '2026/03/30 00:00:00',
    receiveEndAt: '2026/10/30 00:00:00',
    useStartAt: '2023/03/30 00:00:00',
    useEndAt: '2026/10/30 00:00:00',
    status: 'active',
  },
  {
    id: '122661783979',
    name: '择校季-立减体验券',
    discountType: 'directReduction',
    productScope: 'partial',
    promotionScene: '全场景',
    discountSummary: '直减2',
    receivedCount: 200,
    issueCount: 400,
    receiveRate: 50,
    receiveStartAt: '2025/03/30 00:00:00',
    receiveEndAt: '2025/10/30 00:00:00',
    useStartAt: '2025/03/30 00:00:00',
    useEndAt: '2025/10/30 00:00:00',
    status: 'expired',
  },
  {
    id: '122661783980',
    name: '备考季-折扣福利券',
    discountType: 'discount',
    productScope: 'partial',
    promotionScene: '全场景',
    discountSummary: '打9折',
    receivedCount: 200,
    issueCount: 400,
    receiveRate: 50,
    receiveStartAt: '2024/03/30 00:00:00',
    receiveEndAt: '2024/10/30 00:00:00',
    useStartAt: '2024/03/30 00:00:00',
    useEndAt: '2024/10/30 00:00:00',
    status: 'voided',
  },
  {
    id: '122661783981',
    name: '留学冲刺-满减券',
    discountType: 'fullReduction',
    productScope: 'partial',
    promotionScene: '全场景',
    discountSummary: '满20减5',
    receivedCount: 168,
    issueCount: 300,
    receiveRate: 56,
    receiveStartAt: '2026/05/01 00:00:00',
    receiveEndAt: '2026/06/30 23:59:59',
    useStartAt: '2026/05/01 00:00:00',
    useEndAt: '2026/07/15 23:59:59',
    status: 'active',
  },
  {
    id: '122661783982',
    name: '雅思班-立减新人券',
    discountType: 'directReduction',
    productScope: 'all',
    promotionScene: '全场景',
    discountSummary: '直减50',
    receivedCount: 96,
    issueCount: 200,
    receiveRate: 48,
    receiveStartAt: '2026/08/01 00:00:00',
    receiveEndAt: '2026/08/31 23:59:59',
    useStartAt: '2026/08/01 00:00:00',
    useEndAt: '2026/09/10 23:59:59',
    status: 'notStarted',
  },
  {
    id: '122661783983',
    name: 'A-Level秋季折扣券',
    discountType: 'discount',
    productScope: 'all',
    promotionScene: '全场景',
    discountSummary: '打8.5折',
    receivedCount: 320,
    issueCount: 600,
    receiveRate: 53,
    receiveStartAt: '2026/02/01 00:00:00',
    receiveEndAt: '2026/03/31 23:59:59',
    useStartAt: '2026/02/01 00:00:00',
    useEndAt: '2026/04/15 23:59:59',
    status: 'active',
  },
  {
    id: '122661783984',
    name: '模考包-折扣券',
    discountType: 'discount',
    productScope: 'partial',
    promotionScene: '全场景',
    discountSummary: '打9.5折',
    receivedCount: 88,
    issueCount: 180,
    receiveRate: 49,
    receiveStartAt: '2025/09/01 00:00:00',
    receiveEndAt: '2025/09/30 23:59:59',
    useStartAt: '2025/09/01 00:00:00',
    useEndAt: '2025/10/31 23:59:59',
    status: 'expired',
  },
  {
    id: '122661783985',
    name: '服务套餐-减免券',
    discountType: 'fullReduction',
    productScope: 'all',
    promotionScene: '全场景',
    discountSummary: '满100减20',
    receivedCount: 58,
    issueCount: 120,
    receiveRate: 48,
    receiveStartAt: '2024/11/01 00:00:00',
    receiveEndAt: '2024/11/30 23:59:59',
    useStartAt: '2024/11/01 00:00:00',
    useEndAt: '2024/12/15 23:59:59',
    status: 'voided',
  },
  {
    id: '122661783986',
    name: '申请季-全场通用券',
    discountType: 'directReduction',
    productScope: 'all',
    promotionScene: '全场景',
    discountSummary: '直减30',
    receivedCount: 260,
    issueCount: 500,
    receiveRate: 52,
    receiveStartAt: '2026/04/01 00:00:00',
    receiveEndAt: '2026/05/31 23:59:59',
    useStartAt: '2026/04/01 00:00:00',
    useEndAt: '2026/06/30 23:59:59',
    status: 'active',
  },
  {
    id: '122661783987',
    name: '冬令营-早鸟券',
    discountType: 'discount',
    productScope: 'partial',
    promotionScene: '全场景',
    discountSummary: '打8折',
    receivedCount: 45,
    issueCount: 150,
    receiveRate: 30,
    receiveStartAt: '2026/11/01 00:00:00',
    receiveEndAt: '2026/11/30 23:59:59',
    useStartAt: '2026/12/01 00:00:00',
    useEndAt: '2027/01/15 23:59:59',
    status: 'notStarted',
  },
  {
    id: '122661783988',
    name: '科研项目-专享券',
    discountType: 'directReduction',
    productScope: 'partial',
    promotionScene: '全场景',
    discountSummary: '直减100',
    receivedCount: 120,
    issueCount: 180,
    receiveRate: 67,
    receiveStartAt: '2024/06/01 00:00:00',
    receiveEndAt: '2024/07/15 23:59:59',
    useStartAt: '2024/06/01 00:00:00',
    useEndAt: '2024/08/31 23:59:59',
    status: 'voided',
  },
];

function resolveProductCategory(product: ProductItem): CouponProductCategoryOption {
  if (product.name.includes('预测课')) {
    return PRODUCT_CATEGORY_PRESETS[0];
  }
  if (product.name.includes('冲刺')) {
    return PRODUCT_CATEGORY_PRESETS[1];
  }
  if (product.name.includes('预习课')) {
    return PRODUCT_CATEGORY_PRESETS[2];
  }
  if (product.name.includes('模考')) {
    return PRODUCT_CATEGORY_PRESETS[4];
  }
  return PRODUCT_CATEGORY_PRESETS[3];
}

export const MOCK_COUPON_SPUS: CouponSpuItem[] = MOCK_PRODUCTS.map(
  (product, productIndex) => {
    const category = resolveProductCategory(product);
    const children = SKU_SPEC_TEMPLATES[product.productType].map((specText, specIndex) => {
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
        productType: PRODUCT_TYPE_LABEL_MAP[product.productType],
        price: Number((product.price + surcharge).toFixed(2)),
      };
    });

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
      productType: PRODUCT_TYPE_LABEL_MAP[product.productType],
      price: prices[0],
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
      children,
    };
  }
);

export const MOCK_COUPON_SKUS: CouponSkuItem[] = MOCK_COUPON_SPUS.flatMap(
  (item) => item.children
);

export function normalizeCascaderPath(
  value: (string | string[])[] | undefined
): string[] {
  if (!Array.isArray(value) || !value.length) {
    return [];
  }

  const firstValue = value[0];
  if (Array.isArray(firstValue)) {
    return firstValue;
  }

  return value as string[];
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
