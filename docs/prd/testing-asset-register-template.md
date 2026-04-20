# 测试资产台账模板

- Owner: 产品 / 技术负责人
- Last Updated: 2026-04-19
- Status: active
- Scope: 管理测试 Case、执行方式、阻断发布字段与证据链接

## 1. 使用说明

1. 每条 Case 必须有唯一 `Case ID`。
2. `Priority` 仅允许 `P0/P1/P2`。
3. `Blocking` 为 `yes` 的 Case 失败时必须阻断发布。
4. `Evidence` 必须填写可访问证据路径。

## 2. 台账模板

| Case ID | 模块 | 场景 | Priority | 执行方式（自动/手工） | Blocking（yes/no） | Owner | 最近执行 | 结果（pass/fail） | Evidence | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TPL-001 | 示例 | 示例场景 | P0 | 手工 | yes | 待分配 | YYYY-MM-DD | pass | 链接 | 示例 |

## 3. 维护节奏

1. 每次 RC 前更新 `最近执行` 与 `结果`。
2. 每次缺陷复测后更新 `Evidence`。
3. 每周例会检查 P0/P1 覆盖率。
