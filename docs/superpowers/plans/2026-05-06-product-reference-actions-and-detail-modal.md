# Product Reference Actions And Detail Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让引用商品在列表主操作区可直接设置可售/不可售，并将商品详情弹窗按“添加商品”的四个模块重组展示。

**Architecture:** 保持现有商品列表和详情抽屉结构不变，只抽出最小的辅助函数来稳定操作排序和详情数据分组。详情弹窗继续复用现有商品领域数据，避免把创建页表单状态直接耦合进只读弹窗。

**Tech Stack:** React 17, TypeScript, Arco Design, Vitest

---

### Task 1: 固化列表操作优先级

**Files:**
- Modify: `src/pages/product/list/index.tsx`
- Modify: `src/pages/product/combo/index.tsx`
- Create: `src/pages/product/row-actions.ts`
- Test: `src/pages/product/row-actions.test.ts`

- [ ] **Step 1: 写失败测试，定义引用商品的主操作应包含可售状态动作**

```ts
expect(getPrimaryProductRowActionKeys({
  isShared: true,
  canManageStoreSettings: true,
  currentStoreId: 'mall_online',
})).toContain('sell-status');
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm run test:unit -- src/pages/product/row-actions.test.ts`
Expected: FAIL，提示缺少 `getPrimaryProductRowActionKeys` 或断言不成立

- [ ] **Step 3: 实现最小辅助函数并接入两个列表页**

```ts
const sharedPrimaryKeys = ['detail', 'sell-status', 'channel-status'];
```

- [ ] **Step 4: 重新运行测试确认通过**

Run: `npm run test:unit -- src/pages/product/row-actions.test.ts`
Expected: PASS

### Task 2: 详情弹窗按四个模块重组

**Files:**
- Modify: `src/pages/product/components/product-detail.ts`
- Modify: `src/pages/product/components/product-detail-modal.tsx`
- Modify: `src/pages/product/components/product-detail-modal.module.less`
- Test: `src/pages/product/components/product-detail.test.ts`

- [ ] **Step 1: 写失败测试，定义详情弹窗分组数据**

```ts
expect(buildProductDetailSections(product).map((item) => item.key)).toEqual([
  'basic',
  'spec',
  'detail-page',
  'store-channel',
]);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm run test:unit -- src/pages/product/components/product-detail.test.ts`
Expected: FAIL，提示缺少 `buildProductDetailSections`

- [ ] **Step 3: 实现只读详情分组，并让弹窗按四块渲染**

```ts
{
  key: 'store-channel',
  title: '店铺渠道配置',
}
```

- [ ] **Step 4: 重新运行测试确认通过**

Run: `npm run test:unit -- src/pages/product/components/product-detail.test.ts`
Expected: PASS

### Task 3: 回归验证

**Files:**
- Modify: `src/pages/product/list/index.tsx`
- Modify: `src/pages/product/combo/index.tsx`
- Modify: `src/pages/product/components/product-detail-modal.tsx`

- [ ] **Step 1: 运行本次相关单测**

Run: `npm run test:unit -- src/pages/product/row-actions.test.ts src/pages/product/components/product-detail.test.ts`
Expected: PASS

- [ ] **Step 2: 运行类型检查**

Run: `npm run typecheck`
Expected: PASS
