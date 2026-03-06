# DELETE Object

最近更新时间：2024-11-15

## 功能描述

DELETE Object 接口用于删除指定对象（Object）。  
请求该 API 的用户必须对存储桶具有写权限。 :contentReference[oaicite:0]{index=0}

---

## 授权说明

授权策略中的 action 设置为：

```
cos:DeleteObject
```

### 版本控制

如果需要删除对象的指定版本（包括删除标记），可以使用 `versionId` 请求参数指定版本 ID。  
此时响应将返回 `x-cos-version-id` 头部，表示被删除的版本 ID。 :contentReference[oaicite:1]{index=1}

如果 **未指定 `versionId`**：

- **启用版本控制**  
  DELETE 操作会创建一个删除标记（Delete Marker）作为对象最新版本，并返回 `x-cos-version-id` 表示删除标记版本 ID。

- **版本控制暂停**  
  DELETE 操作会创建一个版本 ID 为 `null` 的删除标记，并删除任何已有的 `null` 版本。

如果操作涉及删除标记，则响应头会返回：

```
x-cos-delete-marker: true
```

表示本次 DELETE 操作创建或删除了删除标记。 :contentReference[oaicite:2]{index=2}

---

# 请求

## 请求示例

```
DELETE /<ObjectKey> HTTP/1.1
Host: <BucketName-APPID>.cos.<Region>.myqcloud.com
Date: GMT Date
Authorization: Auth String
```

说明：

- `Host: <BucketName-APPID>.cos.<Region>.myqcloud.com`
- `<BucketName-APPID>`：带 APPID 后缀的存储桶名称，例如  
  `examplebucket-1250000000`
- `<Region>`：COS 可用地域
- `Authorization`：签名字符串

---

## 请求参数

| 名称 | 描述 | 类型 | 是否必选 |
|---|---|---|---|
| versionId | 指定要删除的版本 ID | string | 否 |

---

## 请求头

仅使用 **公共请求头**。

---

## 请求体

无请求体。

---

# 响应

## 响应头

除公共响应头外，还包括以下版本控制相关头：

| 名称 | 描述 | 类型 |
|---|---|---|
| x-cos-version-id | 对象版本 ID 或删除标记版本 ID | string |
| x-cos-delete-marker | 当删除标记被删除或创建时返回 true | boolean |

说明：

- 使用 `versionId` 删除删除标记时返回 `true`
- 未指定 `versionId` 且存储桶启用版本控制时，DELETE 会创建删除标记并返回 `true` :contentReference[oaicite:3]{index=3}

---

## 响应体

无响应体。

---

## 错误码

该接口遵循统一错误码体系。

---

# 实际案例

## 案例一：未启用版本控制

### 请求

```
DELETE /exampleobject HTTP/1.1
Host: examplebucket-1250000000.cos.ap-beijing.myqcloud.com
Date: Wed, 14 Aug 2019 11:59:40 GMT
Authorization: q-sign-algorithm=sha1&q-ak=************************************&q-sign-time=1565783980;1565791180&q-key-time=1565783980;1565791180&q-header-list=date;host&q-url-param-list=&q-signature=****************************************
Connection: close
```

### 响应

```
HTTP/1.1 204 No Content
Content-Length: 0
Connection: close
Date: Wed, 14 Aug 2019 11:59:40 GMT
Server: tencent-cos
x-cos-request-id: NWQ1M2Y3YWNfMzdiMDJhMDlfODA1Yl8xZThj****
```

---

## 案例二：启用版本控制（创建删除标记）

### 请求

```
DELETE /exampleobject HTTP/1.1
Host: examplebucket-1250000000.cos.ap-beijing.myqcloud.com
Date: Wed, 14 Aug 2019 12:00:21 GMT
Authorization: q-sign-algorithm=sha1&q-ak=************************************&q-sign-time=1565784021;1565791221&q-key-time=1565784021;1565791221&q-header-list=date;host&q-url-param-list=&q-signature=****************************************
Connection: close
```

### 响应

```
HTTP/1.1 204 No Content
Content-Length: 0
Connection: close
Date: Wed, 14 Aug 2019 12:00:21 GMT
Server: tencent-cos
x-cos-delete-marker: true
x-cos-request-id: NWQ1M2Y3ZDVfN2RiNDBiMDlfMmMwNmVfMTc4****
x-cos-version-id: MTg0NDUxNzgyODk2ODc1NjY0NzQ
```

---

## 案例三：永久删除指定版本

### 请求

```
DELETE /exampleobject?versionId=MTg0NDUxNzgyODk3MDgyMzI4NDY HTTP/1.1
Host: examplebucket-1250000000.cos.ap-beijing.myqcloud.com
Date: Wed, 14 Aug 2019 12:00:32 GMT
Authorization: q-sign-algorithm=sha1&q-ak=************************************&q-sign-time=1565784032;1565791232&q-key-time=1565784032;1565791232&q-header-list=date;host&q-url-param-list=versionid&q-signature=****************************************
Connection: close
```

### 响应

```
HTTP/1.1 204 No Content
Content-Length: 0
Connection: close
Date: Wed, 14 Aug 2019 12:00:32 GMT
Server: tencent-cos
x-cos-request-id: NWQ1M2Y3ZTBfODhjMjJhMDlfMWNkOF8xZDZi****
x-cos-version-id: MTg0NDUxNzgyODk3MDgyMzI4NDY
```

---

## 案例四：永久删除指定删除标记

### 请求

```
DELETE /exampleobject?versionId=MTg0NDUxNzgyODk2ODc1NjY0NzQ HTTP/1.1
Host: examplebucket-1250000000.cos.ap-beijing.myqcloud.com
Date: Wed, 14 Aug 2019 12:00:42 GMT
Authorization: q-sign-algorithm=sha1&q-ak=************************************&q-sign-time=1565784042;1565791242&q-key-time=1565784042;1565791242&q-header-list=date;host&q-url-param-list=versionid&q-signature=****************************************
Connection: close
```

### 响应

```
HTTP/1.1 204 No Content
Content-Length: 0
Connection: close
Date: Wed, 14 Aug 2019 12:00:42 GMT
Server: tencent-cos
x-cos-delete-marker: true
x-cos-request-id: NWQ1M2Y3ZWFfNzljMDBiMDlfMjkyMDJfMWRjNjVm****
x-cos-version-id: MTg0NDUxNzgyODk2ODc1NjY0NzQ
```