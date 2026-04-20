# 数据库性能分析报告

## 数据库结构分析

### 表结构概览

- **users**: 用户表
- **subscriptions**: 订阅表
- **sessions**: 会话表
- **entitlements**: 权限表
- **worlds**: 世界表
- **books**: 作品表
- **entities**: 实体表
- **book_entity_usages**: 作品实体使用表
- **entity_relations**: 实体关系表
- **timeline_events**: 时间轴事件表
- **captures**: 灵感捕获表

## 性能问题分析

### 1. 索引缺失

| 表名 | 字段 | 建议索引 | 原因 |
|------|------|---------|------|
| worlds | userId | 普通索引 | 频繁按用户查询世界列表 |
| entities | worldId | 普通索引 | 频繁按世界查询实体列表 |
| entities | type | 普通索引 | 频繁按类型筛选实体 |
| entity_relations | fromEntityId, toEntityId | 普通索引 | 频繁查询实体关系 |
| captures | userId | 普通索引 | 频繁按用户查询捕获列表 |
| captures | entityId | 普通索引 | 可能按实体查询捕获 |
| timeline_events | worldId, entityId | 普通索引 | 频繁按世界和实体查询事件 |

### 2. 查询优化

#### 2.1 N+1 查询问题

- **getWorldById** 函数：一次性加载书籍和实体，可能导致大数据量时性能下降
- **getEntitiesByWorld** 函数：加载实体时同时加载使用情况，可能导致N+1查询

#### 2.2 复杂查询

- **searchEntities** 函数：标签查询使用 `contains`，在大数据量时性能较差
- **getEntityById** 函数：加载大量关联数据，可能影响性能

#### 2.3 重复查询

- 多个服务中存在重复的世界归属验证查询

### 3. 缓存机会

- 世界统计信息可以缓存
- 实体列表可以缓存
- 常用的查询结果可以缓存
- 用户信息和权限信息可以缓存

## 优化建议

### 1. 添加索引

在 `prisma/schema.prisma` 文件中为相关字段添加索引：

```prisma
model World {
  // 现有字段
  
  @@index([userId])
}

model Entity {
  // 现有字段
  
  @@index([worldId])
  @@index([type])
}

model EntityRelation {
  // 现有字段
  
  @@index([fromEntityId])
  @@index([toEntityId])
}

model Capture {
  // 现有字段
  
  @@index([userId])
  @@index([entityId])
}

model TimelineEvent {
  // 现有字段
  
  @@index([worldId])
  @@index([entityId])
}
```

### 2. 查询优化

#### 2.1 批量查询

- 使用 `select` 而非 `include` 只获取需要的字段
- 对于复杂关联查询，考虑使用分步查询

#### 2.2 标签查询优化

- 考虑将标签存储为单独的表，使用多对多关系
- 或使用全文搜索索引

#### 2.3 缓存策略

- 为频繁访问的数据添加缓存
- 使用 Redis 或内存缓存

### 3. 代码优化

#### 3.1 避免重复查询

- 创建共用的验证函数
- 使用事务确保数据一致性

#### 3.2 分页查询

- 对列表查询添加分页支持
- 避免一次性加载大量数据

## 执行计划

1. **添加索引**：更新 Prisma schema 文件，添加必要的索引
2. **优化查询**：修改服务层代码，优化查询逻辑
3. **添加缓存**：为频繁访问的数据添加缓存
4. **测试验证**：运行性能测试，验证优化效果

## 预期效果

- 提升查询性能，特别是在大数据量时
- 减少数据库负载
- 提高API响应速度
- 改善用户体验
