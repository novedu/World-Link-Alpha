# World Link Alpha API 文档

## 项目介绍

World Link Alpha 是一个世界观管理工具，帮助作者和创作者管理虚构世界的设定、人物、地点等信息。

## API 基础信息

- **API 基础 URL**: `http://localhost:3001`
- **认证方式**: JWT Token
- **请求格式**: JSON
- **响应格式**: JSON

## 认证说明

所有需要认证的API都需要在请求头中包含 `Authorization` 字段，格式为：

```
Authorization: Bearer {token}
```

## 错误处理

API 返回的错误格式为：

```json
{
  "error": "错误信息"
}
```

常见的错误状态码：

- `400`: 请求参数错误
- `401`: 未认证或认证失败
- `403`: 权限不足
- `404`: 资源不存在
- `500`: 服务器内部错误
