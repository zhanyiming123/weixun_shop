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
  buildProductDetailContentState,
  buildProductDetailSections,
  buildProductDetailChannelRows,
  getProductChannelConfig,
  getProductSharedScopeText,
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

function renderFieldGrid(
  fields: Array<{
    label: string;
    value: string;
  }>
) {
  return (
    <div className={styles.infoGrid}>
      {fields.map((field) => (
        <React.Fragment key={field.label}>
          <div className={styles.infoLabel}>{field.label}</div>
          <div className={styles.infoValue}>{field.value}</div>
        </React.Fragment>
      ))}
    </div>
  );
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
  const detailContent = product ? buildProductDetailContentState(product) : null;
  const detailHtml = detailContent?.html.trim() || '';
  const detailSections =
    product
      ? buildProductDetailSections(
          product,
          getProductCatalogFullLabel(product.productCatalogId, catalogItems),
          getProductOwnershipFullLabel(product.productOwnershipId, ownershipItems),
          storeItems
        )
      : [];

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
          {detailSections.map((section) => (
            <section key={section.key} className={styles.section}>
              <Typography.Title className={styles.sectionTitle} heading={5}>
                {section.title}
              </Typography.Title>
              {renderFieldGrid(
                section.fields.map((field) =>
                  field.label === '商品来源'
                    ? {
                        ...field,
                        value: getSourceText(product),
                      }
                    : field
                )
              )}

              {section.key === 'basic' && !!product.storeView.currentCarouselImages.length && (
                <div className={styles.mediaBlock}>
                  <div className={styles.subSectionTitle}>商品轮播图</div>
                  <div className={styles.imageGrid}>
                    {product.storeView.currentCarouselImages.map((image) => (
                      <img
                        key={image.id}
                        className={styles.carouselImage}
                        alt={image.name || '商品轮播图'}
                        src={image.url}
                      />
                    ))}
                  </div>
                </div>
              )}

              {section.key === 'spec' && (
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
              )}

              {section.key === 'detail-page' && (
                <div className={styles.detailPageBlock}>
                  {detailHtml ? (
                    <div
                      className={styles.detailContent}
                      style={{
                        fontSize: `${detailContent?.fontSize || '16'}px`,
                        lineHeight: detailContent?.lineHeight || '1.75',
                      }}
                      dangerouslySetInnerHTML={{ __html: detailHtml }}
                    />
                  ) : (
                    <div className={styles.emptyBlock}>暂无商品详情内容</div>
                  )}
                </div>
              )}

              {section.key === 'store-channel' && (
                <div className={styles.channelBlock}>
                  {channelRows.length > 0 && (
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
                  )}

                  {channelConfig?.shareMode === 'shared_pool' && sharedScopeText && (
                    <div className={styles.channelSummary}>{sharedScopeText}</div>
                  )}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </Drawer>
  );
}
