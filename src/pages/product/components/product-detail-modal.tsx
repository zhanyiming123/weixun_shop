import React, { useMemo } from 'react';
import { Drawer, Table, Tag, Typography } from '@arco-design/web-react';
import { formatPriceNumber } from '@/lib/format';
import {
  getProductCatalogFullLabel,
  readProductCatalogItems,
} from '@/pages/product/catalog/data';
import {
  getProductOwnershipFullLabel,
  readProductOwnershipItems,
} from '@/pages/product/category/data';
import { readProductStoreItems } from '@/pages/product/store-config/data';
import type { ProductListItem, ProductStoreSkuViewItem } from '@/types/product';
import {
  buildProductDetailChannelRows,
  formatProductLimitRule,
  getProductChannelConfig,
  getProductChannelModeLabel,
  getProductSharedScopeText,
  getProductTypeLabel,
} from './product-detail';
import styles from './product-detail-modal.module.less';

type ProductDetailModalProps = {
  product: ProductListItem | null;
  visible: boolean;
  onCancel: () => void;
};

function getSkuLabel(sku: ProductStoreSkuViewItem, index: number) {
  return sku.specText || (index === 0 ? '默认规格' : `规格${index + 1}`);
}

function getSourceText(product: ProductListItem) {
  const sourceName =
    product.storeView.sourceStoreName || product.storeView.sourceLabel || '--';

  return product.storeView.sourceRegionName
    ? `${sourceName} · ${product.storeView.sourceRegionName}`
    : sourceName;
}

export default function ProductDetailModal({
  product,
  visible,
  onCancel,
}: ProductDetailModalProps) {
  const catalogItems = useMemo(() => readProductCatalogItems(), []);
  const ownershipItems = useMemo(() => readProductOwnershipItems(), []);
  const storeItems = useMemo(() => readProductStoreItems(), []);

  const channelConfig = product ? getProductChannelConfig(product) : undefined;
  const channelRows = product ? buildProductDetailChannelRows(product, storeItems) : [];
  const sharedScopeText = getProductSharedScopeText(channelConfig, storeItems);
  const detailHtml =
    product && typeof product.detailHtml === 'string' ? product.detailHtml.trim() : '';

  return (
    <Drawer
      className={styles.detailModal}
      placement="right"
      title="商品详情"
      visible={visible}
      footer={null}
      width="min(1120px, calc(100vw - 32px))"
      onCancel={onCancel}
    >
      {product && (
        <div className={styles.detailBody}>
          <section className={styles.section}>
            <Typography.Title className={styles.sectionTitle} heading={5}>
              基础信息
            </Typography.Title>
            <div className={styles.infoGrid}>
              <div className={styles.infoLabel}>商品名称</div>
              <div className={styles.infoValue}>{product.storeView.currentName}</div>
              <div className={styles.infoLabel}>商品类型</div>
              <div className={styles.infoValue}>
                {getProductTypeLabel(product.productType)}
              </div>
              <div className={styles.infoLabel}>商品编码</div>
              <div className={styles.infoValue}>{product.id}</div>
              <div className={styles.infoLabel}>限购规则</div>
              <div className={styles.infoValue}>{formatProductLimitRule(product)}</div>
              <div className={styles.infoLabel}>商品来源</div>
              <div className={styles.infoValue}>{getSourceText(product)}</div>
              <div className={styles.infoLabel}>店铺渠道</div>
              <div className={styles.infoValue}>{getProductChannelModeLabel(product)}</div>
              <div className={styles.infoLabel}>商品类目</div>
              <div className={styles.infoValue}>
                {getProductCatalogFullLabel(product.productCatalogId, catalogItems)}
              </div>
              <div className={styles.infoLabel}>商品分类</div>
              <div className={styles.infoValue}>
                {getProductOwnershipFullLabel(
                  product.productOwnershipId,
                  ownershipItems
                )}
              </div>
            </div>
          </section>

          {channelRows.length > 0 && (
            <section className={styles.section}>
              <Typography.Title className={styles.sectionTitle} heading={5}>
                在售店铺
              </Typography.Title>
              <div className={styles.tableWrap}>
                <Table
                  rowKey="key"
                  columns={[
                    {
                      title: '店铺',
                      dataIndex: 'storeName',
                    },
                    {
                      title: '售卖状态',
                      dataIndex: 'sellStatusLabel',
                      width: 140,
                    },
                    {
                      title: '渠道状态',
                      dataIndex: 'channelStatusLabel',
                      width: 140,
                    },
                    {
                      title: '可售 SKU',
                      dataIndex: 'sellableSkuText',
                      width: 160,
                    },
                    {
                      title: '自主改价',
                      dataIndex: 'allowSelfPriceLabel',
                      width: 120,
                    },
                  ]}
                  data={channelRows}
                  pagination={false}
                  tableLayoutFixed
                />
              </div>
            </section>
          )}

          {channelConfig?.shareMode === 'shared_pool' && sharedScopeText && (
            <section className={styles.section}>
              <Typography.Title className={styles.sectionTitle} heading={5}>
                共享范围
              </Typography.Title>
              <div className={styles.channelSummary}>{sharedScopeText}</div>
            </section>
          )}

          <section className={styles.section}>
            <Typography.Title className={styles.sectionTitle} heading={5}>
              规格信息
            </Typography.Title>
            <div className={styles.tableWrap}>
              <Table
                rowKey="id"
                columns={[
                  {
                    title: 'SKU编码',
                    dataIndex: 'id',
                    width: 220,
                    render: (value: string, sku: ProductStoreSkuViewItem) => (
                      <div className={styles.skuCodeCell}>
                        {sku.isLocalSku && <Tag color="arcoblue">本店新增</Tag>}
                        <Typography.Text className={styles.skuCodeText} ellipsis>
                          {value}
                        </Typography.Text>
                      </div>
                    ),
                  },
                  {
                    title: '规格图片',
                    dataIndex: 'image',
                    width: 112,
                    render: (image?: ProductStoreSkuViewItem['image']) =>
                      image?.url ? (
                        <img
                          className={styles.skuImage}
                          alt={image.name || '规格图片'}
                          src={image.url}
                        />
                      ) : null,
                  },
                  {
                    title: '规格',
                    dataIndex: 'specText',
                    render: (_: string, sku: ProductStoreSkuViewItem, index: number) => (
                      <Typography.Text className={styles.skuSpecText}>
                        {getSkuLabel(sku, index)}
                      </Typography.Text>
                    ),
                  },
                  {
                    title: '价格',
                    dataIndex: 'currentPrice',
                    width: 140,
                    render: (value: number) => formatPriceNumber(value),
                  },
                  {
                    title: '库存',
                    dataIndex: 'currentStock',
                    width: 120,
                  },
                  {
                    title: '默认选中',
                    dataIndex: 'isDefaultSelected',
                    width: 120,
                    render: (value?: boolean) => (value ? '是' : '否'),
                  },
                ]}
                data={product.storeView.currentSkus}
                noDataElement="暂无规格数据"
                pagination={false}
                scroll={{ x: 860 }}
                tableLayoutFixed
              />
            </div>
          </section>

          {detailHtml && (
            <section className={styles.section}>
              <Typography.Title className={styles.sectionTitle} heading={5}>
                图文详情
              </Typography.Title>
              <div
                className={styles.detailContent}
                dangerouslySetInnerHTML={{ __html: detailHtml }}
              />
            </section>
          )}
        </div>
      )}
    </Drawer>
  );
}
