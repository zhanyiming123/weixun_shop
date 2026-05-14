import { describe, expect, it } from 'vitest';
import {
  appendDataPermissionModule,
  createDataPermissionModule,
  createDefaultDataPermissionSystems,
  filterDataPermissionSystems,
  findDataPermissionSystemById,
  toggleDataPermissionModuleStatus,
  updateDataPermissionModule,
} from './data';

describe('merchant data permission module config data', () => {
  it('returns the two expected systems in display order', () => {
    const systems = createDefaultDataPermissionSystems();

    expect(systems.map((item) => item.name)).toEqual([
      '电商管理工作台',
      '店铺运营工作台',
    ]);
  });

  it('keeps modules on the default selected system', () => {
    const systems = createDefaultDataPermissionSystems();

    expect(systems[0].modules.length).toBeGreaterThan(0);
  });

  it('appends a new module into the selected system', () => {
    const systems = createDefaultDataPermissionSystems();
    const moduleItem = createDataPermissionModule(
      {
        name: '商品分析',
        description: '',
        permissionCode: 'goods_analysis',
        status: 'enabled',
      },
      new Date(2026, 4, 14, 10, 30)
    );

    const nextSystems = appendDataPermissionModule(
      systems,
      'system_merchant_workbench',
      moduleItem
    );

    expect(
      findDataPermissionSystemById(
        nextSystems,
        'system_merchant_workbench'
      )?.modules.some((item) => item.id === moduleItem.id)
    ).toBe(true);
  });

  it('updates module fields while keeping id and created time', () => {
    const systems = createDefaultDataPermissionSystems();
    const targetItem = systems[0].modules[0];
    const nextSystems = updateDataPermissionModule(
      systems,
      'system_merchant_workbench',
      targetItem.id,
      {
        name: '商品总库',
        description: '覆盖所有商品主数据',
        permissionCode: 'goods_center',
        status: 'disabled',
      }
    );
    const updatedItem = findDataPermissionSystemById(
      nextSystems,
      'system_merchant_workbench'
    )?.modules.find((item) => item.id === targetItem.id);

    expect(updatedItem?.id).toBe(targetItem.id);
    expect(updatedItem?.createdAt).toBe(targetItem.createdAt);
    expect(updatedItem?.name).toBe('商品总库');
    expect(updatedItem?.status).toBe('disabled');
  });

  it('toggles module status between enabled and disabled', () => {
    const systems = createDefaultDataPermissionSystems();
    const targetItem = systems[1].modules[1];
    const nextSystems = toggleDataPermissionModuleStatus(
      systems,
      'system_store_workbench',
      targetItem.id
    );
    const updatedItem = findDataPermissionSystemById(
      nextSystems,
      'system_store_workbench'
    )?.modules.find((item) => item.id === targetItem.id);

    expect(updatedItem?.status).toBe('enabled');
  });

  it('filters systems by system name keyword', () => {
    const systems = createDefaultDataPermissionSystems();

    expect(filterDataPermissionSystems(systems, '店铺').map((item) => item.name)).toEqual([
      '店铺运营工作台',
    ]);
  });
});
