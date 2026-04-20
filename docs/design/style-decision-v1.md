# Style Decision v1（Sidepanel + Web）

## 1. 背景

- 产品形态：
  - 当前：Chrome Sidepanel（`320–400px` 高频工具面板）
  - 后续：Web 工作台版本（更宽视口）
- 产品属性：
  - B 端效率工具
  - 中高信息密度
  - 强结构、可扩展

## 2. 风格候选（StyleKit + 业务评估）

| 候选风格 | 适配结论 | 说明 |
| --- | --- | --- |
| Corporate Clean | ✅ 主风格 | 最匹配 B 端工具：清晰层级、低学习成本、稳定可扩展 |
| Notion-style（可读性） | ✅ 辅助风格 | 用于文案阅读区、说明文档、空状态说明排版 |
| Stripe-style | ⚪ 营销页可用 | 适合官网和落地页，不作为主工作区基础风格 |
| Glassmorphism / 强装饰风格 | ❌ 不作为主风格 | 在高密度工具场景下可读性和稳定性较差 |

## 3. 最终决策

### 3.1 Sidepanel（当前）

- 主风格：**Corporate Clean**
- 辅助元素：Notion 风格的文本排版节奏（标题/段落/说明）
- 核心目标：
  - 先读懂，再操作
  - 重要操作一屏可达
  - 空状态有明确下一步动作（CTA）

### 3.2 Web 版本（后续）

- 继续沿用 Corporate Clean 的 token 体系
- 允许局部增强：
  - 概览页可引入更强卡片层次
  - 文档/说明区强化可读性排版
- 营销站可单独采用 Stripe-style，不反向污染产品主界面

## 4. Token 落地文件

- 主题 token 文件：`sidepanel/src/styles/stylekit-theme-v1.css`
- 接入入口：`sidepanel/src/main.jsx`
- 当前原则：
  - 页面 / 卡片 / 边框 / 文字 / 主色统一走 token
  - 后续换肤优先改 token，不直接改业务组件

## 5. 后续迭代规则

1. 视觉风格调整，必须先更新本文件再改代码。  
2. 新增页面先复用现有 token，必要时再扩展 `stylekit-theme-v1.css`。  
3. 若引入“品牌型风格”（如 Stripe-style），仅限营销域，不直接进入 Sidepanel 主流程。  
