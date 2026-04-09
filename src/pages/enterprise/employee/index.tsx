import React from 'react';
import StarterPage from '@/components/StarterPage';

function EnterpriseEmployeePage() {
  return (
    <StarterPage
      badge="企业管理"
      title="员工管理"
      description="维护员工档案、任职信息和账号状态，支持企业内部人员的全生命周期管理。"
      summaries={[
        {
          label: '管理重点',
          value: '员工档案',
          helper: '沉淀基础信息、岗位、部门和联系方式',
        },
        {
          label: '核心对象',
          value: '任职状态',
          helper: '支持在职、试用、离职等状态扩展',
        },
        {
          label: '联动范围',
          value: '账号权限',
          helper: '可继续接入登录账号、角色和数据权限绑定',
        },
      ]}
      modules={['员工列表维护', '入转调离记录', '账号启停用管理']}
      nextSteps={['支持批量导入导出', '补充员工标签体系', '接入审批和通知能力']}
    />
  );
}

export default EnterpriseEmployeePage;
