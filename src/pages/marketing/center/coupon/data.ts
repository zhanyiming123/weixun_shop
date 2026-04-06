import {
  MOCK_PRODUCTS,
  PRODUCT_TYPE_LABEL_MAP,
  ProductItem,
  ProductType,
} from '@/pages/product/list/data';
import { CatalogItem, MOCK_CATALOG_ITEMS } from '@/pages/product/catalog/data';

export type { CatalogItem };

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

/** 组织架构树节点（事业部 → 课程体系 → 课程项，三级） */
export type OrgTreeNode = {
  key: string;
  value: string;
  title: string;
  children?: OrgTreeNode[];
};

/**
 * 按条件圈品 — 单个类目的圈选范围。
 *
 * 字段说明：
 * - selectedOrgNodeIds：从组织架构树中多选的节点 ID，可选任意层级（事业部/课程体系/课程项），
 *   空数组表示该类目下的全部组织架构均适用。
 * - selectedSpecValues：SKU 规格值（如班型），仅对 hasSkuSpec=true 的类目有效，
 *   空数组表示全部规格均适用。是否显示此字段由类目配置（CatalogItem.hasSkuSpec）决定，
 *   不在业务代码中硬编码判断。
 */
export type CategoryConditionScope = {
  categoryId: string;
  selectedOrgNodeIds: string[];
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
  specific: '适用商品',
};

export const MOCK_CAMPUSES: CouponCampusOption[] = [
  { label: '上海校区', value: 'shanghai' },
  { label: '北京校区', value: 'beijing' },
  { label: '深圳校区', value: 'shenzhen' },
  { label: '杭州校区', value: 'hangzhou' },
];

/**
 * 商品类目列表，从商品类目管理模块（product/catalog）引入。
 * 优惠券等业务模块统一引用此数据，不在各自模块内重复定义。
 */
export const MOCK_COUPON_CATEGORIES: CatalogItem[] = MOCK_CATALOG_ITEMS;

/**
 * 组织架构树（事业部 → 课程体系 → 课程项），三级结构。
 * 真实场景下应从后端 org_node 表动态加载；此处使用 mock 数据。
 */
export const MOCK_ORG_TREE: OrgTreeNode[] = [
  {
    key: 'xm',
    value: 'xm',
    title: '橡沐事业部',
    children: [
      {
        key: 'xm-study',
        value: 'xm-study',
        title: '橡沐留学',
        children: [
          { key: 'p001', value: 'p001', title: '美国升学服务' },
          { key: 'p002', value: 'p002', title: '英国升学服务' },
        ],
      },
      {
        key: 'xm-lang',
        value: 'xm-lang',
        title: '橡沐语培',
        children: [
          { key: 'p003', value: 'p003', title: '雅思冲刺课' },
          { key: 'p004', value: 'p004', title: '托福强化课' },
        ],
      },
    ],
  },
  {
    key: 'wx',
    value: 'wx',
    title: '维新事业部',
    children: [
      {
        key: 'wx-plan',
        value: 'wx-plan',
        title: '维新升学规划',
        children: [
          { key: 'p005', value: 'p005', title: '背景提升规划' },
          { key: 'p006', value: 'p006', title: '择校规划服务' },
        ],
      },
      {
        key: 'wx-thesis',
        value: 'wx-thesis',
        title: '维新论文文书',
        children: [
          { key: 'p007', value: 'p007', title: '文书精修服务' },
          { key: 'p008', value: 'p008', title: '申请全案服务' },
        ],
      },
    ],
  },
  {
    key: 'hq',
    value: 'hq',
    title: '海桥事业部',
    children: [
      {
        key: 'hq-international',
        value: 'hq-international',
        title: '海桥国际课程',
        children: [
          { key: 'p009', value: 'p009', title: 'A-Level系统课' },
          { key: 'p010', value: 'p010', title: 'IB强化课程' },
        ],
      },
      {
        key: 'hq-overseas',
        value: 'hq-overseas',
        title: '海桥海外课程',
        children: [
          { key: 'p011', value: 'p011', title: 'AP先修课程' },
          { key: 'p012', value: 'p012', title: 'STEP冲刺课程' },
        ],
      },
    ],
  },
];

/**
 * 各类目对应的 SKU 规格选项（如班型）。
 * 仅 CatalogItem.hasSkuSpec === true 的类目需要配置此项。
 * 真实场景下应从该类目下商品的 SKU 规格维度动态读取；此处使用 mock 数据。
 */
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

export const MOCK_PRODUCT_CATEGORY_OPTIONS: CouponProductCategoryOption[] =
  MOCK_CATALOG_ITEMS.map((item) => ({
    label: item.label,
    value: item.id,
  }));

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
    productScope: 'specific',
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
    productScope: 'specific',
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
    productScope: 'specific',
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
    productScope: 'specific',
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
    productScope: 'specific',
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
    productScope: 'specific',
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
    productScope: 'specific',
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
    return MOCK_PRODUCT_CATEGORY_OPTIONS[0];
  }
  if (product.name.includes('冲刺')) {
    return MOCK_PRODUCT_CATEGORY_OPTIONS[0];
  }
  if (product.name.includes('预习课')) {
    return MOCK_PRODUCT_CATEGORY_OPTIONS[0];
  }
  if (product.name.includes('模考')) {
    return MOCK_PRODUCT_CATEGORY_OPTIONS[1];
  }
  return MOCK_PRODUCT_CATEGORY_OPTIONS[3];
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
