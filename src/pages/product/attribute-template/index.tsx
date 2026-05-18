import React, { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Cascader,
  Input,
  Popconfirm,
  Select,
  Table,
  Tag,
  Typography,
} from '@arco-design/web-react';
import { IconPlus } from '@arco-design/web-react/icon';
import { useHistory } from 'react-router-dom';
import styles from './index.module.less';
import {
  buildProductCatalogCascaderOptions,
  getProductCatalogFullLabel,
  getProductCatalogIdFromPath,
  type ProductCatalogConfigItem,
  useProductCatalogItems,
} from '@/pages/product/catalog/data';
import { useProductCatalogAttributes } from '@/pages/product/attribute/data';
import {
  ProductCatalogAttributeTemplateItem,
  useProductCatalogAttributeTemplates,
} from './data';

function normalizePaths(
  value: (string | string[])[] | string[][] | undefined
): string[][] {
  if (!Array.isArray(value) || !value.length) {
    return [];
  }

  if (Array.isArray(value[0])) {
    return value as string[][];
  }

  return [value as string[]];
}

function toLeafCatalogIds(paths: string[][], catalogItems: ProductCatalogConfigItem[]) {
  return paths
    .map((path) => getProductCatalogIdFromPath(path, catalogItems))
    .filter(Boolean) as string[];
}

function AttributeTemplatePage() {
  const history = useHistory();
  const [catalogItems] = useProductCatalogItems();
  const [attributes] = useProductCatalogAttributes();
  const [templates, setTemplates] = useProductCatalogAttributeTemplates(attributes);
  const catalogCascaderOptions = useMemo(
    () => buildProductCatalogCascaderOptions(catalogItems),
    [catalogItems]
  );
  const [searchName, setSearchName] = useState('');
  const [filterEnabled, setFilterEnabled] = useState<string>('');
  const [selectedCatalogPaths, setSelectedCatalogPaths] = useState<string[][]>([]);
  const selectedCatalogIds = useMemo(
    () => toLeafCatalogIds(selectedCatalogPaths, catalogItems),
    [catalogItems, selectedCatalogPaths]
  );

  const filteredData = useMemo(
    () =>
      templates.filter((item) => {
        if (searchName && !item.name.includes(searchName)) {
          return false;
        }

        if (
          selectedCatalogIds.length &&
          !item.catalogIds.some((catalogId) => selectedCatalogIds.includes(catalogId))
        ) {
          return false;
        }

        if (filterEnabled === 'true' && !item.enabled) {
          return false;
        }

        if (filterEnabled === 'false' && item.enabled) {
          return false;
        }

        return true;
      }),
    [filterEnabled, searchName, selectedCatalogIds, templates]
  );

  function handleToggleEnabled(record: ProductCatalogAttributeTemplateItem, checked: boolean) {
    setTemplates((prev) =>
      prev.map((item) =>
        item.id === record.id ? { ...item, enabled: checked } : item
      )
    );
  }

  const columns = [
    {
      title: '模板名称',
      dataIndex: 'name',
      width: 220,
      render: (value: string) => <Typography.Text bold>{value}</Typography.Text>,
    },
    {
      title: '绑定类目',
      dataIndex: 'catalogIds',
      width: 420,
      render: (catalogIds: string[]) => (
        <div className={styles.valueList}>
          {catalogIds.map((catalogId) => (
            <Tag key={catalogId} size="small">
              {getProductCatalogFullLabel(catalogId, catalogItems)}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: '字段数',
      dataIndex: 'entries',
      width: 100,
      render: (entries: ProductCatalogAttributeTemplateItem['entries']) => entries.length,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      width: 120,
      render: (value: boolean) => (
        <Tag color={value ? 'green' : 'red'}>{value ? '启用' : '禁用'}</Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 180,
    },
    {
      title: '操作',
      dataIndex: 'operations',
      width: 200,
      fixed: 'right' as const,
      render: (_: unknown, record: ProductCatalogAttributeTemplateItem) => (
        <span className={styles.actionLinks}>
          <Typography.Text
            className={styles.actionLink}
            onClick={() => history.push(`/product/attribute-template/edit?id=${record.id}`)}
          >
            编辑
          </Typography.Text>
          <span className={styles.actionDivider}>|</span>
          {record.enabled ? (
            <Popconfirm
              title={`确定禁用模板「${record.name}」吗？`}
              onOk={() => handleToggleEnabled(record, false)}
            >
              <Typography.Text className={styles.actionLink}>禁用</Typography.Text>
            </Popconfirm>
          ) : (
            <Typography.Text
              className={styles.actionLink}
              onClick={() => handleToggleEnabled(record, true)}
            >
              启用
            </Typography.Text>
          )}
        </span>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      <Card className={styles.filterCard}>
        <div className={styles.filterRow}>
          <div className={styles.filterItem}>
            <span className={styles.filterLabel}>模板名称</span>
            <Input
              allowClear
              placeholder="请输入模板名称"
              style={{ width: 220 }}
              value={searchName}
              onChange={setSearchName}
            />
          </div>
          <div className={styles.filterItem}>
            <span className={styles.filterLabel}>绑定类目</span>
            <Cascader
              allowClear
              className={styles.catalogCascader}
              mode="multiple"
              options={catalogCascaderOptions}
              placeholder="请选择绑定类目"
              value={selectedCatalogPaths.length ? selectedCatalogPaths : undefined}
              onChange={(value) => setSelectedCatalogPaths(normalizePaths(value))}
            />
          </div>
          <div className={styles.filterItem}>
            <span className={styles.filterLabel}>状态</span>
            <Select
              allowClear
              placeholder="请选择状态"
              style={{ width: 140 }}
              value={filterEnabled || undefined}
              onChange={(value) => setFilterEnabled(value || '')}
            >
              <Select.Option value="true">启用</Select.Option>
              <Select.Option value="false">禁用</Select.Option>
            </Select>
          </div>
          <div className={styles.filterActions}>
            <Button type="primary">查询</Button>
            <Button
              onClick={() => {
                setSearchName('');
                setFilterEnabled('');
                setSelectedCatalogPaths([]);
              }}
            >
              重置
            </Button>
          </div>
        </div>
      </Card>

      <Card className={styles.tableCard}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarLeft} />
          <Button
            icon={<IconPlus />}
            type="primary"
            onClick={() => history.push('/product/attribute-template/create')}
          >
            新建模板
          </Button>
        </div>
        <Table
          rowKey="id"
          columns={columns}
          data={filteredData}
          noDataElement="暂无模板数据"
          pagination={{ pageSize: 10, showTotal: true }}
          scroll={{ x: 1360 }}
          tableLayoutFixed
        />
      </Card>
    </div>
  );
}

export default AttributeTemplatePage;
