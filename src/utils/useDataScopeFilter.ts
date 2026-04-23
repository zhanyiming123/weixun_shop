import { useCallback } from 'react';
import { resolveVisibleEmployeeIds } from './data-scope';
import { readEnterpriseDepartmentItems, getEnterpriseDepartmentItemsByScope } from '@/pages/enterprise/department/data';
import { readOrganizationItems } from '@/pages/enterprise/organization/data';
import { readEnterpriseRoleItems } from '@/pages/enterprise/role/data';
import { useEnterpriseRoleItems } from '@/pages/enterprise/role/data';
import { readCurrentOrganization } from './organization';
import { readCurrentDemoIdentityId } from './demo';
import { readPersistentValue } from './usePersistentState';
import { EmployeeItem } from '@/pages/enterprise/employee/data';

// Fake backend resolution of the current user based on the Demo
export function getCurrentMockEmployee(): EmployeeItem | null {
    const identity = readCurrentDemoIdentityId();
    // We use DEFAULT_EMPLOYEE_ITEMS indirectly by reading from persistent state to ensure we get the latest
    const employees = readPersistentValue<EmployeeItem[]>('enterprise-employee-items-v1', []);
    if (!employees || employees.length === 0) {
        // If empty, we can just return null. In reality we'd pull DEFAULT_EMPLOYEE_ITEMS, but for a demo this is fine.
        // Given the structure, we can map identities to default ids
    }

    const idMap = {
        merchant_admin: 'employee_4',
        region_admin: 'employee_2',
        store_staff: 'employee_1',
    };

    const targetId = idMap[identity] || 'employee_1';
    return employees.find(e => e.id === targetId) || null;
}

export function filterDataByScope<T>(items: T[], getOwnerId: (item: T) => string): T[] {
    const currentEmployee = getCurrentMockEmployee();
    const currOrg = readCurrentOrganization();

    // If no fake employee found, just return items
    if (!currentEmployee) {
        return items;
    }

    const roles = readPersistentValue<any[]>('enterprise-role-items-v1', []);
    const userRole = roles.find(r => r.id === currentEmployee.roleId);

    if (!userRole) {
        return items;
    }

    const allEmployees = readPersistentValue<EmployeeItem[]>('enterprise-employee-items-v1', []);

    const visibleIds = resolveVisibleEmployeeIds({
        currentUserId: currentEmployee.id,
        currentDepartmentId: currentEmployee.departmentId,
        viewScope: userRole.dataPermissions?.viewScope || 'self',
        allEmployees,
        customVisibleEmployeeIds: currentEmployee.customVisibleEmployeeIds || [],
        scope: currOrg.scope === 'store' ? 'store' : 'headquarter',
        storeId: currOrg.scope === 'store' ? currOrg.id : undefined,
    });

    const idSet = new Set(visibleIds);
    return items.filter(item => {
        const ownerId = getOwnerId(item);
        return !ownerId || idSet.has(ownerId);
    });
}

export function useDataScopeFilter() {
    return useCallback(<T,>(items: T[], getOwnerId: (item: T) => string): T[] => {
        return filterDataByScope(items, getOwnerId);
    }, []);
}
