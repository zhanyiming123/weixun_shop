import React, { useEffect } from 'react';
import { Button, Form, Input, Modal } from '@arco-design/web-react';
import { OrganizationItem } from '@/pages/enterprise/organization/data';
import styles from './store-form-modal.module.less';
import {
  MerchantStoreFormValues,
  MerchantStoreModalMode,
  buildMerchantStoreFormValues,
} from './store-modal-utils';

const { useForm } = Form;

const PHONE_PATTERN = /^[\d-]{7,20}$/;
const STORE_FORM_LAYOUT = {
  layout: 'horizontal' as const,
  labelCol: { flex: '120px' },
  wrapperCol: { flex: '1' },
};

type MerchantStoreFormModalProps = {
  visible: boolean;
  mode: MerchantStoreModalMode;
  organization?: OrganizationItem | null;
  onCancel: () => void;
  onSubmit: (values: MerchantStoreFormValues) => void;
};

function MerchantStoreFormModal({
  visible,
  mode,
  organization,
  onCancel,
  onSubmit,
}: MerchantStoreFormModalProps) {
  const [form] = useForm<MerchantStoreFormValues>();
  const isEditMode = mode === 'edit';

  useEffect(() => {
    if (!visible) {
      return;
    }

    form.resetFields();
    form.setFieldsValue(buildMerchantStoreFormValues(organization));
  }, [form, organization, visible]);

  async function handleConfirm() {
    const values = await form.validate();
    onSubmit(values);
  }

  return (
    <Modal
      title={isEditMode ? '编辑店铺' : '新增店铺'}
      visible={visible}
      style={{ width: 720 }}
      unmountOnExit
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
        <Button key="submit" type="primary" onClick={handleConfirm}>
          {isEditMode ? '保存' : '提交'}
        </Button>,
      ]}
      onCancel={onCancel}
    >
      <Form form={form} {...STORE_FORM_LAYOUT} className={styles.modalForm}>
        <Form.Item
          field="name"
          label="店铺名称"
          rules={[{ required: true, message: '请输入店铺名称' }]}
        >
          <Input allowClear placeholder="请输入店铺名称" />
        </Form.Item>

        {isEditMode && (
          <Form.Item field="code" label="店铺编号">
            <Input readOnly />
          </Form.Item>
        )}

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
          label="联系地址"
          rules={[{ required: true, message: '请输入联系地址' }]}
        >
          <Input.TextArea
            autoSize={{ minRows: 2, maxRows: 4 }}
            placeholder="请输入经营联系地址"
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
      </Form>
    </Modal>
  );
}

export default MerchantStoreFormModal;
