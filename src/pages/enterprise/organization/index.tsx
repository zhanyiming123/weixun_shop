import React from 'react';
import StarterPage from '@/components/StarterPage';

function EnterpriseOrganizationPage() {
  return (
    <StarterPage
      badge="企业管理"
      title="组织机构"
      description="统一维护企业组织架构、上下级关系和业务归属，为部门、员工与角色数据提供基础结构。"
      summaries={[
        {
          label: '管理重点',
          value: '组织架构',
          helper: '支持总部、区域、直营网点等层级规划',
        },
        {
          label: '核心对象',
          value: '机构节点',
          helper: '可扩展组织编码、负责人和启停用状态',
        },
        {
          label: '联动范围',
          value: '多模块',
          helper: '为部门、员工和权限配置提供归属关系',
        },
      ]}
      modules={['组织树维护', '机构负责人配置', '机构状态管理']}
      nextSteps={['支持拖拽调整层级', '补充机构编码规则', '接入数据权限范围']}
    />
  );
}

export default EnterpriseOrganizationPage;
