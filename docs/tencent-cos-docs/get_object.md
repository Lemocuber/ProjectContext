# GET Object

最近更新时间：2026-03-03

## 功能描述

\`GET Object\` 接口用于从 COS 存储桶中下载对象（Object）到本地。调用该接口需要对对象具有 **读权限**，或者对象被设置为 **公有读**。 :contentReference[oaicite:0]{index=0}

---

## 注意事项

- 若存储桶启用了 **版本控制**，默认返回对象的 **当前版本**。  
- 若需要下载指定版本，可通过 \`versionId\` 参数指定。  
- 若对象当前版本是 **删除标记（Delete Marker）**，则 COS 会表现为对象不存在，并返回响应头：

\`\`\`
x-cos-delete-marker: true
\`\`\`

---

# 授权说明

CAM 策略需要授予如下权限：

\`\`\`json
{
  "version": "2.0",
  "statement": [
    {
      "action": [
        "name/cos:GetObject"
      ],
      "effect": "allow",
      "resource": [
        "qcs::cos:ap-beijing:uid/1250000000:examplebucket-1250000000/doc/*"
      ]
    }
  ]
}
\`\`\`

---

# 请求

## 请求语法

\`\`\`http
GET /<ObjectKey> HTTP/1.1
Host: <BucketName-APPID>.cos.<Region>.myqcloud.com
Date: GMT Date
Authorization: Auth String
\`\`\`

说明：

- \`Host\` 格式：

\`\`\`
<BucketName-APPID>.cos.<Region>.myqcloud.com
\`\`\`

- \`BucketName-APPID\`：带 APPID 的存储桶名称  
- \`Region\`：存储桶所在地域  
- \`Authorization\`：请求签名

---

# 请求参数

| 参数 | 描述 | 类型 | 是否必填 |
|---|---|---|---|
| response-content-type | 指定返回内容类型 | String | 否 |
| response-content-language | 返回内容语言 | String | 否 |
| response-expires | 设置响应过期时间 | String | 否 |
| response-cache-control | 缓存控制 | String | 否 |
| response-content-disposition | 下载文件名 | String | 否 |
| response-content-encoding | 编码格式 | String | 否 |
| versionId | 指定对象版本 | String | 否 |

---

# 请求头

除公共请求头外，还支持以下请求头。

| Header | 描述 |
|---|---|
| Range | 指定下载范围 |
| If-Modified-Since | 若对象在指定时间后被修改才返回 |
| If-Unmodified-Since | 若对象在指定时间后未修改才返回 |
| If-Match | 若 ETag 匹配才返回 |
| If-None-Match | 若 ETag 不匹配才返回 |

---

# 请求体

该接口 **无请求体**。

---

# 响应

## 响应头

| Header | 描述 |
|---|---|
| Content-Type | 对象 MIME 类型 |
| Content-Length | 对象大小 |
| ETag | 对象 MD5 |
| Last-Modified | 最后修改时间 |
| x-cos-version-id | 对象版本 ID |
| x-cos-storage-class | 存储类型 |

若对象为删除标记，还会返回：

\`\`\`
x-cos-delete-marker: true
\`\`\`

---

## 响应体

响应体为 **对象内容（文件数据）**。

---

# 使用示例

## 示例一：简单下载

### 请求

\`\`\`http
GET /exampleobject HTTP/1.1
Host: examplebucket-1250000000.cos.ap-beijing.myqcloud.com
Date: Fri, 10 Apr 2020 09:35:05 GMT
Authorization: q-sign-algorithm=sha1&q-ak=...&q-signature=...
\`\`\`

### 响应

\`\`\`http
HTTP/1.1 200 OK
Content-Type: image/jpeg
Content-Length: 16
ETag: "ee8de918d05640145b18f70f4c3aa602"
Server: tencent-cos

[Object Content]
\`\`\`

---

## 示例二：范围下载

### 请求

\`\`\`http
GET /exampleobject HTTP/1.1
Host: examplebucket-1250000000.cos.ap-beijing.myqcloud.com
Range: bytes=0-1023
Authorization: q-sign-algorithm=sha1&...
\`\`\`

### 响应

\`\`\`http
HTTP/1.1 206 Partial Content
Content-Range: bytes 0-1023/4096
Content-Length: 1024
\`\`\`

---

## 示例三：指定版本下载

### 请求

\`\`\`http
GET /exampleobject?versionId=example-version-id HTTP/1.1
Host: examplebucket-1250000000.cos.ap-beijing.myqcloud.com
Authorization: q-sign-algorithm=sha1&...
\`\`\`

---

## 示例四：设置返回 Header

### 请求

\`\`\`http
GET /exampleobject?response-content-type=text/plain HTTP/1.1
Host: examplebucket-1250000000.cos.ap-beijing.myqcloud.com
Authorization: q-sign-algorithm=sha1&...
\`\`\`

---

# 错误码

接口遵循 COS 统一错误码规范。