# Store Channel Single Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将店铺渠道配置从多规则数组收敛为单一配置对象，并兼容读取历史 `storeChannelRules` 数据。

**Architecture:** 先在产品领域模型与归一化层引入 `storeChannelConfig`，同时提供从旧 `storeChannelRules[0]` 到新对象的兼容转换。再把创建页 helper 和页面状态从 `rules[]` 改为单个草稿对象，最后删除规则卡片相关 UI，仅保留“生效商品池”和门店配置。

**Tech Stack:** TypeScript, React, Next.js page module, Vitest

---

### Task 1: 收敛产品类型与归一化兼容

**Files:**
- Modify: `src/types/product.ts`
- Modify: `src/pages/product/list/data.ts`
- Modify: `src/lib/product.ts`
- Modify: `src/repositories/ProductRepository.ts`
- Test: `src/lib/product.test.ts`

- [ ] **Step 1: 先写归一化兼容测试**

```ts
it('normalizes single store channel config from legacy rules', () => {
  const product = createBaseProduct({
    storeChannelRules: [
      {
        id: 'rule_1',
        storeScope: 'specificStores',
        storeIds: ['store_target'],
        shareMode: 'product_pool',
        skuScope: 'allSkus',
        skuIds: [],
        fieldKeys: ['productPrice'],
        skuConfigs: [],
      },
    ],
  });

  expect(getProductStoreChannelConfig(product)).toEqual({
    shareMode: 'product_pool',
    storeScope: 'specificStores',
    storeIds: ['store_target'],
    productPoolStoreConfigs: [],
  });
});
```

- [ ] **Step 2: 跑测试确认旧 helper 还不满足新断言**

Run: `pnpm vitest src/lib/product.test.ts -t "normalizes single store channel config from legacy rules"`

Expected: FAIL，提示 `getProductStoreChannelConfig` 不存在或返回结构不匹配

- [ ] **Step 3: 实现单对象类型与兼容归一化**

```ts
export type ProductStoreChannelConfigItem = {
  shareMode: ProductStoreChannelShareMode;
  storeScope: ProductStoreChannelStoreScope;
  storeIds: string[];
  productPoolStoreConfigs?: ProductStoreChannelProductPoolStoreConfigItem[];
};

export function normalizeProductStoreChannelConfig(
  config?: ProductStoreChannelConfigItem,
  legacyRules?: ProductStoreChannelRuleItem[],
  skus: Array<{ id: string }> = [],
  storeIds: string[] = []
) {
  const legacyRule = Array.isArray(legacyRules) ? legacyRules[0] : undefined;
  const rawConfig = config || convertLegacyRuleToStoreChannelConfig(legacyRule, skus);
  return normalizeSingleStoreChannelConfig(rawConfig, skus, storeIds);
}
```

- [ ] **Step 4: 更新当前 SKU 视图改为不再读取规则建议区间**

```ts
return {
  ...skuView,
  minIndependentPrice: skuPriceRule?.minPrice,
  maxIndependentPrice: skuPriceRule?.maxPrice,
  minIndependentStock: skuStockRule?.minStock,
  maxIndependentStock: skuStockRule?.maxStock,
};
```

- [ ] **Step 5: 运行相关测试**

Run: `pnpm vitest src/lib/product.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/product.ts src/pages/product/list/data.ts src/lib/product.ts src/repositories/ProductRepository.ts src/lib/product.test.ts
git commit -m "refactor: normalize store channel as single config"
```

### Task 2: 收敛创建页 store-channel helper

**Files:**
- Modify: `src/pages/product/create/store-channel.ts`
- Modify: `src/pages/product/create/store-channel.test.ts`

- [ ] **Step 1: 先写 helper 测试，定义单对象草稿与 payload**

```ts
it('creates default single store channel config draft', () => {
  expect(createEmptyStoreChannelConfig()).toEqual({
    shareMode: 'product_pool',
    storeScope: 'allStores',
    storeIds: [],
    productPoolStoreConfigs: [],
  });
});

it('maps store channel config and share targets when channel is on', () => {
  expect(result.storeChannelConfig).toEqual({
    shareMode: 'product_pool',
    storeScope: 'specificStores',
    storeIds: ['store_guangzhou'],
    productPoolStoreConfigs: [
      {
        storeId: 'store_guangzhou',
        sellStatus: 'sellable',
        sellableSkuIds: ['sku-product_1-1'],
        allowSelfPrice: true,
      },
    ],
  });
});
```

- [ ] **Step 2: 跑测试确认旧 helper 仍返回 `storeChannelRules`**

Run: `pnpm vitest src/pages/product/create/store-channel.test.ts`

Expected: FAIL，提示导出名称或断言结构不匹配

- [ ] **Step 3: 用单个配置草稿替代多规则 helper**

```ts
export type StoreChannelConfigDraftItem = {
  shareMode: ProductStoreChannelShareMode;
  storeScope: ProductStoreChannelStoreScope;
  storeIds: string[];
  productPoolStoreConfigs: StoreChannelProductPoolStoreConfigDraftItem[];
};

export function syncStoreChannelConfigDraft(
  previous: StoreChannelConfigDraftItem,
  skuKeys: string[],
  targetStoreIds: string[] = []
) {
  return {
    ...previous,
    storeIds: uniqueStringArray(previous.storeIds),
    productPoolStoreConfigs: normalizeProductPoolStoreConfigs(
      previous.productPoolStoreConfigs,
      targetStoreIds,
      uniqueStringArray(skuKeys)
    ),
  };
}
```

- [ ] **Step 4: 更新校验与 payload 只面向单个配置**

```ts
if (config.shareMode === 'shared_pool' && config.storeScope === 'specificStores' && !config.storeIds.length) {
  return '请选择店铺';
}

return {
  skus,
  storeChannelConfig: expandedConfig.storeChannelConfig,
  shareTargets,
  independentPriceRule: { enabled: false, skuRules: [] },
  independentStockRule: { enabled: false, skuRules: [] },
};
```

- [ ] **Step 5: 运行 helper 测试**

Run: `pnpm vitest src/pages/product/create/store-channel.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/product/create/store-channel.ts src/pages/product/create/store-channel.test.ts
git commit -m "refactor: simplify store channel create helpers"
```

### Task 3: 收敛创建页状态与 UI

**Files:**
- Modify: `src/pages/product/create/index.tsx`
- Modify: `src/pages/product/create/index.module.less`

- [ ] **Step 1: 先写最小页面行为断言或静态检查点**

```ts
// 无页面测试时，用代码检查点替代：
// - 页面 state 不再持有 storeChannelRules / activeStoreChannelRuleId
// - JSX 中不再出现 “规则1”“新增规则”“选择自定义字段”“选择SKU”
```

- [ ] **Step 2: 实施页面状态替换**

```ts
const [storeChannelConfigDraft, setStoreChannelConfigDraft] =
  useState<StoreChannelConfigDraftItem>(createEmptyStoreChannelConfig());

function patchStoreChannelConfig(patch: Partial<StoreChannelConfigDraftItem>) {
  setStoreChannelConfigDraft((previous) =>
    syncStoreChannelConfigDraft(
      { ...previous, ...patch },
      specMode === 'single' ? [STORE_CHANNEL_SINGLE_SKU_KEY] : specItems.map((item) => String(item.id)),
      storeChannelTargetStoreIds
    )
  );
}
```

- [ ] **Step 3: 删除规则卡片和多余弹窗，保留单块配置 UI**

```tsx
{storeChannelEnabled && (
  <Form.Item className={styles.fullWidth} label="门店配置">
    <div className={styles.storeChannelRuleBody}>
      <div className={styles.storeChannelRuleLine}>...</div>
      <div className={styles.storeChannelRuleLine}>...</div>
    </div>
  </Form.Item>
)}
```

- [ ] **Step 4: 接入新 payload 与旧数据回填**

```ts
const storeChannelPayload = buildStoreChannelCreateSkuPayload({
  ...,
  config: storeChannelConfigDraft,
});

return {
  ...nextProduct,
  storeChannelConfig: storeChannelPayload.storeChannelConfig,
};
```

- [ ] **Step 5: 运行定向测试与静态检查**

Run: `pnpm vitest src/pages/product/create/store-channel.test.ts src/lib/product.test.ts`

Expected: PASS

Run: `pnpm exec tsc --noEmit`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/product/create/index.tsx src/pages/product/create/index.module.less
git commit -m "refactor: simplify store channel create page"
```
