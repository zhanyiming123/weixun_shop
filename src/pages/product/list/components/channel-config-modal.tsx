import React, { useEffect, useMemo, useState } from 'react';
import {
  Message,
  Modal,
  Radio,
  Switch,
  TreeSelect,
  Typography,
} from '@arco-design/web-react';
import styles from './channel-config-modal.module.less';
import SalesStoreConfigPanel from './sales-store-config-panel';
import {
  buildSalesStoreConfigPanelDraftMap,
  buildSalesStoreConfigPanelResult,
} from './sales-store-config-panel';
import { getProductStoreChannelConfig, normalizeProductShareTargets } from '@/lib/product';
import type {
  ProductListItem,
  ProductStoreChannelConfigItem,
  ProductStoreChannelProductPoolStoreConfigItem,
  ProductStoreChannelShareMode,
} from '@/types/product';
import type { ProductStoreItem } from '@/pages/product/store-config/data';

type ChannelConfigModalSubmitPayload = {
  enabled: boolean;
  storeChannelConfig?: ProductStoreChannelConfigItem;
  sharedPoolSellableSkuIds?: string[];
  sharedPoolAllowSelfPrice?: boolean;
};

type ChannelConfigModalProps = {
  visible: boolean;
  product: ProductListItem | null;
  storeItems: ProductStoreItem[];
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (
    input: ChannelConfigModalSubmitPayload
  ) => Promise<void> | void;
};

type ChannelConfigDraft = {
  enabled: boolean;
  shareMode: ProductStoreChannelShareMode;
};

type SharedPoolDraft = {
  sellableSkuIds: string[];
  allowSelfPrice: boolean;
};

function uniqueStringArray(values: string[] = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

const SKU_TREE_ROOT_KEY = 'all_skus';

export function buildChannelConfigDraft(product: ProductListItem | null): ChannelConfigDraft {
  const config = product ? getProductStoreChannelConfig(product) : undefined;

  return {
    enabled: Boolean(config),
    shareMode: config?.shareMode === 'shared_pool' ? 'shared_pool' : 'product_pool',
  };
}

export function buildSharedPoolDraft(product: ProductListItem | null): SharedPoolDraft {
  const config = product ? getProductStoreChannelConfig(product) : undefined;
  const enabledSkuIds = uniqueStringArray(
    (product?.skus || [])
      .filter((sku) => sku.status !== 'off')
      .map((sku) => sku.id)
  );
  const sharedTargets = normalizeProductShareTargets(product?.shareTargets || []).filter(
    (item) => item.status === 'pending'
  );
  const firstTarget = sharedTargets[0];
  const sellableSkuIds = uniqueStringArray(
    (firstTarget?.sellableSkuIds?.length
      ? firstTarget.sellableSkuIds
      : enabledSkuIds
    ).filter((skuId) => enabledSkuIds.includes(skuId))
  );

  return {
    sellableSkuIds,
    allowSelfPrice:
      config?.shareMode === 'shared_pool' && firstTarget?.allowSelfPrice === true,
  };
}

export function buildChannelConfigSubmitPayload(
  product: ProductListItem,
  draft: ChannelConfigDraft,
  productPoolStoreConfigs: ProductStoreChannelProductPoolStoreConfigItem[],
  sharedPoolDraft: SharedPoolDraft
): ChannelConfigModalSubmitPayload {
  if (!draft.enabled) {
    return {
      enabled: false,
    };
  }

  if (draft.shareMode === 'product_pool') {
    const sellableStoreIds = uniqueStringArray(
      productPoolStoreConfigs
        .filter((item) => item.sellStatus === 'sellable')
        .map((item) => item.storeId)
    );

    return {
      enabled: true,
      storeChannelConfig: {
        shareMode: 'product_pool',
        storeScope: 'specificStores',
        storeIds: sellableStoreIds,
        productPoolStoreConfigs,
      },
    };
  }

  return {
    enabled: true,
    storeChannelConfig: {
      shareMode: 'shared_pool',
      storeScope: 'allStores',
      storeIds: [],
      productPoolStoreConfigs: [],
    },
    sharedPoolSellableSkuIds: sharedPoolDraft.sellableSkuIds,
    sharedPoolAllowSelfPrice: sharedPoolDraft.allowSelfPrice,
  };
}

function ChannelConfigModal({
  visible,
  product,
  storeItems,
  submitting = false,
  onCancel,
  onSubmit,
}: ChannelConfigModalProps) {
  // 商品已有渠道配置时，开关和商品池选择不可更改
  const hasExistingConfig = Boolean(product && getProductStoreChannelConfig(product));

  const [draft, setDraft] = useState<ChannelConfigDraft>({
    enabled: false,
    shareMode: 'product_pool',
  });
  const [productPoolStoreConfigs, setProductPoolStoreConfigs] = useState<
    ProductStoreChannelProductPoolStoreConfigItem[]
  >([]);
  const [sharedPoolDraft, setSharedPoolDraft] = useState<SharedPoolDraft>({
    sellableSkuIds: [],
    allowSelfPrice: false,
  });

  const targetStoreItems = useMemo(
    () =>
      storeItems.filter(
        (item) => item.type === 'store' && item.id !== product?.sourceStoreId
      ),
    [product?.sourceStoreId, storeItems]
  );
  const availableSkuIds = useMemo(
    () =>
      uniqueStringArray(
        (product?.skus || [])
          .filter((sku) => sku.status !== 'off')
          .map((sku) => sku.id)
      ),
    [product?.skus]
  );
  const skuTreeData = useMemo(
    () => [
      {
        key: SKU_TREE_ROOT_KEY,
        title: '全部 SKU',
        disabled: !availableSkuIds.length,
        children: (product?.skus || [])
          .filter((sku) => availableSkuIds.includes(sku.id))
          .map((sku, index) => ({
            key: sku.id,
            title: sku.specText || (index === 0 ? '默认规格' : `规格${index + 1}`),
          })),
      },
    ],
    [availableSkuIds, product?.skus]
  );

  useEffect(() => {
    if (!visible || !product) {
      return;
    }

    setDraft(buildChannelConfigDraft(product));
    setSharedPoolDraft(buildSharedPoolDraft(product));
    setProductPoolStoreConfigs(
      buildSalesStoreConfigPanelResult(
        targetStoreItems,
        buildSalesStoreConfigPanelDraftMap(
          product,
          targetStoreItems,
          (product.skus || []).map((sku, index) => ({
            key: sku.id,
            skuId: sku.id,
            specLabel:
              sku.specText || (product.specMode === 'single' ? '默认规格' : `规格${index + 1}`),
          }))
        ),
        availableSkuIds
      )
    );
  }, [availableSkuIds, product, targetStoreItems, visible]);

  async function handleOk() {
    if (!product) {
      return;
    }

    if (
      draft.enabled &&
      draft.shareMode === 'product_pool' &&
      !productPoolStoreConfigs.some((item) => item.sellStatus === 'sellable')
    ) {
      Message.warning('请至少配置 1 家可售门店');
      return;
    }

    if (
      draft.enabled &&
      draft.shareMode === 'shared_pool' &&
      !sharedPoolDraft.sellableSkuIds.length
    ) {
      Message.warning('请至少选择 1 个可售 SKU');
      return;
    }

    await onSubmit(
      buildChannelConfigSubmitPayload(
        product,
        draft,
        productPoolStoreConfigs,
        sharedPoolDraft
      )
    );
  }

  return (
    <Modal
      className={styles.modal}
      title="店铺渠道配置"
      visible={visible}
      style={{ width: 1100 }}
      okText="保存"
      cancelText="取消"
      confirmLoading={submitting}
      onCancel={onCancel}
      onOk={handleOk}
    >
      <div className={styles.body}>
        <div className={styles.sectionCard}>
          <div className={styles.row}>
            <div className={styles.label}>店铺渠道</div>
            <div className={styles.content}>
              <div className={styles.switchRow}>
                <Switch
                  checked={draft.enabled}
                  disabled={hasExistingConfig}
                  onChange={(checked) =>
                    setDraft((previous) => ({
                      ...previous,
                      enabled: checked,
                    }))
                  }
                />
                <span className={styles.switchText}>
                  {draft.enabled ? '已开启' : '已关闭'}
                </span>
              </div>
            </div>
          </div>

          {draft.enabled && (
            <div className={styles.row}>
              <div className={styles.label}>生效商品池</div>
              <div className={styles.content}>
                <Radio.Group
                  value={draft.shareMode}
                  disabled={hasExistingConfig}
                  onChange={(value) =>
                    setDraft((previous) => ({
                      ...previous,
                      shareMode:
                        value === 'shared_pool' ? 'shared_pool' : 'product_pool',
                    }))
                  }
                >
                  <Radio value="product_pool">商品库</Radio>
                  <Radio value="shared_pool">商品共享池</Radio>
                </Radio.Group>
                <Typography.Paragraph className={styles.hint}>
                  商品库：直接进入对应门店商品库并可售；商品共享池：进入全部店铺共享池，由门店自行引用。
                </Typography.Paragraph>
              </div>
            </div>
          )}
        </div>

        {draft.enabled && draft.shareMode === 'product_pool' && (
          <SalesStoreConfigPanel
            product={product}
            storeItems={storeItems}
            onChange={setProductPoolStoreConfigs}
          />
        )}

        {draft.enabled && draft.shareMode === 'shared_pool' && (
          <div className={styles.sectionCard}>
            <div className={styles.row}>
              <div className={styles.label}>可售 SKU</div>
              <div className={styles.content}>
                <TreeSelect
                  multiple
                  treeCheckable
                  allowClear
                  disabled={hasExistingConfig}
                  className={styles.sharedPoolTreeSelect}
                  placeholder="请选择可售 SKU"
                  treeData={skuTreeData}
                  value={sharedPoolDraft.sellableSkuIds}
                  onChange={(value) => {
                    const nextSkuIds = uniqueStringArray(
                      normalizeStringArray(value).filter(
                        (skuId) =>
                          skuId !== SKU_TREE_ROOT_KEY && availableSkuIds.includes(skuId)
                      )
                    );
                    setSharedPoolDraft((previous) => ({
                      ...previous,
                      sellableSkuIds: nextSkuIds,
                      allowSelfPrice: nextSkuIds.length
                        ? previous.allowSelfPrice
                        : false,
                    }));
                  }}
                />
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.label}>自主定价</div>
              <div className={styles.content}>
                <div className={styles.switchRow}>
                  <Switch
                    checked={sharedPoolDraft.allowSelfPrice}
                    disabled={hasExistingConfig || !sharedPoolDraft.sellableSkuIds.length}
                    onChange={(checked) =>
                      setSharedPoolDraft((previous) => ({
                        ...previous,
                        allowSelfPrice: checked,
                      }))
                    }
                  />
                </div>
                <Typography.Paragraph className={styles.hint}>
                  开启后，引用该商品的店铺可以在共享池基础上自主定价。
                </Typography.Paragraph>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default ChannelConfigModal;
