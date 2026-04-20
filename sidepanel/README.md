# World-Link Sidepanel

`sidepanel/` 是 Chrome 插件侧栏前端，负责世界观库管理、设定编辑、灵感箱、时间轴与总览模块。

## 本地开发

1. 安装依赖

```bash
npm ci
```

2. 启动开发模式

```bash
npm run dev
```

3. 构建产物（供插件 `manifest.json` 使用）

```bash
npm run build
```

构建后输出到 `sidepanel/dist/`，插件通过 `sidepanel/dist/index.html` 挂载侧栏。

## 质量校验

```bash
npm run lint
npm run test
npm run check:docs
```

## 主要目录

- `src/components/`：UI 组件与分区模块
- `src/hooks/`：业务状态与交互逻辑
- `src/services/`：HTTP 与 runtime 消息服务
- `src/utils/`：纯函数工具与单测
- `src/styles/`：风格 token 与主题样式

## 与扩展通信

- 通过 `chrome.runtime.sendMessage` 调用 `background.js` 消息协议
- 云端 API 由 `src/lib/http/` 统一封装（鉴权、重试、错误格式）
