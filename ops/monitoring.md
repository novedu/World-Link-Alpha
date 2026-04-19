# Observability Baseline

## TraceId 统一约定

1. 客户端请求统一携带 `x-request-id`
2. 后端若未收到则自动生成
3. 所有错误响应 `meta.requestId` 必须可用

## 运行指标

后端提供聚合指标接口：

```text
GET /api/observability/metrics
```

返回内容包含：

1. 总请求数
2. 状态码桶（2xx/3xx/4xx/5xx）
3. 路由级调用量、错误数、平均耗时、最大耗时

## 告警建议（初始阈值）

1. 5xx 比例 > 2%（5 分钟窗口）
2. P95 延迟 > 800ms（核心写接口）
3. 登录接口失败率 > 5%
