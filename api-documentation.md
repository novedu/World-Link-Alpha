# World-Link Alpha 接口文档

## 1. 认证相关接口

### 1.1 注册账号
- **接口名称**: REGISTER_WITH_PASSWORD
- **请求参数**:
  - `email`: string - 邮箱地址
  - `password`: string - 密码
- **响应数据**:
  - `success`: boolean - 操作是否成功
  - `session`: object - 会话信息，包含 email 等字段
  - `error`: string - 错误信息（失败时）

### 1.2 登录账号
- **接口名称**: SIGN_IN_WITH_PASSWORD
- **请求参数**:
  - `email`: string - 邮箱地址
  - `password`: string - 密码
- **响应数据**:
  - `success`: boolean - 操作是否成功
  - `session`: object - 会话信息，包含 email 等字段
  - `error`: string - 错误信息（失败时）

### 1.3 退出登录
- **接口名称**: SIGN_OUT
- **请求参数**: 无
- **响应数据**:
  - `success`: boolean - 操作是否成功
  - `error`: string - 错误信息（失败时）

## 2. 世界观管理接口

### 2.1 创建世界观
- **接口名称**: CREATE_WORLD
- **请求参数**:
  - `name`: string - 世界观名称
- **响应数据**:
  - `success`: boolean - 操作是否成功
  - `world`: object - 创建的世界观信息，包含 id, name 等字段
  - `error`: string - 错误信息（失败时）

### 2.2 获取世界观列表
- **接口名称**: GET_WORLDS
- **请求参数**: 无
- **响应数据**:
  - `success`: boolean - 操作是否成功
  - `worlds`: array - 世界观列表，每个元素包含 id, name 等字段
  - `error`: string - 错误信息（失败时）

## 3. 书项目管理接口

### 3.1 创建书项目
- **接口名称**: CREATE_BOOK
- **请求参数**:
  - `worldId`: string - 世界观 ID
  - `title`: string - 书项目标题
- **响应数据**:
  - `success`: boolean - 操作是否成功
  - `book`: object - 创建的书项目信息，包含 id, title, worldId 等字段
  - `error`: string - 错误信息（失败时）

### 3.2 获取书项目列表
- **接口名称**: GET_BOOKS
- **请求参数**:
  - `worldId`: string - 世界观 ID（可选）
- **响应数据**:
  - `success`: boolean - 操作是否成功
  - `books`: array - 书项目列表，每个元素包含 id, title, worldId 等字段
  - `error`: string - 错误信息（失败时）

## 4. 实体管理接口

### 4.1 保存实体（选词保存）
- **接口名称**: SAVE_ENTITY
- **请求参数**:
  - `worldId`: string - 世界观 ID
  - `type`: string - 实体类型（character, location, faction, item, mineral, creature, event, law, other）
  - `name`: string - 实体名称
  - `summary`: string - 实体描述（可选）
  - `tags`: array - 标签列表（可选）
  - `sourceUrl`: string - 来源 URL（可选）
  - `sourceTitle`: string - 来源标题（可选）
  - `selectedText`: string - 选中文本（可选）
  - `selectedBooks`: array - 所属书项目 ID 列表（可选）
- **响应数据**:
  - `success`: boolean - 操作是否成功
  - `entity`: object - 保存的实体信息，包含 id, name, type 等字段
  - `error`: string - 错误信息（失败时）

### 4.2 获取实体列表
- **接口名称**: GET_ENTITIES
- **请求参数**:
  - `worldId`: string - 世界观 ID（可选）
  - `bookId`: string - 书项目 ID（可选）
- **响应数据**:
  - `success`: boolean - 操作是否成功
  - `entities`: array - 实体列表，每个元素包含 id, name, type 等字段
  - `error`: string - 错误信息（失败时）

## 5. 捕获管理接口

### 5.1 获取捕获列表
- **接口名称**: GET_CAPTURES
- **请求参数**:
  - `worldId`: string - 世界观 ID（可选）
- **响应数据**:
  - `success`: boolean - 操作是否成功
  - `captures`: array - 捕获列表，每个元素包含 id, text, timestamp 等字段
  - `error`: string - 错误信息（失败时）

### 5.2 更新捕获状态
- **接口名称**: UPDATE_CAPTURE_STATUS
- **请求参数**:
  - `captureId`: string - 捕获 ID
  - `status`: string - 状态（pending, processed, ignored）
- **响应数据**:
  - `success`: boolean - 操作是否成功
  - `error`: string - 错误信息（失败时）

## 6. 关系管理接口

### 6.1 创建实体关系
- **接口名称**: CREATE_ENTITY_RELATION
- **请求参数**:
  - `fromEntityId`: string - 源实体 ID
  - `toEntityId`: string - 目标实体 ID
  - `type`: string - 关系类型
  - `note`: string - 关系描述（可选）
- **响应数据**:
  - `success`: boolean - 操作是否成功
  - `relation`: object - 创建的关系信息，包含 id, fromEntityId, toEntityId 等字段
  - `error`: string - 错误信息（失败时）

### 6.2 获取实体关系
- **接口名称**: GET_ENTITY_RELATIONS
- **请求参数**:
  - `worldId`: string - 世界观 ID（可选）
  - `bookId`: string - 书项目 ID（可选）
- **响应数据**:
  - `success`: boolean - 操作是否成功
  - `relations`: array - 关系列表，每个元素包含 id, fromEntityId, toEntityId, type 等字段
  - `error`: string - 错误信息（失败时）

## 7. 书稿解析接口

### 7.1 解析书稿
- **接口名称**: PARSE_MANUSCRIPT
- **请求参数**:
  - `worldId`: string - 世界观 ID
  - `bookId`: string - 书项目 ID（可选）
  - `text`: string - 书稿内容
- **响应数据**:
  - `success`: boolean - 操作是否成功
  - `suggestions`: array - 实体建议列表
  - `relationSuggestions`: array - 关系建议列表
  - `provider`: string - 解析服务提供商
  - `model`: string - 使用的模型
  - `error`: string - 错误信息（失败时）

### 7.2 批量应用关系
- **接口名称**: BATCH_APPLY_MANUSCRIPT_RELATIONS
- **请求参数**:
  - `worldId`: string - 世界观 ID
  - `bookId`: string - 书项目 ID（可选）
  - `relations`: array - 关系建议列表
- **响应数据**:
  - `success`: boolean - 操作是否成功
  - `appliedCount`: number - 成功应用的关系数量
  - `error`: string - 错误信息（失败时）

## 8. 数据迁移接口

### 8.1 迁移本地数据到云端
- **接口名称**: MIGRATE_LOCAL_TO_CLOUD
- **请求参数**:
  - `strategy`: string - 迁移策略（merge, replace）
  - `clearLocalAfterImport`: boolean - 是否在导入后清除本地数据
- **响应数据**:
  - `success`: boolean - 操作是否成功
  - `migrated`: object - 迁移统计信息，包含 worlds, books, entities, captures 等字段
  - `error`: string - 错误信息（失败时）

## 9. 导出接口

### 9.1 导出为 JSON
- **接口名称**: EXPORT_JSON
- **请求参数**:
  - `worldId`: string - 世界观 ID
  - `bookId`: string - 书项目 ID（可选）
- **响应数据**:
  - `success`: boolean - 操作是否成功
  - `data`: object - 导出的数据
  - `error`: string - 错误信息（失败时）

### 9.2 导出为 Markdown
- **接口名称**: EXPORT_MARKDOWN
- **请求参数**:
  - `worldId`: string - 世界观 ID
  - `bookId`: string - 书项目 ID（可选）
- **响应数据**:
  - `success`: boolean - 操作是否成功
  - `content`: string - Markdown 内容
  - `error`: string - 错误信息（失败时）

## 10. 运行时接口

### 10.1 获取运行时上下文
- **接口名称**: GET_RUNTIME_CONTEXT
- **请求参数**: 无
- **响应数据**:
  - `success`: boolean - 操作是否成功
  - `repositoryMode`: string - 存储模式（local, cloud）
  - `cloudEnabled`: boolean - 是否启用云端
  - `authEnabled`: boolean - 是否启用认证
  - `entitlements`: object - 权限信息
  - `usage`: object - 使用统计
  - `error`: string - 错误信息（失败时）

### 10.2 刷新权限
- **接口名称**: REFRESH_ENTITLEMENTS
- **请求参数**: 无
- **响应数据**:
  - `success`: boolean - 操作是否成功
  - `entitlements`: object - 权限信息
  - `error`: string - 错误信息（失败时）
