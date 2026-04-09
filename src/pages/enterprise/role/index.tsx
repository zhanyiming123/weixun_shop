import React from 'react';
import StarterPage from '@/components/StarterPage';

function EnterpriseRolePage() {
  return (
    <StarterPage
      badge="企业管理"
      title="角色管理"
      description="沉淀岗位角色与权限模型，为菜单、按钮和数据范围控制提供统一授权入口。"
      summaries={[
        {
          label: '管理重点',
          value: '角色模型',
          helper: '支持按岗位、组织或业务场景拆分角色',
        },
        {
          label: '核心对象',
          value: '权限分配',
          helper: '便于后续扩展菜单、接口和数据权限点',
        },
        {
          label: '联动范围',
          value: '员工授权',
          helper: '支持角色与员工账号建立稳定映射关系',
        },
      ]}
      modules={['角色列表维护', '权限点扩展', '授权关系管理']}
      nextSteps={['支持角色复制', '补充数据权限模板', '接入授权变更记录']}
    />
  );
}

export default EnterpriseRolePage;
