export type DataPermissionModuleStatus = 'enabled' | 'disabled';

export type DataPermissionModuleDraft = {
  name: string;
  description: string;
  permissionCode: string;
  status: DataPermissionModuleStatus;
};

export type DataPermissionModuleItem = DataPermissionModuleDraft & {
  id: string;
  createdAt: string;
};

export type DataPermissionSystem = {
  id: string;
  name: string;
  modules: DataPermissionModuleItem[];
};

export type MerchantDataPermissionSystemKey = 'merchant' | 'store';

export const DATA_PERMISSION_MODULE_CONFIG_STORAGE_KEY =
  'merchant-data-permission-module-config-systems-v1';

function createModuleItem(
  id: string,
  name: string,
  description: string,
  permissionCode: string,
  status: DataPermissionModuleStatus,
  createdAt: string
): DataPermissionModuleItem {
  return {
    id,
    name,
    description,
    permissionCode,
    status,
    createdAt,
  };
}

function normalizeDraft(
  values: DataPermissionModuleDraft
): DataPermissionModuleDraft {
  return {
    name: values.name.trim(),
    description: values.description.trim(),
    permissionCode: values.permissionCode.trim(),
    status: values.status,
  };
}

function buildModuleId(date: Date) {
  return `module_${date.getTime()}`;
}

export function formatDataPermissionCreatedAt(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function createDefaultDataPermissionSystems(): DataPermissionSystem[] {
  return [
    {
      id: 'system_merchant_workbench',
      name: '电商管理工作台',
      modules: [
        createModuleItem(
          'module_merchant_goods',
          '商品库',
          '',
          'goods',
          'enabled',
          '2026-05-19 18:30'
        ),
        createModuleItem(
          'module_merchant_multi_goods',
          '组合商品',
          '',
          'multi_goods',
          'enabled',
          '2026-05-19 18:30'
        ),
      ],
    },
    {
      id: 'system_store_workbench',
      name: '店铺运营工作台',
      modules: [
        createModuleItem(
          'module_store_sales_order',
          '销售订单',
          '仅面向门店经营场景',
          'store_sales_order',
          'enabled',
          '2026-05-20 10:15'
        ),
        createModuleItem(
          'module_store_member',
          '门店会员',
          '',
          'store_member',
          'disabled',
          '2026-05-20 11:40'
        ),
      ],
    },
  ];
}

export function getMerchantDataPermissionSystemId(
  system: MerchantDataPermissionSystemKey
) {
  return system === 'merchant'
    ? 'system_merchant_workbench'
    : 'system_store_workbench';
}

export function getDataPermissionModulesByMerchantSystem(
  systems: DataPermissionSystem[],
  system: MerchantDataPermissionSystemKey
) {
  const matchedSystem = systems.find(
    (item) => item.id === getMerchantDataPermissionSystemId(system)
  );

  if (!matchedSystem) {
    return [];
  }

  const enabledModules = matchedSystem.modules.filter((item) => item.status === 'enabled');
  return enabledModules.length ? enabledModules : matchedSystem.modules;
}

export function filterDataPermissionSystems(
  systems: DataPermissionSystem[],
  keyword: string
): DataPermissionSystem[] {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return systems;
  }

  return systems.filter((item) =>
    item.name.toLowerCase().includes(normalizedKeyword)
  );
}

export function findDataPermissionSystemById(
  systems: DataPermissionSystem[],
  systemId: string
): DataPermissionSystem | undefined {
  return systems.find((item) => item.id === systemId);
}

export function createDataPermissionModule(
  values: DataPermissionModuleDraft,
  now: Date = new Date()
): DataPermissionModuleItem {
  return {
    id: buildModuleId(now),
    createdAt: formatDataPermissionCreatedAt(now),
    ...normalizeDraft(values),
  };
}

export function appendDataPermissionModule(
  systems: DataPermissionSystem[],
  systemId: string,
  moduleItem: DataPermissionModuleItem
): DataPermissionSystem[] {
  return systems.map((system) => {
    if (system.id !== systemId) {
      return system;
    }

    return {
      ...system,
      modules: [...system.modules, moduleItem],
    };
  });
}

export function updateDataPermissionModule(
  systems: DataPermissionSystem[],
  systemId: string,
  moduleId: string,
  values: DataPermissionModuleDraft
): DataPermissionSystem[] {
  const normalizedValues = normalizeDraft(values);

  return systems.map((system) => {
    if (system.id !== systemId) {
      return system;
    }

    return {
      ...system,
      modules: system.modules.map((item) => {
        if (item.id !== moduleId) {
          return item;
        }

        return {
          ...item,
          ...normalizedValues,
        };
      }),
    };
  });
}

export function toggleDataPermissionModuleStatus(
  systems: DataPermissionSystem[],
  systemId: string,
  moduleId: string
): DataPermissionSystem[] {
  return systems.map((system) => {
    if (system.id !== systemId) {
      return system;
    }

    return {
      ...system,
      modules: system.modules.map((item) => {
        if (item.id !== moduleId) {
          return item;
        }

        const nextStatus: DataPermissionModuleStatus =
          item.status === 'enabled' ? 'disabled' : 'enabled';

        return {
          ...item,
          status: nextStatus,
        };
      }),
    };
  });
}
