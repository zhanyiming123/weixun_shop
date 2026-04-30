# 店铺渠道配置单一配置收敛设计

## 目标

将商品创建页中的“店铺渠道配置”从多规则模型收敛为单一配置模型，满足以下要求：

- 页面不再展示“规则配置”卡片、规则标题、规则新增/删除入口
- 页面仅保留“生效商品池”和对应“门店配置项”
- 底层数据模型不再保留多规则能力
- 读取历史商品数据时兼容旧的 `storeChannelRules` 数组结构

## 方案

### 数据模型

- 新增单对象字段 `storeChannelConfig`
- `storeChannelConfig` 仅保留本次页面仍需使用的配置：
  - `shareMode`
  - `storeScope`
  - `storeIds`
  - `productPoolStoreConfigs`
- 删除当前规则模型中的以下能力：
  - `fieldKeys`
  - `skuScope`
  - `skuIds / skuKeys`
  - `skuConfigs`
  - 多规则 `id`

### 创建页状态

- 创建页草稿状态由 `storeChannelRules[]` 改为单个 `storeChannelConfigDraft`
- 与规则卡片绑定的状态一并删除：
  - 当前激活规则 id
  - 新增规则
  - 删除规则
  - 规则级字段选择
  - 规则级 SKU 选择
  - 规格建议区间编辑
- “选择在售门店”和“选择店铺”弹窗继续复用，改为直接读写单个配置草稿

### 提交与校验

- 提交 payload 输出单个 `storeChannelConfig`
- `shareTargets` 继续根据单个配置展开
- 保留以下校验：
  - 渠道开启时，商品池模式至少选择 1 家可售门店
  - 共享池指定门店模式下必须选择门店
- 删除仅为多规则存在的校验：
  - 至少保留 1 条规则
  - 同店铺同 SKU 命中多条规则
  - 同店铺分享模式冲突
  - 同门店自助售价授权跨规则冲突

### 兼容迁移

- 产品读取链路优先读取 `storeChannelConfig`
- 若不存在 `storeChannelConfig`，则回退读取 `storeChannelRules[0]`
- 旧规则中已下线的字段只做忽略，不再向新模型透传
- 商品创建页回填时统一消费归一化后的单对象配置

## 验证

- 创建页开启店铺渠道后，只展示一块单一配置区域
- 页面中不再出现“规则1”“新增规则”“删除”等文案和入口
- 保存后的商品数据写入 `storeChannelConfig`，不再写入 `storeChannelRules`
- 历史商品仅存在 `storeChannelRules` 时，页面仍能正确回填第一条配置
- 商品池模式和共享池模式的门店选择逻辑保持可用
