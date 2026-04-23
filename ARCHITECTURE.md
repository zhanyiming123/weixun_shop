# ARCHITECTURE.md

系统架构总览。详细设计见 `docs/design-docs/`，前端约定见 `docs/FRONTEND.md`。

## 技术栈

| 层次 | 技术 |
|------|------|
| 框架 | Next.js 15 (App Router) + TypeScript |
| 数据库 | PostgreSQL + Prisma ORM |
| 认证 | JWT (jose) |
| 支付 | Stripe |
| 部署 | Nixpacks（见 `docs/references/nixpacks-llms.txt`） |

## 分层架构

```
Types → Config → Repositories → Services → Runtime(API) → UI
```

每层只能向下依赖，禁止跨层跳跃。详细规则见 `docs/DESIGN.md`。

```
┌─────────────────────────────────────────┐
│  Layer 6: UI                             │
│  src/components/ + src/app/(pages)/      │
├─────────────────────────────────────────┤
│  Layer 5: Runtime / API Routes           │
│  src/app/api/                            │
├─────────────────────────────────────────┤
│  Layer 4: Services                       │
│  src/services/                           │
├─────────────────────────────────────────┤
│  Layer 3: Repositories                   │
│  src/repositories/                       │
├─────────────────────────────────────────┤
│  Layer 2: Config                         │
│  src/config/                             │
├─────────────────────────────────────────┤
│  Layer 1: Types                          │
│  src/types/  （零依赖）                   │
└─────────────────────────────────────────┘
```

## 多租户设计

所有核心表含 `tenantId`，Repository 层强制注入租户过滤，禁止跨租户查询。

## 数据库 Schema

自动生成文档见 `docs/generated/db-schema.md`。
