# Design 文档索引（当前有效）

> 本目录只保留当前版本 UX/UI 规范，避免历史方案误导开发与评审。
> 截至 `2026-04-19`，仓库内旧版 UI/UX 草案已清理完成，当前文件即唯一有效口径。

## 当前有效文档（Active）

- `design/ux-spec.md`  
  UX 结构、信息架构、关键交互流程
- `design/ui-design-spec.md`  
  UI 视觉规范、组件规则、响应式与状态表现
- `design/style-decision-v1.md`
  风格决策基线（Sidepanel + Web）与 token 落地策略
- `design/style-execution-checklist-v1.md`
  风格执行清单（Corporate Clean 主风格、辅助风格边界与本轮落地范围）

## 使用约定

1. 页面结构或交互流程变更，先更新 `ux-spec.md`。  
2. 视觉 token、样式规则、组件外观变更，更新 `ui-design-spec.md`。  
3. 风格方向发生变化，先更新 `style-decision-v1.md`，再修改 UI 规范与代码。  
4. 旧版本 UI 草案不保留在仓库；确认废弃后直接删除。  

## 设计源信息维护约定（新增）

为降低设计口径漂移，`ux-spec.md` 与 `ui-design-spec.md` 顶部建议维护：

- `Design Source`：设计工具与文档 ID（如 Figma 文件链接或编号）
- `Design Version`：当前对齐版本号（如 `v1.3`）
- `Last Synced`：最近一次与实现或评审对齐日期（YYYY-MM-DD）

## 提交前检查

- 运行：`node scripts/check-docs-consistency.mjs`
