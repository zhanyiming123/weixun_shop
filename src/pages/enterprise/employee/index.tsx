import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Dropdown,
  Input,
  Link,
  Menu,
  Message,
  Pagination,
  Popconfirm,
  Select,
  Table,
  Typography,
} from '@arco-design/web-react';
import { useHistory } from 'react-router-dom';
import styles from './index.module.less';
import {
  DEFAULT_EMPLOYEE_FILTER_VALUES,
  DEFAULT_EMPLOYEE_ITEMS,
  EMPLOYEE_ORGANIZATION_OPTIONS,
  EMPLOYEE_STATUS_FILTER_LABEL_MAP,
  EMPLOYEE_STATUS_TABLE_LABEL_MAP,
  EmployeeFilterValues,
  EmployeeItem,
  EmployeeStatus,
} from './data';

const Option = Select.Option;

function applyEmployeeFilters(
  items: EmployeeItem[],
  filters: EmployeeFilterValues
) {
  const keyword = filters.keyword.trim().toLowerCase();

  return items
    .filter((item) => {
      if (
        keyword &&
        !item.name.toLowerCase().includes(keyword) &&
        !item.account.toLowerCase().includes(keyword)
      ) {
        return false;
      }

      if (filters.organizationId && item.organizationId !== filters.organizationId) {
        return false;
      }

      if (filters.status && item.status !== filters.status) {
        return false;
      }

      return true;
    })
    .sort((left, right) => right.operatedAt.localeCompare(left.operatedAt));
}

function splitDateTime(value: string) {
  const [date = value, time = ''] = value.split(' ');
  return {
    date,
    time,
  };
}

function EnterpriseEmployeePage() {
  const history = useHistory();
  const [formValues, setFormValues] = useState<EmployeeFilterValues>({
    ...DEFAULT_EMPLOYEE_FILTER_VALUES,
  });
  const [appliedFilters, setAppliedFilters] = useState<EmployeeFilterValues>({
    ...DEFAULT_EMPLOYEE_FILTER_VALUES,
  });
  const [selectedRowKeys, setSelectedRowKeys] = useState<(string | number)[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const filteredEmployees = useMemo(
    () => applyEmployeeFilters(DEFAULT_EMPLOYEE_ITEMS, appliedFilters),
    [appliedFilters]
  );

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, filteredEmployees.length, pageSize]);

  const currentPageEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [currentPage, filteredEmployees, pageSize]);

  const currentPageEmployeeIds = useMemo(
    () => currentPageEmployees.map((item) => item.id),
    [currentPageEmployees]
  );

  const currentPageSelected = currentPageEmployeeIds.filter((id) =>
    selectedRowKeys.includes(id)
  );

  const allCurrentPageSelected =
    currentPageEmployeeIds.length > 0 &&
    currentPageSelected.length === currentPageEmployeeIds.length;
  const partiallySelected =
    currentPageSelected.length > 0 && !allCurrentPageSelected;

  function updateFormValue<K extends keyof EmployeeFilterValues>(
    field: K,
    value: EmployeeFilterValues[K]
  ) {
    setFormValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleQuery() {
    setAppliedFilters({
      ...formValues,
    });
    setSelectedRowKeys([]);
    setCurrentPage(1);
  }

  function handleReset() {
    const nextValues = {
      ...DEFAULT_EMPLOYEE_FILTER_VALUES,
    };

    setFormValues(nextValues);
    setAppliedFilters(nextValues);
    setSelectedRowKeys([]);
    setCurrentPage(1);
  }

  function showPendingMessage(actionText: string) {
    Message.info(`${actionText}功能待接入`);
  }

  function handleRowAction(record: EmployeeItem, actionText: string) {
    Message.info(`员工「${record.name}」${actionText}功能待接入`);
  }

  function handleBatchAction(actionKey: string) {
    if (!selectedRowKeys.length) {
      Message.info('请先选择员工');
      return;
    }

    const actionLabelMap: Record<string, string> = {
      export: '批量导出',
      transfer: '批量调整组织',
    };

    Message.info(`${actionLabelMap[actionKey] || '批量操作'}功能待接入`);
  }

  function handleBatchDelete() {
    Message.info(`已选 ${selectedRowKeys.length} 名员工，批量删除功能待接入`);
  }

  function handleSelectCurrentPage(checked: boolean) {
    const currentPageKeySet = new Set(currentPageEmployeeIds);

    setSelectedRowKeys((prev) => {
      const nextKeys = prev.map(String);

      if (checked) {
        return Array.from(new Set([...nextKeys, ...currentPageEmployeeIds]));
      }

      return nextKeys.filter((key) => !currentPageKeySet.has(key));
    });
  }

  function renderBatchDeleteButton() {
    const button = (
      <Button className={styles.batchDeleteButton} disabled={!selectedRowKeys.length}>
        删除
      </Button>
    );

    if (!selectedRowKeys.length) {
      return button;
    }

    return (
      <Popconfirm
        focusLock
        title={`确定对已选 ${selectedRowKeys.length} 名员工执行删除操作吗？`}
        onOk={handleBatchDelete}
      >
        {button}
      </Popconfirm>
    );
  }

  function renderBatchBar(showPagination = false) {
    return (
      <div
        className={`${styles.batchBar} ${
          showPagination ? styles.batchBarBottom : ''
        }`.trim()}
      >
        <div className={styles.batchControls}>
          <Checkbox
            checked={allCurrentPageSelected}
            className={styles.pageSelect}
            disabled={!currentPageEmployeeIds.length}
            indeterminate={partiallySelected}
            onChange={handleSelectCurrentPage}
          >
            当页全选
          </Checkbox>

          <Dropdown
            droplist={
              <Menu
                selectable={false}
                onClickMenuItem={(key) => handleBatchAction(key)}
              >
                <Menu.Item key="export">批量导出（待接入）</Menu.Item>
                <Menu.Item key="transfer">批量调整组织（待接入）</Menu.Item>
              </Menu>
            }
            position="bl"
            trigger="click"
          >
            <Button
              className={`${styles.batchTrigger} ${
                !selectedRowKeys.length ? styles.batchTriggerDisabled : ''
              }`.trim()}
              type="text"
            >
              批量操作
            </Button>
          </Dropdown>

          {renderBatchDeleteButton()}
        </div>

        {showPagination && (
          <div className={styles.paginationWrap}>
            <Pagination
              className={styles.pagination}
              current={currentPage}
              pageSize={pageSize}
              showJumper
              showTotal={(total) => `共 ${total} 条`}
              sizeCanChange
              sizeOptions={[20, 50, 100]}
              total={filteredEmployees.length}
              onChange={(pageNumber, nextPageSize) => {
                setCurrentPage(pageNumber);
                setPageSize(nextPageSize);
              }}
            />
          </div>
        )}
      </div>
    );
  }

  function renderActionLinks(record: EmployeeItem) {
    return (
      <span className={styles.actionLinks}>
        <Link onClick={() => handleRowAction(record, '查看')}>查看</Link>
        <Link onClick={() => handleRowAction(record, '编辑')}>编辑</Link>
        {record.isCurrentAccount ? (
          <Link onClick={() => handleRowAction(record, '更换')}>更换</Link>
        ) : (
          <Popconfirm
            focusLock
            title={`确定删除员工「${record.name}」吗？`}
            onOk={() => handleRowAction(record, '删除')}
          >
            <Link>删除</Link>
          </Popconfirm>
        )}
      </span>
    );
  }

  const columns = [
    {
      title: '有赞账号',
      dataIndex: 'account',
      width: 180,
      render: (value: string, record: EmployeeItem) => (
        <div className={styles.accountCell}>
          <Typography.Text className={styles.accountText}>{value}</Typography.Text>
          {record.isCurrentAccount && (
            <span className={styles.currentTag}>当前账号</span>
          )}
        </div>
      ),
    },
    {
      title: '员工姓名',
      dataIndex: 'name',
      width: 120,
      render: (value: string) => (
        <Typography.Text className={styles.nameText}>{value}</Typography.Text>
      ),
    },
    {
      title: '联系方式',
      dataIndex: 'contactPhone',
      width: 160,
    },
    {
      title: '所属组织/部门/员工角色',
      dataIndex: 'organizationDisplay',
      width: 320,
      render: (value: string[]) => (
        <div className={styles.organizationCell}>
          {value.map((line, index) => (
            <Typography.Text key={`${line}_${index}`} className={styles.organizationLine}>
              {line}
            </Typography.Text>
          ))}
        </div>
      ),
    },
    {
      title: '操作人',
      dataIndex: 'operator',
      width: 140,
      render: (value: string) => (
        <Typography.Text
          className={value === '—' ? styles.operatorEmpty : styles.operatorText}
        >
          {value}
        </Typography.Text>
      ),
    },
    {
      title: '最后操作时间',
      dataIndex: 'operatedAt',
      width: 180,
      render: (value: string) => {
        const { date, time } = splitDateTime(value);

        return (
          <div className={styles.timeCell}>
            <Typography.Text className={styles.timeText}>{date}</Typography.Text>
            <Typography.Text className={styles.timeText}>{time}</Typography.Text>
          </div>
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (value: EmployeeStatus) => (
        <Typography.Text
          className={
            value === 'enabled' ? styles.statusText : styles.statusMuted
          }
        >
          {EMPLOYEE_STATUS_TABLE_LABEL_MAP[value]}
        </Typography.Text>
      ),
    },
    {
      title: '操作',
      dataIndex: 'operations',
      width: 180,
      fixed: 'right' as const,
      render: (_: unknown, record: EmployeeItem) => renderActionLinks(record),
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <Typography.Text className={styles.pageTitle}>员工管理</Typography.Text>
        </div>

        <div className={styles.toolbar}>
          <div className={styles.toolbarPrimary}>
            <Button
              type="primary"
              onClick={() => history.push('/enterprise/employee/create')}
            >
              新建员工
            </Button>
            <Button onClick={() => showPendingMessage('批量导入')}>批量导入</Button>
          </div>

          <Link onClick={() => showPendingMessage('批量新建记录')}>批量新建记录</Link>
        </div>

        <div className={styles.filterPanel}>
          <div className={styles.filterGrid}>
            <div className={styles.filterItem}>
              <span className={styles.filterLabel}>员工姓名或账号：</span>
              <Input
                allowClear
                className={styles.filterInput}
                placeholder="请输入员工姓名或账号"
                value={formValues.keyword}
                onChange={(value) => updateFormValue('keyword', value)}
              />
            </div>

            <div className={styles.filterItem}>
              <span className={styles.filterLabel}>所属组织：</span>
              <Select
                allowClear
                showSearch
                className={styles.filterSelect}
                placeholder="请选择或搜索店铺名称"
                value={formValues.organizationId}
                onChange={(value) =>
                  updateFormValue('organizationId', value || undefined)
                }
              >
                {EMPLOYEE_ORGANIZATION_OPTIONS.map((item) => (
                  <Option key={item.value} value={item.value}>
                    {item.label}
                  </Option>
                ))}
              </Select>
            </div>

            <div className={styles.filterItem}>
              <span className={styles.filterLabel}>状态：</span>
              <Select
                className={styles.filterSelect}
                value={formValues.status || 'all'}
                onChange={(value) =>
                  updateFormValue(
                    'status',
                    value === 'all' ? undefined : (value as EmployeeStatus)
                  )
                }
              >
                <Option value="all">全部</Option>
                {Object.entries(EMPLOYEE_STATUS_FILTER_LABEL_MAP).map(
                  ([value, label]) => (
                    <Option key={value} value={value}>
                      {label}
                    </Option>
                  )
                )}
              </Select>
            </div>
          </div>

          <div className={styles.filterActions}>
            <Button type="primary" onClick={handleQuery}>
              筛选
            </Button>
            <Link onClick={handleReset}>重置筛选条件</Link>
          </div>
        </div>

        {renderBatchBar()}

        <div className={styles.tableWrap}>
          <Table
            rowKey="id"
            columns={columns}
            data={currentPageEmployees}
            noDataElement="暂无员工数据"
            pagination={false}
            rowSelection={{
              columnWidth: 48,
              preserveSelectedRowKeys: true,
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys),
            }}
            scroll={{ x: 1400 }}
            tableLayoutFixed
          />
        </div>

        {renderBatchBar(true)}
      </div>
    </div>
  );
}

export default EnterpriseEmployeePage;
