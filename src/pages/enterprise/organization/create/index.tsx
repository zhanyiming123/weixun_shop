import React, { useEffect, useMemo, useState } from 'react';
import qs from 'query-string';
import {
  Button,
  Card,
  Cascader,
  Form,
  Input,
  Message,
  Space,
  Steps,
  Switch,
  Typography,
} from '@arco-design/web-react';
import { useHistory, useLocation } from 'react-router-dom';
import styles from './index.module.less';
import {
  createOrganizationId,
  createTempOrganizationCode,
  DEFAULT_ORGANIZATION_CAPABILITIES,
  formatOrganizationDateTime,
  getOrganizationRegionLabel,
  ORGANIZATION_REGION_OPTIONS,
  ORGANIZATION_TYPE_LABEL_MAP,
  OrganizationCapabilityConfig,
  OrganizationType,
  useOrganizationItems,
  writeOrganizationItems,
} from '../data';

const { Step } = Steps;
const { useForm } = Form;
const PHONE_PATTERN = /^[\d-]{7,20}$/;

type CreateFormValues = {
  name: string;
  code: string;
  regionPath: string[];
  address: string;
  contactPhone: string;
  managerName: string;
  managerPhone: string;
};

function normalizePath(value: (string | string[])[] | undefined): string[] {
  if (!Array.isArray(value) || !value.length) {
    return [];
  }

  const firstValue = value[0];
  if (Array.isArray(firstValue)) {
    return firstValue;
  }

  return value as string[];
}

function buildInitialFormValues(code: string): CreateFormValues {
  return {
    name: '',
    code,
    regionPath: [],
    address: '',
    contactPhone: '',
    managerName: '',
    managerPhone: '',
  };
}

type CapabilityFieldKey = keyof OrganizationCapabilityConfig;

const CAPABILITY_SECTIONS: Array<{
  title: string;
  items: Array<{
    key: CapabilityFieldKey;
    title: string;
    description: string;
  }>;
}> = [
  {
    title: '店铺相关',
    items: [
      {
        key: 'shopIsolation',
        title: '网店隔离',
        description: '开启后，该组织拥有独立的网店配置和数据隔离能力。',
      },
      {
        key: 'shopStatus',
        title: '网店状态',
        description: '控制该组织的网店是否处于可运营状态。',
      },
    ],
  },
  {
    title: '商品相关',
    items: [
      {
        key: 'selfBuiltProduct',
        title: '自建商品',
        description: '允许该组织独立创建和维护自己的商品。',
      },
      {
        key: 'customProductInfo',
        title: '自定义商品信息',
        description: '允许该组织定制商品展示字段和扩展信息。',
      },
    ],
  },
];

function EnterpriseOrganizationCreatePage() {
  const history = useHistory();
  const location = useLocation();
  const [organizationItems, setOrganizationItems] = useOrganizationItems();
  const [currentStep, setCurrentStep] = useState(0);
  const [capabilities, setCapabilities] = useState<OrganizationCapabilityConfig>(
    DEFAULT_ORGANIZATION_CAPABILITIES
  );
  const [organizationInfo, setOrganizationInfo] = useState<CreateFormValues>(
    buildInitialFormValues(createTempOrganizationCode('store'))
  );
  const [form] = useForm();
  const locationQuery = useMemo(() => qs.parse(location.search), [location.search]);
  const pageType = useMemo<OrganizationType>(
    () => (locationQuery.type === 'partner' ? 'partner' : 'store'),
    [locationQuery.type]
  );
  const tempCode = useMemo(() => createTempOrganizationCode(pageType), [pageType]);
  const typeLabel = ORGANIZATION_TYPE_LABEL_MAP[pageType];
  const nameLabel = pageType === 'store' ? '店铺名称' : '合伙人名称';
  const codeLabel = pageType === 'store' ? '店铺编号' : '合伙人编号';

  useEffect(() => {
    if (locationQuery.type !== pageType) {
      history.replace(`/enterprise/organization/create?type=${pageType}`);
    }
  }, [history, locationQuery.type, pageType]);

  useEffect(() => {
    const initialValues = buildInitialFormValues(tempCode);
    setOrganizationInfo(initialValues);
    setCapabilities(DEFAULT_ORGANIZATION_CAPABILITIES);
    setCurrentStep(0);
    form.resetFields();
    form.setFieldsValue(initialValues);
  }, [form, pageType, tempCode]);

  function handleCancel() {
    history.push(`/enterprise/organization?tab=${pageType}`);
  }

  async function handleNextStep() {
    try {
      const values = (await form.validate()) as CreateFormValues;
      setOrganizationInfo({
        ...values,
        code: tempCode,
        regionPath: [...(values.regionPath || [])],
      });
      setCurrentStep(1);
    } catch (_) {
      return;
    }
  }

  function updateCapability(key: CapabilityFieldKey, checked: boolean) {
    setCapabilities((prev) => ({
      ...prev,
      [key]: checked,
    }));
  }

  function handlePrevStep() {
    form.setFieldsValue(organizationInfo);
    setCurrentStep(0);
  }

  function handleSubmit() {
    const now = formatOrganizationDateTime(new Date());
    const nextItem = {
      id: createOrganizationId(pageType),
      type: pageType,
      name: organizationInfo.name.trim(),
      code: organizationInfo.code,
      regionPath: [...organizationInfo.regionPath],
      regionLabel: getOrganizationRegionLabel(organizationInfo.regionPath),
      address: organizationInfo.address.trim(),
      contactPhone: organizationInfo.contactPhone.trim(),
      managerName: organizationInfo.managerName.trim(),
      managerPhone: organizationInfo.managerPhone.trim(),
      status: 'enabled' as const,
      capabilities,
      createdAt: now,
      updatedAt: now,
    };
    const nextItems = [nextItem, ...organizationItems];

    writeOrganizationItems(nextItems);
    setOrganizationItems(nextItems);
    Message.success(`${typeLabel}创建成功`);
    history.push(`/enterprise/organization?tab=${pageType}`);
  }

  return (
    <div className={styles.page}>
      <Card className={styles.headerCard}>
        <Space
          direction="vertical"
          size={8}
          style={{ display: 'flex' }}
          className={styles.headerContent}
        >
          <Typography.Title heading={4} style={{ margin: 0 }}>
            新建{typeLabel}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            通过两步完成组织信息录入和能力配置，新建完成后将自动回到对应列表页。
          </Typography.Paragraph>
        </Space>
      </Card>

      <Card className={styles.stepsCard}>
        <Steps current={currentStep}>
          <Step title="组织信息" />
          <Step title="组织能力" />
        </Steps>
      </Card>

      <Card className={styles.formCard}>
        <Form form={form} layout="vertical">
          {currentStep === 0 ? (
            <div className={styles.formGrid}>
              <Form.Item
                field="name"
                label={nameLabel}
                rules={[{ required: true, message: `请输入${nameLabel}` }]}
              >
                <Input allowClear placeholder={`请输入${nameLabel}`} />
              </Form.Item>

              <Form.Item field="code" label={codeLabel}>
                <Input readOnly />
              </Form.Item>

              <Form.Item
                field="regionPath"
                label="所属区域"
                rules={[{ required: true, message: '请选择所属区域' }]}
              >
                <Cascader
                  options={ORGANIZATION_REGION_OPTIONS}
                  placeholder="请选择所属区域"
                  onChange={(value) =>
                    form.setFieldValue('regionPath', normalizePath(value))
                  }
                />
              </Form.Item>

              <Form.Item
                field="contactPhone"
                label="联系电话"
                rules={[
                  { required: true, message: '请输入联系电话' },
                  { match: PHONE_PATTERN, message: '请输入 7-20 位联系电话' },
                ]}
              >
                <Input allowClear placeholder="请输入联系电话" />
              </Form.Item>

              <Form.Item
                field="address"
                className={styles.fullWidth}
                label="地址"
                rules={[{ required: true, message: '请输入地址' }]}
              >
                <Input.TextArea
                  autoSize={{ minRows: 3, maxRows: 5 }}
                  placeholder="请输入详细地址"
                />
              </Form.Item>

              <Form.Item
                field="managerName"
                label="负责人姓名"
                rules={[{ required: true, message: '请输入负责人姓名' }]}
              >
                <Input allowClear placeholder="请输入负责人姓名" />
              </Form.Item>

              <Form.Item
                field="managerPhone"
                label="负责人电话"
                rules={[
                  { required: true, message: '请输入负责人电话' },
                  { match: PHONE_PATTERN, message: '请输入 7-20 位负责人电话' },
                ]}
              >
                <Input allowClear placeholder="请输入负责人电话" />
              </Form.Item>
            </div>
          ) : (
            <div className={styles.capabilitySections}>
              {CAPABILITY_SECTIONS.map((section) => (
                <Card key={section.title} className={styles.capabilityCard}>
                  <Typography.Title heading={6} className={styles.sectionTitle}>
                    {section.title}
                  </Typography.Title>
                  <div className={styles.capabilityGrid}>
                    {section.items.map((item) => (
                      <div key={item.key} className={styles.capabilityRow}>
                        <div className={styles.capabilityMeta}>
                          <Typography.Text className={styles.capabilityName}>
                            {item.title}
                          </Typography.Text>
                          <Typography.Text
                            type="secondary"
                            className={styles.capabilityDescription}
                          >
                            {item.description}
                          </Typography.Text>
                        </div>
                        <Switch
                          checked={capabilities[item.key]}
                          checkedText="开启"
                          uncheckedText="关闭"
                          onChange={(checked) => updateCapability(item.key, checked)}
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Form>

        <div className={styles.footerActions}>
          {currentStep === 0 ? (
            <>
              <Button onClick={handleCancel}>取消</Button>
              <Button type="primary" onClick={handleNextStep}>
                下一步
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handlePrevStep}>上一步</Button>
              <Button onClick={handleCancel}>取消</Button>
              <Button type="primary" onClick={handleSubmit}>
                提交
              </Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

export default EnterpriseOrganizationCreatePage;
