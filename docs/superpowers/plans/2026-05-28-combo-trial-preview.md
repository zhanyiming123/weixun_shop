# Combo Trial Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在组合商品配置卡片中新增“组合试算”按钮，用弹窗展示“两组选 1 份”场景下的全部可售组合及组合总价。

**Architecture:** 先在 `combo-product-config-card.utils.ts` 中新增一个纯函数，负责校验试算前提、过滤上架子商品并枚举两两组合；再由 `combo-product-config-card.tsx` 复用这个结果渲染弹窗，避免把试算逻辑散落在组件里。测试先锁定纯逻辑，再补组件级最小回归，保持外科手术式改动。

**Tech Stack:** React 17, TypeScript, Arco Design, Vitest

---

### Task 1: 补组合试算纯逻辑与失败测试

**Files:**
- Modify: `src/pages/product/components/combo-product-config-card.utils.ts`
- Modify: `src/pages/product/components/combo-product-config-card.utils.test.ts`

- [ ] **Step 1: 写失败测试，定义两组选 1 份时会枚举全部上架组合**

```ts
expect(
  buildComboTrialResult(
    [
      {
        id: 'option_1',
        title: '选项1',
        required: true,
        selectionLimit: 1,
        items: [
          {
            productId: 'product_1',
            skuId: 'sku_1',
            comboPrice: 100,
            quantity: 1,
            required: true,
            listed: true,
          },
          {
            productId: 'product_2',
            skuId: 'sku_2',
            comboPrice: 200,
            quantity: 1,
            required: false,
            listed: true,
          },
        ],
      },
      {
        id: 'option_2',
        title: '选项2',
        required: true,
        selectionLimit: 1,
        items: [
          {
            productId: 'product_3',
            skuId: 'sku_3',
            comboPrice: 50,
            quantity: 2,
            required: false,
            listed: true,
          },
        ],
      },
    ],
    productLookup
  ).rows.map((row) => row.totalPrice)
).toEqual([200, 300]);
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm run test:unit -- src/pages/product/components/combo-product-config-card.utils.test.ts`
Expected: FAIL，提示缺少 `buildComboTrialResult` 或断言不成立

- [ ] **Step 3: 实现最小试算逻辑与边界校验**

```ts
if (options.length !== 2) {
  return { supported: false, reason: '当前仅支持 2 个选项卡试算', rows: [] };
}
```

- [ ] **Step 4: 重新运行测试确认通过**

Run: `npm run test:unit -- src/pages/product/components/combo-product-config-card.utils.test.ts`
Expected: PASS

### Task 2: 接入按钮、弹窗与结果展示

**Files:**
- Modify: `src/pages/product/components/combo-product-config-card.tsx`
- Modify: `src/pages/product/components/combo-product-config-card.module.less`
- Test: `src/pages/product/components/combo-product-config-card.utils.test.ts`

- [ ] **Step 1: 先补失败测试，定义不可试算与过滤下架商品的返回值**

```ts
expect(
  buildComboTrialResult(
    [
      {
        id: 'option_1',
        title: '选项1',
        required: true,
        selectionLimit: 2,
        items: [],
      },
      {
        id: 'option_2',
        title: '选项2',
        required: true,
        selectionLimit: 1,
        items: [],
      },
    ],
    productLookup
  )
).toEqual({
  supported: false,
  reason: '当前仅支持每个选项卡选择 1 份的试算',
  rows: [],
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm run test:unit -- src/pages/product/components/combo-product-config-card.utils.test.ts`
Expected: FAIL，提示新增边界断言不成立

- [ ] **Step 3: 在卡片底部接入按钮与弹窗，并展示试算结果**

```tsx
<Button type="outline" onClick={() => setTrialVisible(true)}>
  组合试算
</Button>
```

- [ ] **Step 4: 重新运行测试确认通过**

Run: `npm run test:unit -- src/pages/product/components/combo-product-config-card.utils.test.ts`
Expected: PASS

### Task 3: 整体验证

**Files:**
- Modify: `src/pages/product/components/combo-product-config-card.tsx`
- Modify: `src/pages/product/components/combo-product-config-card.module.less`
- Modify: `src/pages/product/components/combo-product-config-card.utils.ts`
- Modify: `src/pages/product/components/combo-product-config-card.utils.test.ts`

- [ ] **Step 1: 运行本次相关单测**

Run: `npm run test:unit -- src/pages/product/components/combo-product-config-card.utils.test.ts`
Expected: PASS

- [ ] **Step 2: 运行类型检查**

Run: `npm run typecheck`
Expected: PASS
