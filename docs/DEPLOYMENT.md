# World Link Alpha 部署运维文档

## 1. 环境要求

### 1.1 系统要求
- Node.js 20.x
- npm 9.x+
- Docker (可选，用于容器化部署)
- Docker Compose (可选，用于容器化部署)

### 1.2 环境变量

#### 后端环境变量
| 变量名 | 描述 | 示例值 |
|-------|------|--------|
| NODE_ENV | 运行环境 | `development` 或 `production` |
| DATABASE_URL | 数据库连接字符串 | `file:./worldlink.db` |
| JWT_SECRET | JWT密钥（生产环境必须至少32位） | `your-super-secret-jwt-key-change-this-in-production` |
| JWT_EXPIRES_IN | JWT过期时间 | `7d` |
| PORT | 服务器端口 | `3001` |
| ALLOWED_ORIGINS | 允许的跨域来源 | `chrome-extension://*,http://localhost:3000` |

#### 前端环境变量
| 变量名 | 描述 | 示例值 |
|-------|------|--------|
| VITE_API_URL | 后端API地址 | `http://localhost:3001` |
| VITE_APP_NAME | 应用名称 | `World Link Alpha` |

## 2. 部署方式

### 2.1 本地开发部署

#### 后端部署
1. 进入后端目录
   ```bash
   cd backend
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 生成数据库模型
   ```bash
   npm run db:generate
   ```

4. 启动开发服务器
   ```bash
   npm run dev
   ```

#### 前端部署
1. 进入前端目录
   ```bash
   cd sidepanel
   ```

2. 安装依赖
   ```bash
   npm install
   ```

3. 启动开发服务器
   ```bash
   npm run dev
   ```

### 2.2 生产环境部署

#### 使用Docker Compose部署
1. 确保Docker和Docker Compose已安装

2. 在项目根目录创建 `.env` 文件，设置环境变量
   ```env
   # JWT密钥（生产环境必须至少32位）
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
   ```

3. 启动服务
   ```bash
   docker-compose up -d
   ```

4. 查看服务状态
   ```bash
   docker-compose ps
   ```

#### 手动部署

##### 后端部署
1. 进入后端目录
   ```bash
   cd backend
   ```

2. 安装依赖
   ```bash
   npm install --omit=dev
   ```

3. 构建项目
   ```bash
   npm run build
   ```

4. 启动服务
   ```bash
   npm start
   ```

##### 前端部署
1. 进入前端目录
   ```bash
   cd sidepanel
   ```

2. 安装依赖
   ```bash
   npm install --omit=dev
   ```

3. 构建项目
   ```bash
   npm run build
   ```

4. 将构建产物部署到静态文件服务器（如Nginx）

## 3. 数据库管理

### 3.1 数据库迁移
```bash
# 生成迁移文件
npm run db:migrate:dev

# 应用迁移
npm run db:migrate:deploy
```

### 3.2 数据库备份
```bash
# 手动备份
npm run backup:db

# 备份恢复演练
npm run backup:drill
```

## 4. 监控与日志

### 4.1 日志管理
- 后端日志存储在 `backend/logs` 目录
- 日志文件按日期轮转，保留7天
- 包含错误日志和综合日志

### 4.2 监控指标
- API响应时间
- 数据库查询性能
- 内存使用情况
- 错误率

## 5. 安全管理

### 5.1 JWT密钥管理
- 生产环境必须使用至少32位的强随机密钥
- 定期轮换JWT密钥
- 密钥必须通过环境变量设置，不得硬编码

### 5.2 密码策略
- 密码长度至少8位
- 包含大写字母、小写字母、数字和特殊字符
- 使用bcrypt进行密码哈希

### 5.3 安全审计
- 定期进行安全扫描
- 检查依赖包漏洞
- 审查API权限控制

## 6. 常见问题排查

### 6.1 后端服务无法启动
- 检查端口是否被占用
- 检查环境变量配置
- 查看日志文件

### 6.2 数据库连接失败
- 检查数据库文件权限
- 确保数据库文件存在
- 检查数据库连接字符串

### 6.3 前端无法连接后端
- 检查后端服务是否运行
- 检查CORS配置
- 检查API地址配置

## 7. 性能优化

### 7.1 数据库优化
- 使用索引加速查询
- 避免N+1查询问题
- 合理使用缓存

### 7.2 服务端优化
- 启用Gzip压缩
- 合理设置缓存策略
- 优化API响应时间

### 7.3 前端优化
- 代码分割
- 图片优化
- 减少HTTP请求

## 8. 版本管理

### 8.1 发布流程
1. 代码测试
2. 构建验证
3. 部署到测试环境
4. 测试验证
5. 部署到生产环境

### 8.2 回滚策略
1. 保留最近3个版本的构建产物
2. 数据库备份
3. 快速回滚脚本

## 9. 维护计划

### 9.1 定期维护
- 每周：查看日志，检查错误
- 每月：数据库优化，安全审计
- 每季度：依赖包更新，性能评估

### 9.2 应急响应
- 建立故障响应流程
- 制定恢复计划
- 定期演练

## 10. 联系方式

- 技术支持：[your-email@example.com]
- 项目仓库：[https://github.com/novedu/World-Link-Alpha]
