/**
 * 商品类目数据
 *
 * 此文件定义系统后台的商品类目（catalog）列表，作为全局共享数据源。
 * 优惠券创建、商品管理等模块均应引用此处的类目数据，避免各模块各自硬编码类目列表。
 */

export type CatalogItem = {
  /** 类目唯一标识 */
  id: string;
  /** 类目展示名称 */
  label: string;
  /**
   * 该类目下的商品是否有 SKU 规格维度（如班型）。
   * 为 true 时，相关场景（如优惠券圈品）可以进一步按 SKU 规格筛选。
   * 这是一个来自类目属性配置的字段，不应在各业务模块中硬编码判断逻辑。
   */
  hasSkuSpec: boolean;
};

export const MOCK_CATALOG_ITEMS: CatalogItem[] = [
  { id: 'international', label: '国际课程', hasSkuSpec: true },
  { id: 'planning', label: '升学规划', hasSkuSpec: false },
  { id: 'thesis', label: '论文文书', hasSkuSpec: false },
  { id: 'service', label: '服务费', hasSkuSpec: false },
];
