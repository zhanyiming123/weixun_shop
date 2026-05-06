import React, { useEffect, useMemo, useState } from 'react';
import {
  Input,
  Message,
  Modal,
  Select,
  Switch,
  Table,
  Tag,
  TreeSelect,
  Typography,
} from '@arco-design/web-react';
import styles from './sales-store-modal.module.less';
import {
  getProductStoreChannelConfig,
  normalizeProductShareTargets,
} from '@/lib/product';
import {
  createDefaultStoreChannelProductPoolStoreConfig,
  createStoreChannelConfigDraftFromProductConfig,
  type StoreChannelProductPoolStoreConfigDraftItem,
  type StoreChannelSkuMetaItem,
} from '@/pages/product/create/store-channel';
import {
  PRODUCT_STORE_SELL_STATUS_LABEL_MAP,
  PRODUCT_STORE_TYPE_LABEL_MAP,
  ProductStoreItem,
} from '@/pages/product/store-config/data';
import type {
  ProductListItem,
  ProductStoreChannelProductPoolStoreConfigItem,
  ProductStoreSellStatus,
} from '@/types/product';

type StoreChannelProductPoolFilterStatus =
  | 'all'
  | ProductStoreSellStatus;
type StoreConfigTableItem = ProductStoreItem &
  StoreChannelProductPoolStoreConfigDraftItem;

type SalesStoreModalProps = {
  visible: boolean;
  product: ProductListItem | null;
  storeItems: ProductStoreItem[];
  submitting?: boolean;
  onCancel: () => void;
  onSubmit: (
    productPoolStoreConfigs: ProductStoreChannelProductPoolStoreConfigItem[]
  ) => Promise<void> | void;
};

const STORE_CONFIG_PAGE_SIZE_OPTIONS = [20, 50];
const SKU_TREE_ROOT_KEY = 'all_skus';

function uniqueStringArray(values: string[] = []) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function getStoreChannelProductPoolSellState(
  sellStatus: ProductStoreSellStatus
) {
  return sellStatus === 'sellable' ? 'sellable' : 'unsellable';
}

function buildStoreChannelProductPoolDraftItem(
  current: StoreChannelProductPoolStoreConfigDraftItem,
  sellState: ProductStoreSellStatus,
  allowedSkuIds: string[]
) {
  if (sellState === 'unsellable') {
    return {
      ...current,
      sellStatus: 'unsellable' as const,
      channelStatus: 'off' as const,
      sellableSkuKeys: [],
      allowSelfPrice: false,
    };
  }

  const normalizedSellableSkuKeys = uniqueStringArray(
    current.sellableSkuKeys.filter((skuId) => allowedSkuIds.includes(skuId))
  );
  const nextSellableSkuKeys = normalizedSellableSkuKeys.length
    ? normalizedSellableSkuKeys
    : [...allowedSkuIds];

  return {
    ...current,
    sellStatus: 'sellable' as const,
    channelStatus: 'on' as const,
    sellableSkuKeys: nextSellableSkuKeys,
    allowSelfPrice:
      nextSellableSkuKeys.length > 0 && current.allowSelfPrice === true,
  };
}

function buildSeedStoreChannelConfig(product: ProductListItem) {
  const currentConfig = getProductStoreChannelConfig(product);

  if (currentConfig?.shareMode === 'product_pool') {
    return currentConfig;
  }

  const referencedTargets = normalizeProductShareTargets(product.shareTargets || []).filter(
    (item) => item.status === 'referenced'
  );

  return {
    shareMode: 'product_pool' as const,
    storeScope: 'specificStores' as const,
    storeIds: referencedTargets.map((item) => item.storeId),
    productPoolStoreConfigs: referencedTargets.map((item) => {
      const sellableSkuIds = uniqueStringArray(
        (item.sellableSkuIds?.length
          ? item.sellableSkuIds
          : (product.skus || []).map((sku) => sku.id)
        ).filter(Boolean)
      );
      const isSellable = sellableSkuIds.length > 0;

      return {
        storeId: item.storeId,
        sellStatus: isSellable ? ('sellable' as const) : ('unsellable' as const),
        channelStatus: 'off' as const,
        ...(isSellable ? { sellableSkuIds } : {}),
        ...(isSellable && item.allowSelfPrice === true ? { allowSelfPrice: true } : {}),
      };
    }),
  };
}

function buildStoreChannelProductPoolDraftMap(
  product: ProductListItem,
  targetStoreItems: ProductStoreItem[],
  skuMetaItems: StoreChannelSkuMetaItem[]
) {
  const nextDraft = createStoreChannelConfigDraftFromProductConfig(
    buildSeedStoreChannelConfig(product),
    skuMetaItems,
    targetStoreItems.map((item) => item.id)
  );
  const draftConfigMap = new Map(
    (nextDraft.productPoolStoreConfigs || []).map((item) => [item.storeId, item])
  );

  return targetStoreItems.reduce<
    Record<string, StoreChannelProductPoolStoreConfigDraftItem>
  >((result, item) => {
    result[item.id] =
      draftConfigMap.get(item.id) ||
      createDefaultStoreChannelProductPoolStoreConfig(item.id);
    return result;
  }, {});
}

function SalesStoreModal({
  visible,
  product,
  storeItems,
  submitting = false,
  onCancel,
  onSubmit,
}: SalesStoreModalProps) {
  const [draftStoreChannelProductPoolConfigMap, setDraftStoreChannelProductPoolConfigMap] =
    useState<Record<string, StoreChannelProductPoolStoreConfigDraftItem>>({});
  const [storeChannelProductPoolSelectedStoreKeys, setStoreChannelProductPoolSelectedStoreKeys] =
    useState<string[]>([]);
  const [storeChannelProductPoolStatusFilter, setStoreChannelProductPoolStatusFilter] =
    useState<StoreChannelProductPoolFilterStatus>('all');
  const [storeChannelProductPoolKeyword, setStoreChannelProductPoolKeyword] =
    useState('');
  const [storeConfigPage, setStoreConfigPage] = useState(1);
  const [storeConfigPageSize, setStoreConfigPageSize] = useState(20);
  const [storeChannelProductPoolBatchSellStatus, setStoreChannelProductPoolBatchSellStatus] =
    useState<ProductStoreSellStatus>();
  const [
    storeChannelProductPoolBatchSellableSkuKeys,
    setStoreChannelProductPoolBatchSellableSkuKeys,
  ] = useState<string[]>([]);
  const [
    storeChannelProductPoolBatchAllowSelfPrice,
    setStoreChannelProductPoolBatchAllowSelfPrice,
  ] = useState<string>();
  const targetStoreItems = useMemo(
    () =>
      storeItems.filter(
        (item) => item.type === 'store' && item.id !== product?.sourceStoreId
      ),
    [product?.sourceStoreId, storeItems]
  );
  const sourceSkuItems = useMemo<StoreChannelSkuMetaItem[]>(
    () =>
      (product?.skus || []).map((sku, index) => ({
        key: sku.id,
        skuId: sku.id,
        specLabel:
          sku.specText || (product?.specMode === 'single' ? '默认规格' : `规格${index + 1}`),
      })),
    [product?.skus, product?.specMode]
  );
  const availableSkuKeys = useMemo(
    () => sourceSkuItems.map((item) => item.key),
    [sourceSkuItems]
  );
  const availableSkuKeySet = useMemo(
    () => new Set(availableSkuKeys),
    [availableSkuKeys]
  );
  const storeChannelProductPoolSkuTreeData = useMemo(
    () => [
      {
        key: SKU_TREE_ROOT_KEY,
        title: '全部 SKU',
        disabled: !availableSkuKeys.length,
        children: sourceSkuItems.map((item) => ({
          key: item.key,
          title: item.specLabel,
        })),
      },
    ],
    [availableSkuKeys.length, sourceSkuItems]
  );

  useEffect(() => {
    if (!visible || !product) {
      return;
    }

    setDraftStoreChannelProductPoolConfigMap(
      buildStoreChannelProductPoolDraftMap(
        product,
        targetStoreItems,
        sourceSkuItems
      )
    );
    setStoreChannelProductPoolSelectedStoreKeys([]);
    setStoreChannelProductPoolStatusFilter('all');
    setStoreChannelProductPoolKeyword('');
    setStoreConfigPage(1);
    setStoreConfigPageSize(20);
    setStoreChannelProductPoolBatchSellStatus(undefined);
    setStoreChannelProductPoolBatchSellableSkuKeys([]);
    setStoreChannelProductPoolBatchAllowSelfPrice(undefined);
  }, [product, sourceSkuItems, targetStoreItems, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setStoreConfigPage(1);
    setStoreConfigPageSize(20);
  }, [product?.id, visible]);

  function updateStoreChannelProductPoolDraftItem(
    storeId: string,
    updater: (
      current: StoreChannelProductPoolStoreConfigDraftItem
    ) => StoreChannelProductPoolStoreConfigDraftItem
  ) {
    setDraftStoreChannelProductPoolConfigMap((previous) => {
      const current =
        previous[storeId] ||
        createDefaultStoreChannelProductPoolStoreConfig(storeId);

      return {
        ...previous,
        [storeId]: updater(current),
      };
    });
  }

  function handleStoreChannelProductPoolSellStatusChange(
    storeId: string,
    sellState: ProductStoreSellStatus
  ) {
    updateStoreChannelProductPoolDraftItem(storeId, (current) =>
      buildStoreChannelProductPoolDraftItem(current, sellState, availableSkuKeys)
    );
  }

  function handleStoreChannelProductPoolSellableSkuKeysChange(
    storeId: string,
    skuKeys: string[]
  ) {
    const normalizedSkuKeys = uniqueStringArray(
      skuKeys.filter((skuId) => availableSkuKeySet.has(skuId))
    );

    updateStoreChannelProductPoolDraftItem(storeId, (current) => ({
      ...current,
      sellableSkuKeys: normalizedSkuKeys,
      allowSelfPrice: normalizedSkuKeys.length
        ? current.allowSelfPrice === true
        : false,
    }));
  }

  function handleStoreChannelProductPoolAllowSelfPriceChange(
    storeId: string,
    checked: boolean
  ) {
    updateStoreChannelProductPoolDraftItem(storeId, (current) => ({
      ...current,
      allowSelfPrice: current.sellStatus === 'sellable' && checked,
    }));
  }

  function updateSelectedStoreChannelProductPoolConfigs(
    sellState: ProductStoreSellStatus
  ) {
    if (!storeChannelProductPoolSelectedStoreKeys.length) {
      Message.warning('请先选择需要批量设置的店铺');
      return;
    }

    setDraftStoreChannelProductPoolConfigMap((previous) => {
      const next = { ...previous };

      storeChannelProductPoolSelectedStoreKeys.forEach((storeId) => {
        const current =
          next[storeId] ||
          createDefaultStoreChannelProductPoolStoreConfig(storeId);
        next[storeId] = buildStoreChannelProductPoolDraftItem(
          current,
          sellState,
          availableSkuKeys
        );
      });

      return next;
    });
  }

  function handleStoreChannelProductPoolBatchSellStatusChange(value?: string) {
    if (!value) {
      return;
    }

    updateSelectedStoreChannelProductPoolConfigs(
      value as ProductStoreSellStatus
    );
    setStoreChannelProductPoolBatchSellStatus(undefined);
  }

  function handleStoreChannelProductPoolBatchSellableSkuKeysChange(value: unknown) {
    if (!storeChannelProductPoolSelectedStoreKeys.length) {
      Message.warning('请先选择需要批量设置的店铺');
      return;
    }

    const nextSkuKeys = uniqueStringArray(
      normalizeStringArray(value).filter(
        (skuId) => skuId !== SKU_TREE_ROOT_KEY && availableSkuKeySet.has(skuId)
      )
    );

    setDraftStoreChannelProductPoolConfigMap((previous) => {
      const next = { ...previous };

      storeChannelProductPoolSelectedStoreKeys.forEach((storeId) => {
        const current =
          next[storeId] ||
          createDefaultStoreChannelProductPoolStoreConfig(storeId);

        next[storeId] = {
          ...current,
          sellStatus: nextSkuKeys.length ? ('sellable' as const) : current.sellStatus,
          channelStatus:
            nextSkuKeys.length ? ('on' as const) : ('off' as const),
          sellableSkuKeys: nextSkuKeys,
          allowSelfPrice: nextSkuKeys.length
            ? current.allowSelfPrice === true
            : false,
        };
      });

      return next;
    });
    setStoreChannelProductPoolBatchSellableSkuKeys([]);
  }

  function handleStoreChannelProductPoolBatchAllowSelfPriceChange(value?: string) {
    if (!value) {
      return;
    }

    if (!storeChannelProductPoolSelectedStoreKeys.length) {
      Message.warning('请先选择需要批量设置的店铺');
      return;
    }

    setDraftStoreChannelProductPoolConfigMap((previous) => {
      const next = { ...previous };

      storeChannelProductPoolSelectedStoreKeys.forEach((storeId) => {
        const current =
          next[storeId] ||
          createDefaultStoreChannelProductPoolStoreConfig(storeId);

        next[storeId] = {
          ...current,
          allowSelfPrice: value === 'on' && current.sellStatus === 'sellable',
        };
      });

      return next;
    });
    setStoreChannelProductPoolBatchAllowSelfPrice(undefined);
  }

  const storeConfigTableData = useMemo<StoreConfigTableItem[]>(() => {
    const keyword = storeChannelProductPoolKeyword.trim().toLowerCase();

    return targetStoreItems
      .map((item) => {
        const draftConfig =
          draftStoreChannelProductPoolConfigMap[item.id] ||
          createDefaultStoreChannelProductPoolStoreConfig(item.id);
        const normalizedSellableSkuKeys =
          draftConfig.sellStatus === 'sellable'
            ? uniqueStringArray(
                draftConfig.sellableSkuKeys.filter((skuId) =>
                  availableSkuKeySet.has(skuId)
                )
              )
            : [];
        const isSellable = draftConfig.sellStatus === 'sellable';

        return {
          ...item,
          ...draftConfig,
          sellStatus: isSellable ? ('sellable' as const) : ('unsellable' as const),
          channelStatus: isSellable ? ('on' as const) : ('off' as const),
          sellableSkuKeys: isSellable ? normalizedSellableSkuKeys : [],
          allowSelfPrice: isSellable && draftConfig.allowSelfPrice === true,
        };
      })
      .filter((item) => {
        if (keyword && !item.name.toLowerCase().includes(keyword)) {
          return false;
        }

        if (storeChannelProductPoolStatusFilter !== 'all') {
          return (
            getStoreChannelProductPoolSellState(item.sellStatus) ===
            storeChannelProductPoolStatusFilter
          );
        }

        return true;
      });
  }, [
    availableSkuKeySet,
    draftStoreChannelProductPoolConfigMap,
    storeChannelProductPoolKeyword,
    storeChannelProductPoolStatusFilter,
    targetStoreItems,
  ]);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(storeConfigTableData.length / storeConfigPageSize)
    );

    if (storeConfigPage > totalPages) {
      setStoreConfigPage(totalPages);
    }
  }, [storeConfigPage, storeConfigPageSize, storeConfigTableData.length]);

  const storeConfigColumns: Array<any> = [
    {
      title: '店铺名称',
      dataIndex: 'name',
      width: 360,
      render: (_: string, record: StoreConfigTableItem) => (
        <div className={styles.storeCell}>
          <Tag
            className={styles.storeTag}
            color={record.type === 'store' ? 'arcoblue' : 'orangered'}
          >
            {PRODUCT_STORE_TYPE_LABEL_MAP[record.type]}
          </Tag>
          <span className={styles.storeName}>{record.name}</span>
        </div>
      ),
    },
    {
      title: '可售状态',
      dataIndex: 'sellStatus',
      width: 180,
      render: (_: ProductStoreSellStatus, record: StoreConfigTableItem) => (
        <Select
          className={styles.storeStatusSelect}
          value={getStoreChannelProductPoolSellState(record.sellStatus)}
          onChange={(value) =>
            handleStoreChannelProductPoolSellStatusChange(
              record.id,
              value as ProductStoreSellStatus
            )
          }
        >
          {Object.entries(PRODUCT_STORE_SELL_STATUS_LABEL_MAP).map(
            ([value, label]) => (
              <Select.Option key={value} value={value}>
                {label}
              </Select.Option>
            )
          )}
        </Select>
      ),
    },
    {
      title: '可售 SKU',
      dataIndex: 'sellableSkuKeys',
      width: 340,
      render: (_: string[], record: StoreConfigTableItem) => (
        <TreeSelect
          multiple
          treeCheckable
          allowClear
          className={styles.storeSkuTreeSelect}
          disabled={record.sellStatus !== 'sellable'}
          placeholder="请选择可售 SKU"
          treeData={storeChannelProductPoolSkuTreeData}
          value={record.sellableSkuKeys}
          onChange={(value) =>
            handleStoreChannelProductPoolSellableSkuKeysChange(
              record.id,
              normalizeStringArray(value).filter((skuId) => skuId !== SKU_TREE_ROOT_KEY)
            )
          }
        />
      ),
    },
    {
      title: '自主定价',
      dataIndex: 'allowSelfPrice',
      width: 160,
      render: (value: boolean, record: StoreConfigTableItem) => (
        <Switch
          checked={value}
          disabled={record.sellStatus !== 'sellable'}
          onChange={(checked) =>
            handleStoreChannelProductPoolAllowSelfPriceChange(record.id, checked)
          }
        />
      ),
    },
  ];

  async function handleConfirm() {
    const nextConfigs = targetStoreItems.map((item) => {
      const current =
        draftStoreChannelProductPoolConfigMap[item.id] ||
        createDefaultStoreChannelProductPoolStoreConfig(item.id);
      const normalizedSellableSkuIds = uniqueStringArray(
        current.sellableSkuKeys.filter((skuId) => availableSkuKeySet.has(skuId))
      );
      const isSellable =
        current.sellStatus === 'sellable' && normalizedSellableSkuIds.length > 0;

      return {
        storeId: item.id,
        sellStatus: isSellable ? ('sellable' as const) : ('unsellable' as const),
        channelStatus: isSellable ? ('on' as const) : ('off' as const),
        ...(isSellable ? { sellableSkuIds: normalizedSellableSkuIds } : {}),
        ...(isSellable && current.allowSelfPrice ? { allowSelfPrice: true } : {}),
      };
    });

    await onSubmit(nextConfigs);
  }

  return (
    <Modal
      title="管理在售门店"
      visible={visible}
      autoFocus={false}
      focusLock
      style={{ width: 1280 }}
      confirmLoading={submitting}
      onOk={handleConfirm}
      onCancel={onCancel}
    >
      <div className={styles.storeConfigModalContent}>
        <div className={styles.storeConfigFilterRow}>
          <Select
            className={styles.storeConfigFilter}
            value={storeChannelProductPoolStatusFilter}
            onChange={(value) => {
              setStoreChannelProductPoolStatusFilter(
                value as StoreChannelProductPoolFilterStatus
              );
              setStoreConfigPage(1);
            }}
          >
            <Select.Option value="all">全部状态</Select.Option>
            {Object.entries(PRODUCT_STORE_SELL_STATUS_LABEL_MAP).map(
              ([value, label]) => (
                <Select.Option key={value} value={value}>
                  {label}
                </Select.Option>
              )
            )}
          </Select>

          <Input
            allowClear
            className={styles.storeConfigSearch}
            placeholder="搜索店铺名称"
            value={storeChannelProductPoolKeyword}
            onChange={(value) => {
              setStoreChannelProductPoolKeyword(value);
              setStoreConfigPage(1);
            }}
          />
        </div>

        <div className={styles.storeConfigToolbar}>
          <Typography.Text className={styles.storeConfigToolbarText}>
            已勾选 {storeChannelProductPoolSelectedStoreKeys.length} 项
          </Typography.Text>
          <Typography.Text className={styles.storeConfigToolbarText}>
            勾选后可批量设置：
          </Typography.Text>
          <Select
            allowClear
            className={styles.storeConfigBatchSelect}
            placeholder="可售状态"
            value={storeChannelProductPoolBatchSellStatus}
            onChange={handleStoreChannelProductPoolBatchSellStatusChange}
          >
            {Object.entries(PRODUCT_STORE_SELL_STATUS_LABEL_MAP).map(
              ([value, label]) => (
                <Select.Option key={value} value={value}>
                  {label}
                </Select.Option>
              )
            )}
          </Select>
          <TreeSelect
            multiple
            treeCheckable
            allowClear
            className={styles.storeConfigBatchTreeSelect}
            placeholder="可售 SKU"
            treeData={storeChannelProductPoolSkuTreeData}
            value={
              storeChannelProductPoolBatchSellableSkuKeys.length
                ? storeChannelProductPoolBatchSellableSkuKeys
                : availableSkuKeys
            }
            onChange={handleStoreChannelProductPoolBatchSellableSkuKeysChange}
          />
          <Select
            allowClear
            className={styles.storeConfigBatchSelect}
            placeholder="自主定价"
            value={storeChannelProductPoolBatchAllowSelfPrice}
            onChange={handleStoreChannelProductPoolBatchAllowSelfPriceChange}
          >
            <Select.Option value="on">开启</Select.Option>
            <Select.Option value="off">关闭</Select.Option>
          </Select>
        </div>

        <Table
          rowKey="id"
          className={styles.storeConfigTable}
          columns={storeConfigColumns}
          data={storeConfigTableData}
          noDataElement="暂无店铺数据"
          pagination={{
            current: storeConfigPage,
            pageSize: storeConfigPageSize,
            total: storeConfigTableData.length,
            sizeCanChange: true,
            sizeOptions: STORE_CONFIG_PAGE_SIZE_OPTIONS,
            showTotal: true,
            showJumper: true,
            onChange: (pageNumber, pageSize) => {
              setStoreConfigPage(pageNumber);
              setStoreConfigPageSize(pageSize);
            },
          }}
          rowSelection={{
            selectedRowKeys: storeChannelProductPoolSelectedStoreKeys,
            columnWidth: 48,
            preserveSelectedRowKeys: true,
            onChange: (keys) =>
              setStoreChannelProductPoolSelectedStoreKeys(keys.map(String)),
          }}
          scroll={{ x: 1120, y: 440 }}
          tableLayoutFixed
        />
      </div>
    </Modal>
  );
}

export default SalesStoreModal;
