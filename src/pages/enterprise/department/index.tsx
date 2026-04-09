import React from 'react';
import StarterPage from '@/components/StarterPage';

function EnterpriseDepartmentPage() {
  return (
    <StarterPage
      badge="企业管理"
      title="部门管理"
      description="按组织机构维护部门信息、岗位职责和人员编制，沉淀清晰的内部协作关系。"
      summaries={[
        {
          label: '管理重点',
          value: '部门信息',
          helper: '覆盖部门名称、编号、归属机构和负责人',
        },
        {
          label: '核心对象',
          value: '职责分工',
          helper: '便于后续接入审批流、绩效和数据看板',
        },
        {
          label: '联动范围',
          value: '员工配置',
          helper: '为员工入转调离和角色分配提供组织归属',
        },
      ]}
      modules={['部门列表维护', '部门负责人设置', '部门编制扩展']}
      nextSteps={['支持部门排序', '补充跨部门协同标识', '接入审批流配置']}
    />
  );
}

export default EnterpriseDepartmentPage;
