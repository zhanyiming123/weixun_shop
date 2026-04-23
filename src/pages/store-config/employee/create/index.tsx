import React from 'react';
import { Button, Card, Empty } from '@arco-design/web-react';
import { useHistory } from 'react-router-dom';

function StoreEmployeeCreatePage() {
  const history = useHistory();

  return (
    <Card>
      <Empty description="门店员工来自组织架构引用，当前不支持手工新建。" />
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
        <Button type="primary" onClick={() => history.push('/store-config/org-reference')}>
          去组织架构引用
        </Button>
      </div>
    </Card>
  );
}

export default StoreEmployeeCreatePage;
