import { DemoSystemId } from '@/utils/demo';

const STORE_SYSTEM_HIDDEN_ROW_ACTION_LABELS = ['移除'] as const;

export function isStoreEmployeeCreateActionVisible(
  currentDemoSystem?: DemoSystemId
) {
  return currentDemoSystem !== 'store';
}

export function isStoreEmployeeRowActionVisible(
  actionLabel: string,
  currentDemoSystem?: DemoSystemId
) {
  if (currentDemoSystem !== 'store') {
    return true;
  }

  return !STORE_SYSTEM_HIDDEN_ROW_ACTION_LABELS.includes(
    actionLabel as (typeof STORE_SYSTEM_HIDDEN_ROW_ACTION_LABELS)[number]
  );
}
