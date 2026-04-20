# World Link Alpha 前端组件文档

## 1. 核心组件

### 1.1 PrimaryTabBar 组件

#### 功能描述
主标签栏组件，用于切换不同的功能模块。

#### 组件结构
```tsx
import PrimaryTabBar from './PrimaryTabBar';

<PrimaryTabBar 
  activeTab={activeTab} 
  onTabChange={setActiveTab} 
  totalWorlds={totalWorlds} 
  totalEntities={totalEntities}
/>
```

#### 属性说明
| 属性 | 类型 | 描述 | 必选 |
|------|------|------|------|
| activeTab | string | 当前激活的标签 | 是 |
| onTabChange | (tab: string) => void | 标签切换回调函数 | 是 |
| totalWorlds | number | 世界总数 | 否 |
| totalEntities | number | 实体总数 | 否 |

#### 标签值
- `'worlds'` - 世界管理
- `'entities'` - 实体管理
- `'search'` - 搜索
- `'settings'` - 设置

### 1.2 WorldSummaryCard 组件

#### 功能描述
世界摘要卡片组件，用于展示世界的基本信息。

#### 组件结构
```tsx
import WorldSummaryCard from './WorldSummaryCard';

<WorldSummaryCard 
  world={world} 
  onSelect={() => handleSelectWorld(world.id)} 
  onDelete={() => handleDeleteWorld(world.id)}
/>
```

#### 属性说明
| 属性 | 类型 | 描述 | 必选 |
|------|------|------|------|
| world | WorldType | 世界对象 | 是 |
| onSelect | () => void | 选择世界回调函数 | 是 |
| onDelete | () => void | 删除世界回调函数 | 是 |

#### WorldType 类型定义
```typescript
interface WorldType {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    books: number;
    entities: number;
  };
}
```

## 2. 服务模块

### 2.1 authService

#### 功能描述
认证服务，处理用户登录、注册、登出等操作。

#### 方法说明

##### registerUser
```typescript
async function registerUser(input: RegisterInput): Promise<AuthResult>
```
- **参数**：
  - `input`: `{ email: string, password: string }`
- **返回值**：`{ user: { id: string, email: string, plan: string }, token: string }`
- **功能**：注册新用户

##### loginUser
```typescript
async function loginUser(input: LoginInput): Promise<AuthResult>
```
- **参数**：
  - `input`: `{ email: string, password: string }`
- **返回值**：`{ user: { id: string, email: string, plan: string }, token: string }`
- **功能**：用户登录

##### logoutUser
```typescript
async function logoutUser(token: string): Promise<void>
```
- **参数**：
  - `token`: string - JWT令牌
- **功能**：用户登出

##### getCurrentUser
```typescript
async function getCurrentUser(): Promise<User | null>
```
- **返回值**：`User | null` - 当前用户信息
- **功能**：获取当前登录用户信息

### 2.2 worldService

#### 功能描述
世界管理服务，处理世界的创建、更新、删除等操作。

#### 方法说明

##### createWorld
```typescript
async function createWorld(input: { name: string, description?: string, userId: string }): Promise<World>
```
- **参数**：
  - `input`: 包含世界名称、描述和用户ID的对象
- **返回值**：`World` - 创建的世界对象
- **功能**：创建新世界

##### getWorlds
```typescript
async function getWorlds(userId: string): Promise<World[]>
```
- **参数**：
  - `userId`: string - 用户ID
- **返回值**：`World[]` - 用户的世界列表
- **功能**：获取用户的所有世界

##### getWorldById
```typescript
async function getWorldById(worldId: string, userId: string): Promise<World | null>
```
- **参数**：
  - `worldId`: string - 世界ID
  - `userId`: string - 用户ID
- **返回值**：`World | null` - 世界对象
- **功能**：根据ID获取世界详情

##### updateWorld
```typescript
async function updateWorld(worldId: string, input: { name?: string, description?: string }, userId: string): Promise<World>
```
- **参数**：
  - `worldId`: string - 世界ID
  - `input`: 包含要更新的字段的对象
  - `userId`: string - 用户ID
- **返回值**：`World` - 更新后的世界对象
- **功能**：更新世界信息

##### deleteWorld
```typescript
async function deleteWorld(worldId: string, userId: string): Promise<void>
```
- **参数**：
  - `worldId`: string - 世界ID
  - `userId`: string - 用户ID
- **功能**：删除世界

### 2.3 entityService

#### 功能描述
实体管理服务，处理实体的创建、更新、删除等操作。

#### 方法说明

##### createEntity
```typescript
async function createEntity(userId: string, input: CreateEntityInput): Promise<Entity>
```
- **参数**：
  - `userId`: string - 用户ID
  - `input`: 包含实体信息的对象
- **返回值**：`Entity` - 创建的实体对象
- **功能**：创建新实体

##### getEntitiesByWorld
```typescript
async function getEntitiesByWorld(worldId: string, userId: string): Promise<Entity[]>
```
- **参数**：
  - `worldId`: string - 世界ID
  - `userId`: string - 用户ID
- **返回值**：`Entity[]` - 世界中的实体列表
- **功能**：获取世界中的所有实体

##### getEntityById
```typescript
async function getEntityById(entityId: string, userId: string): Promise<Entity | null>
```
- **参数**：
  - `entityId`: string - 实体ID
  - `userId`: string - 用户ID
- **返回值**：`Entity | null` - 实体对象
- **功能**：根据ID获取实体详情

##### updateEntity
```typescript
async function updateEntity(entityId: string, input: UpdateEntityInput, userId: string): Promise<Entity>
```
- **参数**：
  - `entityId`: string - 实体ID
  - `input`: 包含要更新的字段的对象
  - `userId`: string - 用户ID
- **返回值**：`Entity` - 更新后的实体对象
- **功能**：更新实体信息

##### deleteEntity
```typescript
async function deleteEntity(entityId: string, userId: string): Promise<void>
```
- **参数**：
  - `entityId`: string - 实体ID
  - `userId`: string - 用户ID
- **功能**：删除实体

##### searchEntities
```typescript
async function searchEntities(userId: string, query: string, worldId?: string, type?: string, tags?: string[]): Promise<Entity[]>
```
- **参数**：
  - `userId`: string - 用户ID
  - `query`: string - 搜索关键词
  - `worldId`: string - 世界ID（可选）
  - `type`: string - 实体类型（可选）
  - `tags`: string[] - 标签列表（可选）
- **返回值**：`Entity[]` - 搜索结果
- **功能**：搜索实体

## 3. 状态管理

### 3.1 useAuth Hook

#### 功能描述
认证状态管理钩子，用于管理用户认证状态。

#### 使用示例
```tsx
import { useAuth } from '../hooks/useAuth';

const { user, isLoading, login, register, logout } = useAuth();
```

#### 返回值
| 属性 | 类型 | 描述 |
|------|------|------|
| user | User | 当前用户信息 |
| isLoading | boolean | 是否正在加载 |
| login | (email: string, password: string) => Promise<void> | 登录方法 |
| register | (email: string, password: string) => Promise<void> | 注册方法 |
| logout | () => Promise<void> | 登出方法 |

### 3.2 useWorld Hook

#### 功能描述
世界状态管理钩子，用于管理世界相关状态。

#### 使用示例
```tsx
import { useWorld } from '../hooks/useWorld';

const { worlds, currentWorld, createWorld, selectWorld, deleteWorld } = useWorld();
```

#### 返回值
| 属性 | 类型 | 描述 |
|------|------|------|
| worlds | World[] | 世界列表 |
| currentWorld | World | 当前选中的世界 |
| createWorld | (name: string, description?: string) => Promise<void> | 创建世界方法 |
| selectWorld | (worldId: string) => void | 选择世界方法 |
| deleteWorld | (worldId: string) => Promise<void> | 删除世界方法 |

### 3.3 useEntity Hook

#### 功能描述
实体状态管理钩子，用于管理实体相关状态。

#### 使用示例
```tsx
import { useEntity } from '../hooks/useEntity';

const { entities, createEntity, updateEntity, deleteEntity, searchEntities } = useEntity();
```

#### 返回值
| 属性 | 类型 | 描述 |
|------|------|------|
| entities | Entity[] | 实体列表 |
| createEntity | (input: CreateEntityInput) => Promise<void> | 创建实体方法 |
| updateEntity | (entityId: string, input: UpdateEntityInput) => Promise<void> | 更新实体方法 |
| deleteEntity | (entityId: string) => Promise<void> | 删除实体方法 |
| searchEntities | (query: string, worldId?: string, type?: string, tags?: string[]) => Promise<void> | 搜索实体方法 |

## 4. 工具函数

### 4.1 formatDate

#### 功能描述
日期格式化函数，将ISO日期字符串格式化为可读形式。

#### 使用示例
```typescript
import { formatDate } from '../utils/formatters';

const formattedDate = formatDate('2023-10-01T00:00:00.000Z');
// 输出: "2023-10-01"
```

### 4.2 debounce

#### 功能描述
防抖函数，用于限制函数的执行频率。

#### 使用示例
```typescript
import { debounce } from '../utils/helpers';

const debouncedSearch = debounce((query: string) => {
  // 搜索逻辑
}, 300);
```

### 4.3 validateEmail

#### 功能描述
邮箱验证函数，检查邮箱格式是否正确。

#### 使用示例
```typescript
import { validateEmail } from '../utils/validators';

const isValidEmail = validateEmail('user@example.com');
// 输出: true
```

## 5. 样式系统

### 5.1 主题配置

#### 功能描述
应用主题配置，定义颜色、字体等样式变量。

#### 使用示例
```tsx
import { useTheme } from '../styles/theme';

const { colors, fonts, spacing } = useTheme();
```

### 5.2 常用样式类

| 类名 | 描述 |
|------|------|
| `container` | 容器样式 |
| `card` | 卡片样式 |
| `btn` | 按钮样式 |
| `input` | 输入框样式 |
| `error` | 错误提示样式 |
| `success` | 成功提示样式 |

## 6. 测试指南

### 6.1 运行测试

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm test -- --coverage
```

### 6.2 测试文件结构

- 测试文件与组件文件同目录，命名为 `ComponentName.test.jsx`
- 使用 React Testing Library 进行组件测试
- 使用 Vitest 作为测试框架

### 6.3 测试示例

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import PrimaryTabBar from './PrimaryTabBar';

describe('PrimaryTabBar', () => {
  test('renders correctly', () => {
    render(
      <PrimaryTabBar 
        activeTab="worlds" 
        onTabChange={() => {}} 
        totalWorlds={5} 
        totalEntities={100}
      />
    );
    
    expect(screen.getByText('世界')).toBeInTheDocument();
  });
});
```

## 7. 开发规范

### 7.1 代码风格
- 使用 Prettier 进行代码格式化
- 使用 ESLint 进行代码质量检查
- 遵循 React 最佳实践

### 7.2 命名规范
- 组件名：PascalCase
- 变量名：camelCase
- 常量名：UPPER_SNAKE_CASE
- 文件名：PascalCase（组件）或 kebab-case（工具函数）

### 7.3 目录结构
```
src/
├── components/         # 组件
├── hooks/              # 自定义钩子
├── services/           # 服务
├── utils/              # 工具函数
├── styles/             # 样式
├── pages/              # 页面
└── App.jsx             # 应用入口
```

## 8. 性能优化

### 8.1 组件优化
- 使用 React.memo 避免不必要的渲染
- 使用 useCallback 和 useMemo 缓存函数和计算结果
- 合理使用状态管理，避免状态提升过高

### 8.2 网络优化
- 使用 axios 进行 HTTP 请求
- 实现请求缓存
- 合理设置请求超时

### 8.3 加载优化
- 实现懒加载
- 使用骨架屏
- 优化图片加载

## 9. 无障碍访问

### 9.1 无障碍特性
- 使用语义化 HTML 标签
- 为所有交互元素添加 aria 属性
- 确保键盘可访问性
- 提供足够的颜色对比度

### 9.2 测试方法
```bash
# 运行无障碍测试
npm run a11y
```

## 10. 国际化

### 10.1 实现方式
- 使用 i18next 进行国际化
- 支持多语言切换
- 可扩展的语言包

### 10.2 使用示例
```tsx
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();

return <h1>{t('welcome')}</h1>;
```
