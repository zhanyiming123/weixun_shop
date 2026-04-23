import { EnterpriseRoleDataViewScope } from '@/pages/enterprise/role/data';
import { EmployeeItem } from '@/pages/enterprise/employee/data';
import { buildEnterpriseDepartmentTree, EnterpriseDepartmentTreeNode } from '@/pages/enterprise/department/data';
import { readPersistentValue, writePersistentValue } from '@/utils/usePersistentState';

const DEPT_STORE_ASSIGNMENT_KEY = 'department-store-assignments-v1';

export function readDeptStoreAssignments(): Record<string, string[]> {
  const value = readPersistentValue<Record<string, string[]>>(DEPT_STORE_ASSIGNMENT_KEY, {});
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {};
}

export function writeDeptStoreAssignments(assignments: Record<string, string[]>): void {
  writePersistentValue(DEPT_STORE_ASSIGNMENT_KEY, assignments);
}

export type ResolutionParams = {
    currentUserId: string;
    currentDepartmentId: string | null;
    viewScope: EnterpriseRoleDataViewScope;
    allEmployees: EmployeeItem[];
    customVisibleEmployeeIds: string[];
    scope: 'headquarter' | 'store';
    storeId?: string;
};

export function resolveVisibleEmployeeIds(params: ResolutionParams): string[] {
    const {
        currentUserId,
        currentDepartmentId,
        viewScope,
        allEmployees,
        customVisibleEmployeeIds,
        scope,
        storeId,
    } = params;

    if (viewScope === 'self') {
        return [currentUserId];
    }

    if (viewScope === 'all') {
        return allEmployees.map((e) => e.id);
    }

    if (viewScope === 'custom_employee') {
        // Return self plus custom designated employees
        const visibleSet = new Set(customVisibleEmployeeIds);
        visibleSet.add(currentUserId);
        return Array.from(visibleSet);
    }

    // viewScope === 'department'
    // If no department is set for current user, fallback to self
    if (!currentDepartmentId) {
        return [currentUserId];
    }

    const deptTree = buildEnterpriseDepartmentTree(scope, storeId);
    const visibleDeptIds = collectDeptAndDescendants(currentDepartmentId, deptTree);

    return allEmployees
        .filter((e) => e.departmentId && visibleDeptIds.has(e.departmentId))
        .map((e) => e.id);
}

function collectDeptAndDescendants(
    targetId: string,
    tree: EnterpriseDepartmentTreeNode[],
    result = new Set<string>()
): Set<string> {
    for (const node of tree) {
        if (node.key === targetId || result.has(node.key)) {
            result.add(node.key);
            if (node.children) {
                collectDeptAndDescendants(targetId, node.children, result);
            }
        } else if (node.children) {
            collectDeptAndDescendants(targetId, node.children, result);
        }
    }
    return result;
}
