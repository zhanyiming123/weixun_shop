import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Checkbox,
  Empty,
  Form,
  Input,
  Message,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from '@arco-design/web-react';
import { useSelector } from 'react-redux';
import { GlobalState } from '@/store';
import {
  getProductStoreById,
  readProductStoreItems,
} from '@/pages/product/store-config/data';
import styles from './index.module.less';
import {
  createDefaultStoreBasicConfig,
  getStoreBasicConfigByStoreId,
  readStoreBasicConfigItems,
  STORE_BUSINESS_DAY_OPTIONS,
  StoreBasicConfigItem,
  StoreBusinessDay,
  upsertStoreBasicConfigItem,
} from './data';

type StoreBasicConfigFormValues = {
  storeName: string;
  address: string;
  managerName: string;
  contactPhone: string;
  businessDays: StoreBusinessDay[];
  businessStartTime: string;
  businessEndTime: string;
  isPaused: boolean;
};

const { useForm } = Form;

const BUSINESS_TIME_OPTIONS = Array.from({ length: 24 * 2 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, '0');
  const minute = index % 2 === 0 ? '00' : '30';
  const value = `${hour}:${minute}`;

  return {
    label: value,
    value,
  };
});

function buildFormValues(item: StoreBasicConfigItem): StoreBasicConfigFormValues {
  return {
    storeName: item.storeName,
    address: item.address,
    managerName: item.managerName,
    contactPhone: item.contactPhone,
    businessDays: item.businessDays,
    businessStartTime: item.businessStartTime,
    businessEndTime: item.businessEndTime,
    isPaused: item.isPaused,
  };
}

function StoreBasicConfigPage() {
  const [form] = useForm<StoreBasicConfigFormValues>();
  const { currentOrganization, demoContext } = useSelector(
    (state: GlobalState) => state
  );
  const [configItems, setConfigItems] = useState<StoreBasicConfigItem[]>(() =>
    readStoreBasicConfigItems()
  );
  const currentStoreId = currentOrganization?.storeIds?.[0];
  const currentStore = useMemo(
    () =>
      currentStoreId
        ? getProductStoreById(currentStoreId, readProductStoreItems())
        : undefined,
    [currentStoreId]
  );
  const currentConfig = useMemo(() => {
    if (!currentStore) {
      return null;
    }

    return (
      getStoreBasicConfigByStoreId(currentStore.id, configItems) ||
      createDefaultStoreBasicConfig(currentStore)
    );
  }, [configItems, currentStore]);

  useEffect(() => {
    if (currentConfig) {
      form.setFieldsValue(buildFormValues(currentConfig));
    }
  }, [currentConfig, form]);

  if (!currentStore || !currentConfig) {
    return (
      <Card>
        <Empty description="当前未匹配到可配置的店铺，请先切换到具体店铺视角。" />
      </Card>
    );
  }

  async function handleSave() {
    const values = await form.validate();

    if (!values.businessDays.length) {
      Message.error('请至少选择一个营业日');
      return;
    }

    if (values.businessStartTime >= values.businessEndTime) {
      Message.error('营业开始时间需早于结束时间');
      return;
    }

    const nextItem: StoreBasicConfigItem = {
      ...currentConfig,
      ...values,
      updatedAt: new Date()
        .toLocaleString('zh-CN', { hour12: false })
        .replace(/\//g, '-'),
    };
    const nextItems = upsertStoreBasicConfigItem(nextItem, configItems);

    setConfigItems(nextItems);
    Message.success('店铺基础配置已保存');
  }

  function handleReset() {
    form.setFieldsValue(buildFormValues(currentConfig));
    Message.info('已恢复为当前已保存配置');
  }

  return (
    <div className={styles.page}>
      <Card className={styles.heroCard}>
        <div className={styles.heroHeader}>
          <Space direction="vertical" size={10} style={{ display: 'flex' }}>
            <Tag color="arcoblue" size="large">
              {demoContext?.systemLabel || '店铺运营工作台'}
            </Tag>
            <Typography.Title className={styles.heroTitle} heading={4}>
              店铺基础配置
            </Typography.Title>
            <Typography.Paragraph className={styles.heroMeta} type="secondary">
              维护当前店铺的基础信息与营业设置。基础字段默认继承店铺档案，修改后会以本地配置方式单独保存。
            </Typography.Paragraph>
          </Space>

          <div className={styles.statusTagGroup}>
            <Tag>{currentConfig.storeName}</Tag>
            <Tag color={currentConfig.isPaused ? 'red' : 'green'}>
              {currentConfig.isPaused ? '暂停营业中' : '正常营业'}
            </Tag>
            <Tag>{demoContext?.identityLabel || '区域管理员'}</Tag>
          </div>
        </div>
      </Card>

      <div className={styles.summaryGrid}>
        <Card className={styles.summaryCard}>
          <span className={styles.summaryLabel}>当前店铺</span>
          <span className={styles.summaryValue}>{currentConfig.storeName}</span>
          <span className={styles.summaryHelper}>
            当前组织下的唯一店铺视角，配置保存后仅影响该店铺的展示与营业参数。
          </span>
        </Card>
        <Card className={styles.summaryCard}>
          <span className={styles.summaryLabel}>负责人</span>
          <span className={styles.summaryValue}>{currentConfig.managerName}</span>
          <span className={styles.summaryHelper}>
            适合用于店铺联系人、负责人和店铺值班管理的基础档案维护。
          </span>
        </Card>
        <Card className={styles.summaryCard}>
          <span className={styles.summaryLabel}>最近保存</span>
          <span className={styles.summaryValue}>{currentConfig.updatedAt}</span>
          <span className={styles.summaryHelper}>
            第一版使用本地持久化存储，刷新页面后仍会保留当前店铺的已保存配置。
          </span>
        </Card>
      </div>

      <Form form={form} layout="vertical">
        <Card
          className={styles.formCard}
          title={
            <div className={styles.cardTitle}>
              <span>店铺基础信息</span>
              <span className={styles.cardTitleDesc}>
                可覆盖店铺名称、地址、负责人与联系电话，不会直接改写店铺基础常量表。
              </span>
            </div>
          }
        >
          <Form.Item
            field="storeName"
            label="店铺名称"
            rules={[{ required: true, message: '请输入店铺名称' }]}
          >
            <Input placeholder="请输入店铺名称" />
          </Form.Item>
          <Form.Item
            field="address"
            label="店铺地址"
            rules={[{ required: true, message: '请输入店铺地址' }]}
          >
            <Input.TextArea placeholder="请输入店铺地址" autoSize={{ minRows: 2 }} />
          </Form.Item>
          <Form.Item
            field="managerName"
            label="负责人"
            rules={[{ required: true, message: '请输入负责人姓名' }]}
          >
            <Input placeholder="请输入负责人姓名" />
          </Form.Item>
          <Form.Item
            field="contactPhone"
            label="联系电话"
            rules={[
              { required: true, message: '请输入联系电话' },
              {
                match: /^[\d-]{7,20}$/,
                message: '请输入有效的联系电话',
              },
            ]}
          >
            <Input placeholder="请输入联系电话" />
          </Form.Item>
        </Card>

        <Card
          className={styles.formCard}
          title={
            <div className={styles.cardTitle}>
              <span>营业设置</span>
              <span className={styles.cardTitleDesc}>
                第一版仅收敛到营业日、营业时间和暂停营业开关，后续再扩展交易和库存规则。
              </span>
            </div>
          }
        >
          <Form.Item field="businessDays" label="营业日">
            <Checkbox.Group options={STORE_BUSINESS_DAY_OPTIONS} className={styles.dayGroup} />
          </Form.Item>

          <div className={styles.timeGrid}>
            <Form.Item
              field="businessStartTime"
              label="开始营业时间"
              rules={[{ required: true, message: '请选择开始营业时间' }]}
            >
              <Select options={BUSINESS_TIME_OPTIONS} placeholder="请选择开始营业时间" />
            </Form.Item>
            <Form.Item
              field="businessEndTime"
              label="结束营业时间"
              rules={[{ required: true, message: '请选择结束营业时间' }]}
            >
              <Select options={BUSINESS_TIME_OPTIONS} placeholder="请选择结束营业时间" />
            </Form.Item>
          </div>

          <Form.Item field="isPaused" label="暂停营业">
            <div className={styles.switchRow}>
              <div className={styles.switchCopy}>
                <span className={styles.switchTitle}>暂停营业开关</span>
                <span className={styles.switchDesc}>
                  开启后，可用于临时闭店、装修或系统维护等场景的营业状态标记。
                </span>
              </div>
              <Switch />
            </div>
          </Form.Item>
        </Card>

        <div className={styles.actions}>
          <Button onClick={handleReset}>恢复已保存配置</Button>
          <Button type="primary" onClick={handleSave}>
            保存店铺基础配置
          </Button>
        </div>
      </Form>
    </div>
  );
}

export default StoreBasicConfigPage;
